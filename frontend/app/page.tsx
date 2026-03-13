import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 lg:px-8 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-slate-950 to-blue-950/20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-red-600/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-950/50 border border-red-800/30 rounded-full mb-8">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              <span className="text-red-200 text-sm font-medium">Next-Gen Digital Banking Platform</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Banking Powered by{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">
                Artificial Intelligence
              </span>
            </h1>

            {/* Description */}
            <p className="text-xl text-slate-400 mb-10 leading-relaxed max-w-2xl mx-auto">
              Experience the future of finance with AI, multi-bank integration, 
              and blockchain security—all in one seamless platform.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/register" 
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all shadow-2xl shadow-red-600/30 hover:shadow-red-600/50 hover:scale-105"
              >
                Start KYC Verification
              </Link>
              <Link 
                href="#features" 
                className="w-full sm:w-auto bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all"
              >
                Explore Features
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-slate-500 text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Bank-Grade Security</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>AI-Powered Help Support</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>24/7 Service</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 lg:px-8 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Powerful Features for Modern Banking
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Everything you need to manage your finances intelligently in one secure platform
            </p>
          </div>

          {/* Feature Grid - ALL ICONS NOW CONSISTENT WITH RED THEME */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1: AI Banking */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-8 hover:border-red-600/50 transition-all group">
              <div className="w-14 h-14 bg-gradient-to-br from-red-600 to-red-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-red-600/30">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">AI-Powered Insights</h3>
              <p className="text-slate-400 leading-relaxed">
                Get personalized financial advice and smart spending insights powered by advanced AI algorithms
              </p>
            </div>

            {/* Feature 2: Multi-Bank Access */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-8 hover:border-red-600/50 transition-all group">
              <div className="w-14 h-14 bg-gradient-to-br from-red-600 to-red-500 shadow-red-600/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg ">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Multi-Bank Integration</h3>
              <p className="text-slate-400 leading-relaxed">
                Connect and manage multiple bank accounts from different banks in a single unified dashboard
              </p>
            </div>

            {/* Feature 3: Blockchain Security */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-8 hover:border-red-600/50 transition-all group">
              <div className="w-14 h-14 bg-gradient-to-br from-red-600 to-red-500 shadow-red-600/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg ">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Blockchain Security</h3>
              <p className="text-slate-400 leading-relaxed">
                Banking-grade encryption and blockchain technology ensure your transactions are always secure
              </p>
            </div>

            {/* Feature 4: Smart Help Center */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-8 hover:border-red-600/50 transition-all group">
              <div className="w-14 h-14 bg-gradient-to-br from-red-600 to-red-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-red-600/30">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">24/7 AI Support</h3>
              <p className="text-slate-400 leading-relaxed">
                Instant answers to your questions with our intelligent chatbot available round the clock
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section - ALIGNED WITH KYC FLOW */}
      <section id="how-it-works" className="py-24 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Get Started in Minutes
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Complete KYC verification and unlock secure digital banking
            </p>
          </div>

          {/* Steps - ALL 3 STEPS NOW VISUALLY ACTIVE */}
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting Lines (hidden on mobile) */}
            <div className="hidden md:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-600/50 to-transparent" />

            {/* Step 1 - Upload Aadhaar */}
            <div className="relative text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-red-600 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-red-600/40">
                <span className="text-white text-5xl font-bold">1</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Upload Aadhaar</h3>
              <p className="text-slate-400 leading-relaxed">
                Upload your Aadhaar card for instant OCR extraction and identity verification
              </p>
            </div>

            {/* Step 2 - Face Verification - NOW ACTIVE WITH RED THEME */}
            <div className="relative text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-red-600 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-red-600/40">
                <span className="text-white text-5xl font-bold">2</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Face Verification</h3>
              <p className="text-slate-400 leading-relaxed">
                Complete live face capture and AI-powered matching with your Aadhaar photo
              </p>
            </div>

            {/* Step 3 - Admin Approval & Login */}
            <div className="relative text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-red-600 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-red-600/40">
                <span className="text-white text-5xl font-bold">3</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Get Approved & Login</h3>
              <p className="text-slate-400 leading-relaxed">
                Receive admin approval, get your credentials, and access your secure banking dashboard
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-16">
            <Link 
              href="/register" 
              className="inline-block bg-red-600 hover:bg-red-700 text-white px-10 py-4 rounded-lg text-lg font-semibold transition-all shadow-2xl shadow-red-600/30 hover:shadow-red-600/50 hover:scale-105"
            >
              Start Your KYC Journey
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900/50 border-t border-slate-800/50 py-12 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-500 rounded-lg flex items-center justify-center shadow-lg shadow-red-600/30">
                  <span className="text-white font-bold text-xl">V</span>
                </div>
                <span className="text-2xl font-bold text-white">
                  Vyom<span className="text-red-400">Next</span>
                </span>
              </Link>
              <p className="text-slate-400 max-w-sm">
                Next-generation digital banking platform powered by AI and secured by blockchain technology.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><Link href="#features" className="text-slate-400 hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#how-it-works" className="text-slate-400 hover:text-white transition-colors">How It Works</Link></li>
                <li><Link href="#security" className="text-slate-400 hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><Link href="#" className="text-slate-400 hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="#" className="text-slate-400 hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="#" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-slate-800/50 text-center text-slate-500 text-sm">
            <p>&copy; 2026 VyomNext. All rights reserved. Built with Next.js & Tailwind CSS.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}