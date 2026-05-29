'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '../lib/storage';
import { Settings, BlockedDate, RecurringBlockedTime } from '../types/booking';
import MiniCalendar from '../components/MiniCalendar';

const WEEKDAY_NAMES = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedBlockedDate, setSelectedBlockedDate] = useState<string | null>(null);
  const [blockedDateReason, setBlockedDateReason] = useState('');
  const [blockedDateAllDay, setBlockedDateAllDay] = useState(true);
  const [blockedDateStartTime, setBlockedDateStartTime] = useState('09:00');
  const [blockedDateEndTime, setBlockedDateEndTime] = useState('18:00');
  const [showCalendarPopup, setShowCalendarPopup] = useState(false);

  useEffect(() => {
    // Load settings when component mounts
    setSettings(storage.getSettings());
  }, []);

  const validateSettings = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!settings) return false;

    // Validate business hours
    if (settings.businessHours.startTime >= settings.businessHours.endTime) {
      newErrors.businessHours = 'Starttid måste vara före sluttid';
    }

    // Validate time interval
    if (settings.timeInterval < 15 || settings.timeInterval > 240) {
      newErrors.timeInterval = 'Tidsintervall måste vara mellan 15 och 240 minuter';
    }

    // Validate business name
    if (!settings.businessName || settings.businessName.trim().length < 2) {
      newErrors.businessName = 'Företagsnamn måste vara minst 2 tecken';
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(settings.contactEmail)) {
      newErrors.contactEmail = 'Ange en giltig e-postadress';
    }

    // Validate phone
    if (!settings.contactPhone || settings.contactPhone.length < 8) {
      newErrors.contactPhone = 'Ange ett giltigt telefonnummer';
    }

    // Validate advance booking hours
    if (settings.advanceBookingHours < 0 || settings.advanceBookingHours > 720) {
      newErrors.advanceBookingHours = 'Måste vara mellan 0 och 720 timmar';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!settings) return;

    if (!validateSettings()) {
      return;
    }

    storage.saveSettings(settings);

    // Dispatch custom event to notify theme provider of changes
    window.dispatchEvent(new Event('settingsChanged'));

    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  const handleReset = () => {
    if (confirm('Är du säker på att du vill återställa alla inställningar till standardvärden?')) {
      storage.resetSettings();
      setSettings(storage.getSettings());
      setErrors({});

      // Dispatch custom event to notify theme provider of changes
      window.dispatchEvent(new Event('settingsChanged'));

      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    }
  };

  if (!settings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center">
        <div className="text-zinc-600 dark:text-zinc-400">Laddar inställningar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-800 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/demo/booking')}
            className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors mb-4 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Tillbaka
          </button>
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">
            Inställningar
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Anpassa din bokningskalender
          </p>
        </div>

        {/* Success Message */}
        {savedMessage && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Inställningar sparade!</span>
            </div>
          </div>
        )}

        {/* Settings Form */}
        <div className="space-y-6">
          {/* Schedule & Availability - Combined Premium Section */}
          <section className="relative overflow-hidden bg-gradient-to-br from-white via-white to-indigo-50/50 dark:from-zinc-900 dark:via-zinc-900 dark:to-indigo-950/30 rounded-2xl shadow-xl border border-zinc-200/50 dark:border-zinc-700/50">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-rose-500/10 to-amber-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            {/* Header */}
            <div className="relative border-b border-zinc-200/50 dark:border-zinc-700/50 p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Schema & Tillgänglighet</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Hantera öppettider och blockerade tider</p>
                </div>
              </div>
            </div>

            <div className="relative p-6 space-y-8">
              {/* Business Hours, Interval & Booking Rules Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Business Hours Card */}
                <div className="bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm rounded-xl p-5 border border-zinc-200/50 dark:border-zinc-700/50 overflow-hidden">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-zinc-900 dark:text-white">Öppettider</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Öppnar</label>
                      <input
                        type="time"
                        value={settings.businessHours.startTime}
                        onChange={(e) => setSettings({
                          ...settings,
                          businessHours: { ...settings.businessHours, startTime: e.target.value }
                        })}
                        className="w-full px-2 py-2 border border-zinc-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                      />
                    </div>
                    <div className="pt-6 flex-shrink-0">
                      <span className="text-zinc-400">–</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Stänger</label>
                      <input
                        type="time"
                        value={settings.businessHours.endTime}
                        onChange={(e) => setSettings({
                          ...settings,
                          businessHours: { ...settings.businessHours, endTime: e.target.value }
                        })}
                        className="w-full px-2 py-2 border border-zinc-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                      />
                    </div>
                  </div>
                  {errors.businessHours && (
                    <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{errors.businessHours}</p>
                  )}
                </div>

                {/* Time Interval Card */}
                <div className="bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm rounded-xl p-5 border border-zinc-200/50 dark:border-zinc-700/50">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-zinc-900 dark:text-white">Tidsintervall</h3>
                  </div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Bokningslängd</label>
                  <select
                    value={settings.timeInterval}
                    onChange={(e) => setSettings({ ...settings, timeInterval: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  >
                    <option value={15}>15 minuter</option>
                    <option value={30}>30 minuter</option>
                    <option value={45}>45 minuter</option>
                    <option value={60}>60 minuter (1 timme)</option>
                    <option value={90}>90 minuter (1,5 timme)</option>
                    <option value={120}>120 minuter (2 timmar)</option>
                  </select>
                  {errors.timeInterval && (
                    <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{errors.timeInterval}</p>
                  )}
                </div>

                {/* Booking Rules Card */}
                <div className="bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm rounded-xl p-5 border border-zinc-200/50 dark:border-zinc-700/50 md:col-span-2 lg:col-span-1">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-zinc-900 dark:text-white">Bokningsregler</h3>
                  </div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Förhandsbokning</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={settings.advanceBookingHours}
                      onChange={(e) => setSettings({ ...settings, advanceBookingHours: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                      min="0"
                      max="720"
                    />
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">timmar</span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Minsta antal timmar i förväg för bokning
                  </p>
                  {errors.advanceBookingHours && (
                    <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{errors.advanceBookingHours}</p>
                  )}
                </div>
              </div>

              {/* Blocked Weekdays */}
              <div className="bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm rounded-xl p-5 border border-zinc-200/50 dark:border-zinc-700/50">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                    <svg className="w-4 h-4 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-white">Stängda veckodagar</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Välj dagar då bokning inte är möjlig</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {settings.blockedWeekdays?.map((day, index) => (
                    <label
                      key={day.dayOfWeek}
                      className={`relative flex flex-col items-center p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                        day.enabled
                          ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25 scale-105'
                          : 'bg-zinc-100 dark:bg-zinc-700/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={day.enabled}
                        onChange={(e) => {
                          const newBlockedWeekdays = [...settings.blockedWeekdays];
                          newBlockedWeekdays[index] = { ...day, enabled: e.target.checked };
                          setSettings({ ...settings, blockedWeekdays: newBlockedWeekdays });
                        }}
                        className="sr-only"
                      />
                      <span className="text-xs font-bold">{WEEKDAY_NAMES[day.dayOfWeek].slice(0, 3)}</span>
                      {day.enabled && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow">
                          <svg className="w-2.5 h-2.5 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Recurring Blocked Times */}
              <div className="bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm rounded-xl p-5 border border-zinc-200/50 dark:border-zinc-700/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-white">Återkommande pauser</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Lunch, rast eller andra dagliga blockeringar</p>
                    </div>
                  </div>
                </div>

                {/* List of recurring blocked times */}
                {settings.recurringBlockedTimes?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {settings.recurringBlockedTimes.map((time) => (
                      <div
                        key={time.id}
                        className="group flex items-center gap-2 pl-3 pr-1 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full text-sm font-medium shadow-md"
                      >
                        <span>{time.reason}</span>
                        <span className="text-amber-100 text-xs">({time.startTime}-{time.endTime})</span>
                        <button
                          onClick={() => {
                            const newTimes = settings.recurringBlockedTimes.filter(t => t.id !== time.id);
                            setSettings({ ...settings, recurringBlockedTimes: newTimes });
                          }}
                          className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new recurring blocked time */}
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Starttid</label>
                    <input
                      type="time"
                      id="recurring-start"
                      defaultValue="12:00"
                      className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Sluttid</label>
                    <input
                      type="time"
                      id="recurring-end"
                      defaultValue="13:00"
                      className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Benämning</label>
                    <input
                      type="text"
                      id="recurring-reason"
                      placeholder="T.ex. Lunch"
                      className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const startInput = document.getElementById('recurring-start') as HTMLInputElement;
                      const endInput = document.getElementById('recurring-end') as HTMLInputElement;
                      const reasonInput = document.getElementById('recurring-reason') as HTMLInputElement;

                      if (!startInput.value || !endInput.value || !reasonInput.value.trim()) {
                        alert('Fyll i alla fält');
                        return;
                      }

                      const newTime: RecurringBlockedTime = {
                        id: crypto.randomUUID(),
                        startTime: startInput.value,
                        endTime: endInput.value,
                        reason: reasonInput.value.trim(),
                        daysOfWeek: [],
                      };

                      setSettings({
                        ...settings,
                        recurringBlockedTimes: [...(settings.recurringBlockedTimes || []), newTime],
                      });

                      startInput.value = '12:00';
                      endInput.value = '13:00';
                      reasonInput.value = '';
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg text-sm whitespace-nowrap"
                  >
                    + Lägg till
                  </button>
                </div>
              </div>

              {/* Special Blocked Dates */}
              <div className="bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm rounded-xl p-5 border border-zinc-200/50 dark:border-zinc-700/50">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-white">Speciella stängda dagar</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Helgdagar, semester och andra enstaka dagar</p>
                  </div>
                </div>

                {/* List of blocked dates */}
                {settings.blockedDates?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {settings.blockedDates.map((blockedDate) => (
                      <div
                        key={blockedDate.id}
                        className="group flex items-center gap-2 pl-3 pr-1 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-sm font-medium shadow-md"
                      >
                        <span>{blockedDate.reason}</span>
                        <span className="text-purple-100 text-xs">
                          ({new Date(blockedDate.date + 'T00:00:00').toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                          {!blockedDate.allDay && blockedDate.startTime && blockedDate.endTime && (
                            <span> {blockedDate.startTime}-{blockedDate.endTime}</span>
                          )})
                        </span>
                        <button
                          onClick={() => {
                            const newDates = settings.blockedDates.filter(d => d.id !== blockedDate.id);
                            setSettings({ ...settings, blockedDates: newDates });
                          }}
                          className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new blocked date */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="relative flex-1 min-w-[180px]">
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Datum</label>
                      <button
                        type="button"
                        onClick={() => setShowCalendarPopup(!showCalendarPopup)}
                        className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-left text-sm flex items-center justify-between hover:border-purple-400 dark:hover:border-purple-500 transition-colors"
                      >
                        {selectedBlockedDate ? (
                          <span className="text-zinc-900 dark:text-white">
                            {new Date(selectedBlockedDate + 'T00:00:00').toLocaleDateString('sv-SE', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-500">Välj datum...</span>
                        )}
                        <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>

                      {showCalendarPopup && (
                        <>
                          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100]" onClick={() => setShowCalendarPopup(false)} />
                          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border-2 border-zinc-200 dark:border-zinc-600 p-4 sm:p-6 w-[calc(100vw-2rem)] max-w-md">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-semibold text-zinc-900 dark:text-white text-lg">Välj datum</h4>
                              <button
                                onClick={() => setShowCalendarPopup(false)}
                                className="hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                              >
                                <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            <MiniCalendar
                              onDateSelect={(date) => {
                                setSelectedBlockedDate(date);
                                setShowCalendarPopup(false);
                              }}
                              selectedDates={selectedBlockedDate ? [selectedBlockedDate] : []}
                              markedDates={settings.blockedDates?.map(d => d.date) || []}
                            />
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Anledning</label>
                      <input
                        type="text"
                        value={blockedDateReason}
                        onChange={(e) => setBlockedDateReason(e.target.value)}
                        placeholder="T.ex. Julafton"
                        className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Time options */}
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={blockedDateAllDay}
                        onChange={(e) => setBlockedDateAllDay(e.target.checked)}
                        className="w-4 h-4 text-purple-600 border-zinc-300 dark:border-zinc-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">Hela dagen</span>
                    </label>

                    {!blockedDateAllDay && (
                      <div className="flex items-center gap-2">
                        <div>
                          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Från</label>
                          <input
                            type="time"
                            value={blockedDateStartTime}
                            onChange={(e) => setBlockedDateStartTime(e.target.value)}
                            className="px-2 py-1.5 border border-zinc-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white text-sm"
                          />
                        </div>
                        <span className="text-zinc-400 pt-5">—</span>
                        <div>
                          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Till</label>
                          <input
                            type="time"
                            value={blockedDateEndTime}
                            onChange={(e) => setBlockedDateEndTime(e.target.value)}
                            className="px-2 py-1.5 border border-zinc-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white text-sm"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        if (!selectedBlockedDate || !blockedDateReason.trim()) {
                          alert('Fyll i både datum och anledning');
                          return;
                        }

                        if (settings.blockedDates?.some(d => d.date === selectedBlockedDate && d.allDay === blockedDateAllDay)) {
                          alert('Detta datum är redan tillagt');
                          return;
                        }

                        const newBlockedDate: BlockedDate = {
                          id: crypto.randomUUID(),
                          date: selectedBlockedDate,
                          reason: blockedDateReason.trim(),
                          allDay: blockedDateAllDay,
                          ...(!blockedDateAllDay && {
                            startTime: blockedDateStartTime,
                            endTime: blockedDateEndTime,
                          }),
                        };

                        setSettings({
                          ...settings,
                          blockedDates: [...(settings.blockedDates || []), newBlockedDate],
                        });

                        setSelectedBlockedDate(null);
                        setBlockedDateReason('');
                        setBlockedDateAllDay(true);
                        setBlockedDateStartTime('09:00');
                        setBlockedDateEndTime('18:00');
                      }}
                      className="ml-auto px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg text-sm whitespace-nowrap"
                    >
                      + Lägg till
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Business Info */}
          <section className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">
              Företagsinformation
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Företagsnamn
                </label>
                <input
                  type="text"
                  value={settings.businessName}
                  onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ditt företagsnamn"
                />
                {errors.businessName && (
                  <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{errors.businessName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Kontakt e-post
                </label>
                <input
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="info@intenzze.com"
                />
                {errors.contactEmail && (
                  <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{errors.contactEmail}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Telefonnummer
                </label>
                <input
                  type="tel"
                  value={settings.contactPhone}
                  onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="070-123 45 67"
                />
                {errors.contactPhone && (
                  <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{errors.contactPhone}</p>
                )}
              </div>
            </div>
          </section>

          {/* Appearance */}
          <section className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 overflow-hidden">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">
              Utseende
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Tema
                </label>
                <select
                  value={settings.theme}
                  onChange={(e) => setSettings({ ...settings, theme: e.target.value as 'light' | 'dark' | 'system' })}
                  className="w-full max-w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="light">Ljust</option>
                  <option value="dark">Mörkt</option>
                  <option value="system">System</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Kalendervy
                </label>
                <select
                  value={settings.calendarView}
                  onChange={(e) => setSettings({ ...settings, calendarView: e.target.value as 'single' | 'dual' })}
                  className="w-full max-w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="single">En månad</option>
                  <option value="dual">Två månader</option>
                </select>
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">
              Aviseringar
            </h2>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                className="w-5 h-5 text-blue-600 border-zinc-300 dark:border-zinc-700 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-zinc-900 dark:text-white">
                  E-postaviseringar
                </span>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Få e-postbekräftelser för nya bokningar
                </p>
              </div>
            </label>
          </section>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white active:bg-blue-700 font-medium py-3 px-6 rounded-lg transition-colors shadow-lg cursor-pointer"
            >
              Spara inställningar
            </button>
            <button
              onClick={handleReset}
              className="flex-1 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 active:bg-zinc-400 dark:hover:bg-zinc-600 text-zinc-900 dark:text-white font-medium py-3 px-6 rounded-lg transition-colors cursor-pointer shadow-lg"
            >
              Återställ till standard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
