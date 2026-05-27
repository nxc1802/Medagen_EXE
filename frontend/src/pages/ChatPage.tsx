import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { sendFollowUp, getChatHistory, uploadImage } from '../api/client'
import type { TriageResult } from '../types'
import { useT } from '../contexts/SettingsContext'

// ── Markdown renderer ─────────────────────────────────────────────────────────
function md(text: string) {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-black mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc leading-relaxed">$1</li>')
    .replace(/(<li[\s\S]*?<\/li>\n?)+/g, '<ul class="space-y-0.5 my-2">$&</ul>')
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/^(?!<[hul])(.+)$/gm, '<p>$1</p>')
}

const TRIAGE_STYLE: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  emergency: { bg: 'bg-red-100 dark:bg-red-950/30',    text: 'text-red-700 dark:text-red-400',    border: 'border-red-200 dark:border-red-900/40',    icon: 'emergency' },
  urgent:    { bg: 'bg-orange-100 dark:bg-orange-950/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-900/40', icon: 'priority_high' },
  routine:   { bg: 'bg-emerald-100 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-900/40', icon: 'check_circle' },
  'self-care':{ bg: 'bg-blue-100 dark:bg-blue-950/30',  text: 'text-blue-700 dark:text-blue-400',  border: 'border-blue-200 dark:border-blue-900/40',  icon: 'home_health' },
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  image_url?: string
  triage_result?: TriageResult
  created_at: string
}

