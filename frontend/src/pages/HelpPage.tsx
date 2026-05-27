import { useState } from 'react'
import { useSettings, useT } from '../contexts/SettingsContext'
import type { Language } from '../contexts/SettingsContext'

// ── Localized content ───────────────────────────────────────────────────────

const STEPS_EN = [
  { icon: 'add_photo_alternate', label: 'Upload or Capture',  desc: 'Take a clear photo of the affected skin area or upload one from your device.' },
  { icon: 'edit_note',           label: 'Describe Symptoms',  desc: 'Enter symptom details, duration, and severity for a more accurate result.' },
  { icon: 'auto_awesome',        label: 'AI Analysis',        desc: 'MedaGen analyses the image and returns a diagnosis with confidence scores.' },
  { icon: 'description',         label: 'Review & Act',       desc: 'Read your results, generate a Care Plan, and find nearby clinics on the map.' },
]

const STEPS_VI = [
  { icon: 'add_photo_alternate', label: 'Tải ảnh hoặc Chụp',  desc: 'Chụp ảnh rõ nét vùng da bị ảnh hưởng hoặc tải lên từ thiết bị của bạn.' },
  { icon: 'edit_note',           label: 'Mô tả triệu chứng',  desc: 'Nhập chi tiết triệu chứng, thời gian và mức độ nghiêm trọng để có kết quả chính xác hơn.' },
  { icon: 'auto_awesome',        label: 'AI phân tích',        desc: 'MedaGen phân tích ảnh và trả về chẩn đoán kèm điểm tin cậy.' },
  { icon: 'description',         label: 'Xem kết quả & Hành động', desc: 'Đọc kết quả, tạo kế hoạch chăm sóc và tìm phòng khám gần bạn trên bản đồ.' },
]

const STEPS_FR = [
  { icon: 'add_photo_alternate', label: 'Télécharger ou Capturer', desc: 'Prenez une photo claire de la zone cutanée affectée ou téléchargez-en une.' },
  { icon: 'edit_note',           label: 'Décrire les symptômes',   desc: 'Saisissez les détails des symptômes, la durée et la gravité.' },
  { icon: 'auto_awesome',        label: 'Analyse IA',              desc: 'MedaGen analyse l\'image et retourne un diagnostic avec scores de confiance.' },
  { icon: 'description',         label: 'Examiner & Agir',         desc: 'Lisez vos résultats, générez un plan de soins et trouvez des cliniques proches.' },
]

const STEPS_ZH = [
  { icon: 'add_photo_alternate', label: '上传或拍照',    desc: '拍摄受影响皮肤区域的清晰照片，或从设备上传一张。' },
  { icon: 'edit_note',           label: '描述症状',      desc: '输入症状详情、持续时间和严重程度，以获得更准确的结果。' },
  { icon: 'auto_awesome',        label: 'AI分析',        desc: 'MedaGen分析图像并返回带有置信度评分的诊断。' },
  { icon: 'description',         label: '查看并采取行动', desc: '阅读结果、生成护理计划，并在地图上找到附近诊所。' },
]

const STEPS: Record<Language, typeof STEPS_EN> = { en: STEPS_EN, vi: STEPS_VI, fr: STEPS_FR, zh: STEPS_ZH }

