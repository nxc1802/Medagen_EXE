import { logger } from '../utils/logger.js';
import { INTENT_CLASSIFICATION_PROMPT } from '../config/prompts.js';

export type IntentType = 'triage' | 'disease_info' | 'symptom_inquiry' | 'general_health' | 'out_of_scope' | 'casual_greeting';

export interface Intent {
  type: IntentType;
  confidence: number;
  entities: {
    disease?: string;
    symptoms?: string[];
    info_domain?: 'definition' | 'causes' | 'symptoms' | 'treatment' | 'prevention' | 'complications';
    urgency_indicators?: string[];
  };
  needsClarification: boolean;
  suggestedQuestion?: string;
}

/**
 * Intent Classification Service
 * Phân loại ý định của user theo spec AI-Agent.md
 */
export class IntentClassifierService {
  private llm?: any;

  constructor(llm?: any) {
    this.llm = llm;
  }

  // Keywords for different intents
  private readonly TRIAGE_KEYWORDS = [
    'đau', 'sốt', 'chảy máu', 'khó thở', 'nôn', 'buồn nôn',
    'ngất', 'chóng mặt', 'mệt', 'yếu', 'tôi bị', 'em bị',
    'con tôi', 'triệu chứng', 'cấp cứu', 'khẩn cấp'
  ];

  private readonly DISEASE_INFO_KEYWORDS = [
    'bệnh', 'là gì', 'như thế nào', 'giải thích', 'cho tôi biết',
    'thông tin về', 'tìm hiểu về', 'định nghĩa', 'nguyên nhân'
  ];

  // Treatment keywords can be used for future treatment-related intent classification
  // private readonly TREATMENT_KEYWORDS = [
  //   'điều trị', 'chữa', 'phòng ngừa', 'phòng bệnh', 'cách chữa',
  //   'cách điều trị', 'thuốc', 'liệu pháp'
  // ];

  private readonly OUT_OF_SCOPE_KEYWORDS = [
    'bảo hiểm', 'bhyt', 'chi phí', 'giá', 'thủ tục',
    'thuốc nam', 'đông y', 'thảo dược', 'bài thuốc'
  ];

  private readonly CASUAL_GREETING_KEYWORDS = [
    'xin chào', 'chào', 'hi', 'hello', 'cảm ơn', 'thanks', 'thank you',
    'tạm biệt', 'bye', 'goodbye', 'ok', 'okay', 'được rồi', 'hiểu rồi',
    'vâng', 'dạ', 'ừ', 'ừm', 'uhm', 'à', 'ah'
  ];

