import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-500 rounded-lg flex items-center justify-center shadow-lg shadow-red-600/30">
              <span className="text-white font-bold text-xl">V</span>
            </div>
            <span className="text-2xl font-bold text-white">
              Vyom<span className="text-red-400">Next</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
              Features
            </Link>
            <Link href="#how-it-works" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
              How It Works
            </Link>
            <Link href="#security" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
              Security
            </Link>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-slate-300 hover:text-white transition-colors text-sm font-medium"
            >
              Login
            </Link>
            <Link 
              href="/register" 
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-red-600/20 hover:shadow-red-600/40"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}