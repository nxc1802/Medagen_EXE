import { describe, it, expect } from 'vitest';
import { calculateSpecialtyMatchScore } from '../../src/utils/medical-specialty-mapper';

describe('MedicalSpecialtyMapper', () => {
  it('should give general hospital a high score of 0.8 when its specialties match the condition', () => {
    // A clinic that is a "Bệnh viện đa khoa" but lists the matched specialty "Da liễu" (represented as cardiology or dermatology in lowerName)
    // calculateSpecialtyMatchScore checks: maxScore = 1.0 if lowerName matches keyword from specialtyToKeywords.
    // dermatology keyword is 'da liễu'.
    // If name matches keyword, it sets maxScore to 1.0.
    // If maxScore is 1.0 and lowerName contains 'đa khoa', it returns 0.8.
    const score = calculateSpecialtyMatchScore('Bệnh viện Đa khoa Medlatec', ['dermatology']);
    
    // Medlatec does not match 'da liễu', but the hospital name 'Bệnh viện Đa khoa' has 'đa khoa'
    // Let's test with a name that has 'da liễu' and 'đa khoa' (e.g. 'Bệnh viện Đa khoa chuyên khoa da liễu')
    const scoreMatched = calculateSpecialtyMatchScore('Bệnh viện Đa khoa chuyên khoa Da liễu', ['dermatology']);
    expect(scoreMatched).toBe(0.8);
  });

  it('should fall back to 0.3 for general hospital if it does not match a specific specialty keyword', () => {
    const score = calculateSpecialtyMatchScore('Bệnh viện Đa khoa Bạch Mai', ['dermatology']);
    expect(score).toBe(0.3);
  });

  it('should give specialty clinic a score of 1.0 when matched without general hospital keyword', () => {
    const score = calculateSpecialtyMatchScore('Phòng khám Chuyên khoa Da liễu Hà Nội', ['dermatology']);
    expect(score).toBe(1.0);
  });
});