// ── TriageCard ────────────────────────────────────────────────────────────────
function TriageCard({ result, imageUrl }: { result: TriageResult; imageUrl?: string }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const style = TRIAGE_STYLE[result.triage_level] ?? TRIAGE_STYLE.routine
  const riskLevel = result.triage_level === 'emergency' ? 'HIGH' : result.triage_level === 'urgent' ? 'MEDIUM' : 'LOW'

  const triageLabel: Record<string, string> = {
    emergency:   t('triage.emergency'),
    urgent:      t('triage.urgent'),
    routine:     t('triage.routine'),
    'self-care': t('triage.selfCare'),
  }
  const label = triageLabel[result.triage_level] ?? result.triage_level

  return (
    <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Collapse header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${style.bg} ${style.text} ${style.border}`}>
            <span className="material-symbols-outlined text-xs">{style.icon}</span>
            {label}
          </span>
          {result.suspected_conditions?.[0] && (
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
              {result.suspected_conditions[0].name}
            </span>
          )}
        </div>
        <span className={`material-symbols-outlined text-slate-400 text-base shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="px-4 py-4 space-y-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          {result.recommendation?.action && (
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-primary text-base mt-0.5 shrink-0">clinical_notes</span>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{result.recommendation.action}</p>
            </div>
          )}

          {result.red_flags?.length > 0 && (
            <div className="space-y-1.5">
              {result.red_flags.map((f, i) => (
                <div key={i} className="flex gap-2.5 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                  <span className="material-symbols-outlined text-red-500 text-sm mt-0.5 shrink-0">warning</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300">{f}</p>
                </div>
              ))}
            </div>
          )}

          {result.recommendation?.timeframe && (
            <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">schedule</span>
              {result.recommendation.timeframe}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => navigate('/results', { state: { result, imageUrl } })}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
            >
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              {t('chat.viewFullResult')}
            </button>
            <button
              onClick={() => navigate('/map-recommendation', { state: { riskLevel, triageLevel: result.triage_level } })}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
            >
              <span className="material-symbols-outlined text-sm">map</span>
              {t('chat.findFacilities')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, initialImageUrl }: { msg: ChatMessage; initialImageUrl?: string }) {
  const t = useT()
  const isUser = msg.role === 'user'
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (isUser) {
    return (
      <div className="flex justify-end items-end gap-2.5">
        <div className="flex flex-col items-end gap-1 max-w-[75%]">
          {msg.image_url && (
            <img
              src={msg.image_url}
              alt="uploaded"
              className="rounded-xl max-h-52 object-cover border border-white/20 shadow-sm"
            />
          )}
          {msg.content && (
            <div className="bg-primary text-white px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed shadow-sm shadow-primary/20">
              {msg.content}
            </div>
          )}
          <p className="text-[10px] text-slate-400 dark:text-slate-500 px-1">{time}</p>
        </div>
        <div className="size-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0 mb-5">
          <span className="material-symbols-outlined text-primary text-sm">person</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-2.5">
      <div className="size-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 mb-5 shadow-sm">
        <span className="material-symbols-outlined text-white text-sm">medical_services</span>
      </div>
      <div className="flex flex-col gap-1 max-w-[80%]">
        <p className="text-[10px] font-semibold text-primary px-1">{t('chat.aiName')}</p>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
          {msg.content ? (
            <div
              className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed prose prose-sm prose-slate dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: md(msg.content) }}
            />
          ) : (
            <div className="flex gap-1 items-center h-5 px-1">
              <span className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="size-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="size-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
          {msg.triage_result && (
            <TriageCard result={msg.triage_result} imageUrl={initialImageUrl} />
          )}
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 px-1">{time}</p>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const t = useT()
  const { sessionId } = useParams<{ sessionId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { result?: TriageResult; imageUrl?: string; initialText?: string } | null

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!sessionId) return
    if (state?.result) {
      setMessages([
        {
          id: 'init-user',
          role: 'user',
          content: state.initialText || '',
          image_url: state.imageUrl,
          created_at: new Date(Date.now() - 1000).toISOString(),
        },
        {
          id: 'init-ai',
          role: 'assistant',
          content: state.result.message || state.result.recommendation?.action || '',
          triage_result: state.result,
          created_at: new Date().toISOString(),
        },
      ])
      setLoadingHistory(false)
    } else {
      getChatHistory(sessionId)
        .then(history =>
          setMessages(history.map(m => ({ ...m, content: m.triage_result?.message || m.content })))
        )
        .catch(() => {})
        .finally(() => setLoadingHistory(false))
    }
  }, [sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if ((!input.trim() && !imageFile) || sending || !sessionId) return
    const text = input.trim()
    setInput('')

    const optimisticUser: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text || t('chat.imageLabel'),
      image_url: imagePreview || undefined,
      created_at: new Date().toISOString(),
    }
    const placeholder: ChatMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, optimisticUser, placeholder])
    setImageFile(null)
    setImagePreview(null)
    setSending(true)

    try {
      let uploadedUrl: string | undefined
      if (imageFile) {
        uploadedUrl = await uploadImage(imageFile)
        setMessages(prev => prev.map(m =>
          m.id === optimisticUser.id ? { ...m, image_url: uploadedUrl } : m
        ))
      }
      const result = await sendFollowUp(sessionId, text, uploadedUrl)
      setMessages(prev => prev.map(m =>
        m.id === placeholder.id
          ? { ...m, content: result.message || result.recommendation?.action || '', triage_result: result }
          : m
      ))
    } catch (err: any) {
      setMessages(prev => prev.map(m =>
        m.id === placeholder.id ? { ...m, content: `${t('chat.errPrefix')}${err.message}` } : m
      ))
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  return (
    <>
      {/* ── Header ── */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-6 md:px-8">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-base">chat_bubble</span>
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight leading-none">{t('chat.title')}</h2>
            <p className="text-[11px] text-slate-400 leading-none mt-0.5">{t('chat.badge')}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
        >
          <span className="material-symbols-outlined text-sm">add_circle</span>
          {t('chat.newDiagnosis')}
        </button>
      </header>

      {/* ── Chat layout ── */}
      <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-6 px-4 md:px-8 space-y-5 bg-slate-50/50 dark:bg-slate-950/30">
          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
              <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-3xl">chat_bubble</span>
              </div>
              <div>
                <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">{t('chat.empty')}</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs">{t('chat.emptyDesc')}</p>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                initialImageUrl={
                  msg.role === 'assistant' && msg.triage_result
                    ? (messages[i - 1]?.image_url || state?.imageUrl)
                    : undefined
                }
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Input area ── */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 md:px-8 py-4">

          {/* Image preview */}
          {imagePreview && (
            <div className="relative inline-block mb-3">
              <img src={imagePreview} alt="preview" className="h-20 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm" />
              <button
                onClick={() => { setImageFile(null); setImagePreview(null) }}
                className="absolute -top-2 -right-2 size-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm"
              >
                <span className="material-symbols-outlined text-[10px]">close</span>
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            {/* Attach */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title={t('chat.attachImage')}
              className="shrink-0 size-10 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary hover:border-primary/40 transition-all"
            >
              <span className="material-symbols-outlined text-lg">attach_file</span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]) }} />

            {/* Textarea */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('chat.placeholder')}
                rows={1}
                className="w-full resize-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pr-12 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all max-h-32 text-slate-900 dark:text-white placeholder:text-slate-400"
                style={{ overflowY: 'auto' }}
                onInput={e => {
                  const el = e.currentTarget
                  el.style.height = 'auto'
                  el.style.height = Math.min(el.scrollHeight, 128) + 'px'
                }}
              />
            </div>

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={sending || (!input.trim() && !imageFile)}
              className="shrink-0 size-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-primary/20 disabled:shadow-none"
            >
              {sending
                ? <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                : <span className="material-symbols-outlined text-base">send</span>
              }
            </button>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2.5 text-center">
            {t('chat.disclaimer')}
          </p>
        </div>
      </div>
    </>
  )
}
