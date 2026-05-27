import { supabase } from '../lib/supabase'
import type {
  TriageResult,
  ConversationMessage,
  HealthProfile,
  CarePlan,
  Session,
} from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// ── Auth helper ───────────────────────────────────────────────────────────────

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not authenticated')
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || `Request failed with status ${res.status}`)
  }
  return res.json()
}

// ── Analyze / Triage ──────────────────────────────────────────────────────────

export async function analyzeSymptoms(payload: {
  text: string
  image_url?: string
  location?: { lat: number; lng: number }
  session_id?: string
  language?: string
}): Promise<TriageResult & { session_id: string }> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/analyze`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  return handleResponse<TriageResult & { session_id: string }>(res)
}

// ── Chat follow-up ────────────────────────────────────────────────────────────

export async function sendFollowUp(
  sessionId: string,
  text: string,
  imageUrl?: string,
  location?: { lat: number; lng: number },
): Promise<TriageResult & { session_id: string }> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/chat/${sessionId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, image_url: imageUrl, location }),
  })
  return handleResponse<TriageResult & { session_id: string }>(res)
}

// ── Chat history ──────────────────────────────────────────────────────────────

export async function getChatHistory(sessionId: string): Promise<ConversationMessage[]> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/chat/${sessionId}/history`, { headers })
  const data = await handleResponse<{ history: ConversationMessage[] }>(res)
  return data.history
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function getSessions(): Promise<Session[]> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/sessions`, { headers })
  const data = await handleResponse<{ sessions: Session[] }>(res)
  return data.sessions
}

export async function getSessionDetail(id: string): Promise<Session> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/sessions/${id}`, { headers })
  return handleResponse<Session>(res)
}

// ── Care Plan ─────────────────────────────────────────────────────────────────

export async function getCarePlan(): Promise<CarePlan | null> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/care-plan`, { headers })
  const data = await handleResponse<{ plan: CarePlan | null }>(res)
  return data.plan
}

export async function generateCarePlan(): Promise<CarePlan> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/care-plan`, { method: 'POST', headers, body: '{}' })
  const data = await handleResponse<{ plan: CarePlan }>(res)
  return data.plan
}

// ── Health Profile ────────────────────────────────────────────────────────────

export async function getHealthProfile(): Promise<HealthProfile | null> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/health-profile`, { headers })
  const data = await handleResponse<{ profile: HealthProfile | null }>(res)
  return data.profile
}

export async function updateHealthProfile(
  profile: Omit<HealthProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
): Promise<HealthProfile> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/health-profile`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(profile),
  })
  const data = await handleResponse<{ profile: HealthProfile }>(res)
  return data.profile
}

// ── Image Upload ──────────────────────────────────────────────────────────────

export async function uploadImage(file: File): Promise<string> {
  const headers = await getAuthHeader()
  // Remove Content-Type so it's set properly for JSON body
  const authOnly = { Authorization: headers.Authorization }

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const res = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers: { ...authOnly, 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64, contentType: file.type, fileName: file.name }),
  })

  const data = await handleResponse<{ url: string }>(res)
  return data.url
}

// ── Re-export types for convenience ───────────────────────────────────────────
// Components that currently import types from this file can still do so
export type { HealthProfile, CarePlan, ConversationMessage, TriageResult, Session }
