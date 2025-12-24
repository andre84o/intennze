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
    <div className="max-w-6xl mx-auto text-gray-900">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meddelanden</h1>
          <p className="text-gray-500 mt-1">
            {unreadEmailCount + unreadContactCount > 0
              ? `${unreadEmailCount + unreadContactCount} olästa`
              : "Inga olästa meddelanden"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSignatureEditor(true)}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
            title="Redigera signatur"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span className="hidden sm:inline">Signatur</span>
          </button>
          <button
            onClick={fetchNewEmails}
            disabled={fetching}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${fetching ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {fetching ? "Hämtar..." : "Hämta mail"}
          </button>
          <button
            onClick={openCompose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nytt mail
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => { setActiveTab("emails"); setSelectedContact(null); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "emails" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          E-post {unreadEmailCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs">{unreadEmailCount}</span>}
        </button>
        <button
          onClick={() => { setActiveTab("contact"); setSelectedEmail(null); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "contact" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Kontaktformulär {unreadContactCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs">{unreadContactCount}</span>}
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500">Laddar...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Message list */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {activeTab === "emails" ? (
              emails.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                  <p className="text-gray-500">Inga mail ännu. Klicka på "Hämta mail" för att synkronisera.</p>
                </div>
              ) : (
                emails.map((email) => (
                  <button
                    key={email.id}
                    onClick={() => {
                      setSelectedEmail(email);
                      if (!email.is_read) markEmailAsRead(email.id);
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedEmail?.id === email.id
                        ? "bg-blue-50 border-blue-200"
                        : email.is_read
                        ? "bg-white border-gray-200 hover:border-gray-300"
                        : "bg-white border-blue-200 ring-1 ring-blue-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {!email.is_read && email.direction === "inbound" && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                          )}
                          {email.direction === "outbound" && (
                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                          )}
                          <span className={`font-medium truncate ${!email.is_read ? "text-gray-900" : "text-gray-700"}`}>
                            {email.direction === "inbound" ? email.from_name || email.from_email : email.to_email}
                          </span>
                        </div>
                        <p className="text-gray-900 text-sm truncate mt-0.5">{email.subject || "(Inget ämne)"}</p>
                        <p className="text-gray-500 text-sm truncate">{email.body_text?.slice(0, 80)}</p>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(email.email_date).toLocaleDateString("sv-SE")}
                      </span>
                    </div>
                  </button>
                ))
              )
            ) : (
              contactMessages.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                  <p className="text-gray-500">Inga meddelanden från kontaktformuläret.</p>
                </div>
              ) : (
                contactMessages.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => {
                      setSelectedContact(msg);
                      if (!msg.is_read) markContactAsRead(msg.id);
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedContact?.id === msg.id
                        ? "bg-blue-50 border-blue-200"
                        : msg.is_read
                        ? "bg-white border-gray-200 hover:border-gray-300"
                        : "bg-white border-blue-200 ring-1 ring-blue-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {!msg.is_read && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                          <span className={`font-medium truncate ${!msg.is_read ? "text-gray-900" : "text-gray-700"}`}>
                            {msg.name}
                          </span>
                        </div>
                        <p className="text-gray-500 text-sm truncate mt-1">{msg.message}</p>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(msg.created_at).toLocaleDateString("sv-SE")}
                      </span>
                    </div>
                  </button>
                ))
              )
            )}
          </div>

          {/* Detail view */}
          <div className="sticky top-6">
            {activeTab === "emails" && selectedEmail ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedEmail.subject || "(Inget ämne)"}</h2>
                    <p className="text-gray-500 text-sm mt-1">
                      {selectedEmail.direction === "inbound" ? "Från" : "Till"}:{" "}
                      <span className="text-gray-700">
                        {selectedEmail.direction === "inbound"
                          ? selectedEmail.from_name || selectedEmail.from_email
                          : selectedEmail.to_email}
                      </span>
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      {new Date(selectedEmail.email_date).toLocaleString("sv-SE")}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteEmail(selectedEmail.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap border-t border-gray-100 pt-4 mt-4">
                  {selectedEmail.body_text || "(Tomt meddelande)"}
                </div>

                {selectedEmail.direction === "inbound" && (
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => openReply(selectedEmail)}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                    >
                      Svara
                    </button>
                  </div>
                )}
              </div>
            ) : activeTab === "contact" && selectedContact ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedContact.name}</h2>
                    <p className="text-gray-500 text-sm">{new Date(selectedContact.created_at).toLocaleString("sv-SE")}</p>
                  </div>
                  <button
                    onClick={() => deleteContact(selectedContact.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">E-post</label>
                    <p className="text-blue-600">{selectedContact.email}</p>
                  </div>
                  {selectedContact.phone && (
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">Telefon</label>
                      <p className="text-blue-600">{selectedContact.phone}</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">Meddelande</label>
                  <p className="text-gray-900 mt-2 whitespace-pre-wrap">{selectedContact.message}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setComposeTo(selectedContact.email);
                      setComposeSubject(`Re: Kontaktformulär från ${selectedContact.name}`);
                      setComposeBody("");
                      setShowCompose(true);
                    }}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Svara via mail
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-12 flex items-center justify-center h-fit">
                <p className="text-gray-500">Välj ett meddelande för att läsa det</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {replyTo ? "Svara på mail" : "Nytt mail"}
              </h2>
              <button
                onClick={() => setShowCompose(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Till</label>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Ämne</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ämne"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meddelande</label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Skriv ditt meddelande här..."
                />
              </div>

              {/* Signatur preview */}
              {signature && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Din signatur läggs till automatiskt:</p>
                  <div className="text-sm text-gray-600 border-t border-gray-200 pt-2">
                    <div
                      className="whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(signature.replace(/\n/g, "<br>")) }}
                    />
                    <div className={`mt-3 ${logoPosition === "center" ? "text-center" : logoPosition === "right" ? "text-right" : "text-left"}`}>
                      <img src="/logosignatur.png" alt="Logo" style={{ height: `${logoHeight}px` }} className="w-auto inline-block" />
                    </div>
                  </div>
                </div>
              )}

              {/* Attachments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bilagor</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachments.map((att, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span className="truncate max-w-[150px]">{att.filename}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <label className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  Lägg till fil
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  />
                </label>
                <p className="text-xs text-gray-400 mt-1">Max 10MB per fil</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowCompose(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={sendEmail}
                disabled={sending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {sending ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Skickar...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Redigera e-postsignatur</h2>
              <button
                onClick={() => setShowSignatureEditor(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Signatur (HTML stöds)
                </label>
                <textarea
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder="Med vänliga hälsningar,&#10;Ditt Namn&#10;Företag AB&#10;tel: 070-123 45 67"
                />
              </div>

              {/* Logo-inställningar */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logostorlek
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="16"
                      max="80"
                      value={logoHeight}
                      onChange={(e) => setLogoHeight(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-500 w-12">{logoHeight}px</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logoplacering
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setLogoPosition("left")}
                      className={`flex-1 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        logoPosition === "left"
                          ? "bg-blue-50 border-blue-300 text-blue-700"
                          : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      Vänster
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoPosition("center")}
                      className={`flex-1 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        logoPosition === "center"
                          ? "bg-blue-50 border-blue-300 text-blue-700"
                          : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      Center
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoPosition("right")}
                      className={`flex-1 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        logoPosition === "right"
                          ? "bg-blue-50 border-blue-300 text-blue-700"
                          : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      Höger
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Förhandsvisning:</p>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 min-h-[60px]">
                  {signature ? (
                    <>
                      <div
                        className="whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(signature.replace(/\n/g, "<br>")) }}
                      />
                      <div className={`mt-3 ${logoPosition === "center" ? "text-center" : logoPosition === "right" ? "text-right" : "text-left"}`}>
                        <img src="/logosignatur.png" alt="Logo" style={{ height: `${logoHeight}px` }} className="w-auto inline-block" />
                      </div>
                    </>
                  ) : (
                    <span className="text-gray-400">Ingen signatur</span>
                  )}
                </div>
              </div>

              <div className="text-xs text-gray-500">
                <p className="font-medium mb-1">Tips:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Använd <code className="bg-gray-100 px-1 rounded">&lt;br&gt;</code> för radbrytningar</li>
                  <li>Använd <code className="bg-gray-100 px-1 rounded">&lt;b&gt;text&lt;/b&gt;</code> för fetstil</li>
                  <li>Använd <code className="bg-gray-100 px-1 rounded">&lt;a href=&quot;...&quot;&gt;länk&lt;/a&gt;</code> för länkar</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowSignatureEditor(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={saveSignature}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Spara signatur
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
