import { useNavigate, Link } from 'react-router-dom'

export default function PublicPageLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-primary rounded-lg p-1.5 text-white">
                <span className="material-symbols-outlined text-xl">health_metrics</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">MedaGen</h2>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link to="/about" className="text-sm font-medium hover:text-primary transition-colors">About Us</Link>
              <Link to="/pricing" className="text-sm font-medium hover:text-primary transition-colors">Pricing</Link>
              <Link to="/contact" className="text-sm font-medium hover:text-primary transition-colors">Contact</Link>
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

      {/* Page content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-white dark:bg-background-dark border-t border-slate-200 dark:border-slate-800 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-primary rounded-lg p-1.5 text-white">
                  <span className="material-symbols-outlined text-xl">health_metrics</span>
                </div>
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
                <li><Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-slate-900 dark:text-white">Company</h4>
              <ul className="space-y-4 text-slate-600 dark:text-slate-400 text-sm">
                <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
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
