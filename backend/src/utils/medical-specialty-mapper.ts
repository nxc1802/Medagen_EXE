/**
 * Maps medical conditions/diseases to medical specialties
 * Used for finding the most appropriate hospital
 */

export type MedicalSpecialty = 
  | 'dermatology'      // Da liễu
  | 'ophthalmology'    // Mắt
  | 'emergency'        // Cấp cứu
  | 'general'          // Đa khoa
  | 'pediatrics'       // Nhi khoa
  | 'orthopedics'      // Chấn thương chỉnh hình
  | 'cardiology'        // Tim mạch
  | 'neurology'         // Thần kinh
  | 'oncology'         // Ung bướu
  | 'surgery'          // Phẫu thuật
  | 'internal_medicine' // Nội khoa
  | 'obstetrics_gynecology'; // Sản phụ khoa

/**
 * Maps condition names to medical specialties
 */
const conditionToSpecialtyMap: Record<string, MedicalSpecialty[]> = {
  // Dermatology conditions
  'eczema': ['dermatology'],
  'atopic dermatitis': ['dermatology'],
  'viêm da cơ địa': ['dermatology'],
  'psoriasis': ['dermatology'],
  'vảy nến': ['dermatology'],
  'acne': ['dermatology'],
  'mụn trứng cá': ['dermatology'],
  'rash': ['dermatology'],
  'phát ban': ['dermatology'],
  'urticaria': ['dermatology'],
  'mề đay': ['dermatology'],
  'fungal infection': ['dermatology'],
  'nhiễm nấm': ['dermatology'],
  'skin cancer': ['dermatology', 'oncology'],
  'ung thư da': ['dermatology', 'oncology'],
  
  // Ophthalmology conditions
  'conjunctivitis': ['ophthalmology'],
  'viêm kết mạc': ['ophthalmology'],
  'đau mắt đỏ': ['ophthalmology'],
  'red eye': ['ophthalmology'],
  'cataract': ['ophthalmology'],
  'đục thủy tinh thể': ['ophthalmology'],
  'glaucoma': ['ophthalmology'],
  'tăng nhãn áp': ['ophthalmology'],
  'eye infection': ['ophthalmology'],
  'nhiễm trùng mắt': ['ophthalmology'],
  
  // Emergency conditions
  'chest pain': ['emergency', 'cardiology'],
  'đau ngực': ['emergency', 'cardiology'],
  'difficulty breathing': ['emergency', 'internal_medicine'],
  'khó thở': ['emergency', 'internal_medicine'],
  'severe bleeding': ['emergency', 'surgery'],
  'chảy máu nặng': ['emergency', 'surgery'],
  'stroke': ['emergency', 'neurology'],
  'đột quỵ': ['emergency', 'neurology'],
  'heart attack': ['emergency', 'cardiology'],
  'nhồi máu cơ tim': ['emergency', 'cardiology'],
  
  // Orthopedics/Trauma
  'fracture': ['orthopedics', 'emergency'],
  'gãy xương': ['orthopedics', 'emergency'],
  'broken bone': ['orthopedics', 'emergency'],
  'sprain': ['orthopedics'],
  'bong gân': ['orthopedics'],
  'wound': ['surgery', 'emergency'],
  'vết thương': ['surgery', 'emergency'],
  'burn': ['surgery', 'emergency'],
  'bỏng': ['surgery', 'emergency'],
  
  // Pediatrics
  'child': ['pediatrics'],
  'trẻ em': ['pediatrics'],
  'nhi khoa': ['pediatrics'],
  
  // Obstetrics & Gynecology
  'pregnancy': ['obstetrics_gynecology'],
  'thai kỳ': ['obstetrics_gynecology'],
  'mang thai': ['obstetrics_gynecology'],
  'gynecological': ['obstetrics_gynecology'],
  'phụ khoa': ['obstetrics_gynecology'],
  
  // General/Internal Medicine
  'fever': ['internal_medicine', 'general'],
  'sốt': ['internal_medicine', 'general'],
  'headache': ['internal_medicine', 'neurology'],
  'đau đầu': ['internal_medicine', 'neurology'],
  'infection': ['internal_medicine', 'general'],
  'nhiễm trùng': ['internal_medicine', 'general'],
};

/**
 * Maps specialty to Vietnamese hospital name keywords
 */
const specialtyToKeywords: Record<MedicalSpecialty, string[]> = {
  dermatology: ['da liễu', 'dermatology', 'skin'],
  ophthalmology: ['mắt', 'eye', 'ophthalmology', 'nhãn khoa'],
  emergency: ['cấp cứu', 'emergency', 'tai nạn'],
  general: ['đa khoa', 'general', 'tổng hợp'],
  pediatrics: ['nhi', 'pediatric', 'trẻ em'],
  orthopedics: ['chấn thương', 'orthopedic', 'chỉnh hình'],
  cardiology: ['tim mạch', 'cardiology', 'heart'],
  neurology: ['thần kinh', 'neurology'],
  oncology: ['ung bướu', 'oncology', 'cancer'],
  surgery: ['phẫu thuật', 'surgery', 'ngoại khoa'],
  internal_medicine: ['nội khoa', 'internal medicine'],
  obstetrics_gynecology: ['sản phụ khoa', 'obstetrics', 'gynecology', 'phụ sản']
};

/**
 * Get medical specialties for a given condition
 */
export function getSpecialtiesForCondition(condition: string): MedicalSpecialty[] {
  const lowerCondition = condition.toLowerCase().trim();
  
  // Direct match
  if (conditionToSpecialtyMap[lowerCondition]) {
    return conditionToSpecialtyMap[lowerCondition];
  }
  
  // Partial match
  for (const [key, specialties] of Object.entries(conditionToSpecialtyMap)) {
    if (lowerCondition.includes(key) || key.includes(lowerCondition)) {
      return specialties;
    }
  }
  
  // Default to general/emergency
  return ['general', 'emergency'];
}

/**
 * Check if hospital name matches specialty keywords
 */
export function hospitalMatchesSpecialty(
  hospitalName: string,
  specialties: MedicalSpecialty[]
): boolean {
  const lowerName = hospitalName.toLowerCase();
  
  for (const specialty of specialties) {
    const keywords = specialtyToKeywords[specialty];
    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Calculate specialty match score (0-1)
 * Higher score = better match
 */
export function calculateSpecialtyMatchScore(
  hospitalName: string,
  specialties: MedicalSpecialty[]
): number {
  const lowerName = hospitalName.toLowerCase();
  let maxScore = 0;
  
  for (const specialty of specialties) {
    const keywords = specialtyToKeywords[specialty];
    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        // Exact specialty match gets highest score
        maxScore = Math.max(maxScore, 1.0);
      }
    }
  }
  
  // If it matches a specific specialty but is a general hospital, return 0.8 instead of overriding to 0.3
  if (maxScore === 1.0 && (lowerName.includes('đa khoa') || lowerName.includes('general'))) {
    return 0.8;
  }

  if (maxScore === 1.0) {
    return 1.0;
  }
  
  // General hospitals get lower score if they DO NOT match a specific specialty
  if (lowerName.includes('đa khoa') || lowerName.includes('general')) {
    return 0.3;
  }
  
  // Emergency hospitals get medium score
  if (lowerName.includes('cấp cứu') || lowerName.includes('emergency')) {
    return 0.5;
  }
  
  return maxScore;
}

