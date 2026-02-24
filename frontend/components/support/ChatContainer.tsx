"use client";

import { useState } from "react";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
  timestamp: string;
}

export default function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! Welcome to Vyom Support. How can I assist you today?",
      sender: "bot",
      timestamp: "10:30 AM",
    },
  ]);

  const handleSendMessage = (text: string) => {
    const newMessage: Message = {
      id: messages.length + 1,
      text,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages([...messages, newMessage]);

    setTimeout(() => {
      const botResponse: Message = {
        id: messages.length + 2,
        text: "Thank you for your message. Our support team will assist you shortly.",
        sender: "bot",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 1000);
  };

  return (
    <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-2xl backdrop-blur-sm overflow-hidden flex flex-col h-[450px] w-full max-w-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border-b border-gray-700/50 px-6 py-3">
        <h2 className="text-lg font-bold text-white">Vyom Support Assistant</h2>
      </div>

      {/* Messages */}
      <ChatMessages messages={messages} />

      {/* Input */}
      <ChatInput onSendMessage={handleSendMessage} />
    </div>
  );
}