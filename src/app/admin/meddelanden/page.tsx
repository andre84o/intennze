"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

interface Message {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  is_read: boolean;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setMessages(data);
      }
      setLoading(false);
    };

    fetchMessages();
  }, []);

  const markAsRead = async (id: string) => {
    const supabase = createClient();
    await supabase.from("contact_messages").update({ is_read: true }).eq("id", id);
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, is_read: true } : m))
    );
  };

  const deleteMessage = async (id: string) => {
    const supabase = createClient();
    await supabase.from("contact_messages").delete().eq("id", id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
    setSelectedMessage(null);
  };

  const unreadCount = messages.filter((m) => !m.is_read).length;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Meddelanden</h1>
        <p className="text-slate-400 mt-1">
          {unreadCount > 0 ? `${unreadCount} olästa meddelanden` : "Inga olästa meddelanden"}
        </p>
      </div>

      {loading ? (
        <div className="text-slate-400">Laddar...</div>
      ) : messages.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
          <svg
            className="w-16 h-16 mx-auto text-slate-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
          <h3 className="text-lg font-medium text-white mb-2">Inga meddelanden</h3>
          <p className="text-slate-400">
            Meddelanden från kontaktformuläret visas här.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Message list */}
          <div className="space-y-3">
            {messages.map((message) => (
              <button
                key={message.id}
                onClick={() => {
                  setSelectedMessage(message);
                  if (!message.is_read) markAsRead(message.id);
                }}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedMessage?.id === message.id
                    ? "bg-cyan-500/10 border-cyan-500/50"
                    : message.is_read
                    ? "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                    : "bg-slate-800/50 border-cyan-500/30 hover:border-cyan-500/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!message.is_read && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      )}
                      <span className="font-medium text-white truncate">
                        {message.name}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm truncate mt-1">
                      {message.message}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {new Date(message.created_at).toLocaleDateString("sv-SE")}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Message detail */}
          {selectedMessage ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {selectedMessage.name}
                  </h2>
                  <p className="text-slate-400 text-sm">
                    {new Date(selectedMessage.created_at).toLocaleString("sv-SE")}
                  </p>
                </div>
                <button
                  onClick={() => deleteMessage(selectedMessage.id)}
                  className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                  title="Radera"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wider">
                    E-post
                  </label>
                  <a
                    href={`mailto:${selectedMessage.email}`}
                    className="block text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    {selectedMessage.email}
                  </a>
                </div>
                {selectedMessage.phone && (
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wider">
                      Telefon
                    </label>
                    <a
                      href={`tel:${selectedMessage.phone}`}
                      className="block text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      {selectedMessage.phone}
                    </a>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider">
                  Meddelande
                </label>
                <p className="text-white mt-2 whitespace-pre-wrap">
                  {selectedMessage.message}
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800 flex gap-3">
                <a
                  href={`mailto:${selectedMessage.email}`}
                  className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-center transition-colors"
                >
                  Svara via e-post
                </a>
                {selectedMessage.phone && (
                  <a
                    href={`tel:${selectedMessage.phone}`}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    Ring
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 flex items-center justify-center">
              <p className="text-slate-500">Välj ett meddelande för att läsa det</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
