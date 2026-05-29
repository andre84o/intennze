'use client';

import { useState } from 'react';
import { useCMSStore, Service, Testimonial, TeamMember } from '../lib/cms-store';
import {
  Save,
  RefreshCw,
  Home,
  Settings,
  FileText,
  Users,
  MessageSquare,
  Plus,
  Trash2,
  Edit3,
  X,
  ChevronLeft
} from 'lucide-react';
import Link from 'next/link';

type TabType = 'general' | 'hero' | 'services' | 'about' | 'testimonials' | 'team' | 'contact';

export default function AdminPage() {
  const { content, setContent, resetContent, addService, updateService, deleteService, addTestimonial, updateTestimonial, deleteTestimonial, addTeamMember, updateTeamMember, deleteTeamMember } = useCMSStore();
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [isSaved, setIsSaved] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [editingTeamMember, setEditingTeamMember] = useState<TeamMember | null>(null);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleReset = () => {
    if (confirm('Är du säker på att du vill återställa allt innehåll till standard?')) {
      resetContent();
    }
  };

  const tabs = [
    { id: 'general' as TabType, label: 'Allmänt', icon: Settings },
    { id: 'hero' as TabType, label: 'Hero', icon: Home },
    { id: 'services' as TabType, label: 'Behandlingar', icon: FileText },
    { id: 'about' as TabType, label: 'Om oss', icon: FileText },
    { id: 'testimonials' as TabType, label: 'Recensioner', icon: MessageSquare },
    { id: 'team' as TabType, label: 'Team', icon: Users },
    { id: 'contact' as TabType, label: 'Kontakt', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ChevronLeft className="w-5 h-5" />
              <span>Tillbaka till sidan</span>
            </Link>
            <div className="h-6 w-px bg-gray-200" />
            <h1 className="text-xl font-semibold text-gray-900">CMS Admin</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Återställ
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              <Save className="w-4 h-4" />
              {isSaved ? 'Sparat!' : 'Spara'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <nav className="bg-white rounded-xl p-2 shadow-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              {/* General Tab */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">Allmänna inställningar</h2>
                  <div className="grid gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sidans namn</label>
                      <input
                        type="text"
                        value={content.siteName}
                        onChange={(e) => setContent({ siteName: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tagline</label>
                      <input
                        type="text"
                        value={content.siteTagline}
                        onChange={(e) => setContent({ siteTagline: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Footer text</label>
                      <input
                        type="text"
                        value={content.footerText}
                        onChange={(e) => setContent({ footerText: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Hero Tab */}
              {activeTab === 'hero' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">Hero-sektion</h2>
                  <div className="grid gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Rubrik</label>
                      <input
                        type="text"
                        value={content.heroTitle}
                        onChange={(e) => setContent({ heroTitle: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Undertext</label>
                      <textarea
                        rows={3}
                        value={content.heroSubtitle}
                        onChange={(e) => setContent({ heroSubtitle: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CTA-knapp text</label>
                      <input
                        type="text"
                        value={content.heroCTA}
                        onChange={(e) => setContent({ heroCTA: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Hero-bild (sökväg)</label>
                      <input
                        type="text"
                        value={content.heroImage}
                        onChange={(e) => setContent({ heroImage: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>

                    {/* Hero Badge Settings */}
                    <div className="border-t border-gray-200 pt-6 mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Kampanjruta</h3>
                          <p className="text-sm text-gray-500">Den lilla rutan med rabattinfo på hero-bilden</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={content.showHeroBadge}
                            onChange={(e) => setContent({ showHeroBadge: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>

                      {content.showHeroBadge && (
                        <div className="grid gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Rubrik (t.ex. "Boka idag")</label>
                            <input
                              type="text"
                              value={content.heroBadgeTitle}
                              onChange={(e) => setContent({ heroBadgeTitle: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Undertext (t.ex. "20% rabatt")</label>
                            <input
                              type="text"
                              value={content.heroBadgeText}
                              onChange={(e) => setContent({ heroBadgeText: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Services Tab */}
              {activeTab === 'services' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Behandlingar</h2>
                    <button
                      onClick={() => setEditingService({
                        id: Date.now().toString(),
                        title: '',
                        description: '',
                        price: '',
                        duration: '',
                        image: '/images/placeholder.jpg',
                        category: ''
                      })}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Lägg till
                    </button>
                  </div>

                  <div className="grid gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sektionsrubrik</label>
                      <input
                        type="text"
                        value={content.servicesTitle}
                        onChange={(e) => setContent({ servicesTitle: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Undertext</label>
                      <input
                        type="text"
                        value={content.servicesSubtitle}
                        onChange={(e) => setContent({ servicesSubtitle: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {content.services.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <h3 className="font-medium text-gray-900">{service.title}</h3>
                          <p className="text-sm text-gray-500">{service.price} - {service.duration}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingService(service)}
                            className="p-2 text-gray-500 hover:text-primary hover:bg-white rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteService(service.id)}
                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Service Edit Modal */}
                  {editingService && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-semibold">
                            {content.services.find(s => s.id === editingService.id) ? 'Redigera' : 'Lägg till'} behandling
                          </h3>
                          <button onClick={() => setEditingService(null)} className="p-1 hover:bg-gray-100 rounded">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="space-y-4">
                          <input
                            type="text"
                            placeholder="Titel"
                            value={editingService.title}
                            onChange={(e) => setEditingService({ ...editingService, title: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                          />
                          <textarea
                            placeholder="Beskrivning"
                            rows={3}
                            value={editingService.description}
                            onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <input
                              type="text"
                              placeholder="Pris (t.ex. 1295 kr)"
                              value={editingService.price}
                              onChange={(e) => setEditingService({ ...editingService, price: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Tid (t.ex. 60 min)"
                              value={editingService.duration}
                              onChange={(e) => setEditingService({ ...editingService, duration: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                          </div>
                          <input
                            type="text"
                            placeholder="Kategori"
                            value={editingService.category}
                            onChange={(e) => setEditingService({ ...editingService, category: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Bild-sökväg"
                            value={editingService.image}
                            onChange={(e) => setEditingService({ ...editingService, image: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                          />
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                          <button
                            onClick={() => setEditingService(null)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            Avbryt
                          </button>
                          <button
                            onClick={() => {
                              if (content.services.find(s => s.id === editingService.id)) {
                                updateService(editingService.id, editingService);
                              } else {
                                addService(editingService);
                              }
                              setEditingService(null);
                            }}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                          >
                            Spara
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* About Tab */}
              {activeTab === 'about' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">Om oss</h2>
                  <div className="grid gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Rubrik</label>
                      <input
                        type="text"
                        value={content.aboutTitle}
                        onChange={(e) => setContent({ aboutTitle: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Beskrivning</label>
                      <textarea
                        rows={5}
                        value={content.aboutText}
                        onChange={(e) => setContent({ aboutText: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bild (sökväg)</label>
                      <input
                        type="text"
                        value={content.aboutImage}
                        onChange={(e) => setContent({ aboutImage: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Testimonials Tab */}
              {activeTab === 'testimonials' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Recensioner</h2>
                    <button
                      onClick={() => setEditingTestimonial({
                        id: Date.now().toString(),
                        name: '',
                        text: '',
                        rating: 5,
                        image: '/images/placeholder.jpg'
                      })}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Lägg till
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sektionsrubrik</label>
                    <input
                      type="text"
                      value={content.testimonialsTitle}
                      onChange={(e) => setContent({ testimonialsTitle: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>

                  <div className="space-y-3">
                    {content.testimonials.map((testimonial) => (
                      <div
                        key={testimonial.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <h3 className="font-medium text-gray-900">{testimonial.name}</h3>
                          <p className="text-sm text-gray-500 line-clamp-1">{testimonial.text}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingTestimonial(testimonial)}
                            className="p-2 text-gray-500 hover:text-primary hover:bg-white rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTestimonial(testimonial.id)}
                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Testimonial Edit Modal */}
                  {editingTestimonial && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-semibold">
                            {content.testimonials.find(t => t.id === editingTestimonial.id) ? 'Redigera' : 'Lägg till'} recension
                          </h3>
                          <button onClick={() => setEditingTestimonial(null)} className="p-1 hover:bg-gray-100 rounded">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="space-y-4">
                          <input
                            type="text"
                            placeholder="Namn"
                            value={editingTestimonial.name}
                            onChange={(e) => setEditingTestimonial({ ...editingTestimonial, name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                          />
                          <textarea
                            placeholder="Recension"
                            rows={4}
                            value={editingTestimonial.text}
                            onChange={(e) => setEditingTestimonial({ ...editingTestimonial, text: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                          />
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Betyg</label>
                            <select
                              value={editingTestimonial.rating}
                              onChange={(e) => setEditingTestimonial({ ...editingTestimonial, rating: Number(e.target.value) })}
                              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                            >
                              {[5, 4, 3, 2, 1].map((n) => (
                                <option key={n} value={n}>{n} stjärnor</option>
                              ))}
                            </select>
                          </div>
                          <input
                            type="text"
                            placeholder="Bild-sökväg"
                            value={editingTestimonial.image}
                            onChange={(e) => setEditingTestimonial({ ...editingTestimonial, image: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                          />
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                          <button
                            onClick={() => setEditingTestimonial(null)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            Avbryt
                          </button>
                          <button
                            onClick={() => {
                              if (content.testimonials.find(t => t.id === editingTestimonial.id)) {
                                updateTestimonial(editingTestimonial.id, editingTestimonial);
                              } else {
                                addTestimonial(editingTestimonial);
                              }
                              setEditingTestimonial(null);
                            }}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                          >
                            Spara
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Team Tab */}
              {activeTab === 'team' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Team</h2>
                    <button
                      onClick={() => setEditingTeamMember({
                        id: Date.now().toString(),
                        name: '',
                        role: '',
                        image: '/images/placeholder.jpg',
                        bio: ''
                      })}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Lägg till
                    </button>
                  </div>

                  <div className="grid gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sektionsrubrik</label>
                      <input
                        type="text"
                        value={content.teamTitle}
                        onChange={(e) => setContent({ teamTitle: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Undertext</label>
                      <input
                        type="text"
                        value={content.teamSubtitle}
                        onChange={(e) => setContent({ teamSubtitle: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {content.team.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <h3 className="font-medium text-gray-900">{member.name}</h3>
                          <p className="text-sm text-gray-500">{member.role}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingTeamMember(member)}
                            className="p-2 text-gray-500 hover:text-primary hover:bg-white rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTeamMember(member.id)}
                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Team Member Edit Modal */}
                  {editingTeamMember && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-semibold">
                            {content.team.find(m => m.id === editingTeamMember.id) ? 'Redigera' : 'Lägg till'} teammedlem
                          </h3>
                          <button onClick={() => setEditingTeamMember(null)} className="p-1 hover:bg-gray-100 rounded">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="space-y-4">
                          <input
                            type="text"
                            placeholder="Namn"
                            value={editingTeamMember.name}
                            onChange={(e) => setEditingTeamMember({ ...editingTeamMember, name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Roll"
                            value={editingTeamMember.role}
                            onChange={(e) => setEditingTeamMember({ ...editingTeamMember, role: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                          />
                          <textarea
                            placeholder="Biografi"
                            rows={3}
                            value={editingTeamMember.bio}
                            onChange={(e) => setEditingTeamMember({ ...editingTeamMember, bio: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                          />
                          <input
                            type="text"
                            placeholder="Bild-sökväg"
                            value={editingTeamMember.image}
                            onChange={(e) => setEditingTeamMember({ ...editingTeamMember, image: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                          />
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                          <button
                            onClick={() => setEditingTeamMember(null)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            Avbryt
                          </button>
                          <button
                            onClick={() => {
                              if (content.team.find(m => m.id === editingTeamMember.id)) {
                                updateTeamMember(editingTeamMember.id, editingTeamMember);
                              } else {
                                addTeamMember(editingTeamMember);
                              }
                              setEditingTeamMember(null);
                            }}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                          >
                            Spara
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Contact Tab */}
              {activeTab === 'contact' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">Kontakt & Bokning</h2>
                  <div className="grid gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Rubrik</label>
                      <input
                        type="text"
                        value={content.contactTitle}
                        onChange={(e) => setContent({ contactTitle: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Undertext</label>
                      <input
                        type="text"
                        value={content.contactSubtitle}
                        onChange={(e) => setContent({ contactSubtitle: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Adress</label>
                        <input
                          type="text"
                          value={content.address}
                          onChange={(e) => setContent({ address: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                        <input
                          type="text"
                          value={content.phone}
                          onChange={(e) => setContent({ phone: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">E-post</label>
                      <input
                        type="email"
                        value={content.email}
                        onChange={(e) => setContent({ email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
