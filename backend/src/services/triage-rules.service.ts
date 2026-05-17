import { logger } from '../utils/logger.js';
import type { TriageInput, TriageLevel } from '../types/index.js';

interface TriageRulesResult {
  triage: TriageLevel;
  red_flags: string[];
  reasoning: string;
}

export class TriageRulesService {
  evaluateSymptoms(input: TriageInput): TriageRulesResult {
    logger.info('Evaluating triage rules...');
    
    const redFlags: string[] = [];
    let triage: TriageLevel = 'routine';
    let reasoning = '';

    const { symptoms } = input;

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

