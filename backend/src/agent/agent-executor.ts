import { GeminiLLM } from './gemini-llm.js';
import { CVService } from '../services/cv.service.js';
import { TriageRulesService } from '../services/triage-rules.service.js';
import { RAGService } from '../services/rag.service.js';
import { KnowledgeBaseService } from '../services/knowledge-base.service.js';
import { SupabaseService } from '../services/supabase.service.js';
import { MapsService } from '../services/maps.service.js';
import { IntentClassifierService, type Intent } from '../services/intent-classifier.service.js';
import { logger } from '../utils/logger.js';
import type { TriageResult, TriageLevel, ConditionSource, ConditionConfidence, Location, NearestClinic, HealthProfile } from '../types/index.js';

const LANG_INSTRUCTION: Record<string, string> = {
  en: 'IMPORTANT: You MUST respond entirely in English. Do not use Vietnamese.',
  fr: 'IMPORTANT: Vous DEVEZ répondre entièrement en français. N\'utilisez pas le vietnamien.',
  zh: 'IMPORTANT: 您必须完全用中文回答。不要使用越南语。',
  vi: '',
};

const TIMEFRAME_MAP: Record<string, Record<string, string>> = {
  en: { emergency: 'Immediately', urgent: 'Within 24 hours', routine: 'When convenient', none: 'Not applicable' },
  vi: { emergency: 'Ngay lập tức', urgent: 'Trong 24 giờ', routine: 'Khi có thể sắp xếp', none: 'Không áp dụng' },
  fr: { emergency: 'Immédiatement', urgent: 'Dans les 24 heures', routine: 'Dès que possible', none: 'Non applicable' },
  zh: { emergency: '立即', urgent: '24小时内', routine: '方便时', none: '不适用' },
};

const RED_FLAG_MAP: Record<string, Record<string, string>> = {
  en: {
    'Thay đổi thị lực đột ngột': 'Sudden vision changes',
    'Khó thở': 'Difficulty breathing',
    'Đau ngực': 'Chest pain',
    'Đau đầu dữ dội': 'Severe headache',
    'Lú lẫn, ý thức thay đổi': 'Confusion, altered consciousness',
    'Sốt cao kèm đau dữ dội': 'High fever with severe pain',
    'Chảy máu': 'Bleeding',
    'Không thể phân tích tự động, cần đánh giá trực tiếp': 'Cannot analyse automatically — direct evaluation required',
  },
  fr: {
    'Thay đổi thị lực đột ngột': 'Changements visuels soudains',
    'Khó thở': 'Difficultés respiratoires',
    'Đau ngực': 'Douleur thoracique',
    'Đau đầu dữ dội': 'Maux de tête sévères',
    'Lú lẫn, ý thức thay đổi': 'Confusion, altération de la conscience',
    'Sốt cao kèm đau dữ dội': 'Fièvre élevée avec douleur intense',
    'Chảy máu': 'Saignement',
    'Không thể phân tích tự động, cần đánh giá trực tiếp': 'Analyse automatique impossible — évaluation directe requise',
  },
  zh: {
    'Thay đổi thị lực đột ngột': '突然视力变化',
    'Khó thở': '呼吸困难',
    'Đau ngực': '胸痛',
    'Đau đầu dữ dội': '剧烈头痛',
    'Lú lẫn, ý thức thay đổi': '意识混乱',
    'Sốt cao kèm đau dữ dội': '高烧伴剧烈疼痛',
    'Chảy máu': '出血',
    'Không thể phân tích tự động, cần đánh giá trực tiếp': '无法自动分析，需要直接评估',
  },
};

function translateRedFlags(flags: string[], lang?: string): string[] {
  if (!lang || lang === 'vi' || !RED_FLAG_MAP[lang]) return flags;
  return flags.map(f => RED_FLAG_MAP[lang][f] ?? f);
}

function getTimeframe(level: string, lang?: string): string {
  const l = lang && TIMEFRAME_MAP[lang] ? lang : 'vi';
  const map = TIMEFRAME_MAP[l];
  return map[level] ?? map.none;
}

export class MedagenAgent {
  private llm: GeminiLLM;
  private cvService: CVService;
  private triageService: TriageRulesService;
  private ragService: RAGService;
  private knowledgeBase: KnowledgeBaseService;
  private mapsService: MapsService;
  private intentClassifier: IntentClassifierService;
  private initialized: boolean = false;