const TIPS_EN = [
  { icon: 'wb_sunny',            color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-900/40',   title: 'Use natural light',          desc: 'Take photos near a window in daylight. Avoid flash — it creates harsh shadows and washes out skin texture.' },
  { icon: 'center_focus_strong', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30',   border: 'border-blue-200 dark:border-blue-900/40',     title: 'Focus on the affected area', desc: 'Hold the camera 10–15 cm from the skin. Make sure the area fills most of the frame and is in sharp focus.' },
  { icon: 'water_drop',          color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-900/40', title: 'Keep skin clean and dry',  desc: 'Wipe away any cream, sweat, or makeup from the area before taking the photo for a cleaner reading.' },
  { icon: '360',                 color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-200 dark:border-violet-900/40', title: 'Capture multiple angles', desc: 'If the condition spans a large area, take 2–3 overlapping photos and submit the one showing the most representative symptoms.' },
]

const TIPS_VI = [
  { icon: 'wb_sunny',            color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30',         border: 'border-amber-200 dark:border-amber-900/40',         title: 'Dùng ánh sáng tự nhiên',     desc: 'Chụp ảnh gần cửa sổ vào ban ngày. Tránh dùng đèn flash vì tạo bóng cứng và làm mất kết cấu da.' },
  { icon: 'center_focus_strong', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30',             border: 'border-blue-200 dark:border-blue-900/40',             title: 'Lấy nét vào vùng da bệnh',   desc: 'Giữ camera cách da 10–15 cm. Đảm bảo vùng da chiếm phần lớn khung hình và rõ nét.' },
  { icon: 'water_drop',          color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-900/40', title: 'Giữ da sạch và khô',         desc: 'Lau sạch kem, mồ hôi hoặc trang điểm khỏi vùng da trước khi chụp để có kết quả phân tích tốt hơn.' },
  { icon: '360',                 color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/30',       border: 'border-violet-200 dark:border-violet-900/40',       title: 'Chụp nhiều góc',             desc: 'Nếu tình trạng trải rộng, chụp 2–3 ảnh chồng nhau và gửi ảnh thể hiện triệu chứng rõ nhất.' },
]

const TIPS_FR = [
  { icon: 'wb_sunny',            color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30',         border: 'border-amber-200 dark:border-amber-900/40',         title: 'Utilisez la lumière naturelle', desc: 'Photographiez près d\'une fenêtre en plein jour. Évitez le flash.' },
  { icon: 'center_focus_strong', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30',             border: 'border-blue-200 dark:border-blue-900/40',             title: 'Focalisez sur la zone',         desc: 'Tenez l\'appareil à 10–15 cm de la peau, zone bien cadrée et nette.' },
  { icon: 'water_drop',          color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-900/40', title: 'Peau propre et sèche',          desc: 'Essuyez toute crème, sueur ou maquillage avant la photo.' },
  { icon: '360',                 color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/30',       border: 'border-violet-200 dark:border-violet-900/40',       title: 'Plusieurs angles',              desc: 'Prenez 2–3 photos si la zone est étendue.' },
]

const TIPS_ZH = [
  { icon: 'wb_sunny',            color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30',         border: 'border-amber-200 dark:border-amber-900/40',         title: '使用自然光',       desc: '在白天靠近窗户拍照，避免使用闪光灯。' },
  { icon: 'center_focus_strong', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30',             border: 'border-blue-200 dark:border-blue-900/40',             title: '对准患处',         desc: '将相机保持在皮肤10-15厘米处，确保患处清晰对焦。' },
  { icon: 'water_drop',          color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-900/40', title: '保持皮肤清洁干燥',  desc: '拍照前擦去患处的乳霜、汗水或化妆品。' },
  { icon: '360',                 color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/30',       border: 'border-violet-200 dark:border-violet-900/40',       title: '拍多角度',         desc: '如果患处面积较大，拍2-3张重叠照片，提交最具代表性的一张。' },
]

const TIPS: Record<Language, typeof TIPS_EN> = { en: TIPS_EN, vi: TIPS_VI, fr: TIPS_FR, zh: TIPS_ZH }

const FAQS_EN = [
  { category: 'Accuracy',   q: 'How accurate is MedaGen\'s skin analysis?',                a: 'MedaGen uses AI trained on dermatology datasets to identify patterns in skin conditions. It provides guidance and probability scores, but is not a replacement for a licensed dermatologist. Always consult a doctor for a confirmed diagnosis.' },
  { category: 'Conditions', q: 'What types of skin conditions can MedaGen detect?',         a: 'MedaGen can flag a wide range of common skin conditions including fungal infections, eczema, psoriasis, acne, rosacea, and other dermatological patterns. For rare or complex conditions, in-person examination is strongly recommended.' },
  { category: 'Results',    q: 'Why did my analysis come back inconclusive?',               a: 'Inconclusive results usually happen when the photo is blurry, taken in poor lighting, or the affected area is not centered in the frame. Try retaking the photo in natural daylight with the skin area clearly visible and in focus.' },
  { category: 'Privacy',    q: 'Is my health data stored securely?',                        a: 'Yes. All data is encrypted in transit and at rest via Supabase infrastructure. Your health profile and diagnosis history are private and only accessible by your account. We never sell or share personal health data.' },
  { category: 'Care Plan',  q: 'How does the Care Plan work?',                              a: 'After you have at least one diagnosis, MedaGen\'s AI reads your diagnosis history and health profile — including allergies, chronic conditions, and current medications — to generate a personalized care plan covering lifestyle, nutrition, exercise, and OTC suggestions.' },
  { category: 'Usage',      q: 'Can I use MedaGen for children or elderly patients?',       a: 'MedaGen is designed for general adult use. For children under 12 or elderly patients with complex medical backgrounds, please consult a healthcare professional directly rather than relying solely on AI analysis.' },
  { category: 'Account',    q: 'How do I delete my account or data?',                       a: 'Go to Settings → Account → Delete Account. All associated data including your health profile, diagnosis history, and care plans will be permanently removed within 30 days.' },
]

const FAQS_VI = [
  { category: 'Độ chính xác', q: 'Độ chính xác của phân tích da MedaGen là bao nhiêu?',         a: 'MedaGen sử dụng AI được đào tạo trên bộ dữ liệu da liễu để nhận dạng các mẫu bệnh da. Hệ thống cung cấp hướng dẫn và điểm xác suất, nhưng không thay thế bác sĩ da liễu có chứng chỉ. Hãy luôn tham khảo bác sĩ để có chẩn đoán chính xác.' },
  { category: 'Tình trạng',   q: 'MedaGen có thể phát hiện loại bệnh da nào?',                  a: 'MedaGen có thể nhận biết nhiều loại bệnh da thường gặp như nhiễm nấm, chàm, vẩy nến, mụn trứng cá, rosacea và các mẫu da liễu khác. Đối với các bệnh hiếm gặp hoặc phức tạp, khám trực tiếp được khuyến nghị mạnh mẽ.' },
  { category: 'Kết quả',      q: 'Tại sao kết quả phân tích của tôi không rõ ràng?',             a: 'Kết quả không rõ ràng thường xảy ra khi ảnh bị mờ, chụp trong điều kiện ánh sáng kém hoặc vùng da không nằm chính giữa khung hình. Hãy chụp lại ảnh dưới ánh sáng tự nhiên với vùng da nhìn thấy rõ và đúng tiêu cự.' },
  { category: 'Bảo mật',      q: 'Dữ liệu sức khỏe của tôi có được lưu trữ an toàn không?',     a: 'Có. Tất cả dữ liệu được mã hóa trong quá trình truyền và lưu trữ qua cơ sở hạ tầng Supabase. Hồ sơ sức khỏe và lịch sử chẩn đoán của bạn là riêng tư và chỉ bạn mới truy cập được. Chúng tôi không bao giờ bán hoặc chia sẻ dữ liệu sức khỏe cá nhân.' },
  { category: 'Kế hoạch',     q: 'Kế hoạch chăm sóc hoạt động như thế nào?',                    a: 'Sau khi có ít nhất một chẩn đoán, AI của MedaGen đọc lịch sử chẩn đoán và hồ sơ sức khỏe — bao gồm dị ứng, bệnh mãn tính và thuốc đang dùng — để tạo kế hoạch cá nhân hóa về lối sống, dinh dưỡng, tập luyện và thuốc không kê đơn.' },
  { category: 'Sử dụng',      q: 'Tôi có thể dùng MedaGen cho trẻ em hoặc bệnh nhân cao tuổi không?', a: 'MedaGen được thiết kế cho người dùng người lớn nói chung. Đối với trẻ em dưới 12 tuổi hoặc bệnh nhân cao tuổi có tiền sử bệnh phức tạp, hãy tham khảo trực tiếp chuyên gia y tế thay vì chỉ dựa vào phân tích AI.' },
  { category: 'Tài khoản',    q: 'Làm thế nào để xóa tài khoản hoặc dữ liệu của tôi?',          a: 'Vào Cài đặt → Tài khoản → Xóa tài khoản. Tất cả dữ liệu liên quan bao gồm hồ sơ sức khỏe, lịch sử chẩn đoán và kế hoạch chăm sóc sẽ bị xóa vĩnh viễn trong vòng 30 ngày.' },
]

const FAQS_FR = [
  { category: 'Précision',   q: 'Quelle est la précision de l\'analyse de MedaGen?',             a: 'MedaGen utilise une IA entraînée sur des données dermatologiques pour identifier des schémas cutanés. Elle fournit des orientations et des scores de probabilité, mais ne remplace pas un dermatologue agréé.' },
  { category: 'Conditions',  q: 'Quels types d\'affections cutanées MedaGen peut-il détecter?',  a: 'MedaGen peut signaler de nombreuses affections courantes : infections fongiques, eczéma, psoriasis, acné, rosacée, etc. Pour les cas rares ou complexes, un examen en personne est vivement recommandé.' },
  { category: 'Résultats',   q: 'Pourquoi mon analyse est-elle revenue peu concluante?',          a: 'Des résultats peu concluants surviennent généralement quand la photo est floue, prise dans de mauvaises conditions d\'éclairage, ou que la zone n\'est pas centrée. Reprenez la photo en plein jour.' },
  { category: 'Confidential',q: 'Mes données de santé sont-elles stockées en sécurité?',          a: 'Oui. Toutes les données sont chiffrées en transit et au repos via Supabase. Votre profil et votre historique sont privés et accessibles uniquement par votre compte.' },
  { category: 'Plan',        q: 'Comment fonctionne le plan de soins?',                           a: 'Après au moins un diagnostic, l\'IA lit votre historique et profil de santé pour générer un plan personnalisé couvrant le style de vie, la nutrition, l\'exercice et les médicaments.' },
  { category: 'Usage',       q: 'Puis-je utiliser MedaGen pour des enfants ou des personnes âgées?', a: 'MedaGen est conçu pour un usage adulte général. Pour les enfants de moins de 12 ans ou les patients âgés avec des antécédents médicaux complexes, consultez directement un professionnel de santé.' },
  { category: 'Compte',      q: 'Comment supprimer mon compte ou mes données?',                   a: 'Allez dans Paramètres → Compte → Supprimer le compte. Toutes les données seront supprimées définitivement dans les 30 jours.' },
]

const FAQS_ZH = [
  { category: '准确性', q: 'MedaGen的皮肤分析有多准确?',            a: 'MedaGen使用在皮肤病数据集上训练的AI来识别皮肤状况模式。它提供指导和概率评分，但不能替代执业皮肤科医生。请务必咨询医生以获得确认诊断。' },
  { category: '疾病',   q: 'MedaGen可以检测哪些皮肤疾病?',          a: 'MedaGen可以标记多种常见皮肤疾病，包括真菌感染、湿疹、银屑病、痤疮、玫瑰痤疮等。对于罕见或复杂疾病，强烈建议当面检查。' },
  { category: '结果',   q: '为什么我的分析结果不确定?',              a: '不确定结果通常发生在照片模糊、光线不佳或患处未居中的情况下。请在自然光下重新拍照，确保患处清晰可见。' },
  { category: '隐私',   q: '我的健康数据是否安全存储?',              a: '是的。所有数据通过Supabase基础设施进行传输和存储加密。您的健康档案和诊断历史是私密的，只有您的账户可以访问。我们绝不出售或共享个人健康数据。' },
  { category: '护理',   q: '护理计划如何运作?',                      a: '至少完成一次诊断后，MedaGen的AI会读取您的诊断历史和健康档案（包括过敏史、慢性病和当前用药），生成涵盖生活方式、营养、运动和非处方药的个性化护理计划。' },
  { category: '使用',   q: 'MedaGen可以用于儿童或老年患者吗?',       a: 'MedaGen专为一般成人使用设计。对于12岁以下儿童或有复杂病史的老年患者，请直接咨询医疗专业人员，而不要仅依赖AI分析。' },
  { category: '账户',   q: '如何删除我的账户或数据?',                a: '前往设置→账户→删除账户。所有相关数据（包括健康档案、诊断历史和护理计划）将在30天内被永久删除。' },
]

const FAQS: Record<Language, typeof FAQS_EN> = { en: FAQS_EN, vi: FAQS_VI, fr: FAQS_FR, zh: FAQS_ZH }

// ── Components ───────────────────────────────────────────────────────────────

function FAQItem({ q, a, category }: { q: string; a: string; category: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors ${open ? 'bg-primary/[0.02]' : ''}`}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-start justify-between gap-4 py-5 px-6 text-left group">
        <div className="flex items-start gap-3 min-w-0">
          <span className="mt-0.5 shrink-0 inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase text-primary bg-primary/10">
            {category}
          </span>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors leading-snug">{q}</span>
        </div>
        <span className={`material-symbols-outlined text-slate-400 text-base shrink-0 mt-0.5 transition-transform duration-300 ${open ? 'rotate-180 text-primary' : ''}`}>
          expand_more
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-48' : 'max-h-0'}`}>
        <p className="px-6 pb-5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed pl-[calc(1.5rem+theme(spacing.16))]">{a}</p>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">{children}</p>
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const t = useT()
  const { language } = useSettings()
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'question' | 'other'>('question')

  const FEEDBACK_TYPES = [
    { value: 'bug'      as const, icon: 'bug_report',  label: t('help.feedbackBug') },
    { value: 'feature'  as const, icon: 'lightbulb',   label: t('help.feedbackFeature') },
    { value: 'question' as const, icon: 'help',        label: t('help.feedbackQuestion') },
    { value: 'other'    as const, icon: 'chat_bubble', label: t('help.feedbackOther') },
  ]

  const steps = STEPS[language] ?? STEPS.en
  const tips  = TIPS[language]  ?? TIPS.en
  const faqs  = FAQS[language]  ?? FAQS.en

  const handleFeedback = (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedbackText.trim()) return
    setFeedbackSent(true)
    setFeedbackText('')
  }

  return (
    <>
      {/* Sticky header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">help</span>
          <h2 className="text-xl font-bold tracking-tight">{t('help.title')}</h2>
        </div>
        <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full font-medium">
          {t('help.version')}
        </span>
      </header>

      {/* Hero banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/90 to-primary px-8 py-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white translate-x-32 -translate-y-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white -translate-x-16 translate-y-16" />
        </div>
        <div className="relative max-w-3xl mx-auto">
          <p className="text-white/60 text-sm font-semibold uppercase tracking-widest mb-2">{t('help.heroLabel')}</p>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight">{t('help.heroTitle')}</h1>
          <p className="text-white/75 text-base max-w-xl leading-relaxed">{t('help.heroParagraph')}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-10 space-y-14">

        {/* ── Quick Start ── */}
        <section>
          <SectionLabel>{t('help.gettingStarted')}</SectionLabel>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">{t('help.stepsTitle')}</h2>
          <div className="relative">
            <div className="hidden sm:block absolute top-5 left-5 right-5 h-px bg-slate-200 dark:bg-slate-700" style={{ left: '2.25rem', right: '2.25rem' }} />
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 relative">
              {steps.map((step, i) => (
                <div key={i} className="flex flex-col items-center text-center gap-3">
                  <div className="relative size-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30 shrink-0 z-10">
                    <span className="material-symbols-outlined text-sm">{step.icon}</span>
                    <span className="absolute -top-1 -right-1 size-4 rounded-full bg-white dark:bg-slate-900 border-2 border-primary text-primary text-[8px] font-black flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1">{step.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Tips ── */}
        <section>
          <SectionLabel>{t('help.bestPractices')}</SectionLabel>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">{t('help.tipsTitle')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tips.map((tip, i) => (
              <div key={i} className={`flex gap-4 p-5 bg-white dark:bg-slate-900 rounded-xl border ${tip.border} shadow-sm hover:shadow-md transition-shadow`}>
                <div className={`size-10 rounded-xl ${tip.color} flex items-center justify-center shrink-0`}>
                  <span className={`material-symbols-outlined text-base ${tip.color.split(' ')[0]}`}>{tip.icon}</span>
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1">{tip.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section>
          <SectionLabel>{t('help.faqLabel')}</SectionLabel>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">{t('help.faqTitle')}</h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {faqs.map((faq, i) => (
              <FAQItem key={i} q={faq.q} a={faq.a} category={faq.category} />
            ))}
          </div>
        </section>

        {/* ── Medical Disclaimer ── */}
        <div className="flex gap-4 p-6 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20">
          <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-base">medical_information</span>
          </div>
          <div>
            <p className="font-bold text-sm text-amber-800 dark:text-amber-300 mb-1">{t('help.disclaimer')}</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">{t('help.disclaimerText')}</p>
          </div>
        </div>

        {/* ── Feedback ── */}
        <section>
          <SectionLabel>{t('help.contactLabel')}</SectionLabel>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">{t('help.contactTitle')}</h2>

          {feedbackSent ? (
            <div className="flex flex-col items-center gap-4 py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <div className="size-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-2xl">check_circle</span>
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-100">{t('help.thankYou')}</p>
                <p className="text-sm text-slate-500 mt-1">{t('help.thankYouDesc')}</p>
              </div>
              <button onClick={() => setFeedbackSent(false)} className="mt-2 text-sm text-primary font-semibold hover:underline">
                {t('help.sendAnother')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleFeedback} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    {t('help.feedbackTypeLabel')}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {FEEDBACK_TYPES.map(type => (
                      <button key={type.value} type="button" onClick={() => setFeedbackType(type.value)}
                        className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-semibold transition-all ${
                          feedbackType === type.value
                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-primary/40 hover:text-primary'
                        }`}>
                        <span className={`material-symbols-outlined text-lg ${feedbackType === type.value ? 'text-primary' : ''}`}>{type.icon}</span>
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('help.msgLabel')}</label>
                  <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} rows={4}
                    placeholder={t('help.msgPh')}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none text-slate-900 dark:text-white placeholder:text-slate-400" />
                  <p className="text-xs text-slate-400 mt-1 text-right">{feedbackText.length} / 500</p>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">lock</span>
                  {t('help.privacyNote')}
                </p>
                <button type="submit" disabled={!feedbackText.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-primary/20">
                  <span className="material-symbols-outlined text-sm">send</span>
                  {t('help.sendBtn')}
                </button>
              </div>
            </form>
          )}
        </section>

        <div className="flex flex-col items-center gap-1 pb-6 text-center">
          <p className="text-xs text-slate-400">{t('help.urgentNote')}</p>
          <p className="text-xs text-slate-300 dark:text-slate-600">{t('help.version')} · {t('nav.subtitle')}</p>
        </div>

      </div>
    </>
  )
}
