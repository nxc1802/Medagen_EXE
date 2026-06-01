import PublicPageLayout from '../components/PublicPageLayout'

const SECTIONS = [
  {
    icon: 'database',
    title: 'Information We Collect',
    content: [
      { heading: 'Account Information', body: 'When you register, we collect your email address and a securely hashed password. You may optionally provide a display name.' },
      { heading: 'Health Profile', body: 'You may voluntarily enter health data such as age, sex, known allergies, chronic conditions, and current medications. This data is used solely to personalise your AI diagnosis and care plan.' },
      { heading: 'Diagnostic Images', body: 'Photos you upload for skin analysis are processed by our AI model and stored in encrypted form attached to your account.' },
      { heading: 'Usage Data', body: 'We collect standard server logs (IP address, browser type, pages visited) to maintain service reliability. This data is anonymised after 30 days.' },
    ],
  },
  {
    icon: 'manage_accounts',
    title: 'How We Use Your Information',
    content: [
      { heading: 'Delivering the Service', body: 'Your data is used to analyse skin images, generate diagnoses, create personalised care plans, and surface nearby healthcare facilities.' },
      { heading: 'Service Improvement', body: 'Anonymised and aggregated data may be used to improve AI model accuracy. No individually identifiable data is used for model training without explicit consent.' },
      { heading: 'Communications', body: 'We may send transactional emails (account verification, password reset). We will not send marketing emails without your explicit opt-in.' },
    ],
  },
  {
    icon: 'share',
    title: 'Data Sharing & Disclosure',
    content: [
      { heading: 'No Sale of Data', body: 'We do not sell, rent, or trade your personal or health information to any third party, ever.' },
      { heading: 'Service Providers', body: 'We engage Supabase for database and authentication infrastructure, and Google Cloud for AI inference. Both are bound by data processing agreements that restrict use to service delivery only.' },
      { heading: 'Legal Requirements', body: 'We may disclose data if required by applicable law, court order, or governmental authority, and will notify you where legally permitted to do so.' },
    ],
  },
  {
    icon: 'lock',
    title: 'Security',
    content: [
      { heading: 'Encryption', body: 'All data is encrypted in transit using TLS 1.3 and encrypted at rest using AES-256 via Supabase infrastructure.' },
      { heading: 'Access Controls', body: 'Health data is scoped to your authenticated user account. MedaGen staff access is role-based and audited.' },
      { heading: 'Breach Response', body: 'In the event of a data breach affecting your personal data, we will notify you and relevant authorities within 72 hours as required by applicable regulations.' },
    ],
  },
  {
    icon: 'verified_user',
    title: 'Your Rights',
    content: [
      { heading: 'Access & Portability', body: 'You may request a full export of your personal data at any time from Settings → Account → Export Data.' },
      { heading: 'Correction', body: 'You may update your health profile and account information directly within the application.' },
      { heading: 'Deletion', body: 'You may delete your account and all associated data from Settings → Account → Delete Account. Deletion is permanent and processed within 30 days.' },
      { heading: 'Withdrawal of Consent', body: 'Where processing is based on consent, you may withdraw it at any time by contacting us at privacy@medagen.ai.' },
    ],
  },
  {
    icon: 'child_care',
    title: 'Children\'s Privacy',
    content: [
      { heading: 'Age Restriction', body: 'MedaGen is not directed at children under the age of 13. We do not knowingly collect personal data from children. If you believe a child has provided us with data, please contact us immediately.' },
    ],
  },
  {
    icon: 'update',
    title: 'Changes to This Policy',
    content: [
      { heading: 'Notification', body: 'We will notify registered users of material changes to this policy by email at least 14 days before the changes take effect. Continued use of the service after the effective date constitutes acceptance of the updated policy.' },
    ],
  },
]

export default function PrivacyPolicyPage() {
  return (
    <PublicPageLayout>
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/90 to-primary py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white translate-x-32 -translate-y-32" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-3">Legal</p>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">Privacy Policy</h1>
          <p className="text-white/75 text-base max-w-xl mx-auto">Last updated: January 1, 2025. We are committed to protecting your personal and health information.</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-14 space-y-12">
        {/* Intro */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-2xl p-6 flex gap-4">
          <span className="material-symbols-outlined text-blue-500 text-2xl shrink-0 mt-0.5">info</span>
          <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
            MedaGen AI Technologies ("we", "our", "us") operates the MedaGen platform. This policy explains how we collect, use, and protect your data when you use our service. Please read it carefully before using MedaGen.
          </p>
        </div>

        {SECTIONS.map((section) => (
          <section key={section.title}>
            <div className="flex items-center gap-3 mb-6">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-lg">{section.icon}</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">{section.title}</h2>
            </div>
            <div className="space-y-5">
              {section.content.map((item) => (
                <div key={item.heading} className="pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">{item.heading}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Contact block */}
        <div className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-8 text-center">
          <span className="material-symbols-outlined text-primary text-3xl mb-3 block">mail</span>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Questions about this policy?</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Our privacy team responds within 2 business days.</p>
          <a href="mailto:privacy@medagen.ai" className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all">
            <span className="material-symbols-outlined text-sm">mail</span>
            privacy@medagen.ai
          </a>
        </div>
      </div>
    </PublicPageLayout>
  )
}