  constructor(supabaseService: SupabaseService, mapsService?: MapsService) {
    this.llm = new GeminiLLM();
    this.cvService = new CVService();
    this.triageService = new TriageRulesService();
    this.ragService = new RAGService(supabaseService);
    this.knowledgeBase = new KnowledgeBaseService(supabaseService);
    this.mapsService = mapsService || new MapsService();
    this.intentClassifier = new IntentClassifierService();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      logger.info('Initializing Medagen Agent...');

      // Initialize RAG service
      await this.ragService.initialize();

      this.initialized = true;
      logger.info('Medagen Agent initialized successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize agent');
      throw error;
    }
  }

  async processTriage(
    userText: string,
    imageUrl?: string,
    _userId?: string,
    conversationContext?: string,
    location?: Location,
    healthProfile?: HealthProfile | null,
    language?: string
  ): Promise<TriageResult & { nearest_clinic?: NearestClinic }> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      logger.info('Starting query processing...');
      logger.info(`User text: "${userText}"`);
      logger.info(`Has image: ${!!imageUrl}`);

      // Step 1: Classify intent FIRST (routing decision)
      const intent = this.intentClassifier.classifyIntent(userText, !!imageUrl);
      logger.info(`[ROUTING] Intent classified: ${intent.type} (confidence: ${intent.confidence})`);

      // Build health profile context string once for reuse
      const profileContext = healthProfile ? this.buildProfileContext(healthProfile) : undefined;

      // Step 2: Route based on intent
      switch (intent.type) {
        case 'casual_greeting':
          logger.info('[ROUTING] → Lightweight: Casual greeting');
          return await this.handleCasualConversation(userText, conversationContext, language);

        case 'out_of_scope':
          logger.info('[ROUTING] → Lightweight: Out of scope');
          return await this.handleOutOfScope(userText, intent, language);

        case 'disease_info':
          logger.info('[ROUTING] → Medium: Disease info (RAG only)');
          return await this.processDiseaseInfoQuery(userText, conversationContext, profileContext, language);

        case 'triage':
          if (imageUrl) {
            logger.info('[ROUTING] → Full: Triage with image (CV + Triage + RAG)');
            return await this.processTriageWithImage(userText, imageUrl, conversationContext, location, profileContext, language);
          } else {
            logger.info('[ROUTING] → Full: Triage text-only (Triage + RAG)');
            return await this.processTriageTextOnly(userText, conversationContext, location, profileContext, language);
          }

        default:
          // Fallback: if unclear, use lightweight response
          logger.info('[ROUTING] → Lightweight: Default fallback');
          return await this.handleCasualConversation(userText, conversationContext, language);
      }
    } catch (error) {
      logger.error({ error }, 'Error processing query');
      
      // Return safe default
      return this.getSafeDefaultResponse(userText);
    }
  }

  private buildProfileContext(profile: HealthProfile): string {
    const parts: string[] = ['=== HỒ SƠ SỨC KHỎE BỆNH NHÂN ==='];
    if (profile.full_name) parts.push(`Tên: ${profile.full_name}`);
    if (profile.date_of_birth) {
      const age = new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear();
      parts.push(`Tuổi: ${age}`);
    }
    if (profile.gender) {
      const genderMap = { male: 'Nam', female: 'Nữ', other: 'Khác' };
      parts.push(`Giới tính: ${genderMap[profile.gender]}`);
    }
    if (profile.height_cm && profile.weight_kg) {
      const bmi = (profile.weight_kg / Math.pow(profile.height_cm / 100, 2)).toFixed(1);
      parts.push(`Chiều cao: ${profile.height_cm}cm, Cân nặng: ${profile.weight_kg}kg (BMI: ${bmi})`);
    }
    if (profile.blood_type && profile.blood_type !== 'unknown') parts.push(`Nhóm máu: ${profile.blood_type}`);
    if (profile.chronic_diseases?.length) parts.push(`Bệnh mãn tính: ${profile.chronic_diseases.join(', ')}`);
    if (profile.drug_allergies?.length) parts.push(`DỊ ỨNG THUỐC: ${profile.drug_allergies.join(', ')} ← QUAN TRỌNG`);
    if (profile.food_allergies?.length) parts.push(`Dị ứng thực phẩm: ${profile.food_allergies.join(', ')}`);
    if (profile.current_medications?.length) {
      const meds = profile.current_medications.map(m => `${m.name}${m.dosage ? ` (${m.dosage})` : ''}`).join(', ');
      parts.push(`Thuốc đang dùng: ${meds}`);
    }
    if (profile.past_surgeries?.length) parts.push(`Tiền sử phẫu thuật: ${profile.past_surgeries.join(', ')}`);
    parts.push('=== KẾT THÚC HỒ SƠ ===');
    return parts.join('\n');
  }

  /**
   * Process educational query about disease
   * Agent tự quyết định khi nào cần gọi knowledge base vs RAG
   */
  private async processDiseaseInfoQuery(
    userText: string,
    conversationContext?: string,
    profileContext?: string,
    language?: string
  ): Promise<TriageResult> {
    try {
      logger.info('='.repeat(80));
      logger.info('[AGENT WORKFLOW] processDiseaseInfoQuery STARTED');
      logger.info(`[AGENT] User text: "${userText}"`);

      // Agent tự quyết định: thử knowledge base trước, nếu không có thì dùng RAG
      let guidelines: any[] = [];

      // Step 1: Thử tìm disease name từ user text và query knowledge base
      logger.info('[AGENT] Step 1: Attempting structured knowledge search...');
      try {
        // Extract potential disease name from query (simple heuristic)
        const diseaseKeywords = userText.match(/(?:bệnh|về)\s+([^?.,!]+)/i);
        if (diseaseKeywords && diseaseKeywords[1]) {
          const potentialDisease = diseaseKeywords[1].trim();
          logger.info(`[AGENT] Potential disease name: ${potentialDisease}`);
          
          const disease = await this.knowledgeBase.findDisease(potentialDisease);
          if (disease) {
            logger.info(`[AGENT] Found disease: ${disease.name} (ID: ${disease.id})`);
            const structuredResults = await this.knowledgeBase.queryStructuredKnowledge({
              disease: disease.name,
              query: userText
            });
            if (structuredResults.length > 0) {
              guidelines = structuredResults;
              logger.info(`[AGENT] Retrieved ${guidelines.length} structured knowledge chunks from CSDL`);
            }
          }
        }
      } catch (error) {
        logger.warn({ error }, '[AGENT] Knowledge base search failed, will use RAG');
      }

      // Step 2: Fallback to RAG if no structured results
      if (guidelines.length === 0) {
        logger.info('[AGENT] Step 2: Using RAG for semantic search...');
        const guidelineQuery = {
          symptoms: userText,
          suspected_conditions: [],
          triage_level: 'routine'
        };

        logger.info(`[AGENT] Calling MCP RAG - searchGuidelines...`);
        guidelines = await this.ragService.searchGuidelines(guidelineQuery);
        logger.info(`[AGENT] Retrieved ${guidelines.length} guideline snippets from RAG`);
      }
      
      logger.info(`[AGENT] Total guidelines collected: ${guidelines.length}`);

      // Format guidelines for better readability
      const formattedGuidelines = guidelines.map((g, i) => {
        const content = typeof g === 'string' ? g : (g.content || g.snippet || JSON.stringify(g));
        return `\n--- Guideline ${i + 1} ---\n${content}`;
      }).join('\n\n');

      // Use LLM to synthesize educational response
      const langInstr = LANG_INSTRUCTION[language ?? 'vi'] ?? '';
      const prompt = `${langInstr ? langInstr + '\n\n' : ''}Bạn là trợ lý y tế giáo dục của Việt Nam, dựa trên hướng dẫn của Bộ Y Tế. Hãy tạo một phản hồi TỰ NHIÊN, DỄ HIỂU bằng markdown HOÀN TOÀN BẰNG TIẾNG VIỆT.

Câu hỏi của người dùng: ${userText}

${conversationContext ? `Ngữ cảnh cuộc trò chuyện trước: ${conversationContext}` : ''}
${profileContext ? `\n${profileContext}\nLưu ý: sử dụng hồ sơ sức khỏe để cá nhân hóa lời khuyên (đặc biệt chú ý dị ứng thuốc và bệnh mãn tính).\n` : ''}

═══════════════════════════════════════════════════════════════════════════════
HƯỚNG DẪN Y TẾ TỪ BỘ Y TẾ (BẮT BUỘC PHẢI SỬ DỤNG):
═══════════════════════════════════════════════════════════════════════════════
${formattedGuidelines}
═══════════════════════════════════════════════════════════════════════════════

⚠️ QUAN TRỌNG: BẮT BUỘC sử dụng thông tin từ "Hướng dẫn y tế từ Bộ Y Tế" ở trên:
- PHẢI dựa trên thông tin CỤ THỂ từ guidelines để giải thích, biện luận về bệnh/triệu chứng
- KHÔNG được tự ý tạo thông tin ngoài guidelines được cung cấp
- Có thể giải thích nguyên tắc điều trị từ guidelines (KHÔNG kê đơn cụ thể, không khuyến nghị liều thuốc)
- Nếu guidelines đề cập thuốc cụ thể, có thể giải thích: "Có thể sử dụng các thuốc như... (theo chỉ định của bác sĩ)"
- Nếu guidelines đề cập phương pháp, có thể giải thích phương pháp đó một cách tự nhiên

YÊU CẦU VỀ PHONG CÁCH VIẾT:
1. VIẾT HOÀN TOÀN BẰNG TIẾNG VIỆT - không được dùng tiếng Anh trong response
2. Viết NGẮN GỌN, CÔ ĐỌNG - tối đa 250-350 từ, tập trung vào thông tin quan trọng nhất
3. Viết TỰ NHIÊN, DỄ HIỂU như đang trò chuyện với người dùng
4. CÓ THỂ biện luận, giải thích nhưng NGẮN GỌN, không lan man
5. Sử dụng markdown để format (tiêu đề, danh sách) cho dễ đọc
6. PHẢI sử dụng thông tin từ "Hướng dẫn y tế từ Bộ Y Tế" ở trên - KHÔNG được tự ý tạo thông tin
7. KHÔNG được tự thêm câu mở đầu kiểu "Based on...", "I've assessed..." hoặc "This is..."
8. Đây là câu hỏi giáo dục, KHÔNG PHẢI chẩn đoán cá nhân
9. Luôn nhấn mạnh: "Thông tin chỉ mang tính tham khảo, không thay thế bác sĩ"
10. KHÔNG kê đơn, KHÔNG khuyến nghị liều thuốc cụ thể

QUAN TRỌNG VỀ ĐỘ DÀI:
- Tối đa 250-350 từ (khoảng 1-2 đoạn văn ngắn)
- Tập trung vào: định nghĩa ngắn gọn, nguyên tắc điều trị chính, phòng ngừa
- KHÔNG lặp lại thông tin, KHÔNG giải thích quá chi tiết
- Ưu tiên thông tin thực tế, dễ hiểu

Hãy tạo một phản hồi markdown NGẮN GỌN, cô đọng, bao gồm:
- Định nghĩa ngắn gọn về bệnh/triệu chứng (2-3 câu)
- Nguyên tắc điều trị chính từ guidelines (3-4 điểm ngắn gọn)
- Hướng dẫn phòng ngừa và chăm sóc (2-3 điểm)
- Disclaimer ngắn gọn

Ví dụ format markdown NGẮN GỌN:
## 📚 Về bệnh [tên bệnh]

[Định nghĩa ngắn gọn 2-3 câu từ guidelines]

## 💊 Nguyên tắc điều trị

- [Điểm 1 - ngắn gọn]
- [Điểm 2 - ngắn gọn]
- [Điểm 3 - ngắn gọn]

## 💡 Phòng ngừa và chăm sóc

- [Điểm 1 - ngắn gọn]
- [Điểm 2 - ngắn gọn]

**Lưu ý:** Thông tin chỉ mang tính tham khảo giáo dục, không thay thế bác sĩ.`;

      // Log prompt and input data before sending to LLM
      logger.info('='.repeat(80));
      logger.info('[AGENT] PROMPT SENT TO LLM (Disease Info Query):');
      logger.info(prompt);
      logger.info('='.repeat(80));
      logger.info('[AGENT] INPUT DATA SUMMARY (Disease Info Query):');
      logger.info(`- User text: "${userText}"`);
      logger.info(`- Guidelines count: ${guidelines.length}`);
      if (guidelines.length > 0) {
        guidelines.forEach((g, i) => {
          const content = typeof g === 'string' ? g : (g.content || g.snippet || JSON.stringify(g));
          logger.info(`  ${i + 1}. Preview: ${content.substring(0, 200)}...`);
        });
      }
      logger.info(`- Conversation context: ${conversationContext ? 'Yes' : 'No'}`);
      logger.info('='.repeat(80));

      const generations = await this.llm._generate([prompt]);
      const response = generations.generations[0][0].text;

      // Extract markdown content (full response is markdown)
      const markdownContent = response.trim();

      // Build TriageResult from markdown response
      const triageLevel = 'routine' as TriageLevel;
      
      // Extract key information from markdown for backward compatibility
      const actionMatch = markdownContent.match(/##\s*[📚💊💡]*\s*(?:Về|Nguyên tắc|Hướng dẫn)[\s\S]*?\n([\s\S]*?)(?=\n##|$)/i);
      const homeCareMatch = markdownContent.match(/##\s*[💡]*\s*Hướng dẫn[\s\S]*?\n([\s\S]*?)(?=\n##|$)/i);
      
      const action = actionMatch ? actionMatch[1].trim().split('\n')[0] : 'Thông tin giáo dục về bệnh/triệu chứng dựa trên hướng dẫn của Bộ Y Tế.';
      const homeCareAdvice = homeCareMatch ? homeCareMatch[1].trim().substring(0, 500) : 'Thông tin về phòng ngừa và chăm sóc từ hướng dẫn của Bộ Y Tế.';

      const parsed: TriageResult = {
        triage_level: triageLevel,
        symptom_summary: userText,
        red_flags: [],
        suspected_conditions: [],
        cv_findings: {
          model_used: 'none',
          raw_output: {}
        },
        recommendation: {
          action: action,
          timeframe: 'Không áp dụng (đây là thông tin giáo dục)',
          home_care_advice: homeCareAdvice,
          warning_signs: 'Thông tin chỉ mang tính tham khảo giáo dục. Nếu bạn đang có triệu chứng, hãy đến gặp bác sĩ để được khám và chẩn đoán chính xác.'
        },
        // Add markdown response as additional field
        message: markdownContent
      } as any;
        
      // Log final response
      logger.info('='.repeat(80));
      logger.info('[AGENT] FINAL RESPONSE (Disease Info Query - Markdown):');
      logger.info(markdownContent);
      logger.info('[AGENT] FINAL RESPONSE (Disease Info Query - Structured):');
      logger.info(JSON.stringify(parsed, null, 2));
      logger.info('='.repeat(80));
        
      return parsed;
    } catch (error) {
      logger.error({ error }, 'Error processing disease info query');
      return this.getSafeDefaultResponse(userText);
    }
  }

  /**
   * Custom agent workflow when image is provided
   * This ensures CV tools are actually called, not hallucinated by LLM
   */
  private async processTriageWithImage(
    userText: string,
    imageUrl: string,
    conversationContext?: string,
    location?: Location,
    profileContext?: string,
    language?: string
  ): Promise<TriageResult & { nearest_clinic?: NearestClinic }> {
    try {
      logger.info('Processing triage with image using Gemini Vision...');

      // Step 1: Gemini Vision phân tích ảnh trực tiếp
      logger.info('Step 1: Analyzing image with Gemini Vision...');
      const visionPrompt = `Bạn là bác sĩ AI chuyên phân tích hình ảnh y tế. Hãy phân tích hình ảnh này và trả lời BẰNG TIẾNG VIỆT với format JSON sau (KHÔNG thêm markdown, chỉ JSON thuần):
{
  "observations": "mô tả ngắn gọn những gì thấy trong ảnh (màu sắc, hình dạng, vị trí tổn thương nếu có)",
  "suspected_conditions": ["tên bệnh 1", "tên bệnh 2"],
  "confidence": "high|medium|low",
  "image_quality": "good|poor",
  "notes": "ghi chú thêm nếu cần"
}

Thông tin từ người dùng: ${userText || 'Không có mô tả thêm'}
Chỉ trả về JSON, không giải thích thêm.`;

      let visionAnalysis: { observations: string; suspected_conditions: string[]; confidence: string; image_quality: string; notes?: string } | null = null;
      const validCVResults: Array<{ name: string; prob: number }> = [];

      try {
        const visionText = await this.llm.generateWithImage(imageUrl, visionPrompt);
        const jsonMatch = visionText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          visionAnalysis = JSON.parse(jsonMatch[0]);
          logger.info(`[Gemini Vision] Observations: ${visionAnalysis?.observations}`);
          logger.info(`[Gemini Vision] Suspected: ${visionAnalysis?.suspected_conditions?.join(', ')}`);

          // Chuyển kết quả vision thành format CVResult tương thích
          const confidenceToProb = { high: 0.85, medium: 0.65, low: 0.45 };
          const baseProb = confidenceToProb[(visionAnalysis?.confidence as keyof typeof confidenceToProb)] ?? 0.5;
          visionAnalysis?.suspected_conditions?.slice(0, 3).forEach((name, i) => {
            validCVResults.push({ name, prob: Math.max(0.3, baseProb - i * 0.1) });
          });
        }
      } catch (visionErr) {
        logger.warn({ visionErr }, '[Gemini Vision] Could not parse vision response, proceeding with text-only');
      }

      logger.info(`[AGENT] Gemini Vision found ${validCVResults.length} conditions`);

      // Step 2: Apply triage rules
      logger.info('Step 2: Applying triage rules...');
      const triageInput = {
        symptoms: {
          main_complaint: userText || 'Triệu chứng dựa trên hình ảnh',
          context: conversationContext
        },
        cv_results: validCVResults.length > 0 ? {
          model_used: 'gemini_vision',
          raw_output: {
            top_predictions: validCVResults.map(c => ({ condition: c.name, probability: c.prob }))
          }
        } : undefined
      };

      const triageResult = this.triageService.evaluateSymptoms(triageInput);
      logger.info(`Triage level: ${triageResult.triage}`);

      // Step 3: Get guidelines from RAG
      logger.info('[AGENT] Step 3: Retrieving medical guidelines from RAG...');
      const suspectedConditions = validCVResults.slice(0, 1).map(c => c.name);
      const guidelineInput = {
        symptoms: userText,
        suspected_conditions: suspectedConditions,
        triage_level: triageResult.triage
      };

      const guidelines = await this.ragService.searchGuidelines(guidelineInput);
      logger.info(`[AGENT] Retrieved ${guidelines.length} guideline snippets from RAG`);

      // Step 4: Synthesize with full context including vision observations
      logger.info('Step 4: Synthesizing final response with LLM...');
      const enrichedText = visionAnalysis?.observations
        ? `${userText}\n[Phân tích hình ảnh: ${visionAnalysis.observations}]`
        : userText;

      const finalResult = await this.synthesizeFinalResponse(
        enrichedText,
        { top_conditions: validCVResults },
        triageResult,
        guidelines,
        conversationContext,
        profileContext,
        language
      );
      
      // Attach guidelines count to result for report generation
      (finalResult as any).guidelines_count = guidelines.length;

      // Step 5: Find best matching hospital if emergency/urgent and location provided
      // This tool is called LAST in the agent workflow
      // Extract condition from suspected_conditions or CV results
      const condition = finalResult.suspected_conditions?.length > 0 
        ? finalResult.suspected_conditions[0].name 
        : (validCVResults.length > 0 ? validCVResults[0].name : undefined);

      if ((triageResult.triage === 'emergency' || triageResult.triage === 'urgent') && location) {
        logger.info(`[AGENT] Step 5: Finding best matching hospital (emergency/urgent case)${condition ? ` for condition: ${condition}` : ''}...`);
        logger.info('[REPORT] Hospital tool (MCP) will be executed for emergency/urgent case');
        try {
          const bestHospital = await this.mapsService.findBestMatchingHospital(
            location,
            condition,
            'bệnh viện'
          );
          if (bestHospital) {
            logger.info(`[AGENT] Found best matching hospital: ${bestHospital.name} (${bestHospital.distance_km}km away${bestHospital.specialty_score ? `, specialty match: ${bestHospital.specialty_score.toFixed(2)}` : ''})`);
            logger.info(`[REPORT] ✓ Hospital tool (MCP) executed successfully: ${bestHospital.name}`);
            // Append hospital info to message markdown
            const hospitalInfo = `\n\n## 🏥 Bệnh viện gần nhất\n\n**${bestHospital.name}**\n- Khoảng cách: ${bestHospital.distance_km}km\n- Địa chỉ: ${bestHospital.address || 'Địa chỉ không có sẵn'}${bestHospital.rating ? `\n- Đánh giá: ${bestHospital.rating}/5` : ''}`;
            return {
              ...finalResult,
              nearest_clinic: bestHospital,
              message: (finalResult.message || '') + hospitalInfo
            };
          } else {
            logger.warn('[AGENT] No hospital found nearby');
            logger.info('[REPORT] Hospital tool (MCP) executed but no hospital found');
          }
        } catch (error) {
          logger.error({ error }, '[AGENT] Failed to find best matching hospital');
          logger.error('[REPORT] Hospital tool (MCP) execution failed');
          // Continue without hospital info
        }
      } else if (this.shouldSuggestHospital(userText)) {
        // Also suggest hospital if user explicitly requests it
        if (location) {
          logger.info(`[AGENT] Step 5: Finding best matching hospital (user requested)${condition ? ` for condition: ${condition}` : ''}...`);
          logger.info('[REPORT] Hospital tool (MCP) will be executed (user explicitly requested)');
          try {
            const bestHospital = await this.mapsService.findBestMatchingHospital(
              location,
              condition,
              'bệnh viện'
            );
            if (bestHospital) {
              logger.info(`[AGENT] Found best matching hospital: ${bestHospital.name} (${bestHospital.distance_km}km away${bestHospital.specialty_score ? `, specialty match: ${bestHospital.specialty_score.toFixed(2)}` : ''})`);
              logger.info(`[REPORT] ✓ Hospital tool (MCP) executed successfully: ${bestHospital.name}`);
              return {
                ...finalResult,
                nearest_clinic: bestHospital
              };
            }
          } catch (error) {
            logger.error({ error }, '[AGENT] Failed to find best matching hospital');
            logger.error('[REPORT] Hospital tool (MCP) execution failed');
          }
        } else {
          logger.info('[REPORT] Hospital tool (MCP) requested by user but no location provided - will request location in response');
          // Add a note to the response that location is needed
          (finalResult as any).needs_location_for_hospital = true;
        }
      } else {
        if (location) {
          logger.info(`[REPORT] Hospital tool (MCP) skipped: triage_level=${triageResult.triage} (only called for emergency/urgent or explicit request)`);
        } else {
          logger.info('[REPORT] Hospital tool (MCP) skipped: no location provided');
        }
      }

      return finalResult;
    } catch (error) {
      logger.error({ error }, 'Error in custom agent workflow');
      throw error;
    }
  }

  /**
   * Process text-only triage
   * Agent tự quyết định: nếu là câu hỏi giáo dục về bệnh thì dùng knowledge base/RAG
   * Nếu là triệu chứng cá nhân thì dùng triage rules + RAG
   */
  private async processTriageTextOnly(
    userText: string,
    conversationContext?: string,
    location?: Location,
    profileContext?: string,
    language?: string
  ): Promise<TriageResult & { nearest_clinic?: NearestClinic }> {
    try {
      logger.info('Processing text-only query...');

      // Phân tích user text để quyết định workflow
      // Nếu có từ khóa "là gì", "như thế nào", "về" → câu hỏi giáo dục
      const lowerText = userText.toLowerCase();
      const isEducationalQuery = 
        lowerText.includes('là gì') || 
        lowerText.includes('như thế nào') || 
        lowerText.includes('về') ||
        lowerText.includes('giải thích') ||
        lowerText.includes('cho tôi biết');

      if (isEducationalQuery) {
        // Câu hỏi giáo dục: thử knowledge base trước, sau đó RAG
        logger.info('[AGENT] Detected educational query, using knowledge base/RAG workflow');
        return await this.processDiseaseInfoQuery(userText, conversationContext, profileContext);
      }

      // Triệu chứng cá nhân: dùng triage workflow
      logger.info('[AGENT] Detected symptom query, using triage workflow');
      
      // Step 1: Apply triage rules
      const triageInput = {
        symptoms: {
          main_complaint: userText,
          context: conversationContext
        }
      };

      const triageResult = this.triageService.evaluateSymptoms(triageInput);
      
      // Step 2: Get guidelines from RAG
      const guidelineInput = {
        symptoms: userText,
        suspected_conditions: [],
        triage_level: triageResult.triage
      };

      const guidelines = await this.ragService.searchGuidelines(guidelineInput);

      // Step 3: Synthesize response
      const finalResult = await this.synthesizeFinalResponse(
        userText,
        { top_conditions: [] },
        triageResult,
        guidelines,
        conversationContext,
        profileContext,
        language
      );
      
      // Attach guidelines count to result for report generation
      (finalResult as any).guidelines_count = guidelines.length;

      // Step 4: Find best matching hospital if emergency/urgent and location provided
      // This tool is called LAST in the agent workflow
      // Extract condition from suspected_conditions
      const condition = finalResult.suspected_conditions?.length > 0 
        ? finalResult.suspected_conditions[0].name 
        : undefined;

      if ((triageResult.triage === 'emergency' || triageResult.triage === 'urgent') && location) {
        logger.info(`[AGENT] Step 4: Finding best matching hospital (emergency/urgent case)${condition ? ` for condition: ${condition}` : ''}...`);
        try {
          const bestHospital = await this.mapsService.findBestMatchingHospital(
            location,
            condition,
            'bệnh viện'
          );
          if (bestHospital) {
            logger.info(`[AGENT] Found best matching hospital: ${bestHospital.name} (${bestHospital.distance_km}km away${bestHospital.specialty_score ? `, specialty match: ${bestHospital.specialty_score.toFixed(2)}` : ''})`);
            logger.info(`[REPORT] ✓ Hospital tool (MCP) executed successfully: ${bestHospital.name}`);
            // Append hospital info to message markdown
            const hospitalInfo = `\n\n## 🏥 Bệnh viện gần nhất\n\n**${bestHospital.name}**\n- Khoảng cách: ${bestHospital.distance_km}km\n- Địa chỉ: ${bestHospital.address || 'Địa chỉ không có sẵn'}${bestHospital.rating ? `\n- Đánh giá: ${bestHospital.rating}/5` : ''}`;
            return {
              ...finalResult,
              nearest_clinic: bestHospital,
              message: (finalResult.message || '') + hospitalInfo
            };
          } else {
            logger.warn('[AGENT] No hospital found nearby');
            logger.info('[REPORT] Hospital tool (MCP) executed but no hospital found');
          }
        } catch (error) {
          logger.error({ error }, '[AGENT] Failed to find best matching hospital');
          // Continue without hospital info
        }
      } else if (this.shouldSuggestHospital(userText)) {
        // Also suggest hospital if user explicitly requests it
        if (location) {
          logger.info(`[AGENT] Step 4: Finding best matching hospital (user requested)${condition ? ` for condition: ${condition}` : ''}...`);
          logger.info('[REPORT] Hospital tool (MCP) will be executed (user explicitly requested)');
          try {
            const bestHospital = await this.mapsService.findBestMatchingHospital(
              location,
              condition,
              'bệnh viện'
            );
            if (bestHospital) {
              logger.info(`[AGENT] Found best matching hospital: ${bestHospital.name} (${bestHospital.distance_km}km away${bestHospital.specialty_score ? `, specialty match: ${bestHospital.specialty_score.toFixed(2)}` : ''})`);
              logger.info(`[REPORT] ✓ Hospital tool (MCP) executed successfully: ${bestHospital.name}`);
              // Append hospital info to message markdown
              const hospitalInfo = `\n\n## 🏥 Bệnh viện gần nhất\n\n**${bestHospital.name}**\n- Khoảng cách: ${bestHospital.distance_km}km\n- Địa chỉ: ${bestHospital.address || 'Địa chỉ không có sẵn'}${bestHospital.rating ? `\n- Đánh giá: ${bestHospital.rating}/5` : ''}`;
              return {
                ...finalResult,
                nearest_clinic: bestHospital,
                message: (finalResult.message || '') + hospitalInfo
              };
            }
          } catch (error) {
            logger.error({ error }, '[AGENT] Failed to find best matching hospital');
            logger.error('[REPORT] Hospital tool (MCP) execution failed');
          }
        } else {
          logger.info('[REPORT] Hospital tool (MCP) requested by user but no location provided - will request location in response');
          // Add a note to the response that location is needed
          (finalResult as any).needs_location_for_hospital = true;
        }
      }

      return finalResult;
    } catch (error) {
      logger.error({ error }, 'Error in text-only triage');
      throw error;
    }
  }

  /**
   * Determine which CV model to use based on user text
   */
  private determineCVType(userText: string): 'derm' | 'eye' | 'wound' {
    const lowerText = userText.toLowerCase();
    
    // Check for eye-related keywords
    if (lowerText.includes('mắt') || lowerText.includes('eye') || 
        lowerText.includes('nhìn') || lowerText.includes('đỏ mắt')) {
      return 'eye';
    }
    
    // Check for wound-related keywords
    if (lowerText.includes('vết thương') || lowerText.includes('wound') || 
        lowerText.includes('bỏng') || lowerText.includes('burn') ||
        lowerText.includes('chảy máu') || lowerText.includes('cắt')) {
      return 'wound';
    }
    
    // Default to dermatology
    return 'derm';
  }

  /**
   * Call appropriate CV model
   */
  private async callCVModel(imageUrl: string, type: 'derm' | 'eye' | 'wound') {
    switch (type) {
      case 'derm':
        return await this.cvService.callDermCV(imageUrl);
      case 'eye':
        return await this.cvService.callEyeCV(imageUrl);
      case 'wound':
        return await this.cvService.callWoundCV(imageUrl);
    }
  }

  /**
   * Use LLM to synthesize final structured response
   */
  private async synthesizeFinalResponse(
    userText: string,
    cvResult: any,
    triageResult: any,
    guidelines: any[],
    conversationContext?: string,
    profileContext?: string,
    language?: string
  ): Promise<TriageResult> {
    // Determine CV model used
    const cvModelUsed = cvResult.top_conditions.length > 0 
      ? (cvResult.top_conditions[0] as any).model_used || 'derm_cv'
      : 'none';

    // Format guidelines for better readability
    const formattedGuidelines = guidelines.map((g, i) => {
      const content = typeof g === 'string' ? g : (g.content || g.snippet || JSON.stringify(g));
      return `\n--- Guideline ${i + 1} ---\n${content}`;
    }).join('\n\n');

    const langInstr = LANG_INSTRUCTION[language ?? 'vi'] ?? '';
    const prompt = `${langInstr ? langInstr + '\n\n' : ''}Bạn là trợ lý y tế AI của Việt Nam. Dựa trên thông tin sau, hãy tạo một phản hồi TỰ NHIÊN, DỄ HIỂU bằng markdown HOÀN TOÀN BẰNG TIẾNG VIỆT.

Mô tả triệu chứng: ${userText}

${conversationContext ? `Ngữ cảnh cuộc trò chuyện trước: ${conversationContext}` : ''}
${profileContext ? `\n${profileContext}\nLưu ý: cá nhân hóa phân tích dựa trên hồ sơ sức khỏe (bệnh mãn tính, dị ứng thuốc ảnh hưởng đến khuyến nghị).\n` : ''}

${cvResult.top_conditions.length > 0 ? `
Kết quả phân tích hình ảnh (chỉ các kết quả có độ tin cậy cao):
${cvResult.top_conditions.map((c: any, i: number) => `${i + 1}. ${c.name}: ${(c.prob * 100).toFixed(1)}%`).join('\n')}
` : `
Lưu ý: Phân tích hình ảnh không cho kết quả đủ tin cậy, sẽ dựa chủ yếu vào mô tả triệu chứng của người dùng.
`}

Mức độ khẩn cấp: ${triageResult.triage}
Dấu hiệu cảnh báo: ${triageResult.red_flags?.join(', ') || 'Không có'}
Lý do đánh giá: ${triageResult.reasoning}

═══════════════════════════════════════════════════════════════════════════════
HƯỚNG DẪN Y TẾ TỪ BỘ Y TẾ (BẮT BUỘC PHẢI SỬ DỤNG):
═══════════════════════════════════════════════════════════════════════════════
${formattedGuidelines}
═══════════════════════════════════════════════════════════════════════════════

⚠️ QUAN TRỌNG: BẮT BUỘC sử dụng thông tin từ "Hướng dẫn y tế từ Bộ Y Tế" ở trên:
- PHẢI dựa trên thông tin CỤ THỂ từ guidelines để giải thích, biện luận, so sánh
- KHÔNG được tự ý tạo thông tin ngoài guidelines được cung cấp
- Có thể giải thích nguyên tắc điều trị từ guidelines (KHÔNG kê đơn cụ thể, không khuyến nghị liều thuốc)
- Nếu guidelines đề cập thuốc cụ thể, có thể giải thích: "Có thể sử dụng các thuốc bôi tại chỗ như retinoid, benzoyl peroxid (theo chỉ định của bác sĩ)"
- Nếu guidelines đề cập phương pháp, có thể giải thích phương pháp đó một cách tự nhiên

YÊU CẦU VỀ PHONG CÁCH VIẾT:
1. VIẾT HOÀN TOÀN BẰNG TIẾNG VIỆT - không được dùng tiếng Anh trong response
2. Viết NGẮN GỌN, CÔ ĐỌNG - tối đa 300-400 từ, tập trung vào thông tin quan trọng nhất
3. Viết TỰ NHIÊN, DỄ HIỂU như đang trò chuyện với bệnh nhân
4. CÓ THỂ biện luận, giải thích "tại sao" nhưng NGẮN GỌN, không lan man
5. Sử dụng markdown để format (tiêu đề, danh sách) cho dễ đọc
6. PHẢI sử dụng thông tin từ "Hướng dẫn y tế từ Bộ Y Tế" ở trên - KHÔNG được tự ý tạo thông tin
7. Luôn nhấn mạnh: "Thông tin chỉ mang tính tham khảo, cần bác sĩ khám để chẩn đoán chính xác"
${cvResult.top_conditions.length === 0 ? '8. Phân tích hình ảnh không đủ tin cậy, chỉ dựa vào mô tả triệu chứng và guidelines.' : ''}

QUAN TRỌNG VỀ ĐỘ DÀI:
- Tối đa 300-400 từ (khoảng 1-2 đoạn văn ngắn)
- Tập trung vào: tình trạng có thể là gì, hướng dẫn chăm sóc ngắn gọn, khi nào cần đi khám
- KHÔNG lặp lại thông tin, KHÔNG giải thích quá chi tiết
- Ưu tiên thông tin thực tế, hành động cụ thể

Hãy tạo một phản hồi markdown NGẮN GỌN, cô đọng, bao gồm:
- Tóm tắt ngắn về tình trạng có thể là gì (1-2 câu)
- Hướng dẫn chăm sóc tại nhà ngắn gọn từ guidelines (3-4 điểm chính)
- Khi nào cần đi khám ngay (1-2 câu)
- Disclaimer ngắn gọn

Ví dụ format markdown NGẮN GỌN:
## 📋 Tình trạng

Dựa trên triệu chứng và hình ảnh, có khả năng bạn đang gặp [tên bệnh]. [1-2 câu giải thích ngắn gọn].

## 💡 Chăm sóc tại nhà

- [Điểm 1 từ guidelines - ngắn gọn]
- [Điểm 2 từ guidelines - ngắn gọn]
- [Điểm 3 từ guidelines - ngắn gọn]

## ⚠️ Khi nào cần đi khám

[1-2 câu về dấu hiệu cảnh báo]

**Lưu ý:** Thông tin chỉ mang tính tham khảo, cần bác sĩ khám để chẩn đoán chính xác.`;

    // Log prompt and input data before sending to LLM
    logger.info('='.repeat(80));
    logger.info('[AGENT] PROMPT SENT TO LLM:');
    logger.info(prompt);
    logger.info('='.repeat(80));
    logger.info('[AGENT] INPUT DATA SUMMARY:');
    logger.info(`- User text: "${userText}"`);
    logger.info(`- CV results count: ${cvResult.top_conditions.length}`);
    if (cvResult.top_conditions.length > 0) {
      cvResult.top_conditions.forEach((c: any, i: number) => {
        logger.info(`  ${i + 1}. ${c.name}: ${(c.prob * 100).toFixed(1)}%`);
      });
    }
    logger.info(`- Triage level: ${triageResult.triage}`);
    logger.info(`- Triage reasoning: ${triageResult.reasoning || 'N/A'}`);
    logger.info(`- Red flags: ${triageResult.red_flags?.join(', ') || 'None'}`);
    logger.info(`- Guidelines count: ${guidelines.length}`);
    if (guidelines.length > 0) {
      guidelines.forEach((g, i) => {
        const content = typeof g === 'string' ? g : (g.content || g.snippet || JSON.stringify(g));
        logger.info(`  ${i + 1}. Preview: ${content.substring(0, 200)}...`);
      });
    }
    logger.info(`- Conversation context: ${conversationContext ? 'Yes' : 'No'}`);
    logger.info('='.repeat(80));

    const generations = await this.llm._generate([prompt]);
    const response = generations.generations[0][0].text;

    // Extract markdown content (full response is markdown)
    const markdownContent = response.trim();

    // Build TriageResult from markdown response
    const triageLevel = triageResult.triage as TriageLevel;
    const suspectedCondition = cvResult.top_conditions.length > 0 ? cvResult.top_conditions[0].name : undefined;
    
    // Extract key information from markdown for backward compatibility
    const actionMatch = markdownContent.match(/##\s*[📋💡⚠️🔍]*\s*(?:Hành động|Khi nào|Kết luận|Khuyến nghị)[\s\S]*?\n([\s\S]*?)(?=\n##|$)/i);
    const homeCareMatch = markdownContent.match(/##\s*[💡]*\s*Hướng dẫn chăm sóc[\s\S]*?\n([\s\S]*?)(?=\n##|$)/i);
    const warningMatch = markdownContent.match(/##\s*[⚠️]*\s*Khi nào cần đi khám[\s\S]*?\n([\s\S]*?)(?=\n##|$)/i);
    
    const action = actionMatch ? actionMatch[1].trim().split('\n')[0] : 'Bạn nên đến gặp bác sĩ để được thăm khám và chẩn đoán chính xác.';
    const homeCareAdvice = homeCareMatch ? homeCareMatch[1].trim().substring(0, 500) : 'Giữ vệ sinh sạch sẽ và theo dõi triệu chứng.';
    const warningSigns = warningMatch ? warningMatch[1].trim().substring(0, 300) : 'Nếu triệu chứng nặng hơn, hãy đến khám ngay. Thông tin chỉ mang tính tham khảo, cần bác sĩ khám để chẩn đoán chính xác.';

    const parsed: TriageResult = {
      triage_level: triageLevel,
      symptom_summary: userText,
      red_flags: translateRedFlags(triageResult.red_flags || [], language),
      suspected_conditions: suspectedCondition ? [{
        name: suspectedCondition,
        source: 'cv_model' as ConditionSource,
        confidence: cvResult.top_conditions.length > 0 && cvResult.top_conditions[0].prob > 0.5 ? 'medium' : 'low' as ConditionConfidence
      }] : [],
      cv_findings: {
        model_used: cvModelUsed as any,
        raw_output: cvResult.top_conditions.length > 0 ? {
          top_predictions: cvResult.top_conditions.slice(0, 1).map((c: any) => ({ condition: c.name, probability: c.prob }))
        } : {}
      },
      recommendation: {
        action: action,
        timeframe: getTimeframe(triageLevel, language),
        home_care_advice: homeCareAdvice,
        warning_signs: warningSigns
      },
      // Add markdown response as additional field (extend TriageResult)
      message: markdownContent
    } as any;
    
    // Log final response
    logger.info('='.repeat(80));
    logger.info('[AGENT] FINAL RESPONSE (Markdown):');
    logger.info(markdownContent);
    logger.info('[AGENT] FINAL RESPONSE (Structured):');
    logger.info(JSON.stringify(parsed, null, 2));
    logger.info('='.repeat(80));
    
    return parsed;
  }

  /**
   * Handle casual conversation/greeting - lightweight response
   */
  private async handleCasualConversation(
    userText: string,
    conversationContext?: string,
    language?: string
  ): Promise<TriageResult> {
    try {
      logger.info('[LIGHTWEIGHT] Handling casual conversation...');
      const langInstr = LANG_INSTRUCTION[language ?? 'vi'] ?? '';
      const prompt = `${langInstr ? langInstr + '\n\n' : ''}Bạn là trợ lý y tế thân thiện của Việt Nam. Người dùng nói: "${userText}"

${conversationContext ? `Ngữ cảnh cuộc trò chuyện trước: ${conversationContext}` : ''}

Hãy trả lời tự nhiên, ngắn gọn, thân thiện bằng tiếng Việt:
- Nếu là câu chào, hãy chào lại và hỏi xem bạn có thể giúp gì về sức khỏe
- Nếu là câu cảm ơn, hãy trả lời lịch sự
- Nếu là câu hỏi đơn giản, hãy trả lời ngắn gọn
- Luôn sẵn sàng hỗ trợ về vấn đề sức khỏe

Viết bằng markdown, tự nhiên, không cần format cứng nhắc.`;

      const generations = await this.llm._generate([prompt]);
      const markdown = generations.generations[0][0].text.trim();

      return this.buildLightweightResponse(markdown, 'routine', userText);
    } catch (error) {
      logger.error({ error }, 'Error handling casual conversation');
      return this.buildLightweightResponse(
        'Xin chào! Tôi có thể giúp gì cho bạn về vấn đề sức khỏe?',
        'routine',
        userText
      );
    }
  }

  /**
   * Handle out of scope queries - lightweight response
   */
  private async handleOutOfScope(
    userText: string,
    intent: Intent,
    language?: string
  ): Promise<TriageResult> {
    try {
      logger.info('[LIGHTWEIGHT] Handling out of scope query...');
      const langInstr = LANG_INSTRUCTION[language ?? 'vi'] ?? '';
      const prompt = `${langInstr ? langInstr + '\n\n' : ''}Bạn là trợ lý y tế của Việt Nam. Người dùng hỏi: "${userText}"

Câu hỏi này nằm ngoài phạm vi của hệ thống (${JSON.stringify(intent.entities)}).

Hãy từ chối lịch sự và hướng dẫn họ đến kênh phù hợp:
- Nếu hỏi về bảo hiểm/chi phí: hướng dẫn liên hệ cơ quan bảo hiểm hoặc bệnh viện
- Nếu hỏi về thuốc nam/đông y: giải thích hệ thống chỉ hỗ trợ hướng dẫn của Bộ Y Tế
- Luôn lịch sự, thân thiện

Viết bằng tiếng Việt, markdown format, ngắn gọn.`;

      const generations = await this.llm._generate([prompt]);
      const markdown = generations.generations[0][0].text.trim();

      return this.buildLightweightResponse(markdown, 'routine', userText);
    } catch (error) {
      logger.error({ error }, 'Error handling out of scope');
      return this.buildLightweightResponse(
        'Xin lỗi, câu hỏi này nằm ngoài phạm vi của hệ thống. Vui lòng liên hệ trực tiếp với cơ sở y tế để được hỗ trợ.',
        'routine',
        userText
      );
    }
  }

  /**
   * Build lightweight response structure
   */
  private buildLightweightResponse(
    markdown: string,
    triageLevel: TriageLevel,
    userText?: string
  ): TriageResult {
    // Extract first meaningful line for action field
    const actionLine = markdown.split('\n').find(line => 
      line.trim().length > 10 && !line.trim().startsWith('#')
    ) || markdown.split('\n')[0] || 'Cảm ơn bạn đã liên hệ.';

    return {
      triage_level: triageLevel,
      symptom_summary: userText || '',
      red_flags: [],
      suspected_conditions: [],
      cv_findings: {
        model_used: 'none',
        raw_output: {}
      },
      recommendation: {
        action: actionLine.trim(),
        timeframe: 'Không áp dụng',
        home_care_advice: '',
        warning_signs: ''
      },
      message: markdown
    } as any;
  }

  private getSafeDefaultResponse(userText: string): TriageResult {
    return {
      triage_level: 'urgent',
      symptom_summary: `Triệu chứng: ${userText}`,
      red_flags: ['Không thể phân tích tự động, cần đánh giá trực tiếp'],
      suspected_conditions: [],
      cv_findings: {
        model_used: 'none',
        raw_output: {}
      },
      recommendation: {
        action: 'Vui lòng đến cơ sở y tế để được bác sĩ khám và đánh giá trực tiếp',
        timeframe: 'Trong vòng 24 giờ',
        home_care_advice: 'Theo dõi triệu chứng và đến ngay nếu tình trạng xấu đi',
        warning_signs: 'Nếu triệu chứng nặng hơn, đến cấp cứu ngay lập tức'
      }
    };
  }

  /**
   * Check if user text suggests they need hospital recommendation
   */
  private shouldSuggestHospital(userText: string): boolean {
    const lowerText = userText.toLowerCase();
    const hospitalKeywords = [
      'bệnh viện',
      'bệnh viện gần',
      'bệnh viện nào',
      'đi bệnh viện',
      'đến bệnh viện',
      'khám ở đâu',
      'nên đi khám ở đâu',
      'nên khám ở đâu',
      'đi khám ở đâu',
      'đi khám',
      'cần đi khám',
      'gợi ý bệnh viện',
      'tìm bệnh viện',
      'tìm nơi khám',
      'nơi khám',
      'địa chỉ khám',
      'chỗ khám'
    ];
    
    return hospitalKeywords.some(keyword => lowerText.includes(keyword));
  }
}

