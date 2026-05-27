export type TriageLevel = 'emergency' | 'urgent' | 'routine' | 'self-care'

export interface SuspectedCondition {
  name: string
  source: string
  confidence: string
}

export interface TriageResult {
  triage_level: TriageLevel
  symptom_summary: string
  red_flags: string[]
  suspected_conditions: SuspectedCondition[]
  cv_findings: { model_used: string; raw_output: Record<string, any> }
  recommendation: {
    action: string
    timeframe: string
    home_care_advice: string
    warning_signs: string
  }
  message?: string
  nearest_clinic?: { name: string; distance_km: number; address: string; rating?: number }
}

export interface Session {
  id: string
  user_id: string
  input_text: string
  image_url?: string
  triage_level: TriageLevel
  triage_result: TriageResult
  created_at: string
}
