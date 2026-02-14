"use client";

import { useState, useRef, useEffect } from "react";
import api from "@/lib/api";
import ReactMarkdown from "react-markdown";
import { Sparkles, X } from "lucide-react";

export default function CareOpsGPT() {
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; content: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [glow, setGlow] = useState(true);

  useEffect(() => {
  const timer = setTimeout(() => {
    setGlow(false);
  }, 5000);

  return () => clearTimeout(timer);
}, []);


  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await api.post("/api/ai/chat", {
        message: userMessage,
      });

      setMessages((prev) => [
        ...prev,
        { role: "ai", content: res.data.response },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "⚠️ Something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">

      {open ? (
        <div className="w-[420px] h-[600px] bg-[#0f1117] border border-white/10 backdrop-blur-xl shadow-2xl rounded-2xl flex flex-col overflow-hidden">

          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex justify-between items-center bg-white/5 backdrop-blur">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              CareOpsGPT
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm text-gray-200">

            {messages.length === 0 && (
              <div className="text-gray-500">
                Ask about bookings, revenue, performance insights...
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                      : "bg-white/5 border border-white/10 text-gray-200"
                  }`}
                >
                  {msg.role === "ai" ? (
                    <ReactMarkdown
                      components={{
                        strong: ({ ...props }) => (
                          <strong className="font-semibold text-white" {...props} />
                        ),
                        ul: ({ ...props }) => (
                          <ul className="list-disc ml-5 space-y-1" {...props} />
                        ),
                        li: ({ ...props }) => (
                          <li className="text-sm text-gray-300" {...props} />
                        ),
                        p: ({ ...props }) => (
                          <p className="mb-2 leading-relaxed" {...props} />
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl w-fit text-gray-400">
                <span className="animate-pulse">Thinking...</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/10 bg-white/5 backdrop-blur flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask your business AI..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 rounded-xl text-sm font-medium transition disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      ) : (
          <button
            onClick={() => setOpen(true)}
            className={`
    relative group
    px-7 py-3 rounded-full
    bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600
    text-white font-semibold
    flex items-center gap-2
    transition-all duration-300
    hover:scale-105
    shadow-xl
    ${glow ? "animate-pulse shadow-[0_0_40px_rgba(99,102,241,0.7)]" : ""}
  `}
          >
            {/* Animated Glow Layer */}
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 blur-xl opacity-40 group-hover:opacity-60 transition"></span>

            <Sparkles className="w-4 h-4 relative z-10" />
            <span className="relative z-10">CareOpsGPT</span>
          </button>

      )}
    </div>
  );
}
