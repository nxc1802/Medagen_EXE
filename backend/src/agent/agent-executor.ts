import { LLMFactory, type LLMProvider } from '../providers/llm.factory.js';
import { env } from '../config/env.js';
import { CVService } from '../services/cv.service.js';
import { TriageRulesService } from '../services/triage-rules.service.js';
import { RAGService } from '../services/rag.service.js';
import { KnowledgeBaseService } from '../services/knowledge-base.service.js';
import { SupabaseService } from '../services/supabase.service.js';
import { MapsService } from '../services/maps.service.js';
import { IntentClassifierService, type Intent } from '../services/intent-classifier.service.js';
import { logger } from '../utils/logger.js';
import type { TriageResult, TriageLevel, ConditionSource, ConditionConfidence, Location, NearestClinic } from '../types/index.js';
import {
  DISEASE_INFO_PROMPT,
  FINAL_TRIAGE_RESPONSE_PROMPT,
  CASUAL_CONVERSATION_PROMPT,
  OUT_OF_SCOPE_PROMPT
} from '../config/prompts.js';

export class MedagenAgent {
  private llm: any;
  private cvService: CVService;
  private triageService: TriageRulesService;
  private ragService: RAGService;
  private knowledgeBase: KnowledgeBaseService;
  private mapsService: MapsService;
  private intentClassifier: IntentClassifierService;
  private initialized: boolean = false;

  constructor(supabaseService: SupabaseService, mapsService?: MapsService) {
    this.llm = LLMFactory.createModel(env.LLM_PROVIDER as LLMProvider);
    this.cvService = new CVService();
    this.triageService = new TriageRulesService();
    this.ragService = new RAGService(supabaseService);
    this.knowledgeBase = new KnowledgeBaseService(supabaseService);
    this.mapsService = mapsService || new MapsService();
    this.intentClassifier = new IntentClassifierService(this.llm);
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
    onToken?: (token: string) => void
  ): Promise<TriageResult & { nearest_clinic?: NearestClinic }> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      logger.info('Starting query processing...');
      logger.info(`User text: "${userText}"`);
      logger.info(`Has image: ${!!imageUrl}`);

      // Step 1: Classify intent FIRST (routing decision) using LLM-based classification
      const intent = await this.intentClassifier.classifyIntent(userText, !!imageUrl, conversationContext);
      logger.info(`[ROUTING] Intent classified: ${intent.type} (confidence: ${intent.confidence})`);

