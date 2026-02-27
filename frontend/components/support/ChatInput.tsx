"use client";

import { useState } from "react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
}

export default function ChatInput({ onSendMessage }: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleMicClick = () => {
    alert("Audio input feature - UI only (not yet connected)");
  };

  const handleVideoClick = () => {
    alert("Video input feature - UI only (not yet connected)");
  };

  return (
    <div className="border-t border-gray-700/50 p-4">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        {/* Audio Button */}
        <button
          type="button"
          onClick={handleMicClick}
          className="w-10 h-10 bg-gray-800/60 hover:bg-gray-700/60 rounded-lg flex items-center justify-center transition-colors border border-gray-700/50"
        >
          <svg
            className="w-5 h-5 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        </button>

        {/* Video Button */}
        <button
          type="button"
          onClick={handleVideoClick}
          className="w-10 h-10 bg-gray-800/60 hover:bg-gray-700/60 rounded-lg flex items-center justify-center transition-colors border border-gray-700/50"
        >
          <svg
            className="w-5 h-5 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>

        {/* Text Input */}
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
        />

        {/* Send Button */}
        <button
          type="submit"
          className="w-10 h-10 bg-gradient-to-br from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 rounded-lg flex items-center justify-center transition-all shadow-lg hover:shadow-red-500/50"
        >
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}