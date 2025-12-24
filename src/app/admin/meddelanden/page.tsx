"use client";

import { useState, useEffect } from "react";
import DOMPurify from "isomorphic-dompurify";
import { createClient } from "@/utils/supabase/client";

// Sanitize HTML to prevent XSS attacks
const sanitizeHtml = (html: string) => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["br", "p", "strong", "em", "a", "span", "div"],
    ALLOWED_ATTR: ["href", "target", "rel", "class", "style"],
  });
};

interface Email {
  id: string;
  created_at: string;
  message_id: string | null;
  direction: "inbound" | "outbound";
  from_email: string;
  from_name: string | null;
  to_email: string;
  to_name: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  is_read: boolean;
  is_starred: boolean;
  email_date: string;
}

interface ContactMessage {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  is_read: boolean;
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

type MessageType = "emails" | "contact";

export default function MessagesPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactMessage | null>(null);
  const [activeTab, setActiveTab] = useState<MessageType>("emails");
  const [showCompose, setShowCompose] = useState(false);
  const [replyTo, setReplyTo] = useState<Email | null>(null);

  // Compose form state
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Signature and attachments
  const [signature, setSignature] = useState("");
  const [logoHeight, setLogoHeight] = useState(32);
  const [logoPosition, setLogoPosition] = useState<"left" | "center" | "right">("left");
  const [showSignatureEditor, setShowSignatureEditor] = useState(false);
  const [attachments, setAttachments] = useState<{ filename: string; content: string; contentType: string }[]>([]);

