import { supabase } from '../lib/supabase'
import type { TriageResult } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not authenticated')
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export async function analyzeStream(
  payload: {
    text: string
    image_url?: string
    location?: { lat: number; lng: number }
    session_id?: string
    language?: string
  },
  callbacks: {
    onStatus: (message: string) => void
    onToken: (token: string) => void
    onDone: (result: Record<string, any> & { session_id: string }) => void
    onError: (err: string) => void
  }
): Promise<void> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/analyze/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    callbacks.onError(err.error || 'Analysis failed')
    return
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''
    for (const part of parts) {
      if (!part.startsWith('data: ')) continue
      try {
        const event = JSON.parse(part.slice(6))
        if (event.type === 'status') callbacks.onStatus(event.message)
        else if (event.type === 'token') callbacks.onToken(event.text)
        else if (event.type === 'done') callbacks.onDone(event)
        else if (event.type === 'error') callbacks.onError(event.message)
      } catch {}
    }
  }
}

export async function analyzeSymptoms(payload: {
  text: string
  image_url?: string
  location?: { lat: number; lng: number }
  session_id?: string
  language?: string
}): Promise<{ session_id: string } & Record<string, any>> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/analyze`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || 'Analysis failed')
  }
  return res.json()
}

export async function sendFollowUp(
  sessionId: string,
  text: string,
  imageUrl?: string,
): Promise<TriageResult & { session_id: string }> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/chat/${sessionId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, image_url: imageUrl }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || 'Failed to send message')
  }
  return res.json()
}

export async function getChatHistory(sessionId: string): Promise<{
  id: string
  role: 'user' | 'assistant'
  content: string
  image_url?: string
  triage_result?: any
  created_at: string
}[]> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/chat/${sessionId}/history`, { headers })
  if (!res.ok) throw new Error('Failed to fetch chat history')
  const data = await res.json()
  return data.history
}

export async function getSessions() {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/sessions`, { headers })
  if (!res.ok) throw new Error('Failed to fetch sessions')
  const data = await res.json()
  return data.sessions
}

export async function getCarePlan() {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/care-plan`, { headers })
  if (!res.ok) throw new Error('Failed to fetch care plan')
  const data = await res.json()
  return data.plan // null nếu chưa có
}

export async function generateCarePlan() {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/care-plan`, { method: 'POST', headers, body: '{}' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || 'Failed to generate care plan')
  }
  const data = await res.json()
  return data.plan
}

export interface HealthProfile {
  id?: string
  user_id?: string
  full_name?: string
  date_of_birth?: string
  gender?: 'male' | 'female' | 'other'
  height_cm?: number
  weight_kg?: number
  blood_type?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown'
  chronic_diseases?: string[]
  past_surgeries?: string[]
  drug_allergies?: string[]
  food_allergies?: string[]
  current_medications?: Array<{ name: string; dosage?: string; frequency?: string }>
  emergency_contact?: { name: string; phone: string; relationship: string }
  created_at?: string
  updated_at?: string
}

export async function getHealthProfile(): Promise<HealthProfile | null> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/health-profile`, { headers })
  if (!res.ok) throw new Error('Failed to fetch health profile')
  const data = await res.json()
  return data.profile
}

export async function updateHealthProfile(profile: Omit<HealthProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<HealthProfile> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/health-profile`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(profile),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || 'Failed to save health profile')
  }
  const data = await res.json()
  return data.profile
}

// ── Payment ──────────────────────────────────────────────────────────────────

export async function createPaymentOrder(plan: 'pro_monthly' | 'pro_annual'): Promise<{ checkoutUrl: string; orderCode: number }> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/payment/create-order`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ plan }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || 'Failed to create payment order')
  }
  return res.json()
}

export async function getPaymentStatus(orderCode: number): Promise<{ status: string; amount: number }> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/payment/status/${orderCode}`, { headers })
  if (!res.ok) throw new Error('Failed to fetch payment status')
  return res.json()
}

export async function getUserSubscription(): Promise<{ plan: string; billing?: string; status: string; ends_at?: string }> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/payment/subscription`, { headers })
  if (!res.ok) return { plan: 'free', status: 'active' }
  return res.json()
}

export async function uploadImage(file: File): Promise<string> {
  const headers = await getAuthHeader()
  delete headers['Content-Type'] // let fetch set it for JSON

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const res = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64, contentType: file.type, fileName: file.name }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(err.error || 'Upload failed')
  }

  const data = await res.json()
  return data.url
}
