import Link from 'next/link';

export default function AdminNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0e27]/80 backdrop-blur-md border-b border-white/5">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">V</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-semibold text-lg">
                Vyom<span className="text-red-600">Next</span>
              </span>
              <span className="text-gray-400 text-xs">Admin Panel</span>
            </div>
          </Link>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Admin Badge */}
            <div className="px-3 py-1.5 bg-red-600/10 border border-red-600/30 rounded-lg">
              <span className="text-red-500 text-sm font-medium">Administrator</span>
            </div>

            {/* Logout Button */}
            <button
              onClick={() => alert('Logout functionality - To be implemented')}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}