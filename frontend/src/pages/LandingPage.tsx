import { Link, useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-3xl">shield_moon</span>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">MedaGen</h2>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a className="text-sm font-medium hover:text-primary transition-colors" href="#how-it-works">How it works</a>
              <a className="text-sm font-medium hover:text-primary transition-colors" href="#features">Features</a>
              <a className="text-sm font-medium hover:text-primary transition-colors" href="#trust">Why Trust Us</a>
              <button
                onClick={() => navigate('/login')}
                className="bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-sm"
              >
                Get Started
              </button>
            </nav>
            <div className="md:hidden">
              <span className="material-symbols-outlined cursor-pointer">menu</span>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-6">
                <span className="material-symbols-outlined text-sm">verified_user</span>
                CLINICALLY BACKED AI
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white leading-tight mb-6">
                Instant Skin Analysis{' '}
                <span className="text-primary">Powered by AI</span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-xl mx-auto lg:mx-0">
                Fast, accurate, and reliable skin diagnosis from the comfort of your home. MedaGen uses advanced neural networks to identify over 50 skin conditions in seconds.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto bg-primary text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">camera_enhance</span>
                  Start Diagnosis
                </button>
                <a
                  href="#how-it-works"
                  className="w-full sm:w-auto bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-200 transition-all text-center"
                >
                  Learn More
                </a>
              </div>
            </div>

            <div className="flex-1 relative">
              <div className="relative z-10 w-full aspect-square max-w-lg mx-auto bg-gradient-to-tr from-primary/20 to-transparent rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDw-1UOkYS8CslbMukCJC8G6GP9SaEOZUymxhg9HZSIDznKesLzrzF9nyOC1aLj9JilEiigWtyi9JRnSnfg3vxrReiHiwjkD18eWB5PpuzeFT7cK8L-jQb98jQaBm2tIsVdLAwbE6u1xoB8Fdab04isnNXKRjBB8_MSG5DMh3lqNDM23ooOXGkCEdk6z5RPxK9KR4DO47hueH0VCplTjq8d6Abs6rrFks6nP57QZuZEtOpE5MnkhoR4I-Ah4OgUsc__ev969jtV33NM')" }}
                />
                <div className="absolute bottom-6 left-6 right-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-4 rounded-xl shadow-lg border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="size-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary">check_circle</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Latest Result</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Dermatitis detected — 98.4% Accuracy</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-10 -right-10 size-40 bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 size-40 bg-primary/20 rounded-full blur-3xl" />
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 bg-white dark:bg-slate-900" id="how-it-works">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">Three Simple Steps</h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg">
                Our AI analyzes your skin images to provide instant insights and professional guidance in minutes.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                { icon: 'add_a_photo', step: '1. Upload Photo', desc: 'Take a clear photo of the affected area using your phone or upload from gallery.' },
                { icon: 'neurology', step: '2. AI Analysis', desc: 'Our deep learning model scans for markers and compares them to thousands of cases.' },
                { icon: 'description', step: '3. Detailed Report', desc: 'Receive a comprehensive PDF report with potential conditions and next steps.' },
              ].map(({ icon, step, desc }) => (
                <div key={step} className="group flex flex-col items-center text-center">
                  <div className="size-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <span className="material-symbols-outlined text-4xl text-primary group-hover:text-white">{icon}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust & Indicators */}
        <section className="py-20" id="trust">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-primary rounded-[2rem] p-8 md:p-16 text-white relative overflow-hidden">
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">
                    Advanced Accuracy Meets Human Expertise
                  </h2>
                  <p className="text-white/80 text-lg mb-8">
                    We don't just stop at AI. MedaGen bridges the gap between digital prediction and professional healthcare.
                  </p>
                  <div className="space-y-4">
                    {[
                      { icon: 'health_and_safety', title: '99.2% Prediction Accuracy', desc: 'Trained on over 1.5 million dermatological images.' },
                      { icon: 'medical_services', title: 'Telehealth Ready', desc: 'Connect with certified dermatologists for a second opinion.' },
                      { icon: 'lock', title: 'HIPAA Compliant', desc: 'Your medical data is encrypted and strictly private.' },
                    ].map(({ icon, title, desc }) => (
                      <div key={title} className="flex items-start gap-4">
                        <span className="material-symbols-outlined bg-white/20 p-2 rounded-lg">{icon}</span>
                        <div>
                          <h4 className="font-bold">{title}</h4>
                          <p className="text-sm text-white/70">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: '50+', label: 'Conditions Detected' },
                    { value: '2M+', label: 'Scans Completed' },
                    { value: '24/7', label: 'Instant Access' },
                    { value: '15+', label: 'Countries Served' },
                  ].map(({ value, label }) => (
                    <div key={label} className="bg-white/10 backdrop-blur p-6 rounded-2xl border border-white/10 text-center">
                      <div className="text-4xl font-black mb-1">{value}</div>
                      <div className="text-xs uppercase tracking-widest text-white/60">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle cx="80" cy="20" fill="white" r="40" />
                  <circle cx="100" cy="80" fill="white" r="30" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-background-light dark:bg-background-dark" id="features">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row gap-16 items-center">
              <div className="w-full lg:w-1/2 rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
                <div
                  className="aspect-[4/3] bg-cover bg-center"
                  style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDnSa2XeWp8Ki8qXCfEPHWyzkzvFCmcybLMm0dVv1-0G0L50B4_PVfcJm8rh30ICp6UsVy9Y1ioVj2KTo5UdbwnYhVg_880WPu2-Gb1RRLpkSeZDb_CciMTTORN4YA2hl7sEY0FC33Hb7KZlQ0AsBgLNiY6XjHL56xXgwoKlvS4bY4NWudKR29CLxwMPIJDJGLsKZwG6LJuQ5KE_5XRm_k4U12Aekd5OUX13a7-o88ZLlo7AT_layvC2IksMNpCdad5L0PL7D9Fk7hA')" }}
                />
              </div>
              <div className="w-full lg:w-1/2">
                <h2 className="text-3xl font-bold mb-6">Built for Accuracy, Designed for Care</h2>
                <div className="space-y-8">
                  {[
                    { icon: 'analytics', title: 'Smart Tracking', desc: 'Monitor changes in your skin over time with our visual progress tracker and automated reminders.' },
                    { icon: 'groups', title: 'Expert Network', desc: 'Directly share your reports with a network of verified dermatologists for immediate consultation.' },
                    { icon: 'medication', title: 'Treatment Guidance', desc: 'Get evidence-based recommendations for over-the-counter treatments and skin care routines.' },
                  ].map(({ icon, title, desc }) => (
                    <div key={title} className="flex gap-4">
                      <div className="flex-shrink-0 size-12 rounded-lg bg-primary text-white flex items-center justify-center">
                        <span className="material-symbols-outlined">{icon}</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold mb-1">{title}</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="bg-slate-900 dark:bg-primary/20 rounded-3xl p-12 border border-slate-800 dark:border-primary/30">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready for healthier skin?</h2>
              <p className="text-slate-400 dark:text-slate-300 mb-10 text-lg">
                Join thousands of users who trust MedaGen for their primary skin screening.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => navigate('/login')}
                  className="bg-primary text-white px-8 py-4 rounded-xl font-bold hover:shadow-lg hover:shadow-primary/30 transition-all"
                >
                  Get Started Free
                </button>
                <a
                  href="#how-it-works"
                  className="bg-white text-slate-900 px-8 py-4 rounded-xl font-bold hover:bg-slate-100 transition-all"
                >
                  Learn How It Works
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-background-dark border-t border-slate-200 dark:border-slate-800 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-primary text-3xl">shield_moon</span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">MedaGen</h2>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
                Leading the way in AI-driven dermatological diagnostics. Helping people worldwide detect skin conditions early.
              </p>
              <div className="flex gap-4">
                <a href="#" className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">public</span>
                </a>
                <a href="#" className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">mail</span>
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-slate-900 dark:text-white">Product</h4>
              <ul className="space-y-4 text-slate-600 dark:text-slate-400 text-sm">
                <li><a href="#how-it-works" className="hover:text-primary transition-colors">How it works</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Mobile App</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">API for Clinics</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-slate-900 dark:text-white">Company</h4>
              <ul className="space-y-4 text-slate-600 dark:text-slate-400 text-sm">
                <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Our Team</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-slate-900 dark:text-white">Legal</h4>
              <ul className="space-y-4 text-slate-600 dark:text-slate-400 text-sm">
                <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                <li><a href="#" className="hover:text-primary transition-colors">Medical Disclaimer</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400 text-sm">
            <p>© 2024 MedaGen AI Technologies. All rights reserved. Not a substitute for professional medical advice.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
