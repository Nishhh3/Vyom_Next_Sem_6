"use client";

import AdminNavbar from "@/components/AuthenticatedNavbar";
import ChatContainer from "@/components/support/ChatContainer";

export default function SupportPage() {
  return (
    <div className="h-screen overflow-hidden bg-[#0b0f1a] flex flex-col">
      <AdminNavbar />
      {/* chat fills every pixel below the navbar */}
      <div className="flex-1 min-h-0 px-6 pt-3 pb-3 max-w-4xl w-full mx-auto flex flex-col">
        <div className="flex-1 min-h-0">
          <ChatContainer />
        </div>
      </div>
    </div>
  );
}