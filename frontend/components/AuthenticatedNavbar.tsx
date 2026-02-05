'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AuthenticatedNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isServicesOpen, setIsServicesOpen] = useState(false);

  const handleLogout = () => {
    // TODO: Implement actual logout logic (clear tokens, etc.)
    router.push('/login');
  };

  const navLinks = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'My Banks', href: '/my-banks' },
    { name: 'EMI Calculator', href: '/emi-calculator' },
  ];

  const serviceLinks = [
    { name: 'Transactions', href: '/transactions' },
    { name: 'Support', href: '/support' },
    { name: 'DigiLocker', href: '/digilocker' },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/70 backdrop-blur-xl border-b border-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-[72px]">
          {/* Left: Logo */}
          <Link 
            href="/dashboard" 
            className="flex items-center space-x-2 flex-shrink-0"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/30">
              <span className="text-white font-bold text-xl">V</span>
            </div>
            <span className="text-white font-bold text-xl hidden sm:block">
              Vyom<span className="text-red-500">Next</span>
            </span>
          </Link>

          {/* Center: Navigation Links */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(link.href)
                    ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
                    : 'text-gray-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {link.name}
              </Link>
            ))}

            {/* Services Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsServicesOpen(!isServicesOpen)}
                className={`px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                  isServicesOpen
                    ? 'bg-slate-800/60 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                Services
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isServicesOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isServicesOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsServicesOpen(false)}
                  />
                  
                  {/* Dropdown Content */}
                  <div className="absolute top-full mt-2 right-0 w-52 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl z-20 overflow-hidden">
                    <div className="py-2">
                      {serviceLinks.map((service, index) => (
                        <Link
                          key={service.href}
                          href={service.href}
                          onClick={() => setIsServicesOpen(false)}
                          className={`block px-4 py-2.5 text-sm text-gray-300 hover:bg-slate-800/60 hover:text-white transition-colors ${
                            index !== serviceLinks.length - 1 ? 'border-b border-slate-800/50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <svg
                              className="w-4 h-4 text-red-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                            {service.name}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: Profile & Logout */}
          <div className="flex items-center space-x-2 lg:space-x-3">
            {/* Profile Button */}
            <Link
              href="/profile"
              className="p-2 lg:p-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-slate-800/60 transition-all duration-200"
              title="Profile"
            >
              <svg
                className="w-5 h-5 lg:w-6 lg:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </Link>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-3 lg:px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5 shadow-lg shadow-red-500/30"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>

            {/* Mobile Menu Button (for future implementation) */}
            <button className="md:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-slate-800/60 transition-all duration-200">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}