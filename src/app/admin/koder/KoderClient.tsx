"use client";

import { useState, useMemo, useRef } from "react";
import { CodeSnippet, Attachment } from "@/types/database";
import { createClient } from "@/utils/supabase/client";
import { AttachmentUploader } from "@/components/attachments/AttachmentUploader";
import { ImageGalleryModal } from "@/components/attachments/ImageGalleryModal";
import { DocumentListModal } from "@/components/attachments/DocumentListModal";
import { deleteAttachment } from "@/lib/attachments/storage";

interface Props {
  initialSnippets: CodeSnippet[];
  initialAttachments?: Attachment[];
  error?: string;
}

const ENTITY_TYPE = "code_snippet";

const languageOptions = [
  "JavaScript", "TypeScript", "Python", "HTML", "CSS", "SQL",
  "Bash", "JSON", "React/JSX", "PHP", "C#", "Java", "Go", "Rust", "Annat",
];

export default function KoderClient({ initialSnippets, initialAttachments = [], error }: Props) {
  const [snippets, setSnippets] = useState(initialSnippets);
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [galleryFor, setGalleryFor] = useState<string | null>(null);
  const [docsFor, setDocsFor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<CodeSnippet | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [snippetToDelete, setSnippetToDelete] = useState<string | null>(null);
  const [expandedSnippet, setExpandedSnippet] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formLanguage, setFormLanguage] = useState("");
  const [formTags, setFormTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const filteredSnippets = useMemo(() => {
    return snippets.filter((snippet) => {
      const q = search.toLowerCase();
      const matchesSearch =
        search === "" ||
        snippet.title.toLowerCase().includes(q) ||
        snippet.description?.toLowerCase().includes(q) ||
        snippet.code.toLowerCase().includes(q) ||
        snippet.language?.toLowerCase().includes(q) ||
        snippet.tags?.some((tag) => tag.toLowerCase().includes(q));
      const matchesLanguage = languageFilter === "all" || snippet.language === languageFilter;
      const matchesFavorite = !showFavoritesOnly || snippet.is_favorite;
      return matchesSearch && matchesLanguage && matchesFavorite;
    });
  }, [snippets, search, languageFilter, showFavoritesOnly]);

  const availableLanguages = useMemo(() => {
    const langs = new Set(snippets.map((s) => s.language).filter(Boolean));
    return Array.from(langs).sort();
  }, [snippets]);

  const openCreateModal = () => {
    setEditingSnippet(null);
    setFormTitle("");
    setFormDescription("");
    setFormCode("");
    setFormLanguage("");
    setFormTags("");
    setSaveError(null);
    setShowModal(true);
  };

  const openEditModal = (snippet: CodeSnippet) => {
    setEditingSnippet(snippet);
    setFormTitle(snippet.title);
    setFormDescription(snippet.description || "");
    setFormCode(snippet.code);
    setFormLanguage(snippet.language || "");
    setFormTags(snippet.tags?.join(", ") || "");
    setSaveError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formCode.trim()) return;
    setSaving(true);
    setSaveError(null);
    const supabase = createClient();
    const tags = formTags.split(",").map((t) => t.trim()).filter(Boolean);
    const payload = {
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      code: formCode,
      language: formLanguage || null,
      tags,
      updated_at: new Date().toISOString(),
    };

    if (editingSnippet) {
      const { data, error } = await supabase.from("code_snippets").update(payload).eq("id", editingSnippet.id).select().single();
      if (error) {
        setSaveError("Kunde inte uppdatera: " + error.message);
        setSaving(false);
        return;
      }
      if (data) setSnippets((prev) => prev.map((s) => (s.id === data.id ? data : s)));
    } else {
      const { data, error } = await supabase.from("code_snippets").insert(payload).select().single();
      if (error) {
        setSaveError("Kunde inte spara: " + error.message);
        setSaving(false);
        return;
      }
      if (data) setSnippets((prev) => [data, ...prev]);
    }
    setSaving(false);
    setShowModal(false);
    setEditingSnippet(null);
  };

  const handleDelete = async () => {
    if (!snippetToDelete) return;
    const supabase = createClient();
    // Remove this snippet's attachments first (Storage files + DB rows) so we
    // don't orphan files in Supabase when the whole card is deleted.
    const related = attachments.filter((a) => a.entity_id === snippetToDelete);
    await Promise.all(related.map((a) => deleteAttachment(a)));
    const { error } = await supabase.from("code_snippets").delete().eq("id", snippetToDelete);
    if (!error) {
      setSnippets((prev) => prev.filter((s) => s.id !== snippetToDelete));
      setAttachments((prev) => prev.filter((a) => a.entity_id !== snippetToDelete));
    }
    setShowDeleteModal(false);
    setSnippetToDelete(null);
  };

  const toggleFavorite = async (snippet: CodeSnippet) => {
    const supabase = createClient();
    const newVal = !snippet.is_favorite;
    const { error } = await supabase.from("code_snippets").update({ is_favorite: newVal }).eq("id", snippet.id);
    if (!error) setSnippets((prev) => prev.map((s) => (s.id === snippet.id ? { ...s, is_favorite: newVal } : s)));
  };

  const copyToClipboard = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Inline editing of free-text fields directly in the card ------------------
  const dirtyFields = useRef<Set<string>>(new Set());

  const updateSnippetLocal = (id: string, patch: Partial<CodeSnippet>) => {
    setSnippets((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const editField = (snippet: CodeSnippet, field: keyof CodeSnippet, value: CodeSnippet[keyof CodeSnippet]) => {
    dirtyFields.current.add(`${snippet.id}:${String(field)}`);
    updateSnippetLocal(snippet.id, { [field]: value });
  };

  const persistField = async (snippet: CodeSnippet, field: keyof CodeSnippet) => {
    const key = `${snippet.id}:${String(field)}`;
    if (!dirtyFields.current.has(key)) return;
    dirtyFields.current.delete(key);
    const supabase = createClient();
    await supabase
      .from("code_snippets")
      .update({ [field]: snippet[field], updated_at: new Date().toISOString() })
      .eq("id", snippet.id);
  };

  // Attachments grouped per snippet ------------------------------------------
  const attachmentsBySnippet = useMemo(() => {
    const map: Record<string, { images: Attachment[]; documents: Attachment[] }> = {};
    for (const a of attachments) {
      const group = (map[a.entity_id] ??= { images: [], documents: [] });
      if (a.kind === "image") group.images.push(a);
      else group.documents.push(a);
    }
    return map;
  }, [attachments]);

  const onAttachmentUploaded = (att: Attachment) => setAttachments((prev) => [...prev, att]);
  const onAttachmentDeleted = (att: Attachment) =>
    setAttachments((prev) => prev.filter((a) => a.id !== att.id));

  return (
    <div className="text-gray-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mina koder</h1>
          <p className="text-gray-500 mt-1 text-sm">Spara och hitta dina kodsnippets</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-1.5 bg-blue-500 text-white text-sm rounded-full font-medium hover:bg-blue-600 transition-all duration-200 shadow-sm"
        >
          + Ny kod
        </button>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Sök i titel, beskrivning, kod eller taggar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`px-3 py-2 border rounded-full text-sm transition-all duration-200 ${
              showFavoritesOnly
                ? "bg-amber-50 border-amber-200 text-amber-600"
                : "bg-white border-gray-200 text-gray-400 hover:text-amber-400 hover:border-amber-200"
            }`}
            title="Visa favoriter"
          >
            <svg className="w-4 h-4" fill={showFavoritesOnly ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-6 text-xs text-gray-400">
        <span>{filteredSnippets.length} av {snippets.length} koder</span>
        {search && <span>Söker: &quot;{search}&quot;</span>}
      </div>

      {/* Content */}
      {filteredSnippets.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
          </svg>
          <p className="text-gray-400 text-sm">
            {snippets.length === 0 ? "Inga koder sparade ännu. Lägg till din första!" : "Inga koder matchar din sökning."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredSnippets.map((snippet) => {
            const isExpanded = expandedSnippet === snippet.id;
            const att = attachmentsBySnippet[snippet.id] ?? { images: [], documents: [] };
            return (
              <div key={snippet.id} className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-blue-200/60 group">
                {/* Colored top accent */}
                <div className="h-1 bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400" />

                <div className="p-4">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{snippet.title}</h3>
                      {snippet.description && (
                        <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{snippet.description}</p>
                      )}
                    </div>
                    <button onClick={() => toggleFavorite(snippet)} className={`shrink-0 transition-colors ${snippet.is_favorite ? "text-amber-400" : "text-gray-300 hover:text-amber-300"}`}>
                      <svg className="w-4 h-4" fill={snippet.is_favorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                      </svg>
                    </button>
                  </div>

                  {/* Language + Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    {snippet.language && (
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-semibold rounded-full border border-indigo-100">
                        {snippet.language}
                      </span>
                    )}
                    {snippet.tags?.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Code */}
                  <textarea
                    value={snippet.code}
                    onChange={(e) => editField(snippet, "code", e.target.value)}
                    onFocus={() => setExpandedSnippet(snippet.id)}
                    onBlur={() => { persistField(snippet, "code"); setExpandedSnippet(null); }}
                    spellCheck={false}
                    placeholder="Klistra in din kod här..."
                    className={`w-full p-3 text-xs font-mono text-slate-700 bg-slate-50 border border-slate-100 rounded-xl resize-y focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white transition-all ${isExpanded ? "h-72" : "h-24"}`}
                  />

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">{new Date(snippet.created_at).toLocaleDateString("sv-SE")}</span>
                      {att.images.length > 0 && (
                        <button onClick={() => setGalleryFor(snippet.id)} className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-500 text-[10px] font-medium hover:bg-blue-100 transition-colors" title="Visa bilder">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 19.5h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                          </svg>
                          {att.images.length}
                        </button>
                      )}
                      {att.documents.length > 0 && (
                        <button onClick={() => setDocsFor(snippet.id)} className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-500 text-[10px] font-medium hover:bg-indigo-100 transition-colors" title="Visa dokument">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                          {att.documents.length}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <AttachmentUploader entityType={ENTITY_TYPE} entityId={snippet.id} onUploaded={onAttachmentUploaded} />
                      <button onClick={() => copyToClipboard(snippet.code, snippet.id)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition-colors" title="Kopiera">
                        {copiedId === snippet.id ? (
                          <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                          </svg>
                        )}
                      </button>
                      <button onClick={() => openEditModal(snippet)} className="p-1.5 text-gray-400 hover:text-indigo-500 rounded-lg hover:bg-indigo-50 transition-colors" title="Redigera språk/taggar">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      <button onClick={() => { setSnippetToDelete(snippet.id); setShowDeleteModal(true); }} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors" title="Ta bort">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingSnippet ? "Redigera kod" : "Ny kod"}
                </h2>
                <button onClick={() => { setShowModal(false); setEditingSnippet(null); }} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Titel *</label>
                  <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="T.ex. React useEffect cleanup"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Beskrivning</label>
                  <input type="text" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Kort beskrivning av koden..."
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Språk</label>
                    <select value={formLanguage} onChange={(e) => setFormLanguage(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all">
                      <option value="">Välj språk...</option>
                      {languageOptions.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Taggar</label>
                    <input type="text" value={formTags} onChange={(e) => setFormTags(e.target.value)} placeholder="react, hook, cleanup"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Kod *</label>
                  <textarea value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="Klistra in din kod här..." rows={12}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all resize-y" />
                </div>
              </div>

              {saveError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{saveError}</div>
              )}

              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => { setShowModal(false); setEditingSnippet(null); }}
                  className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                  Avbryt
                </button>
                <button onClick={handleSave} disabled={saving || !formTitle.trim() || !formCode.trim()}
                  className="px-5 py-1.5 text-sm bg-blue-500 text-white rounded-full font-medium hover:bg-blue-600 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? "Sparar..." : editingSnippet ? "Uppdatera" : "Spara"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 max-w-sm w-full shadow-xl">
            <h3 className="text-base font-bold text-gray-900 mb-2">Ta bort kod</h3>
            <p className="text-gray-500 text-sm mb-5">Är du säker? Detta går inte att ångra.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowDeleteModal(false); setSnippetToDelete(null); }}
                className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                Avbryt
              </button>
              <button onClick={handleDelete}
                className="px-4 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors">
                Ta bort
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image gallery */}
      <ImageGalleryModal
        open={galleryFor !== null}
        images={galleryFor ? attachmentsBySnippet[galleryFor]?.images ?? [] : []}
        onClose={() => setGalleryFor(null)}
        onDeleted={onAttachmentDeleted}
      />

      {/* Document list */}
      <DocumentListModal
        open={docsFor !== null}
        documents={docsFor ? attachmentsBySnippet[docsFor]?.documents ?? [] : []}
        onClose={() => setDocsFor(null)}
        onDeleted={onAttachmentDeleted}
      />
    </div>
  );
}
