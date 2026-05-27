// ── Primitive Types ──────────────────────────────────────────────────────────

export type TriageLevel = 'emergency' | 'urgent' | 'routine' | 'self-care'

export type ConditionSource = 'cv_model' | 'guideline' | 'user_report' | 'reasoning'

export type ConditionConfidence = 'low' | 'medium' | 'high'

export type Gender = 'male' | 'female' | 'other'

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown'

// ── Triage / Analysis ────────────────────────────────────────────────────────

export interface SuspectedCondition {
  name: string
  source: ConditionSource
  confidence: ConditionConfidence
}

export interface CVFindings {
  model_used: 'derm_cv' | 'eye_cv' | 'wound_cv' | 'teeth_cv' | 'nail_cv' | 'none'
  raw_output: {
    top_predictions?: Array<{ condition: string; probability: number }>
    [key: string]: any
  }
}

export interface Recommendation {
  action: string
  timeframe: string
  home_care_advice: string
  warning_signs: string
}

export interface NearestClinic {
  name: string
  distance_km: number
  address: string
  rating?: number
}

export interface TriageResult {
  triage_level: TriageLevel
  symptom_summary: string
  red_flags: string[]
  suspected_conditions: SuspectedCondition[]
  cv_findings: CVFindings
  recommendation: Recommendation
  nearest_clinic?: NearestClinic
  message?: string
  session_id?: string
}

// ── Session (Triage History) ──────────────────────────────────────────────────

export interface Session {
  id: string
  user_id: string
  input_text: string
  image_url?: string
  triage_level: TriageLevel
  triage_result: TriageResult
  created_at: string
}

// ── Conversation ──────────────────────────────────────────────────────────────

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  image_url?: string
  triage_result?: Partial<TriageResult>
  created_at: string
}

// ── Health Profile ────────────────────────────────────────────────────────────

export interface CurrentMedication {
  name: string
  dosage?: string
  frequency?: string
}

export interface EmergencyContact {
  name: string
  phone: string
  relationship: string
}

export interface HealthProfile {
  id?: string
  user_id?: string
  full_name?: string
  date_of_birth?: string
  gender?: Gender
  height_cm?: number
  weight_kg?: number
  blood_type?: BloodType
  chronic_diseases?: string[]
  past_surgeries?: string[]
  drug_allergies?: string[]
  food_allergies?: string[]
  current_medications?: CurrentMedication[]
  emergency_contact?: EmergencyContact
  created_at?: string
  updated_at?: string
}

// ── Care Plan ─────────────────────────────────────────────────────────────────

export interface LifestyleItem {
  title: string
  icon: string
  tips: string[]
}

export interface NutritionInclude {
  name: string
  desc: string
  icon: string
}

export interface NutritionAvoid {
  name: string
  badge: string
  badgeColor: 'red' | 'amber'
}

export interface OTCSuggestion {
  name: string
  desc: string
  icon: string
}

export interface CarePlan {
  id: string
  summary: string
  conditions?: string[]
  lifestyle: LifestyleItem[]
  nutrition: {
    include: NutritionInclude[]
    avoid: NutritionAvoid[]
  }
  exercise: {
    recommended: string[]
    avoid: string[]
  }
  otc_suggestions: OTCSuggestion[]
  next_checkup_days: number
  next_checkup_date?: string
  created_at?: string
}
