import { useEffect, useState } from 'react'
import { getHealthProfile, updateHealthProfile } from '../api/client'
import type { HealthProfile } from '../types'
import { useT } from '../contexts/SettingsContext'


type Medication = { name: string; dosage: string; frequency: string }

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'] as const

const inputCls = 'w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400'

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

function FieldLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
      <span className="material-symbols-outlined text-base text-slate-400">{icon}</span>
      {label}
    </label>
  )
}

function TagInput({
  label, icon, values, onChange, placeholder, tagColor = 'primary',
}: {
  label: string; icon: string; values: string[]
  onChange: (v: string[]) => void; placeholder: string
  tagColor?: 'primary' | 'red' | 'amber'
}) {
  const t = useT()
  const [input, setInput] = useState('')

  const add = () => {
    const trimmed = input.trim()
    if (trimmed && !values.includes(trimmed)) onChange([...values, trimmed])
    setInput('')
  }

  const tagCls = {
    primary: 'bg-primary/10 text-primary border border-primary/20',
    red: 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/40',
    amber: 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-900/40',
  }

  return (
    <div>
      <FieldLabel icon={icon} label={label} />
      <div className="flex gap-2 mb-3">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder} className={inputCls} />
        <button type="button" onClick={add}
          className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-bold hover:bg-primary/20 transition-colors shrink-0">
          {t('action.add')}
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((v, i) => (
            <span key={i} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${tagCls[tagColor]}`}>
              {v}
              <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))}
                className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function HealthProfilePage() {
  const t = useT()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('')
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [bloodType, setBloodType] = useState<typeof BLOOD_TYPES[number] | ''>('')
  const [chronicDiseases, setChronicDiseases] = useState<string[]>([])
  const [pastSurgeries, setPastSurgeries] = useState<string[]>([])
  const [drugAllergies, setDrugAllergies] = useState<string[]>([])
  const [foodAllergies, setFoodAllergies] = useState<string[]>([])
  const [medications, setMedications] = useState<Medication[]>([])
  const [medInput, setMedInput] = useState<Medication>({ name: '', dosage: '', frequency: '' })
  const [ecName, setEcName] = useState('')
  const [ecPhone, setEcPhone] = useState('')
  const [ecRelation, setEcRelation] = useState('')

  useEffect(() => {
    getHealthProfile()
      .then(profile => {
        if (!profile) return
        setFullName(profile.full_name || '')
        setDob(profile.date_of_birth || '')
        setGender((profile.gender as any) || '')
        setHeightCm(profile.height_cm?.toString() || '')
        setWeightKg(profile.weight_kg?.toString() || '')
        setBloodType((profile.blood_type as any) || '')
        setChronicDiseases(profile.chronic_diseases || [])
        setPastSurgeries(profile.past_surgeries || [])
        setDrugAllergies(profile.drug_allergies || [])
        setFoodAllergies(profile.food_allergies || [])
        setMedications((profile.current_medications || []).map(m => ({
          name: m.name, dosage: m.dosage || '', frequency: m.frequency || '',
        })))
        if (profile.emergency_contact) {
          setEcName(profile.emergency_contact.name)
          setEcPhone(profile.emergency_contact.phone)
          setEcRelation(profile.emergency_contact.relationship)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const bmi = heightCm && weightKg
    ? (parseFloat(weightKg) / Math.pow(parseFloat(heightCm) / 100, 2)).toFixed(1)
    : null

  function bmiInfo(bmiVal: number) {
    if (bmiVal < 18.5) return { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: t('hp.bmiUnderweight') }
    if (bmiVal < 25)   return { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', label: t('hp.bmiNormal') }
    if (bmiVal < 30)   return { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', label: t('hp.bmiOverweight') }
    return { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: t('hp.bmiObese') }
  }

  const bmiResult = bmi ? bmiInfo(parseFloat(bmi)) : null

  const addMedication = () => {
    if (!medInput.name.trim()) return
    setMedications([...medications, { ...medInput }])
    setMedInput({ name: '', dosage: '', frequency: '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(null); setSaved(false)
    try {
      const payload: Omit<HealthProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
        full_name: fullName || undefined,
        date_of_birth: dob || undefined,
        gender: (gender as any) || undefined,
        height_cm: heightCm ? parseFloat(heightCm) : undefined,
        weight_kg: weightKg ? parseFloat(weightKg) : undefined,
        blood_type: (bloodType as any) || undefined,
        chronic_diseases: chronicDiseases.length ? chronicDiseases : undefined,
        past_surgeries: pastSurgeries.length ? pastSurgeries : undefined,
        drug_allergies: drugAllergies.length ? drugAllergies : undefined,
        food_allergies: foodAllergies.length ? foodAllergies : undefined,
        current_medications: medications.length ? medications : undefined,
        emergency_contact: ecName && ecPhone
          ? { name: ecName, phone: ecPhone, relationship: ecRelation }
          : undefined,
      }
      await updateHealthProfile(payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* ── Sticky header ── */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">health_metrics</span>
          <h2 className="text-xl font-bold tracking-tight">{t('hp.title')}</h2>
        </div>
        <button form="health-profile-form" type="submit" disabled={saving || loading}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-primary/20">
          {saving
            ? <><span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> {t('hp.saving')}</>
            : <><span className="material-symbols-outlined text-sm">save</span> {t('hp.saveBtn')}</>
          }
        </button>
      </header>

      {/* ── Hero banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/90 to-primary px-8 py-10">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white translate-x-24 -translate-y-24" />
          <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-white -translate-x-12 translate-y-12" />
        </div>
        <div className="relative max-w-3xl mx-auto">
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">{t('hp.heroLabel')}</p>
          <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-3">{t('hp.heroTitle')}</h1>
          <p className="text-white/75 text-sm max-w-xl leading-relaxed">{t('hp.heroParagraph')}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {[
              { icon: 'lock',              key: 'hp.pill1' as const },
              { icon: 'psychology',        key: 'hp.pill2' as const },
              { icon: 'medical_services',  key: 'hp.pill3' as const },
            ].map(({ icon, key }) => (
              <span key={key} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/15 text-white border border-white/20">
                <span className="material-symbols-outlined text-[12px]">{icon}</span>
                {t(key)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 space-y-10">

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined animate-spin text-primary text-2xl">progress_activity</span>
            </div>
            <p className="text-slate-500 text-sm font-medium">{t('hp.loadingMsg')}</p>
          </div>
        )}

        {!loading && (
          <>
            {/* Error */}
            {error && (
              <div className="flex items-start gap-4 p-5 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/30">
                <div className="size-9 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-base">error</span>
                </div>
                <div>
                  <p className="font-bold text-sm text-red-700 dark:text-red-400">{t('hp.errTitle')}</p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Success */}
            {saved && (
              <div className="flex items-start gap-4 p-5 rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/30">
                <div className="size-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-base">check_circle</span>
                </div>
                <div>
                  <p className="font-bold text-sm text-emerald-700 dark:text-emerald-400">{t('hp.successTitle')}</p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">{t('hp.successDesc')}</p>
                </div>
              </div>
            )}

            <form id="health-profile-form" onSubmit={handleSubmit} className="space-y-10">

              {/* Section 1: Basic Info */}
              <section>
                <SectionLabel>{t('hp.sec1label')}</SectionLabel>
                <SectionTitle icon="person" iconBg="bg-primary" title={t('hp.sec1title')} />
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <FieldLabel icon="badge" label={t('hp.fullName')} />
                      <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe" className={inputCls} />
                    </div>
                    <div>
                      <FieldLabel icon="cake" label={t('hp.dob')} />
                      <input type="date" value={dob} onChange={e => setDob(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <FieldLabel icon="wc" label={t('hp.gender')} />
                      <select value={gender} onChange={e => setGender(e.target.value as any)} className={inputCls}>
                        <option value="">{t('hp.genderSelect')}</option>
                        <option value="male">{t('hp.genderMale')}</option>
                        <option value="female">{t('hp.genderFemale')}</option>
                        <option value="other">{t('hp.genderOther')}</option>
                      </select>
                    </div>
                    <div>
                      <FieldLabel icon="height" label={t('hp.height')} />
                      <input type="number" min={50} max={250} value={heightCm} onChange={e => setHeightCm(e.target.value)} placeholder="170" className={inputCls} />
                    </div>
                    <div>
                      <FieldLabel icon="monitor_weight" label={t('hp.weight')} />
                      <div className="relative">
                        <input type="number" min={1} max={300} value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="65" className={inputCls} />
                        {bmi && bmiResult && (
                          <div className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${bmiResult.cls}`}>
                            <span>BMI {bmi}</span>
                            <span className="opacity-70">· {bmiResult.label}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <FieldLabel icon="bloodtype" label={t('hp.bloodType')} />
                      <div className="flex flex-wrap gap-2">
                        {(['', ...BLOOD_TYPES.filter(bt => bt !== 'unknown')] as const).map(bt => (
                          <button key={bt} type="button" onClick={() => setBloodType(bt as any)}
                            className={`px-3.5 py-1.5 rounded-xl text-sm font-bold border-2 transition-all ${
                              bloodType === bt
                                ? 'border-primary bg-primary text-white'
                                : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-primary/40 hover:text-primary'
                            }`}>
                            {bt === '' ? t('hp.bloodUnknown') : bt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 2: Medical History */}
              <section>
                <SectionLabel>{t('hp.sec2label')}</SectionLabel>
                <SectionTitle icon="history" iconBg="bg-violet-500" title={t('hp.sec2title')} />
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
                  <TagInput label={t('hp.chronicCond')} icon="monitor_heart" values={chronicDiseases} onChange={setChronicDiseases} placeholder={t('hp.chronicPh')} />
                  <div className="border-t border-slate-100 dark:border-slate-800" />
                  <TagInput label={t('hp.pastSurgeries')} icon="surgical" values={pastSurgeries} onChange={setPastSurgeries} placeholder={t('hp.surgeryPh')} />
                </div>
              </section>

              {/* Section 3: Allergies */}
              <section>
                <SectionLabel>{t('hp.sec3label')}</SectionLabel>
                <SectionTitle icon="warning" iconBg="bg-red-500" title={t('hp.sec3title')} />
                <div className="rounded-2xl border border-red-100 dark:border-red-900/30 overflow-hidden shadow-sm">
                  <div className="flex items-start gap-3 px-6 py-4 bg-red-50 dark:bg-red-950/20 border-b border-red-100 dark:border-red-900/30">
                    <div className="size-7 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-sm">info</span>
                    </div>
                    <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
                      <strong>⚠</strong> {t('hp.allergyWarning')}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-6 space-y-6">
                    <TagInput label={t('hp.drugAllergies')} icon="medication" values={drugAllergies} onChange={setDrugAllergies} placeholder={t('hp.drugAllergyPh')} tagColor="red" />
                    <div className="border-t border-slate-100 dark:border-slate-800" />
                    <TagInput label={t('hp.foodAllergies')} icon="restaurant" values={foodAllergies} onChange={setFoodAllergies} placeholder={t('hp.foodAllergyPh')} tagColor="amber" />
                  </div>
                </div>
              </section>

              {/* Section 4: Medications */}
              <section>
                <SectionLabel>{t('hp.sec4label')}</SectionLabel>
                <SectionTitle icon="medication" iconBg="bg-emerald-500" title={t('hp.sec4title')} />
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t('hp.addMed')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input value={medInput.name} onChange={e => setMedInput(p => ({ ...p, name: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMedication() } }}
                        placeholder={t('hp.medNamePh')} className={inputCls} />
                      <input value={medInput.dosage} onChange={e => setMedInput(p => ({ ...p, dosage: e.target.value }))}
                        placeholder={t('hp.medDosagePh')} className={inputCls} />
                      <div className="flex gap-2">
                        <input value={medInput.frequency} onChange={e => setMedInput(p => ({ ...p, frequency: e.target.value }))}
                          placeholder={t('hp.medFreqPh')} className={`${inputCls} flex-1`} />
                        <button type="button" onClick={addMedication}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-colors shrink-0">
                          {t('action.add')}
                        </button>
                      </div>
                    </div>
                  </div>
                  {medications.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {medications.map((m, i) => (
                        <div key={i} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-sm">medication</span>
                          </div>
                          <span className="font-semibold text-sm flex-1 text-slate-800 dark:text-slate-200">{m.name}</span>
                          {m.dosage && <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{m.dosage}</span>}
                          {m.frequency && <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{m.frequency}</span>}
                          <button type="button" onClick={() => setMedications(medications.filter((_, j) => j !== i))}
                            className="size-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center transition-colors">
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-3xl">medication</span>
                      <p className="text-sm text-slate-400">{t('hp.noMeds')}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Section 5: Emergency Contact */}
              <section>
                <SectionLabel>{t('hp.sec5label')}</SectionLabel>
                <SectionTitle icon="emergency" iconBg="bg-amber-500" title={t('hp.sec5title')} />
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <FieldLabel icon="person" label={t('hp.ecName')} />
                      <input value={ecName} onChange={e => setEcName(e.target.value)} placeholder="Jane Doe" className={inputCls} />
                    </div>
                    <div>
                      <FieldLabel icon="phone" label={t('hp.ecPhone')} />
                      <input value={ecPhone} onChange={e => setEcPhone(e.target.value)} placeholder="+1 234 567 890" className={inputCls} />
                    </div>
                    <div>
                      <FieldLabel icon="family_restroom" label={t('hp.ecRelation')} />
                      <input value={ecRelation} onChange={e => setEcRelation(e.target.value)} placeholder="Parent, Spouse…" className={inputCls} />
                    </div>
                  </div>
                </div>
              </section>

              {/* Submit bottom */}
              <div className="flex justify-end">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-10 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none">
                  {saving
                    ? <><span className="material-symbols-outlined animate-spin">progress_activity</span> {t('hp.saving')}</>
                    : <><span className="material-symbols-outlined">save</span> {t('hp.saveBtn')}</>
                  }
                </button>
              </div>
            </form>

            <p className="text-center text-xs text-slate-400 pb-4">{t('settings.footer')}</p>
          </>
        )}
      </div>
    </>
  )
}
