"use client";

import { useState } from "react";
import ChatMessages from "@/components/support/ChatMessages";
import ChatInput from "@/components/support/ChatInput";

export type Message = {
  id:          string;
  role:        "bot" | "user";
  text:        string;
  time:        string;
};

const TOPICS = ["All", "Billing", "Technical", "Account"] as const;
type Topic = (typeof TOPICS)[number];

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function authHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatTime() {
  return new Date().toLocaleTimeString("en-IN", {
    hour:   "2-digit",
    minute: "2-digit",
  });
}

const INITIAL_MESSAGE: Message = {
  id:   "init",
  role: "bot",
  text: "Hello! Welcome to Vyom Support. How can I assist you today?",
  time: formatTime(),
};

export default function ChatContainer() {
  const [messages,    setMessages]    = useState<Message[]>([INITIAL_MESSAGE]);
  const [isTyping,    setIsTyping]    = useState(false);
  const [activeTopic, setActiveTopic] = useState<Topic>("All");
  const [sessionId]                   = useState(() => crypto.randomUUID());

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    // Add user message immediately
    const userMsg: Message = {
      id:   Date.now().toString(),
      role: "user",
      text: trimmed,
      time: formatTime(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const r = await fetch(`${BASE}/api/support/chat`, {
        method:  "POST",
        headers: authHeaders(),
        body:    JSON.stringify({
          message:    trimmed,
          session_id: sessionId,
        }),
      });

      if (!r.ok) throw new Error("API error");
      const data = await r.json();

      const botMsg: Message = {
        id:   (Date.now() + 1).toString(),
        role: "bot",
        text: data.answer ?? "I couldn't process that. Please try again.",
        time: formatTime(),
      };
      setMessages((prev) => [...prev, botMsg]);

      // If RAG couldn't resolve it — suggest ticket after short delay
      if (data.suggest_ticket) {
        setTimeout(() => {
          setMessages((prev) => [...prev, {
            id:   (Date.now() + 2).toString(),
            role: "bot",
            text: "I wasn't able to fully resolve this from my knowledge base. Would you like to raise a support ticket so our team can help you directly?",
            time: formatTime(),
          }]);
        }, 600);
      }

    } catch {
      // Fallback if API is unreachable
      setMessages((prev) => [...prev, {
        id:   (Date.now() + 1).toString(),
        role: "bot",
        text: "I'm having trouble connecting right now. Please try again in a moment.",
        time: formatTime(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden border border-[#1e2a45] bg-[#0d1225] shadow-2xl shadow-black/60">

      {/* ── Header ── */}
      <div className="flex-shrink-0 bg-gradient-to-r from-[#160808] via-[#1a0c0c] to-[#160d10] border-b border-[#2a1a1a] px-5 py-4">
        <div className="flex items-center gap-3">

          {/* Bot avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-11 h-11 rounded-xl bg-[#ff1f2f] flex items-center justify-center shadow-lg shadow-red-900/50">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.839L3 20l1.339-3.98C3.493 14.77 3 13.42 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-[#160808]" />
          </div>

          <div>
            <h2 className="text-white font-bold text-[15px] leading-tight tracking-wide">
              Aria — Support Assistant
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[11px] text-[#7a8aaa] font-medium">
                Online · RAG-powered
              </span>
            </div>
          </div>

          {/* Right badges */}
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 bg-[#0d1225] border border-[#1e2a45] rounded-lg px-3 py-1.5">
              <svg className="w-3 h-3 text-[#ff1f2f]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-[10px] text-[#7a8aaa] font-medium">Bank-grade Secure</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 bg-[#0d1225] border border-[#1e2a45] rounded-lg px-3 py-1.5">
              <svg className="w-3 h-3 text-[#ff1f2f]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 6v6l4 2"/>
              </svg>
              <span className="text-[10px] text-[#7a8aaa] font-medium">Avg. &lt;2 min</span>
            </div>
          </div>
        </div>

        {/* ── Topic filter bar ── */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <span className="text-[11px] text-[#4a5578] mr-1">Topic:</span>
          {TOPICS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTopic(t)}
              className={`text-[11.5px] font-medium px-3.5 py-1 rounded-full border transition-all ${
                activeTopic === t
                  ? "bg-[#ff1f2f] border-[#ff1f2f] text-white shadow-md shadow-red-900/40"
                  : "bg-transparent border-[#2a1a1a] text-[#7a8aaa] hover:border-[#ff1f2f]/40 hover:text-white"
              }`}
            >
              {t === "All" ? `+ ${t}` : t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Messages ── */}
      <ChatMessages
        messages={messages}
        isTyping={isTyping}
        onOptionClick={sendMessage}
        showWelcomeCard={messages.length === 1}
      />

      {/* ── Input ── */}
      <ChatInput onSend={sendMessage} disabled={isTyping} />
    </div>
  );
}