"use client";

import { useRef, useState, useEffect } from "react";

type Props = {
  onSend: (text: string) => void;
  onSendAudio?: (blob: Blob, durationSec: number) => void;
  onSendFile?: (file: File) => void;
  disabled?: boolean;
};

const QUICK_CHIPS = ["Refund policy", "Reset password", "Human agent"];

export default function ChatInput({ onSend, onSendAudio, onSendFile, disabled }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Audio recording state ──
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Text send ──
  const handleSend = () => {
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  // ── Mic: start / stop recording ──
  const handleMicClick = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
      setRecordSeconds(0);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());

        if (onSendAudio) {
          onSendAudio(blob, recordSeconds);
        } else {
          // Default: show as a chat message with audio player URL
          const url = URL.createObjectURL(blob);
          onSend(`🎙️ Voice message recorded (${recordSeconds}s) — [audio:${url}]`);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch {
      alert("Microphone access denied. Please allow microphone permission in your browser.");
    }
  };

  // ── File: trigger hidden input ──
  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (onSendFile) {
      onSendFile(file);
    } else {
      // Default: send file name + size as a chat message
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const sizeKB = (file.size / 1024).toFixed(1);
      const displaySize = file.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;
      onSend(`📎 File attached: ${file.name} (${displaySize})`);
    }

    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <div className="flex-shrink-0 bg-[#0d1225] border-t border-[#1e2a45] px-4 pt-3 pb-4">

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.doc,.docx,.txt,.xlsx,.csv"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Quick reply chips */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => onSend(chip)}
            disabled={disabled}
            className="text-[11.5px] text-[#7a8aaa] border border-[#1e2a45] rounded-full px-3.5 py-1 hover:border-[#ff1f2f]/50 hover:text-white hover:bg-[#ff1f2f]/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {chip}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-[#2a3555]">
          🔒 End-to-end encrypted
        </span>
      </div>

      {/* Recording banner */}
      {isRecording && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-[#ff1f2f]/10 border border-[#ff1f2f]/30 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-[#ff1f2f] animate-pulse" />
          <span className="text-[12px] text-[#ff1f2f] font-medium">
            Recording… {formatTime(recordSeconds)}
          </span>
          <span className="text-[11px] text-[#7a8aaa] ml-auto">
            Tap mic again to stop
          </span>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">

        {/* Mic button */}
        <button
          type="button"
          title={isRecording ? "Stop recording" : "Record voice message"}
          onClick={handleMicClick}
          disabled={disabled}
          className={`w-10 h-10 flex-shrink-0 rounded-xl border flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            isRecording
              ? "bg-[#ff1f2f] border-[#ff1f2f] text-white animate-pulse"
              : "bg-[#111a2e] border-[#1e2a45] text-[#7a8aaa] hover:border-[#ff1f2f]/40 hover:text-[#ff1f2f]"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 3a4 4 0 014 4v4a4 4 0 01-8 0V7a4 4 0 014-4z" />
          </svg>
        </button>

        {/* Attach file button */}
        <button
          type="button"
          title="Attach file (image, PDF, doc)"
          onClick={handleAttachClick}
          disabled={disabled}
          className="w-10 h-10 flex-shrink-0 rounded-xl bg-[#111a2e] border border-[#1e2a45] flex items-center justify-center text-[#7a8aaa] hover:border-[#ff1f2f]/40 hover:text-[#ff1f2f] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || isRecording}
          placeholder={isRecording ? "Recording voice message…" : "Type your message..."}
          className="flex-1 resize-none bg-[#111a2e] border border-[#ff1f2f]/50 focus:border-[#ff1f2f] rounded-xl px-4 py-2.5 text-[13.5px] text-[#c8d4f0] placeholder-[#2a3555] outline-none transition-colors leading-relaxed disabled:opacity-50"
          style={{
            minHeight: "42px",
            maxHeight: "120px",
            scrollbarWidth: "none",
          } as React.CSSProperties}
        />

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!value.trim() || disabled || isRecording}
          title="Send message"
          className="w-10 h-10 flex-shrink-0 rounded-xl bg-[#ff1f2f] flex items-center justify-center text-white hover:bg-[#e01020] active:scale-95 transition-all shadow-lg shadow-red-900/40 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>

      {/* Footer hint */}
      <p className="text-[10px] text-[#2a3555] mt-2 pl-1">
        Press Enter to send · Shift+Enter for new line · Attach: image, PDF, doc
      </p>
    </div>
  );
}