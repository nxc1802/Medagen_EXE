import { useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyzeSymptoms, uploadImage } from '../api/client'
import { useT, useSettings } from '../contexts/SettingsContext'

// Backend values stay English (sent to AI)
type Duration = 'Less than 24 hours' | '1-3 days' | '4-7 days' | '1-2 weeks' | 'More than 2 weeks'
type Severity = 'Mild' | 'Moderate' | 'Severe' | 'Extreme'

const DURATION_VALUES: Duration[] = [
  'Less than 24 hours', '1-3 days', '4-7 days', '1-2 weeks', 'More than 2 weeks',
]

const SEVERITY_OPTIONS: { value: Severity; icon: string; activeCls: string }[] = [
  { value: 'Mild',     icon: 'sentiment_satisfied',           activeCls: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' },
  { value: 'Moderate', icon: 'sentiment_neutral',             activeCls: 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' },
  { value: 'Severe',   icon: 'sentiment_dissatisfied',        activeCls: 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400' },
  { value: 'Extreme',  icon: 'sentiment_very_dissatisfied',   activeCls: 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400' },
]

const SEV_KEY: Record<Severity, 'sev.mild' | 'sev.moderate' | 'sev.severe' | 'sev.extreme'> = {
  Mild: 'sev.mild', Moderate: 'sev.moderate', Severe: 'sev.severe', Extreme: 'sev.extreme',
}

const DUR_KEY: Record<Duration, 'dur.lt24h' | 'dur.1to3' | 'dur.4to7' | 'dur.1to2w' | 'dur.gt2w'> = {
  'Less than 24 hours': 'dur.lt24h',
  '1-3 days': 'dur.1to3',
  '4-7 days': 'dur.4to7',
  '1-2 weeks': 'dur.1to2w',
  'More than 2 weeks': 'dur.gt2w',
}

const inputCls = 'w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400'

export default function DashboardPage() {
  const navigate = useNavigate()
  const t = useT()
  const { language } = useSettings()

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [symptoms, setSymptoms] = useState('')
  const [duration, setDuration] = useState<Duration>('Less than 24 hours')
  const [severity, setSeverity] = useState<Severity>('Mild')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState('')

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setCameraOpen(true)
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream }, 100)
    } catch {
      setError(t('dashboard.errCamera'))
    }
  }

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraOpen(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) return
      setImageFile(new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' }))
      setImagePreview(URL.createObjectURL(blob))
      closeCamera()
    }, 'image/jpeg', 0.9)
  }

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) { setError(t('dashboard.errSelectImage')); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError(null)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [])

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!symptoms.trim() && !imageFile) {
      setError(t('dashboard.errNeedInput'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      let imageUrl: string | undefined
      if (imageFile) {
        setUploadProgress(t('dashboard.uploading'))
        imageUrl = await uploadImage(imageFile)
      }
      setUploadProgress(t('dashboard.analyzing'))
      const fullText = `${symptoms.trim()} (Duration: ${duration}, Severity: ${severity})`.trim()
      const result = await analyzeSymptoms({ text: fullText, image_url: imageUrl, language })
      navigate(`/chat/${result.session_id}`, { state: { result, imageUrl, initialText: fullText } })
    } catch (err: any) {
      setError(err.message || t('state.errGeneric'))
    } finally {
      setLoading(false)
      setUploadProgress('')
    }
  }

  return (
    <>
      {/* ── Sticky header ── */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">add_circle</span>
          <h2 className="text-xl font-bold tracking-tight">{t('dashboard.title')}</h2>
        </div>
        <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full font-medium">
          {t('dashboard.badge')}
        </span>
      </header>

      {/* ── Hero banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/90 to-primary px-8 py-10">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white translate-x-24 -translate-y-24" />
          <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-white -translate-x-12 translate-y-12" />
        </div>
        <div className="relative max-w-4xl mx-auto">
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">{t('dashboard.heroLabel')}</p>
          <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-3">
            {t('dashboard.heroTitle')}
          </h1>
          <p className="text-white/75 text-sm max-w-xl leading-relaxed">
            {t('dashboard.heroParagraph')}
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            {[
              { icon: 'photo_camera', key: 'dashboard.pill1' as const },
              { icon: 'psychology',   key: 'dashboard.pill2' as const },
              { icon: 'timer',        key: 'dashboard.pill3' as const },
            ].map(({ icon, key }) => (
              <span key={key} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/15 text-white border border-white/20">
                <span className="material-symbols-outlined text-[12px]">{icon}</span>
                {t(key)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Camera modal ── */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative bg-black rounded-2xl overflow-hidden max-w-lg w-full mx-4 shadow-2xl">
            <video ref={videoRef} autoPlay playsInline className="w-full aspect-video object-cover" />
            <div className="flex items-center justify-center gap-6 p-5 bg-black/70">
              <button type="button" onClick={closeCamera}
                className="px-5 py-2 rounded-xl border border-white/20 text-white text-sm font-semibold hover:bg-white/10 transition-colors">
                {t('dashboard.cancelCamera')}
              </button>
              <button type="button" onClick={capturePhoto}
                className="size-16 rounded-full bg-white flex items-center justify-center shadow-xl hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-slate-900 text-3xl">camera</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 space-y-10">

        {/* ── Error ── */}
        {error && (
          <div className="flex items-start gap-4 p-5 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/30">
            <div className="size-9 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-base">error</span>
            </div>
            <div>
              <p className="font-bold text-sm text-red-700 dark:text-red-400">{t('state.errTitle')}</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <form className="space-y-10" onSubmit={handleSubmit}>

          {/* ── Step 1: Image Upload ── */}
          <section>
            <SectionLabel>{t('dashboard.step1label')}</SectionLabel>
            <SectionTitle icon="add_photo_alternate" iconBg="bg-primary" title={t('dashboard.step1title')} />

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="w-full max-h-80 object-contain bg-slate-50 dark:bg-slate-800" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white text-xs font-semibold">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      {t('dashboard.imageReady')}
                    </div>
                    <button type="button" onClick={clearImage}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs font-semibold hover:bg-white/30 transition-colors border border-white/20">
                      <span className="material-symbols-outlined text-sm">delete</span>
                      {t('action.remove')}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`flex flex-col items-center justify-center p-12 transition-colors ${
                    isDragging ? 'bg-primary/5 border-2 border-dashed border-primary' : 'bg-slate-50/50 dark:bg-slate-800/30'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <div className={`size-16 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
                    isDragging ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                  }`}>
                    <span className="material-symbols-outlined text-3xl">upload_file</span>
                  </div>
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
                    {isDragging ? t('dashboard.dropActive') : t('dashboard.dropIdle')}
                  </h4>
                  <p className="text-sm text-slate-400 mb-6 text-center max-w-xs">{t('dashboard.uploadHint')}</p>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-5 rounded-xl transition-colors shadow-sm shadow-primary/20">
                      <span className="material-symbols-outlined text-sm">folder_open</span>
                      {t('dashboard.browse')}
                    </button>
                    <button type="button" onClick={openCamera}
                      className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/40 hover:text-primary font-bold py-2.5 px-5 rounded-xl transition-colors text-slate-600 dark:text-slate-300">
                      <span className="material-symbols-outlined text-sm">photo_camera</span>
                      {t('dashboard.takePhoto')}
                    </button>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]) }} />
                </div>
              )}
            </div>
          </section>

          {/* ── Step 2: Symptoms ── */}
          <section>
            <SectionLabel>{t('dashboard.step2label')}</SectionLabel>
            <SectionTitle icon="edit_note" iconBg="bg-violet-500" title={t('dashboard.step2title')} />

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2" htmlFor="symptoms">
                  {t('dashboard.symLabel')}
                </label>
                <textarea
                  id="symptoms"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className={`${inputCls} resize-none`}
                  placeholder={t('dashboard.symPh')}
                  rows={5}
                />
                <p className="text-xs text-slate-400 mt-1 text-right">{symptoms.length} {t('dashboard.symCount')}</p>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  {t('dashboard.durLabel')}
                </label>
                <select value={duration} onChange={(e) => setDuration(e.target.value as Duration)} className={inputCls}>
                  {DURATION_VALUES.map(o => (
                    <option key={o} value={o}>{t(DUR_KEY[o])}</option>
                  ))}
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  {t('dashboard.sevLabel')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {SEVERITY_OPTIONS.map(({ value, icon, activeCls }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSeverity(value)}
                      className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 text-sm font-bold transition-all ${
                        severity === value
                          ? activeCls
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-primary/30 hover:text-primary'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-2xl ${severity === value ? '' : 'text-slate-400'}`}>{icon}</span>
                      {t(SEV_KEY[value])}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── Submit ── */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => { setSymptoms(''); setSeverity('Mild'); setDuration('Less than 24 hours'); clearImage(); setError(null) }}
              className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
            >
              {t('action.clearAll')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-10 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  {uploadProgress || t('dashboard.processing')}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">analytics</span>
                  {t('dashboard.startAnalysis')}
                </>
              )}
            </button>
          </div>
        </form>

        {/* ── Medical disclaimer ── */}
        <div className="flex gap-4 p-6 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20">
          <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-base">medical_information</span>
          </div>
          <div>
            <p className="font-bold text-sm text-amber-800 dark:text-amber-300 mb-1">{t('dashboard.disclaimer')}</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">{t('dashboard.disclaimerText')}</p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 pb-4">{t('settings.footer')}</p>
      </div>
    </>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">{children}</p>
}

function SectionTitle({ icon, iconBg, title }: { icon: string; iconBg: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className={`size-10 rounded-xl ${iconBg} flex items-center justify-center text-white shadow-sm`}>
        <span className="material-symbols-outlined text-sm">{icon}</span>
      </div>
      <h2 className="text-2xl font-black text-slate-900 dark:text-white">{title}</h2>
    </div>
  )
}
