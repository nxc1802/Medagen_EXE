import PublicPageLayout from '../components/PublicPageLayout'

const TEAM = [
  {
    name: 'Dr. Linh Nguyen',
    role: 'Co-founder & Chief Medical Officer',
    bio: 'Board-certified dermatologist with 12 years of clinical experience. Former faculty at University of Medicine and Pharmacy HCMC. Leads all clinical validation and medical oversight at MedaGen.',
    icon: 'stethoscope',
    color: 'from-rose-400 to-rose-600',
    tags: ['Dermatology', 'Clinical AI', 'Research'],
  },
  {
    name: 'Minh Tran',
    role: 'Co-founder & Chief Technology Officer',
    bio: 'PhD in Computer Vision from VinAI Research. Previously ML Lead at a Series B healthtech startup. Architected MedaGen\'s deep learning pipeline and inference infrastructure.',
    icon: 'neurology',
    color: 'from-violet-400 to-violet-600',
    tags: ['Machine Learning', 'Computer Vision', 'Infrastructure'],
  },
  {
    name: 'Huy Hoang',
    role: 'Lead Full-Stack Engineer',
    bio: 'FPT University alumni specialising in React, Node.js, and AI integrations. Built the MedaGen platform from the ground up, including the ReAct agent, telehealth pipeline, and real-time chat system.',
    icon: 'code',
    color: 'from-primary to-blue-600',
    tags: ['React', 'Node.js', 'AI Agents'],
  },
  {
    name: 'Thu Pham',
    role: 'Head of Product',
    bio: 'Former product manager at Grab Health. Passionate about making complex health technology feel effortless. Owns the end-to-end user experience from onboarding to post-diagnosis care.',
    icon: 'design_services',
    color: 'from-amber-400 to-amber-600',
    tags: ['Product Strategy', 'UX Research', 'Growth'],
  },
  {
    name: 'Duc Le',
    role: 'AI Research Scientist',
    bio: 'MSc in Biomedical Engineering from Hanoi University of Science and Technology. Focuses on model accuracy, bias reduction, and expanding the conditions MedaGen can detect.',
    icon: 'science',
    color: 'from-emerald-400 to-emerald-600',
    tags: ['Deep Learning', 'Biomedical AI', 'Dataset Curation'],
  },
  {
    name: 'An Vo',
    role: 'Head of Partnerships & Growth',
    bio: 'Built strategic relationships with healthcare networks across Southeast Asia. Manages telehealth partnerships and clinic integrations that power the map recommendation feature.',
    icon: 'handshake',
    color: 'from-teal-400 to-teal-600',
    tags: ['Partnerships', 'Business Development', 'SEA Markets'],
  },
]

const ADVISORS = [
  { name: 'Prof. David Chen', title: 'Clinical AI Advisor', org: 'Stanford School of Medicine' },
  { name: 'Dr. Sara Okonkwo', title: 'Global Health Advisor', org: 'WHO Digital Health Initiative' },
  { name: 'James Park', title: 'Investment Advisor', org: 'Sequoia Capital Southeast Asia' },
]

export default function OurTeamPage() {
  return (
    <PublicPageLayout>
      {/* Hero */}
      <section className="py-20 text-center bg-gradient-to-b from-slate-50 dark:from-slate-900/50 to-transparent px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-6">
          <span className="material-symbols-outlined text-sm">diversity_3</span>
          THE PEOPLE
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-5">
          Meet the Team
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          We are a multidisciplinary team of clinicians, AI researchers, engineers, and designers united by a single mission: making quality skin health accessible to everyone.
        </p>
      </section>

      {/* Team grid */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TEAM.map(({ name, role, bio, icon, color, tags }) => (
            <div key={name} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-shadow overflow-hidden group">
              {/* Avatar */}
              <div className={`h-40 bg-gradient-to-br ${color} flex items-center justify-center relative overflow-hidden`}>
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white translate-x-8 -translate-y-8" />
                </div>
                <div className="size-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center relative z-10">
                  <span className="material-symbols-outlined text-white text-4xl">{icon}</span>
                </div>
              </div>
              {/* Info */}
              <div className="p-6">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-0.5">{name}</h3>
                <p className="text-xs font-semibold text-primary mb-3">{role}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">{bio}</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Advisors */}
      <section className="py-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Advisory Board</p>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">World-Class Advisors</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ADVISORS.map(({ name, title, org }) => (
              <div key={name} className="flex flex-col items-center text-center p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <div className="size-14 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-2xl">person</span>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white">{name}</h3>
                <p className="text-sm text-primary font-semibold">{title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{org}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join us */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span className="material-symbols-outlined text-primary text-4xl mb-4 block">work</span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Join Our Team</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            We are always looking for passionate people who want to make a real impact in healthcare. Check out our open roles or reach out directly.
          </p>
          <a
            href="mailto:careers@medagen.ai"
            className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3.5 rounded-xl font-bold hover:bg-primary/90 transition-all"
          >
            <span className="material-symbols-outlined text-sm">mail</span>
            careers@medagen.ai
          </a>
        </div>
      </section>
    </PublicPageLayout>
  )
}