      // Step 2: Route based on intent
      switch (intent.type) {
        case 'casual_greeting':
          logger.info('[ROUTING] → Lightweight: Casual greeting');
          return await this.handleCasualConversation(userText, conversationContext, onToken);

        case 'out_of_scope':
          logger.info('[ROUTING] → Lightweight: Out of scope');
          return await this.handleOutOfScope(userText, intent, onToken);

        case 'disease_info':
          logger.info('[ROUTING] → Medium: Disease info (RAG only)');
          return await this.processDiseaseInfoQuery(userText, conversationContext, onToken);

        case 'triage':
          if (imageUrl) {
            logger.info('[ROUTING] → Full: Triage with image (CV + Triage + RAG)');
            return await this.processTriageWithImage(userText, imageUrl, conversationContext, location, onToken);
          } else {
            logger.info('[ROUTING] → Full: Triage text-only (Triage + RAG)');
            return await this.processTriageTextOnly(userText, conversationContext, location, onToken);
          }

        default:
          // Fallback: if unclear, use lightweight response
          logger.info('[ROUTING] → Lightweight: Default fallback');
          return await this.handleCasualConversation(userText, conversationContext, onToken);
      }
    } catch (error) {
      logger.error({ error }, 'Error processing query');
      
      // Return safe default
      return this.getSafeDefaultResponse(userText);
    }
  }

  /**
   * Process educational query about disease
   * Agent tự quyết định khi nào cần gọi knowledge base vs RAG
   */
  private async processDiseaseInfoQuery(
    userText: string,
    conversationContext?: string,
    onToken?: (token: string) => void
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
      const prompt = DISEASE_INFO_PROMPT
        .replace('{guidelines}', formattedGuidelines || 'Không tìm thấy hướng dẫn y tế cụ thể trong hệ thống.')
        .replace('{context}', conversationContext || 'Không có')
        .replace('{query}', userText);

      // Log prompt and input data before sending to LLM
      logger.debug('='.repeat(80));
      logger.debug('[AGENT] PROMPT SENT TO LLM (Disease Info Query):');
      logger.debug(prompt);
      logger.debug('='.repeat(80));
      logger.info('[AGENT] INPUT DATA SUMMARY (Disease Info Query):');
      logger.info(`- User text: "${userText}"`);
      logger.info(`- Guidelines count: ${guidelines.length}`);
      logger.info(`- Conversation context: ${conversationContext ? 'Yes' : 'No'}`);
      logger.info('='.repeat(80));

      let responseText = '';
      if (onToken) {
        const stream = await this.llm.stream(prompt);
        for await (const chunk of stream) {
          const content = typeof chunk.content === 'string' ? chunk.content : '';
          responseText += content;
          onToken(content);
        }
      } else {
        const responseMessage = await this.llm.invoke(prompt);
        responseText = typeof responseMessage.content === 'string'
          ? responseMessage.content
          : JSON.stringify(responseMessage.content);
      }

      // Extract markdown content (full response is markdown)
      const markdownContent = responseText.trim();

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
    onToken?: (token: string) => void
  ): Promise<TriageResult & { nearest_clinic?: NearestClinic }> {
    try {
      logger.info('Processing triage with image using parallel custom workflow (Gold Standard 2)...');

      // Determine CV Type instantly
      const cvType = this.determineCVType(userText);

      // Instantly evaluate symptoms with rules engine thô to estimate quick triage level
      const fastTriageResult = this.triageService.evaluateSymptoms({
        symptoms: {
          main_complaint: userText || 'Triệu chứng hình ảnh',
          context: conversationContext
        } as any
      });
      logger.info(`[PARALLEL] Estimated quick triage level: ${fastTriageResult.triage}`);

      // Fire parallel promises concurrently
      logger.info('[PARALLEL] Step 1: Launching CV model, RAG search and Hospital query in parallel...');
      const cvPromise = this.callCVModel(imageUrl, cvType);
      
      const ragPromise = this.ragService.searchGuidelines({
        symptoms: userText,
        suspected_conditions: [],
        triage_level: fastTriageResult.triage
      });

      // Only lookup hospital if triage is emergency/urgent and location is provided
      const isEmergencyOrUrgent = fastTriageResult.triage === 'emergency' || fastTriageResult.triage === 'urgent';
      const hospitalPromise = (location && (isEmergencyOrUrgent || this.shouldSuggestHospital(userText)))
        ? this.mapsService.findBestMatchingHospital(location, undefined, 'bệnh viện')
        : Promise.resolve(null);

      // Await all parallel back-end promises
      const [cvResult, guidelines, bestHospital] = await Promise.all([
        cvPromise,
        ragPromise,
        hospitalPromise
      ]);

      logger.info(`[PARALLEL] Concurrent background tasks complete.`);
      logger.info(`- CV top condition: ${cvResult.top_conditions[0]?.name || 'none'} (${(cvResult.top_conditions[0]?.prob * 100 || 0).toFixed(1)}%)`);
      logger.info(`- RAG guidelines returned: ${guidelines.length}`);
      logger.info(`- Hospital match found: ${bestHospital ? bestHospital.name : 'none'}`);

      // Filter CV results by confidence threshold (only use if confidence >= 0.5)
      const CV_CONFIDENCE_THRESHOLD = 0.5;
      const validCVResults = cvResult.top_conditions.filter((c: any) => c.prob >= CV_CONFIDENCE_THRESHOLD);

      // Calculate final clinical triage level combining the top CV results
      const triageInput = {
        symptoms: {
          main_complaint: userText || 'Triệu chứng dựa trên hình ảnh',
          context: conversationContext
        },
        cv_results: validCVResults.length > 0 ? {
          model_used: cvType === 'derm' ? 'derm_cv' : cvType === 'eye' ? 'eye_cv' : cvType === 'wound' ? 'wound_cv' : cvType === 'teeth' ? 'teeth_cv' : 'nail_cv',
          raw_output: {
            top_predictions: validCVResults.map(c => ({
              condition: c.name,
              probability: c.prob
            }))
          }
        } : undefined
      };

      const finalTriageResult = this.triageService.evaluateSymptoms(triageInput);
      logger.info(`[PARALLEL] Final clinical triage level: ${finalTriageResult.triage}`);

      // Synthesize final response using LLM and token streaming if callback is provided
      const filteredCVResult = {
        top_conditions: validCVResults
      };

      const finalResult = await this.synthesizeFinalResponse(
        userText,
        filteredCVResult,
        finalTriageResult,
        guidelines,
        conversationContext,
        onToken
      );

      (finalResult as any).guidelines_count = guidelines.length;

      // Merge and append nearest hospital details if found
      if (bestHospital) {
        logger.info(`[AGENT] Merging best matching hospital: ${bestHospital.name}`);
        const hospitalInfo = `\n\n## 🏥 Bệnh viện gần nhất\n\n**${bestHospital.name}**\n- Khoảng cách: ${bestHospital.distance_km.toFixed(1)}km\n- Địa chỉ: ${bestHospital.address || 'Địa chỉ không có sẵn'}${bestHospital.rating ? `\n- Đánh giá: ${bestHospital.rating}/5` : ''}`;
        return {
          ...finalResult,
          nearest_clinic: bestHospital,
          message: (finalResult.message || '') + hospitalInfo
        };
      }

      if (this.shouldSuggestHospital(userText) && !location) {
        (finalResult as any).needs_location_for_hospital = true;
      }

      return finalResult;
    } catch (error) {
      logger.error({ error }, 'Error in custom parallel agent workflow');
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
    onToken?: (token: string) => void
  ): Promise<TriageResult & { nearest_clinic?: NearestClinic }> {
    try {
      logger.info('Processing text-only query in parallel (Gold Standard 2)...');

      // Phân tích user text để quyết định workflow
      const lowerText = userText.toLowerCase();
      const isEducationalQuery = 
        lowerText.includes('là gì') || 
        lowerText.includes('như thế nào') || 
        lowerText.includes('về') ||
        lowerText.includes('giải thích') ||
        lowerText.includes('cho tôi biết');

      if (isEducationalQuery) {
        logger.info('[AGENT] Detected educational query, using knowledge base/RAG workflow');
        return await this.processDiseaseInfoQuery(userText, conversationContext, onToken);
      }

      // Triệu chứng cá nhân: dùng triage workflow
      logger.info('[AGENT] Detected symptom query, using triage workflow');
      
      // Step 1: Instantly apply triage rules thô
      const triageInput = {
        symptoms: {
          main_complaint: userText,
          context: conversationContext
        }
      };
      const triageResult = this.triageService.evaluateSymptoms(triageInput);
      logger.info(`[PARALLEL] Estimated clinical triage level: ${triageResult.triage}`);

      // Step 2: Fire parallel background promises concurrently
      logger.info('[PARALLEL] Step 2: Launching RAG search and Hospital query in parallel...');
      const ragPromise = this.ragService.searchGuidelines({
        symptoms: userText,
        suspected_conditions: [],
        triage_level: triageResult.triage
      });

      const isEmergencyOrUrgent = triageResult.triage === 'emergency' || triageResult.triage === 'urgent';
      const hospitalPromise = (location && (isEmergencyOrUrgent || this.shouldSuggestHospital(userText)))
        ? this.mapsService.findBestMatchingHospital(location, undefined, 'bệnh viện')
        : Promise.resolve(null);

      const [guidelines, bestHospital] = await Promise.all([
        ragPromise,
        hospitalPromise
      ]);

      logger.info(`[PARALLEL] Concurrent background tasks complete.`);
      logger.info(`- RAG guidelines returned: ${guidelines.length}`);
      logger.info(`- Hospital match found: ${bestHospital ? bestHospital.name : 'none'}`);

      // Step 3: Synthesize final response using LLM and token streaming if callback is provided
      const finalResult = await this.synthesizeFinalResponse(
        userText,
        { top_conditions: [] },
        triageResult,
        guidelines,
        conversationContext,
        onToken
      );
      
      (finalResult as any).guidelines_count = guidelines.length;

      // Merge and append nearest hospital details if found
      if (bestHospital) {
        logger.info(`[AGENT] Merging best matching hospital: ${bestHospital.name}`);
        const hospitalInfo = `\n\n## 🏥 Bệnh viện gần nhất\n\n**${bestHospital.name}**\n- Khoảng cách: ${bestHospital.distance_km.toFixed(1)}km\n- Địa chỉ: ${bestHospital.address || 'Địa chỉ không có sẵn'}${bestHospital.rating ? `\n- Đánh giá: ${bestHospital.rating}/5` : ''}`;
        return {
          ...finalResult,
          nearest_clinic: bestHospital,
          message: (finalResult.message || '') + hospitalInfo
        };
      }

      if (this.shouldSuggestHospital(userText) && !location) {
        (finalResult as any).needs_location_for_hospital = true;
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
  private determineCVType(userText: string): 'derm' | 'eye' | 'wound' | 'teeth' | 'nail' {
    const lowerText = userText.toLowerCase();
    
    // Check for teeth-related keywords
    if (/(răng|miệng|nướu|lợi|teeth|tooth|dental|mouth|nhiệt miệng)/i.test(lowerText)) {
      return 'teeth';
    }

    // Check for nail-related keywords
    if (/(móng|nail|fungus|phong móng|sưng móng)/i.test(lowerText)) {
      return 'nail';
    }

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
  private async callCVModel(imageUrl: string, type: 'derm' | 'eye' | 'wound' | 'teeth' | 'nail') {
    switch (type) {
      case 'derm':
        return await this.cvService.callDermCV(imageUrl);
      case 'teeth':
        return await this.cvService.callTeethCV(imageUrl);
      case 'nail':
        return await this.cvService.callNailCV(imageUrl);
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
    onToken?: (token: string) => void
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

    // Build CV findings summary
    const cvSummary = cvResult.top_conditions.length > 0 
      ? cvResult.top_conditions.map((c: any) => `- **${c.name}**: ${(c.prob * 100).toFixed(1)}% (Model: ${cvModelUsed})`).join('\n')
      : 'Không có phân tích hình ảnh hoặc độ tin cậy quá thấp.';

    let triageLevelDisplay = 'Màu Xanh (Tự chăm sóc / Khám thường)';
    if (triageResult.triage === 'emergency') {
      triageLevelDisplay = 'Màu Đỏ (Nguy cấp - Cần cấp cứu ngay)';
    } else if (triageResult.triage === 'urgent') {
      triageLevelDisplay = 'Màu Vàng (Cần khám sớm)';
    }

    const prompt = FINAL_TRIAGE_RESPONSE_PROMPT
      .replace('{userText}', userText)
      .replace('{cvSummary}', cvSummary)
      .replace('{triageLevel}', triageResult.triage)
      .replace('{triageLevelDisplay}', triageLevelDisplay)
      .replace('{guidelinesSummary}', formattedGuidelines || 'Không tìm thấy hướng dẫn cụ thể.')
      .replace('{contextSummary}', conversationContext || 'Không có');

    // Log prompt at debug level to avoid cluttering info logs
    logger.debug('='.repeat(80));
    logger.debug('[AGENT] PROMPT SENT TO LLM:');
    logger.debug(prompt);
    logger.debug('='.repeat(80));
    logger.info('[AGENT] INPUT DATA SUMMARY:');
    logger.info(`- User text: "${userText}"`);
    logger.info(`- CV results count: ${cvResult.top_conditions.length}`);
    logger.info(`- Triage level: ${triageResult.triage}`);
    logger.info(`- Triage reasoning: ${triageResult.reasoning || 'N/A'}`);
    logger.info(`- Red flags: ${triageResult.red_flags?.join(', ') || 'None'}`);
    logger.info(`- Guidelines count: ${guidelines.length}`);
    logger.info(`- Conversation context: ${conversationContext ? 'Yes' : 'No'}`);
    logger.info('='.repeat(80));

    let responseText = '';
    if (onToken) {
      const stream = await this.llm.stream(prompt);
      for await (const chunk of stream) {
        const content = typeof chunk.content === 'string' ? chunk.content : '';
        responseText += content;
        onToken(content);
      }
    } else {
      const responseMessage = await this.llm.invoke(prompt);
      responseText = typeof responseMessage.content === 'string'
        ? responseMessage.content
        : JSON.stringify(responseMessage.content);
    }

    // Extract markdown content (full response is markdown)
    const markdownContent = responseText.trim();

    // Build TriageResult from markdown response
    const triageLevel = triageResult.triage as TriageLevel;
    const suspectedCondition = cvResult.top_conditions.length > 0 ? cvResult.top_conditions[0].name : undefined;
    
    // Extract key information from markdown for backward compatibility
    const actionMatch = markdownContent.match(/##\s*[📋💡⚠️🔍]*\s*(?:Khuyến cáo Y tế|Khuyến cáo|Hành động|Khi nào|Kết luận|Khuyến nghị)[\s\S]*?\n([\s\S]*?)(?=\n##|$)/i);
    const homeCareMatch = markdownContent.match(/##\s*[💡]*\s*Lời khuyên Chăm sóc[\s\S]*?\n([\s\S]*?)(?=\n##|$)/i);
    const warningMatch = markdownContent.match(/##\s*[⚠️]*\s*Khi nào cần đi khám[\s\S]*?\n([\s\S]*?)(?=\n##|$)/i);
    
    const action = actionMatch ? actionMatch[1].trim().split('\n')[0] : 'Bạn nên đến gặp bác sĩ để được thăm khám và chẩn đoán chính xác.';
    const homeCareAdvice = homeCareMatch ? homeCareMatch[1].trim().substring(0, 500) : 'Giữ vệ sinh sạch sẽ và theo dõi triệu chứng.';
    const warningSigns = warningMatch ? warningMatch[1].trim().substring(0, 300) : 'Nếu triệu chứng nặng hơn, hãy đến khám ngay. Thông tin chỉ mang tính tham khảo, cần bác sĩ khám để chẩn đoán chính xác.';

    const parsed: TriageResult = {
      triage_level: triageLevel,
      symptom_summary: userText,
      red_flags: triageResult.red_flags || [],
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
        timeframe: triageLevel === 'emergency' ? 'Ngay lập tức' : triageLevel === 'urgent' ? 'Trong 24 giờ' : 'Khi có thể sắp xếp',
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
    onToken?: (token: string) => void
  ): Promise<TriageResult> {
    try {
      logger.info('[LIGHTWEIGHT] Handling casual conversation with streaming...');
      
      const prompt = CASUAL_CONVERSATION_PROMPT
        .replace('{context}', conversationContext || 'Không có')
        .replace('{query}', userText);

      let responseText = '';
      if (onToken) {
        const stream = await this.llm.stream(prompt);
        for await (const chunk of stream) {
          const content = typeof chunk.content === 'string' ? chunk.content : '';
          responseText += content;
          onToken(content);
        }
      } else {
        const responseMessage = await this.llm.invoke(prompt);
        responseText = typeof responseMessage.content === 'string'
          ? responseMessage.content
          : JSON.stringify(responseMessage.content);
      }
      
      const markdown = responseText.trim();
      return this.buildLightweightResponse(markdown, 'routine', userText);
    } catch (error) {
      logger.error({ error }, 'Error handling casual conversation');
      const fallbackResponse = 'Xin chào! Tôi là Medagen, trợ lý y tế AI của bạn. Tôi có thể giúp gì cho bạn về vấn đề sức khỏe hôm nay?';
      if (onToken) {
        onToken(fallbackResponse);
      }
      return this.buildLightweightResponse(
        fallbackResponse,
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
    onToken?: (token: string) => void
  ): Promise<TriageResult> {
    try {
      logger.info('[LIGHTWEIGHT] Handling out of scope query with streaming...');
      
      const prompt = OUT_OF_SCOPE_PROMPT
        .replace('{entities}', JSON.stringify(intent.entities || {}))
        .replace('{query}', userText);

      let responseText = '';
      if (onToken) {
        const stream = await this.llm.stream(prompt);
        for await (const chunk of stream) {
          const content = typeof chunk.content === 'string' ? chunk.content : '';
          responseText += content;
          onToken(content);
        }
      } else {
        const responseMessage = await this.llm.invoke(prompt);
        responseText = typeof responseMessage.content === 'string'
          ? responseMessage.content
          : JSON.stringify(responseMessage.content);
      }
      
      const markdown = responseText.trim();
      return this.buildLightweightResponse(markdown, 'routine', userText);
    } catch (error) {
      logger.error({ error }, 'Error handling out of scope');
      const fallbackResponse = 'Xin lỗi, câu hỏi này nằm ngoài phạm vi của hệ thống. Vui lòng liên hệ trực tiếp với cơ sở y tế để được hỗ trợ.';
      if (onToken) {
        onToken(fallbackResponse);
      }
      return this.buildLightweightResponse(
        fallbackResponse,
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

