import { logger } from '../utils/logger.js';
import type { TriageInput, TriageLevel } from '../types/index.js';

interface TriageRulesResult {
  triage: TriageLevel;
  red_flags: string[];
  reasoning: string;
}

// Regex patterns for each symptom category extracted from free text
const PATTERNS = {
  vision_changes:      /mờ mắt|mù|nhìn đôi|thị lực|mắt đột ngột|không nhìn thấy/,
  breathing_difficulty:/khó thở|không thở được|ngạt thở|thở khó|thở không ra|hụt hơi/,
  chest_pain:          /đau ngực|tức ngực|đau tim|nặng ngực|đau vùng ngực/,
  severe_headache:     /đau đầu dữ|đau đầu nặng|đau đầu cực|đau đầu như búa|đau đầu đột ngột/,
  confusion:           /lú lẫn|mất ý thức|bất tỉnh|ngất|hôn mê|không tỉnh/,
  fever:               /sốt|nhiệt độ cao|38[,.]|39[,.]|40[,.]|sốt cao/,
  bleeding:            /chảy máu|xuất huyết|băng huyết|ra máu/,
  severe_pain:         /đau dữ dội|đau không chịu được|đau cực kỳ|đau rất nặng|rất đau/,
  moderate_pain:       /đau vừa|đau trung bình|đau khá/,
  mild_pain:           /đau nhẹ|khó chịu nhẹ|hơi đau/,
};

export class TriageRulesService {
  evaluateSymptoms(input: TriageInput): TriageRulesResult {
    logger.info('Evaluating triage rules...');

    const redFlags: string[] = [];
    let triage: TriageLevel = 'routine';
    let reasoning = '';

    const { symptoms } = input;

    // Combine free text for pattern matching
    const text = ((symptoms.main_complaint || '') + ' ' + (symptoms.context || '')).toLowerCase();

    // Resolve each flag: honour explicit boolean if set, otherwise detect from text
    const vision_changes      = symptoms.vision_changes      ?? PATTERNS.vision_changes.test(text);
    const breathing_difficulty= symptoms.breathing_difficulty ?? PATTERNS.breathing_difficulty.test(text);
    const chest_pain          = symptoms.chest_pain          ?? PATTERNS.chest_pain.test(text);
    const severe_headache     = symptoms.severe_headache     ?? PATTERNS.severe_headache.test(text);
    const confusion           = symptoms.confusion           ?? PATTERNS.confusion.test(text);
    const fever               = symptoms.fever               ?? PATTERNS.fever.test(text);
    const bleeding            = symptoms.bleeding            ?? PATTERNS.bleeding.test(text);

    // Infer pain severity from text when not explicitly provided
    let pain_severity = symptoms.pain_severity;
    if (!pain_severity) {
      if (PATTERNS.severe_pain.test(text))   pain_severity = 'nặng';
      else if (PATTERNS.moderate_pain.test(text)) pain_severity = 'vừa';
      else if (PATTERNS.mild_pain.test(text))     pain_severity = 'nhẹ';
    }

    // ── EMERGENCY ──────────────────────────────────────────────────────────────
    if (vision_changes) {
      redFlags.push('Thay đổi thị lực đột ngột');
      triage = 'emergency';
      reasoning = 'Thay đổi thị lực đột ngột là dấu hiệu nguy hiểm cần cấp cứu ngay';
    }
    if (breathing_difficulty) {
      redFlags.push('Khó thở');
      triage = 'emergency';
      reasoning = 'Khó thở là dấu hiệu nguy hiểm cần cấp cứu ngay';
    }
    if (chest_pain) {
      redFlags.push('Đau ngực');
      triage = 'emergency';
      reasoning = 'Đau ngực có thể là dấu hiệu của bệnh tim mạch nghiêm trọng';
    }
    if (severe_headache) {
      redFlags.push('Đau đầu dữ dội');
      triage = 'emergency';
      reasoning = 'Đau đầu dữ dội đột ngột có thể là dấu hiệu của xuất huyết não';
    }
    if (confusion) {
      redFlags.push('Lú lẫn, ý thức thay đổi');
      triage = 'emergency';
      reasoning = 'Thay đổi ý thức là dấu hiệu nguy hiểm cần cấp cứu ngay';
    }

    // ── URGENT ─────────────────────────────────────────────────────────────────
    if (triage !== 'emergency') {
      if (fever && pain_severity === 'nặng') {
        redFlags.push('Sốt cao kèm đau dữ dội');
        triage = 'urgent';
        reasoning = 'Sốt cao kèm đau dữ dội cần được khám ngay trong ngày';
      }
      if (bleeding) {
        redFlags.push('Chảy máu');
        triage = 'urgent';
        reasoning = 'Chảy máu cần được đánh giá và xử lý sớm';
      }
      if (pain_severity === 'nặng') {
        redFlags.push('Đau dữ dội');
        triage = 'urgent';
        reasoning = 'Đau dữ dội cần được khám và điều trị sớm';
      }

      // CV results with high confidence → urgent
      if (input.cv_results?.top_conditions) {
        const highProb = input.cv_results.top_conditions.filter((c: any) => c.prob > 0.7);
        if (highProb.length > 0) {
          redFlags.push(`Phát hiện dấu hiệu bất thường: ${highProb.map((c: any) => c.name).join(', ')}`);
          if (triage === 'routine') {
            triage = 'urgent';
            reasoning = 'Hình ảnh cho thấy dấu hiệu bất thường cần được bác sĩ đánh giá';
          }
        }
      }
    }

    // ── ROUTINE / SELF-CARE ────────────────────────────────────────────────────
    if (triage === 'routine') {
      if (fever || pain_severity === 'vừa') {
        reasoning = 'Triệu chứng nhẹ đến trung bình, nên khám trong vài ngày tới';
      } else if (pain_severity === 'nhẹ') {
        triage = 'self-care';
        reasoning = 'Triệu chứng nhẹ, có thể tự chăm sóc tại nhà và theo dõi';
      } else {
        reasoning = 'Nên khám để được đánh giá chính xác';
      }
    }

    logger.info(`Triage level determined: ${triage}`);
    return { triage, red_flags: redFlags, reasoning };
  }
}