  // Toast/popup notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchData();
    loadSignature();
  }, []);

  const loadSignature = async () => {
    try {
      const response = await fetch("/api/preferences/signature");
      if (response.ok) {
        const data = await response.json();
        setSignature(data.signature || "");
        setLogoHeight(data.logoHeight || 32);
        setLogoPosition(data.logoPosition || "left");
      }
    } catch (error) {
      console.error("Kunde inte ladda signatur:", error);
    }
  };

  const saveSignature = async () => {
    try {
      const response = await fetch("/api/preferences/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature, logoHeight, logoPosition }),
      });
      if (response.ok) {
        setShowSignatureEditor(false);
        showToast("Signatur sparad!", "success");
      }
    } catch (error) {
      console.error("Kunde inte spara signatur:", error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        showToast(`${file.name} är för stor (max 10MB)`, "error");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        setAttachments((prev) => [
          ...prev,
          {
            filename: file.name,
            content: base64,
            contentType: file.type,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const fetchData = async () => {
    const supabase = createClient();

    // Hämta emails från databas
    const { data: emailData } = await supabase
      .from("emails")
      .select("*")
      .order("email_date", { ascending: false });

    if (emailData) {
      setEmails(emailData);
    }

    // Hämta kontaktformulär-meddelanden
    const { data: contactData } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (contactData) {
      setContactMessages(contactData);
    }

    // Hämta kunder med e-post
    const { data: customerData } = await supabase
      .from("customers")
      .select("id, first_name, last_name, email")
      .not("email", "is", null)
      .order("first_name", { ascending: true });

    if (customerData) {
      setCustomers(customerData);
    }

    setLoading(false);
  };

  const fetchNewEmails = async () => {
    setFetching(true);
    try {
      const response = await fetch("/api/mail/fetch", { method: "POST" });
      const data = await response.json();

      if (data.success) {
        setEmails(data.emails);
        if (data.newCount > 0) {
          showToast(`${data.newCount} nya mail hämtade!`, "success");
        } else {
          showToast("Inga nya mail", "info");
        }
      } else {
        showToast("Kunde inte hämta mail: " + (data.error || "Okänt fel"), "error");
      }
    } catch {
      showToast("Nätverksfel vid hämtning av mail", "error");
    }
    setFetching(false);
  };

  const markEmailAsRead = async (id: string) => {
    const supabase = createClient();
    await supabase.from("emails").update({ is_read: true }).eq("id", id);
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, is_read: true } : e)));
  };

  const markContactAsRead = async (id: string) => {
    const supabase = createClient();
    await supabase.from("contact_messages").update({ is_read: true }).eq("id", id);
    setContactMessages((prev) => prev.map((m) => (m.id === id ? { ...m, is_read: true } : m)));
  };

  const deleteEmail = async (id: string) => {
    const supabase = createClient();
    await supabase.from("emails").delete().eq("id", id);
    setEmails((prev) => prev.filter((e) => e.id !== id));
    setSelectedEmail(null);
  };

  const deleteContact = async (id: string) => {
    const supabase = createClient();
    await supabase.from("contact_messages").delete().eq("id", id);
    setContactMessages((prev) => prev.filter((m) => m.id !== id));
    setSelectedContact(null);
  };

  const openReply = (email: Email) => {
    setReplyTo(email);
    setComposeTo(email.from_email);
    setComposeSubject(`Re: ${email.subject || "(Inget ämne)"}`);
    setComposeBody(`\n\n---\n${email.from_name || email.from_email} skrev:\n${email.body_text || ""}`);
    setShowCompose(true);
  };

  const openCompose = () => {
    setReplyTo(null);
    setComposeTo("");
    setComposeSubject("");
    setComposeBody("");
    setCustomerSearch("");
    setAttachments([]);
    setShowCompose(true);
  };

  const sendEmail = async () => {
    if (!composeTo || !composeSubject || !composeBody) {
      showToast("Fyll i alla fält", "error");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          body: composeBody,
          signature: signature || null,
          logoHeight,
          logoPosition,
          replyToMessageId: replyTo?.message_id,
          attachments: attachments,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showToast("Mail skickat!", "success");
        setShowCompose(false);
        setAttachments([]);
        fetchData();
      } else {
        showToast("Kunde inte skicka mail: " + (data.error || "Okänt fel"), "error");
      }
    } catch {
      showToast("Nätverksfel vid skickande av mail", "error");
    }
    setSending(false);
  };

  const unreadEmailCount = emails.filter((e) => !e.is_read && e.direction === "inbound").length;
  const unreadContactCount = contactMessages.filter((m) => !m.is_read).length;

  return (
    <div className="max-w-7xl mx-auto text-gray-900 p-6">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Meddelanden</h1>
          <p className="text-gray-500 mt-1 text-lg">
            {unreadEmailCount + unreadContactCount > 0
              ? `${unreadEmailCount + unreadContactCount} olästa meddelanden`
              : "Alla meddelanden är lästa"}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSignatureEditor(true)}
            className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl transition-all shadow-sm hover:shadow flex items-center gap-2 font-medium"
            title="Redigera signatur"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            <span className="hidden sm:inline">Signatur</span>
          </button>
          <button
            onClick={fetchNewEmails}
            disabled={fetching}
            className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl transition-all shadow-sm hover:shadow flex items-center gap-2 disabled:opacity-50 font-medium"
          >
            <svg className={`w-5 h-5 text-gray-500 ${fetching ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            {fetching ? "Hämtar..." : "Hämta mail"}
          </button>
          <button
            onClick={openCompose}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-sm hover:shadow-md flex items-center gap-2 font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
            </svg>
            Nytt mail
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => { setActiveTab("emails"); setSelectedContact(null); }}
          className={`px-6 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
            activeTab === "emails" 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          E-post {unreadEmailCount > 0 && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{unreadEmailCount}</span>}
        </button>
        <button
          onClick={() => { setActiveTab("contact"); setSelectedEmail(null); }}
          className={`px-6 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
            activeTab === "contact" 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Kontaktformulär {unreadContactCount > 0 && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{unreadContactCount}</span>}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-250px)] min-h-[600px]">
          {/* Message list */}
          <div className="lg:col-span-5 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            {activeTab === "emails" ? (
              emails.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Inga mail</h3>
                  <p className="text-gray-500 mt-1">Klicka på "Hämta mail" för att synkronisera.</p>
                </div>
              ) : (
                emails.map((email) => (
                  <button
                    key={email.id}
                    onClick={() => {
                      setSelectedEmail(email);
                      if (!email.is_read) markEmailAsRead(email.id);
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition-all group ${
                      selectedEmail?.id === email.id
                        ? "bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-200"
                        : email.is_read
                        ? "bg-white border-gray-200 hover:border-blue-300 hover:shadow-md"
                        : "bg-white border-l-4 border-l-blue-500 border-y-gray-200 border-r-gray-200 shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {email.direction === "outbound" ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 uppercase tracking-wide">
                            Utgående
                          </span>
                        ) : !email.is_read && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                        )}
                        <span className={`font-medium truncate text-sm ${!email.is_read ? "text-gray-900" : "text-gray-700"}`}>
                          {email.direction === "inbound" ? email.from_name || email.from_email : `Till: ${email.to_email}`}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                        {new Date(email.email_date).toLocaleDateString("sv-SE", { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className={`text-sm truncate mb-1 ${!email.is_read ? "font-medium text-gray-900" : "text-gray-800"}`}>
                      {email.subject || "(Inget ämne)"}
                    </p>
                    <p className="text-gray-500 text-xs truncate leading-relaxed">
                      {email.body_text?.slice(0, 100) || "Inget förhandsvisning tillgänglig"}
                    </p>
                  </button>
                ))
              )
            ) : (
              contactMessages.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Inga meddelanden</h3>
                  <p className="text-gray-500 mt-1">Inga meddelanden från kontaktformuläret.</p>
                </div>
              ) : (
                contactMessages.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => {
                      setSelectedContact(msg);
                      if (!msg.is_read) markContactAsRead(msg.id);
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition-all group ${
                      selectedContact?.id === msg.id
                        ? "bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-200"
                        : msg.is_read
                        ? "bg-white border-gray-200 hover:border-blue-300 hover:shadow-md"
                        : "bg-white border-l-4 border-l-blue-500 border-y-gray-200 border-r-gray-200 shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {!msg.is_read && <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />}
                        <span className={`font-medium truncate text-sm ${!msg.is_read ? "text-gray-900" : "text-gray-700"}`}>
                          {msg.name}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                        {new Date(msg.created_at).toLocaleDateString("sv-SE", { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs truncate leading-relaxed">
                      {msg.message}
                    </p>
                  </button>
                ))
              )
            )}
          </div>

          {/* Detail view */}
          <div className="lg:col-span-7 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
            {activeTab === "emails" && selectedEmail ? (
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-gray-100 bg-gray-50/30">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <h2 className="text-xl font-bold text-gray-900 leading-snug">{selectedEmail.subject || "(Inget ämne)"}</h2>
                    <button
                      onClick={() => deleteEmail(selectedEmail.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      title="Ta bort"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                        {(selectedEmail.direction === "inbound" 
                          ? (selectedEmail.from_name || selectedEmail.from_email) 
                          : selectedEmail.to_email
                        ).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedEmail.direction === "inbound" ? selectedEmail.from_name || selectedEmail.from_email : `Till: ${selectedEmail.to_email}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {selectedEmail.direction === "inbound" ? `<${selectedEmail.from_email}>` : ""}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 font-medium">
                      {new Date(selectedEmail.email_date).toLocaleString("sv-SE", { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                  <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap font-sans">
                    {selectedEmail.body_text || "(Tomt meddelande)"}
                  </div>
                </div>

                {selectedEmail.direction === "inbound" && (
                  <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                    <button
                      onClick={() => openReply(selectedEmail)}
                      className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-sm hover:shadow font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      Svara
                    </button>
                  </div>
                )}
              </div>
            ) : activeTab === "contact" && selectedContact ? (
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-gray-100 bg-gray-50/30">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <h2 className="text-xl font-bold text-gray-900 leading-snug">Meddelande från {selectedContact.name}</h2>
                    <button
                      onClick={() => deleteContact(selectedContact.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      title="Ta bort"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                      <span className="text-gray-900 font-medium">{selectedContact.email}</span>
                    </div>
                    {selectedContact.phone && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                        </svg>
                        <span className="text-gray-900 font-medium">{selectedContact.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg ml-auto">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-gray-600">{new Date(selectedContact.created_at).toLocaleString("sv-SE")}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                  <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap font-sans">
                    {selectedContact.message}
                  </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                  <button
                    onClick={() => {
                      setComposeTo(selectedContact.email);
                      setComposeSubject(`Re: Kontaktformulär från ${selectedContact.name}`);
                      setComposeBody("");
                      setShowCompose(true);
                    }}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-sm hover:shadow font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    Svara via mail
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-12 text-center bg-gray-50/30">
                <div className="w-20 h-20 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Välj ett meddelande</h3>
                <p className="text-gray-500 mt-2 max-w-sm">
                  Klicka på ett meddelande i listan till vänster för att läsa innehållet och svara.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                {replyTo ? "Svara på mail" : "Nytt mail"}
              </h2>
              <button
                onClick={() => setShowCompose(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Till</label>
                <input
                  type="email"
                  value={composeTo}
                  onChange={(e) => {
                    setComposeTo(e.target.value);
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Sök kund eller skriv e-post..."
                />
                {showCustomerDropdown && customers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {customers
                      .filter((c) => {
                        const search = customerSearch.toLowerCase();
                        return (
                          !search ||
                          c.first_name.toLowerCase().includes(search) ||
                          c.last_name.toLowerCase().includes(search) ||
                          c.email?.toLowerCase().includes(search)
                        );
                      })
                      .slice(0, 10)
                      .map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            setComposeTo(customer.email || "");
                            setShowCustomerDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 last:border-0"
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium">
                            {customer.first_name[0]}{customer.last_name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {customer.first_name} {customer.last_name}
                            </p>
                            <p className="text-sm text-gray-500 truncate">{customer.email}</p>
                          </div>
                        </button>
                      ))}
                    {customers.filter((c) => {
                      const search = customerSearch.toLowerCase();
                      return (
                        !search ||
                        c.first_name.toLowerCase().includes(search) ||
                        c.last_name.toLowerCase().includes(search) ||
                        c.email?.toLowerCase().includes(search)
                      );
                    }).length === 0 && (
                      <p className="px-3 py-2 text-sm text-gray-500">Inga kunder hittades</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Ämne</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Vad handlar mailet om?"
                />
              </div>

              <div className="flex-1 flex flex-col min-h-[200px]">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Meddelande</label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="w-full flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none font-sans"
                  placeholder="Skriv ditt meddelande här..."
                />
              </div>

              {/* Signatur preview */}
              {signature && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Din signatur läggs till automatiskt:</p>
                  <div className="text-sm text-gray-600 border-t border-gray-200 pt-3">
                    <div
                      className="whitespace-pre-wrap font-sans"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(signature.replace(/\n/g, "<br>")) }}
                    />
                    <div className={`mt-3 ${logoPosition === "center" ? "text-center" : logoPosition === "right" ? "text-right" : "text-left"}`}>
                      <img src="/logosignatur.png" alt="Logo" style={{ height: `${logoHeight}px` }} className="w-auto inline-block" />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Bifoga filer</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-100">
                      <span className="truncate max-w-[200px]">{file.filename}</span>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="text-blue-400 hover:text-blue-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl cursor-pointer transition-all shadow-sm hover:shadow text-sm font-medium">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                  </svg>
                  Välj filer
                  <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                </label>
                <p className="text-xs text-gray-400 mt-1 ml-1">Max 10MB per fil</p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setShowCompose(false)}
                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all font-medium shadow-sm"
              >
                Avbryt
              </button>
              <button
                onClick={sendEmail}
                disabled={sending}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none flex items-center gap-2 font-medium"
              >
                {sending ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Skickar...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                    Skicka
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Editor Modal */}
      {showSignatureEditor && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Redigera signatur
              </h2>
              <button
                onClick={() => setShowSignatureEditor(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Signaturtext</label>
                <textarea
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none font-sans"
                  placeholder="Skriv din signatur här..."
                />
                <p className="text-xs text-gray-400 mt-1.5 ml-1">
                  Används automatiskt i alla nya mail. HTML stöds.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Logotypens storlek (px)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={logoHeight}
                      onChange={(e) => setLogoHeight(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      min="20"
                      max="200"
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <span className="text-gray-400 text-sm">px</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Logotypens position</label>
                  <select
                    value={logoPosition}
                    onChange={(e) => setLogoPosition(e.target.value as 'left' | 'center' | 'right')}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                  >
                    <option value="left">Vänster</option>
                    <option value="center">Mitten</option>
                    <option value="right">Höger</option>
                  </select>
                </div>
              </div>

              <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Förhandsgranskning:</p>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <div className="text-sm text-gray-600 font-sans">
                    <div
                      className="whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(signature.replace(/\n/g, "<br>")) }}
                    />
                    <div className={`mt-4 ${logoPosition === 'center' ? 'text-center' : logoPosition === 'right' ? 'text-right' : 'text-left'}`}>
                      <img src="/logosignatur.png" alt="Logo" style={{ height: `${logoHeight}px` }} className="w-auto inline-block" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setShowSignatureEditor(false)}
                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all font-medium shadow-sm"
              >
                Avbryt
              </button>
              <button
                onClick={saveSignature}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg font-medium"
              >
                Spara inställningar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Popup */}
      {toast && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none">
          <div
            className={`pointer-events-auto px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-200 ${
              toast.type === "success"
                ? "bg-green-600 text-white"
                : toast.type === "error"
                ? "bg-red-600 text-white"
                : "bg-blue-600 text-white"
            }`}
          >
            {toast.type === "success" && (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {toast.type === "error" && (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {toast.type === "info" && (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
