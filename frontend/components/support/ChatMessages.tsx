"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/components/support/ChatContainer";

// Renders plain text, voice messages, or file attachments
function MessageContent({ text }: { text: string }) {
  const audioMatch = text.match(/\[audio:(.*?)\]/);
  if (audioMatch) {
    const url = audioMatch[1];
    const secMatch = text.match(/\((\d+)s\)/);
    const secs = secMatch ? secMatch[1] : "?";
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-[12.5px] text-[#c8d4f0]">
          <span>🎙️</span>
          <span>Voice message ({secs}s)</span>
        </div>
        <audio
          controls
          src={url}
          className="w-full max-w-[220px] rounded-lg"
          style={{ accentColor: "#ff1f2f" }}
        />
      </div>
    );
  }

  if (text.startsWith("📎 File attached:")) {
    const nameMatch = text.match(/File attached: (.+?) \(/);
    const sizeMatch = text.match(/\((.+?)\)/);
    const name = nameMatch?.[1] ?? "File";
    const size = sizeMatch?.[1] ?? "";
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext);
    const isPDF = ext === "pdf";
    return (
      <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#ff1f2f]/20 flex items-center justify-center flex-shrink-0 text-base">
          {isImage ? "🖼️" : isPDF ? "📄" : "📎"}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[12.5px] text-[#c8d4f0] font-medium truncate max-w-[180px]">
            {name}
          </span>
          <span className="text-[10px] text-[#4a5578]">{size}</span>
        </div>
      </div>
    );
  }

  return (
    <p className="text-[13.5px] text-[#c8d4f0] leading-relaxed">{text}</p>
  );
}

type Props = {
  messages: Message[];
  isTyping: boolean;
  onOptionClick: (text: string) => void;
  onCreateTicket?: () => void;
  isCreatingTicket?: boolean;
  showWelcomeCard: boolean;
};

const WELCOME_OPTIONS = [
  { icon: "💳", label: "Billing & payments" },
  { icon: "⚙️", label: "Technical support" },
  { icon: "👤", label: "Account & settings" },
  { icon: "📋", label: "KYC & verification" },
];

function BotAvatar() {
  return (
    <div className="w-7 h-7 rounded-lg bg-[#ff1f2f] flex items-center justify-center flex-shrink-0 shadow-md shadow-red-900/40 mt-0.5">
      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.839L3 20l1.339-3.98C3.493 14.77 3 13.42 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    </div>
  );
}

export default function ChatMessages({ messages, isTyping, onOptionClick, onCreateTicket, isCreatingTicket, showWelcomeCard }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // ✅ FIX: format time safely
  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div
      className="flex-1 overflow-y-auto px-5 py-5 space-y-5"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
    >
      <style>{`div::-webkit-scrollbar{display:none}`}</style>

      {/* Date divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#1e2a45]" />
        <span className="text-[10.5px] text-[#4a5578] font-medium px-2 whitespace-nowrap">
          Today · {messages[0] ? formatTime(messages[0].time) : ""}
        </span>
        <div className="flex-1 h-px bg-[#1e2a45]" />
      </div>

      {/* Welcome message + topic card */}
      {showWelcomeCard && (
        <div className="flex items-start gap-2.5 animate-[fadeUp_0.3s_ease_both]">
          <BotAvatar />
          <div className="space-y-2 max-w-[84%]">
            <div className="bg-[#111a2e] border border-[#1e2a45] rounded-2xl rounded-tl-sm px-4 py-3">
              <p className="text-[13.5px] text-[#c8d4f0] leading-relaxed">
                {messages[0].text}
              </p>
            </div>
            <div className="bg-[#0d1225] border border-[#1e2a45] rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-widest text-[#4a5578] font-semibold mb-2.5">
                Common topics
              </p>
              <div className="space-y-1.5">
                {WELCOME_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => onOptionClick(`I need help with ${opt.label}`)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#111a2e] border border-[#1e2a45] text-[12.5px] text-[#a0aec0] hover:border-[#ff1f2f]/50 hover:text-white hover:bg-[#ff1f2f]/5 transition-all text-left group"
                  >
                    <span className="text-sm">{opt.icon}</span>
                    <span className="flex-1">{opt.label}</span>
                    <span className="text-[#ff1f2f] text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </button>
                ))}
              </div>
            </div>
            <span className="text-[10px] text-[#2a3555] pl-1">
              Aria · {formatTime(messages[0].time)}
            </span>
          </div>
        </div>
      )}

      {/* Dynamic messages */}
      {messages.slice(1).map((msg, idx) =>
        msg.role === "bot" ? (
          <div key={msg.id} className="flex items-start gap-2.5 animate-[fadeUp_0.25s_ease_both]">
            <BotAvatar />
            <div className="space-y-1 max-w-[80%]">
              <div className="bg-[#111a2e] border border-[#1e2a45] rounded-2xl rounded-tl-sm px-4 py-3">
                <MessageContent text={msg.text} />
              </div>
              {/* Show create ticket button if this is the ticket suggestion message */}
              {msg.text.includes("Would you like to raise a support ticket") && onCreateTicket && (
                <button
                  onClick={onCreateTicket}
                  disabled={isCreatingTicket}
                  className="mt-2 px-4 py-2 bg-[#ff1f2f] hover:bg-[#e01020] text-white text-[12.5px] font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingTicket ? "Creating ticket..." : "Create support ticket"}
                </button>
              )}
              <span className="text-[10px] text-[#2a3555] pl-1">
                Aria · {formatTime(msg.time)}
              </span>
            </div>
          </div>
        ) : (
          <div key={msg.id} className="flex items-end justify-end gap-2.5 animate-[fadeUp_0.25s_ease_both]">
            <div className="space-y-1 max-w-[78%]">
              <div className="bg-[#ff1f2f] rounded-2xl rounded-br-sm px-4 py-3 shadow-lg shadow-red-900/30">
                <MessageContent text={msg.text} />
              </div>
              <span className="text-[10px] text-[#2a3555] pr-1 text-right block">
                You · {formatTime(msg.time)}
              </span>
            </div>
            <div className="w-7 h-7 rounded-lg bg-[#111a2e] border border-[#1e2a45] flex items-center justify-center flex-shrink-0 mb-5 text-[10px] font-bold text-[#7a8aaa]">
              You
            </div>
          </div>
        )
      )}

      {/* Typing indicator */}
      {isTyping && (
        <div className="flex items-start gap-2.5 animate-[fadeUp_0.2s_ease_both]">
          <BotAvatar />
          <div className="bg-[#111a2e] border border-[#1e2a45] rounded-2xl rounded-tl-sm px-4 py-3.5">
            <div className="flex items-center gap-1.5">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="w-2 h-2 rounded-full bg-[#ff1f2f] animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}