interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
  timestamp: string;
}

interface ChatMessagesProps {
  messages: Message[];
}

export default function ChatMessages({ messages }: ChatMessagesProps) {
  return (
    <div className="flex-1 p-6 space-y-4 overflow-y-auto">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.sender === "user" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`max-w-[75%] rounded-2xl px-4 py-3 ${
              message.sender === "user"
                ? "bg-gradient-to-br from-red-600 to-orange-600 text-white"
                : "bg-gradient-to-br from-gray-800/60 to-gray-900/60 text-white border border-gray-700/50"
            }`}
          >
            <p className="text-sm leading-relaxed">{message.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}