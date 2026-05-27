export interface Location {
  lat: number;
  lng: number;
}

export interface HealthCheckRequest {
  text?: string;
  image_url?: string;
  user_id: string;
  session_id?: string; // For tracking conversation history
  location?: Location;
  language?: string; // 'en' | 'vi' | 'fr' | 'zh'
}

export interface ConversationMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  image_url?: string;
  triage_result?: any;
  created_at: string;
}

export type TriageLevel = "emergency" | "urgent" | "routine" | "self-care";

export type ConditionSource = "cv_model" | "guideline" | "user_report" | "reasoning";

export type ConditionConfidence = "low" | "medium" | "high";

export interface SuspectedCondition {
  name: string;
  source: ConditionSource;
  confidence: ConditionConfidence;
}

export interface CVFindings {
  model_used: "derm_cv" | "eye_cv" | "wound_cv" | "none";
  raw_output: Record<string, any>;
}

export interface Recommendation {
  action: string;
  timeframe: string;
  home_care_advice: string;
  warning_signs: string;
}

export interface TriageResult {
  triage_level: TriageLevel;
  symptom_summary: string;
  red_flags: string[];
  suspected_conditions: SuspectedCondition[];
  cv_findings: CVFindings;
  recommendation: Recommendation;
  message?: string; // Markdown response from LLM (natural language, not constrained by JSON structure)
}

export interface NearestClinic {
  name: string;
  distance_km: number;
  address: string;
  rating?: number;
}

export interface HealthCheckResponse extends TriageResult {
  nearest_clinic?: NearestClinic;
}

export interface TriageInput {
  symptoms: {
    main_complaint: string;
    duration?: string;
    pain_severity?: "nhẹ" | "vừa" | "nặng";
    fever?: boolean;
    vision_changes?: boolean;
    bleeding?: boolean;
    breathing_difficulty?: boolean;
    chest_pain?: boolean;
    severe_headache?: boolean;
    confusion?: boolean;
  };
  cv_results?: any;
}

export interface CVResult {
  top_conditions: Array<{ name: string; prob: number }>;
  status?: 'success' | 'out_of_domain' | 'error';
  max_confidence?: number;
  threshold?: number;
}

export interface CurrentMedication {
  name: string;
  dosage?: string;
  frequency?: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';
export type Gender = 'male' | 'female' | 'other';

export interface HealthProfile {
  id?: string;
  user_id: string;
  full_name?: string;
  date_of_birth?: string;
  gender?: Gender;
  height_cm?: number;
  weight_kg?: number;
  blood_type?: BloodType;
  chronic_diseases?: string[];
  past_surgeries?: string[];
  drug_allergies?: string[];
  food_allergies?: string[];
  current_medications?: CurrentMedication[];
  emergency_contact?: EmergencyContact;
  created_at?: string;
  updated_at?: string;
}

export interface GuidelineQuery {
  symptoms: string;
  suspected_conditions: string[];
  triage_level: string;
}

