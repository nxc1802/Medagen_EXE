import { useNavigate } from 'react-router-dom'
import PublicPageLayout from '../components/PublicPageLayout'

const STATS = [
  { value: '50+', label: 'Conditions Detected' },
  { value: '99.2%', label: 'Prediction Accuracy' },
  { value: '24/7', label: 'AI Availability' },
  { value: '2025', label: 'Founded' },
]

const VALUES = [
  {
    icon: 'favorite',
    color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/30',
    title: 'Patient First',
    desc: 'Every feature we build starts with one question: does this genuinely help the person on the other side of the screen make a better health decision?',
  },
  {
    icon: 'science',
    color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/30',
    title: 'Clinically Rigorous',
    desc: 'We work with board-certified dermatologists to validate our models and ensure the guidance we provide meets a clinical standard of care.',
  },
  {
    icon: 'lock',
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30',
    title: 'Privacy by Design',
    desc: 'Health data is among the most sensitive information a person can share. We encrypt everything, share nothing, and give you full control over your data.',
  },
  {
    icon: 'diversity_3',
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30',
    title: 'Radically Accessible',
    desc: 'Dermatology expertise is unevenly distributed around the world. We are building technology that closes that gap — regardless of geography or income.',
  },
]

const MILESTONES = [
  { year: 'Nov 2025', title: 'Project Kickoff', desc: 'A team of AI researchers, engineers, and clinicians at FPT University begin building MedaGen as a capstone project with a real-world healthcare mission.' },
  { year: 'Dec 2025', title: 'First Working Model', desc: 'Initial deep learning model reaches 87% accuracy on a 20-condition validation set. Core diagnosis pipeline and Supabase backend go live.' },
  { year: 'Feb 2026', title: 'Beta Launch', desc: 'MedaGen opens to early users. AI Care Plan, telehealth map, and multi-language support ship in the same release.' },
  { year: 'Jun 2026', title: 'Accuracy Milestone', desc: 'Model accuracy reaches 99.2% after iterative fine-tuning with clinician feedback. ReAct agent and real-time chat added.' },
]

export default function AboutUsPage() {
  const navigate = useNavigate()

  return (
    <PublicPageLayout>
      {/* Hero */}
      <section className="relative py-24 overflow-hidden bg-gradient-to-br from-primary/5 to-transparent">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-primary blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto px-4 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-6">
            <span className="material-symbols-outlined text-sm">shield_moon</span>
            OUR STORY
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white leading-tight mb-6">
            Democratising Access to<br />
            <span className="text-primary">Skin Health</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            MedaGen was born out of a simple observation: world-class dermatology is available to very few people. We are changing that with AI that is fast, accurate, and available to anyone with a smartphone.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-primary">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-4xl font-black text-white mb-1">{value}</div>
                <div className="text-xs uppercase tracking-widest text-white/60">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 max-w-4xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Our Mission</p>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-5 leading-tight">
              Bridging the Gap Between AI and Clinical Care
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              More than 3 billion people live in areas where there is fewer than one dermatologist per 100,000 population. Skin conditions are the fourth-largest cause of non-fatal disease burden globally, yet most go undiagnosed or misdiagnosed.
            </p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              MedaGen was built from the ground up at FPT University starting in November 2025 — a focused team of students, engineers, and clinicians who believed a better first opinion on skin health should be available to everyone, not just those with access to a specialist.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {VALUES.map(({ icon, color, title, desc }) => (
              <div key={title} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <div className={`size-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
                  <span className={`material-symbols-outlined text-lg ${color.split(' ')[0]}`}>{icon}</span>
                </div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1">{title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Our Journey</p>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">From Research to Reality</h2>
          </div>
          <div className="space-y-0">
            {MILESTONES.map(({ year, title, desc }, i) => (
              <div key={year} className="flex gap-5">
                {/* Dot + connecting line */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="size-10 rounded-full bg-primary flex items-center justify-center ring-4 ring-white dark:ring-slate-900 z-10 shrink-0">
                    <span className="material-symbols-outlined text-white text-sm">check</span>
                  </div>
                  {i < MILESTONES.length - 1 && (
                    <div className="w-0.5 flex-1 min-h-6 bg-slate-200 dark:bg-slate-700 my-1" />
                  )}
                </div>
                {/* Content */}
                <div className={`flex-1 ${i < MILESTONES.length - 1 ? 'pb-8' : 'pb-2'}`}>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black text-primary bg-primary/10 mb-2">{year}</span>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1">{title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto bg-slate-900 dark:bg-primary/20 rounded-3xl p-12 border border-slate-800 dark:border-primary/30 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Join the mission</h2>
          <p className="text-slate-400 dark:text-slate-300 mb-8">
            Help us make dermatology expertise accessible to everyone, everywhere.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="bg-primary text-white px-8 py-4 rounded-xl font-bold hover:bg-primary/90 transition-all"
          >
            Get Started Free
          </button>
        </div>
      </section>
    </PublicPageLayout>
  )
}