  /**
   * Classify user intent based on query text
   */
  async classifyIntent(query: string, hasImage: boolean = false, context?: string): Promise<Intent> {
    const lowerQuery = query.toLowerCase().trim();
    
    logger.info(`Classifying intent for query: "${query.substring(0, 50)}..."`);

    // Gold Standard 1: LLM-Based Intent Classification
    if (this.llm) {
      try {
        const prompt = INTENT_CLASSIFICATION_PROMPT
          .replace('{context}', context || 'Không có')
          .replace('{query}', query)
          .replace('{hasImage}', hasImage ? 'Có hình ảnh y tế được gửi kèm' : 'Không gửi kèm hình ảnh');

        const responseMessage = await this.llm.invoke(prompt);
        const responseText = typeof responseMessage.content === 'string'
          ? responseMessage.content
          : JSON.stringify(responseMessage.content);

        // Standardize and clean the response text to extract valid JSON block
        const jsonStart = responseText.indexOf('{');
        const jsonEnd = responseText.lastIndexOf('}');
        
        if (jsonStart >= 0 && jsonEnd >= 0) {
          const jsonContent = responseText.substring(jsonStart, jsonEnd + 1);
          const parsed = JSON.parse(jsonContent) as Intent;
          
          if (parsed && parsed.type) {
            logger.info(`[INTENT] LLM classified intent successfully: ${parsed.type} (confidence: ${parsed.confidence})`);
            return parsed;
          }
        }
      } catch (error) {
        logger.error({ error }, 'Failed to classify intent using LLM, falling back to rule-based classification.');
      }
    }

    // Fallback: Rule-Based Intent Classification
    // PRIORITY 1: If has image, ALWAYS triage (unless it's clearly just a greeting)
    if (hasImage) {
      // Only treat as casual greeting if it's VERY short and clearly just greeting
      if (lowerQuery.length <= 10 && this.isCasualGreeting(lowerQuery)) {
        return {
          type: 'casual_greeting',
          confidence: 0.9,
          entities: {},
          needsClarification: false
        };
      }
      // Otherwise, image + any text = triage
      return this.classifyTriageIntent(lowerQuery, hasImage);
    }

    // PRIORITY 2: Check for out of scope
    if (this.isOutOfScope(lowerQuery)) {
      return {
        type: 'out_of_scope',
        confidence: 0.9,
        entities: {},
        needsClarification: false
      };
    }

    // PRIORITY 3: Check if it's purely a casual greeting first
    // This avoids classifying a simple greeting like "xin chào" or "cảm ơn" as triage or disease info
    if (this.isCasualGreeting(lowerQuery) && lowerQuery.length <= 15) {
      return {
        type: 'casual_greeting',
        confidence: 0.95,
        entities: {},
        needsClarification: false
      };
    }

    // PRIORITY 4: Check for disease info with explicit educational markers
    // Educational question markers indicate search for information rather than personal diagnosis
    const eduMarkers = ['là gì', 'như thế nào', 'giải thích', 'cho tôi biết', 'thông tin về', 'tìm hiểu về', 'định nghĩa', 'tại sao', 'nguyên nhân', 'cơ chế', 'phòng ngừa', 'phòng tránh'];
    const hasEduMarker = eduMarkers.some(marker => lowerQuery.includes(marker));
    const diseaseMatches = this.calculateKeywordScore(lowerQuery, this.DISEASE_INFO_KEYWORDS) > 0;
    
    if (hasEduMarker || (diseaseMatches && lowerQuery.includes('bệnh'))) {
      logger.info('[AGENT] Educational markers detected. Selecting disease_info intent.');
      return this.classifyDiseaseInfoIntent(lowerQuery);
    }

    // PRIORITY 5: Check for triage (personal health concerns / symptoms)
    const hasTriageKeywords = this.calculateKeywordScore(lowerQuery, this.TRIAGE_KEYWORDS) > 0;
    const hasSymptoms = this.extractSymptoms(lowerQuery).length > 0;
    const hasPersonalPronouns = this.hasPersonalPronouns(lowerQuery);
    
    if (hasTriageKeywords || hasSymptoms || (hasPersonalPronouns && lowerQuery.length > 12)) {
      return this.classifyTriageIntent(lowerQuery, hasImage);
    }

    // PRIORITY 6: Check for casual greeting (fallback longer greeting)
    if (this.isCasualGreeting(lowerQuery)) {
      return {
        type: 'casual_greeting',
        confidence: 0.95,
        entities: {},
        needsClarification: false
      };
    }

    // PRIORITY 7: Default fallback
    if (hasPersonalPronouns) {
      return this.classifyTriageIntent(lowerQuery, hasImage);
    }
    
    // Otherwise, default to disease info for general queries
    return this.classifyDiseaseInfoIntent(lowerQuery);
  }

  private classifyTriageIntent(query: string, hasImage: boolean = false): Intent {
    const symptoms = this.extractSymptoms(query);
    const urgencyIndicators = this.extractUrgencyIndicators(query);

    // If we have an image, we don't need text clarification
    const needsClarification = !hasImage && symptoms.length === 0 && urgencyIndicators.length === 0;

    return {
      type: 'triage',
      confidence: 0.8,
      entities: {
        symptoms,
        urgency_indicators: urgencyIndicators
      },
      needsClarification,
      suggestedQuestion: needsClarification 
        ? 'Bạn có thể mô tả chi tiết hơn về triệu chứng đang gặp phải không?'
        : undefined
    };
  }

  private classifyDiseaseInfoIntent(query: string): Intent {
    const disease = this.extractDiseaseName(query);
    const infoDomain = this.extractInfoDomain(query);

    return {
      type: 'disease_info',
      confidence: 0.7,
      entities: {
        disease,
        info_domain: infoDomain
      },
      needsClarification: !disease && !infoDomain,
      suggestedQuestion: !disease
        ? 'Bạn muốn tìm hiểu về bệnh gì? Ví dụ: trứng cá, vảy nến, viêm kết mạc...'
        : !infoDomain
        ? `Bạn muốn biết về ${disease}: Định nghĩa / Nguyên nhân / Triệu chứng / Điều trị / Phòng bệnh?`
        : undefined
    };
  }

  private isOutOfScope(query: string): boolean {
    return this.OUT_OF_SCOPE_KEYWORDS.some(keyword => query.includes(keyword));
  }

