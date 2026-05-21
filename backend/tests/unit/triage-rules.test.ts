import { describe, it, expect } from 'vitest';
import { TriageRulesService } from '../../src/services/triage-rules.service';

describe('TriageRulesService', () => {
  const service = new TriageRulesService();

  it('should automatically extract emergency flags from raw text and classify as emergency', () => {
    // "đau ngực" and "khó thở" should trigger chest_pain and breathing_difficulty
    const input = {
      symptoms: {
        main_complaint: 'Tôi bị đau ngực dữ dội và cảm thấy cực kỳ khó thở từ 10 phút trước.',
        context: 'Không có tiền sử bệnh lý.'
      }
    };

    const result = service.evaluateSymptoms(input);
    expect(result.triage).toBe('emergency');
    expect(result.red_flags).toContain('Đau ngực');
    expect(result.red_flags).toContain('Khó thở');
  });

  it('should automatically parse high pain level from raw text and classify as urgent', () => {
    // "đau mức 9" should extract pain_level: 9 -> Urgent
    const input = {
      symptoms: {
        main_complaint: 'Tôi bị sưng ngón chân rất đau mức 9 trên 10.',
      }
    };

    const result = service.evaluateSymptoms(input);
    expect(result.triage).toBe('urgent');
  });

  it('should classify routine skin complaints as self-care', () => {
    const input = {
      symptoms: {
        main_complaint: 'Mu bàn tay của tôi nổi vài nốt mẩn đỏ hơi ngứa nhè nhẹ, đau mức 2.',
      }
    };

    const result = service.evaluateSymptoms(input);
    expect(result.triage).toBe('self-care');
  });
});
