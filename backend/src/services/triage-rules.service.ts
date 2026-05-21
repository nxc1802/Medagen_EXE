import { logger } from '../utils/logger.js';
import type { TriageInput, TriageLevel } from '../types/index.js';

interface TriageRulesResult {
  triage: TriageLevel;
  red_flags: string[];
  reasoning: string;
}

export class TriageRulesService {
  private extractSymptomsFromText(text: string): Partial<TriageInput['symptoms']> {
    const lower = text.toLowerCase();
    const symptoms: Partial<TriageInput['symptoms']> = {};

    // vision_changes (thay đổi thị lực đột ngột)
    if (/(mờ mắt|thị lực|nhìn mờ|nhìn đôi|mắt mờ|blurry|vision|mất thị lực)/i.test(lower)) {
      symptoms.vision_changes = true;
    }
    // breathing_difficulty (khó thở)
    if (/(khó thở|hụt hơi|thở dốc|ngạt thở|shortness of breath|breathing)/i.test(lower)) {
      symptoms.breathing_difficulty = true;
    }
    // chest_pain (đau ngực)
    if (/(đau ngực|tức ngực|nhói ngực|nặng ngực|chest pain)/i.test(lower)) {
      symptoms.chest_pain = true;
    }
    // severe_headache (đau đầu dữ dội)
    if (/(đau đầu dữ dội|đau đầu như búa bổ|nhức đầu kinh khủng|severe headache|đau đầu rất)/i.test(lower)) {
      symptoms.severe_headache = true;
    }
    // confusion (lú lẫn, ý thức thay đổi)
    if (/(lú lẫn|mất phương hướng|ngất|bất tỉnh|mê man|confusion|hôn mê)/i.test(lower)) {
      symptoms.confusion = true;
    }
    // fever (sốt)
    if (/(sốt|nóng sốt|sốt cao|fever)/i.test(lower)) {
      symptoms.fever = true;
    }
    // bleeding (chảy máu)
    if (/(chảy máu|ra máu|máu chảy|bleeding|blood)/i.test(lower)) {
      symptoms.bleeding = true;
    }
    // pain_severity (độ đau)
    if (/(dữ dội|kinh khủng|rất đau|đau quặn|severe pain|nhức nhối|quá đau)/i.test(lower)) {
      symptoms.pain_severity = 'nặng';
    } else if (/(vừa|ê ẩm|âm ỉ|đau nhức|đau nhiều|đau vừa)/i.test(lower)) {
      symptoms.pain_severity = 'vừa';
    } else if (/(nhẹ|hơi đau|không đau lắm|mild|đau nhẹ)/i.test(lower)) {
      symptoms.pain_severity = 'nhẹ';
    }

    return symptoms;
  }

  evaluateSymptoms(input: TriageInput): TriageRulesResult {
    logger.info('Evaluating triage rules...');
    
    const redFlags: string[] = [];
    let triage: TriageLevel = 'routine';
    let reasoning = '';

    const originalSymptoms = input.symptoms || { main_complaint: '' };
    const contextText = (originalSymptoms as any).context || '';
    const combinedText = `${originalSymptoms.main_complaint || ''} ${contextText}`;
    
    // Automatically extract symptoms from raw text
    const extracted = this.extractSymptomsFromText(combinedText);
    
    // Merge: structured symptoms passed by user take precedence over raw text extraction
    const symptoms = {
      ...extracted,
      ...originalSymptoms
    };

    // EMERGENCY level checks
    if (symptoms.vision_changes) {
      redFlags.push('Thay đổi thị lực đột ngột');
      triage = 'emergency';
      reasoning = 'Thay đổi thị lực đột ngột là dấu hiệu nguy hiểm cần cấp cứu ngay';
    }

    if (symptoms.breathing_difficulty) {
      redFlags.push('Khó thở');
      triage = 'emergency';
      reasoning = 'Khó thở là dấu hiệu nguy hiểm cần cấp cứu ngay';
    }

    if (symptoms.chest_pain) {
      redFlags.push('Đau ngực');
      triage = 'emergency';
      reasoning = 'Đau ngực có thể là dấu hiệu của bệnh tim mạch nghiêm trọng';
    }

    if (symptoms.severe_headache) {
      redFlags.push('Đau đầu dữ dội');
      triage = 'emergency';
      reasoning = 'Đau đầu dữ dội đột ngột có thể là dấu hiệu của xuất huyết não';
    }

    if (symptoms.confusion) {
      redFlags.push('Lú lẫn, ý thức thay đổi');
      triage = 'emergency';
      reasoning = 'Thay đổi ý thức là dấu hiệu nguy hiểm cần cấp cứu ngay';
    }

    // URGENT level checks (if not already emergency)
    if (triage !== 'emergency') {
      if (symptoms.fever && symptoms.pain_severity === 'nặng') {
        redFlags.push('Sốt cao kèm đau dữ dội');
        triage = 'urgent';
        reasoning = 'Sốt cao kèm đau dữ dội cần được khám ngay trong ngày';
      }

      if (symptoms.bleeding) {
        redFlags.push('Chảy máu');
        triage = 'urgent';
        reasoning = 'Chảy máu cần được đánh giá và xử lý sớm';
      }

      if (symptoms.pain_severity === 'nặng') {
        redFlags.push('Đau dữ dội');
        triage = 'urgent';
        reasoning = 'Đau dữ dội cần được khám và điều trị sớm';
      }

      // Check CV results for urgent patterns
      if (input.cv_results?.top_conditions) {
        const highProbConditions = input.cv_results.top_conditions.filter(
          (c: any) => c.prob > 0.7
        );
        
        if (highProbConditions.length > 0) {
          const conditionNames = highProbConditions.map((c: any) => c.name).join(', ');
          redFlags.push(`Phát hiện dấu hiệu bất thường: ${conditionNames}`);
          
          if (triage === 'routine') {
            triage = 'urgent';
            reasoning = 'Hình ảnh cho thấy dấu hiệu bất thường cần được bác sĩ đánh giá';
          }
        }
      }
    }

    // ROUTINE level (default for mild symptoms)
    if (triage === 'routine') {
      if (symptoms.fever || symptoms.pain_severity === 'vừa') {
        reasoning = 'Triệu chứng nhẹ đến trung bình, nên khám trong vài ngày tới';
      } else if (symptoms.pain_severity === 'nhẹ') {
        triage = 'self-care';
        reasoning = 'Triệu chứng nhẹ, có thể tự chăm sóc tại nhà và theo dõi';
      } else {
        reasoning = 'Nên khám để được đánh giá chính xác';
      }
    }

    logger.info(`Triage level determined: ${triage}`);
    
    return {
      triage,
      red_flags: redFlags,
      reasoning
    };
  }
}