  private isCasualGreeting(query: string): boolean {
    // Check if query is very short (likely greeting) or contains greeting keywords
    const trimmedQuery = query.trim();
    
    // Very short queries (<= 10 chars) are likely greetings
    if (trimmedQuery.length <= 10) {
      return this.CASUAL_GREETING_KEYWORDS.some(keyword => trimmedQuery.includes(keyword)) ||
             /^(hi|hello|chào|xin chào|cảm ơn|thanks|ok|okay|vâng|dạ|ừ|bye)$/i.test(trimmedQuery);
    }
    
    // For longer queries, only match if it's EXACTLY a greeting phrase
    // Don't match if query contains symptoms or medical terms
    const hasMedicalTerms = this.TRIAGE_KEYWORDS.some(kw => query.includes(kw)) ||
                           this.DISEASE_INFO_KEYWORDS.some(kw => query.includes(kw)) ||
                           /(đau|sốt|bệnh|triệu chứng|mụn|nhọt|sưng|ngứa)/i.test(query);
    
    if (hasMedicalTerms) {
      return false; // Not a casual greeting if has medical terms
    }
    
    // Check if it's a pure greeting phrase
    return this.CASUAL_GREETING_KEYWORDS.some(keyword => {
      // Match only if keyword is at the start or is the main content
      const keywordIndex = query.indexOf(keyword);
      return keywordIndex >= 0 && (keywordIndex === 0 || query.length <= keyword.length + 5);
    });
  }

  private calculateKeywordScore(query: string, keywords: string[]): number {
    const matches = keywords.filter(keyword => query.includes(keyword));
    return matches.length / keywords.length;
  }

  private hasPersonalPronouns(query: string): boolean {
    const pronouns = ['tôi', 'em', 'con tôi', 'con em', 'bố', 'mẹ', 'anh', 'chị'];
    return pronouns.some(pronoun => query.includes(pronoun));
  }

  private extractSymptoms(query: string): string[] {
    const symptoms: string[] = [];
    
    // Common symptom patterns
    const symptomPatterns = [
      /đau\s+(\w+)/gi,
      /sốt/gi,
      /chảy\s+máu/gi,
      /khó\s+thở/gi,
      /nôn/gi,
      /buồn\s+nôn/gi,
      /chóng\s+mặt/gi,
      /ngứa/gi,
      /sưng/gi,
      /đỏ/gi,
      /mẩn/gi,
      /nổi\s+mụn/gi
    ];

    for (const pattern of symptomPatterns) {
      const matches = query.match(pattern);
      if (matches) {
        symptoms.push(...matches);
      }
    }

    return [...new Set(symptoms)];
  }

  private extractUrgencyIndicators(query: string): string[] {
    const urgencyKeywords = [
      'cấp cứu', 'khẩn cấp', 'ngay lập tức', 'gấp', 'nặng',
      'khó thở', 'chảy máu nhiều', 'ngất', 'bất tỉnh'
    ];

    return urgencyKeywords.filter(keyword => query.includes(keyword));
  }

  private extractDiseaseName(query: string): string | undefined {
    // Common disease names in Vietnamese
    const diseases = [
      'trứng cá', 'mụn', 'vảy nến', 'viêm da',
      'viêm kết mạc', 'đau mắt đỏ', 'viêm giác mạc',
      'viêm gan', 'tiểu đường', 'cao huyết áp',
      'hen suyễn', 'dị ứng', 'sốt xuất huyết',
      'cúm', 'covid', 'viêm họng', 'viêm amidan'
    ];

    for (const disease of diseases) {
      if (query.includes(disease)) {
        return disease;
      }
    }

    return undefined;
  }

  private extractInfoDomain(query: string): Intent['entities']['info_domain'] {
    if (/định nghĩa|là gì|như thế nào/.test(query)) {
      return 'definition';
    } else if (/nguyên nhân|tại sao|do đâu/.test(query)) {
      return 'causes';
    } else if (/triệu chứng|dấu hiệu|biểu hiện/.test(query)) {
      return 'symptoms';
    } else if (/điều trị|chữa|cách chữa/.test(query)) {
      return 'treatment';
    } else if (/phòng ngừa|phòng bệnh|cách phòng/.test(query)) {
      return 'prevention';
    } else if (/biến chứng|nguy hiểm|hậu quả/.test(query)) {
      return 'complications';
    }

    return undefined;
  }
}

