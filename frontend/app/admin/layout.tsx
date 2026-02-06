"use client";

import AdminNavbar from '@/components/AdminNavbar';
import AdminSidebar from '@/components/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#151b3d] to-[#0a0e27]">
      {/* Admin Navbar */}
      <AdminNavbar />

      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <main className="ml-64 pt-[65px] min-h-screen">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}