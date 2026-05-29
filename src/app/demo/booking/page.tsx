'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Calendar from './components/Calendar';
import DualCalendar from './components/DualCalendar';
import TimeSlots from './components/TimeSlots';
import BookingForm from './components/BookingForm';
import BookingList from './components/BookingList';
import Modal from './components/Modal';
import EditBookingModal from './components/EditBookingModal';
import { storage } from './lib/storage';
import { Booking, Settings } from './types/booking';
import { formatDate } from './lib/utils';

export default function Home() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [activeTab, setActiveTab] = useState<'book' | 'list'>('book');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    actions?: Array<{ label: string; onClick: () => void; variant?: 'primary' | 'secondary' }>;
  }>({
    title: '',
    message: '',
    type: 'success'
  });
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    // Load bookings and settings from localStorage when component mounts
    setBookings(storage.getBookings());
    setSettings(storage.getSettings());

    // Listen for settings changes
    const handleSettingsChange = () => {
      setSettings(storage.getSettings());
    };
    window.addEventListener('settingsChanged', handleSettingsChange);

    return () => {
      window.removeEventListener('settingsChanged', handleSettingsChange);
    };
  }, []);

  const showModal = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'success',
    actions?: Array<{ label: string; onClick: () => void; variant?: 'primary' | 'secondary' }>
  ) => {
    setModalConfig({ title, message, type, actions });
    setModalOpen(true);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setShowForm(false);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setShowForm(true);
  };

  const handleBookingSubmit = (bookingData: Omit<Booking, 'id' | 'createdAt'>) => {
    // Final validation: check if the time slot is still available
    const isSlotTaken = bookings.some(
      b => b.date === bookingData.date && b.timeSlot === bookingData.timeSlot
    );

    if (isSlotTaken) {
      showModal(
        'Dubbel bokning',
        'Tyvärr, denna tid är redan bokad. Vänligen välj en annan tid.',
        'error'
      );
      return;
    }

    const newBooking: Booking = {
      ...bookingData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };

    storage.saveBooking(newBooking);
    setBookings(storage.getBookings());

    // Reset state
    setSelectedDate(null);
    setSelectedTime(null);
    setShowForm(false);

    // Show success message
    showModal(
      'Bokning bekräftad!',
      'Din bokning är bekräftad! Du kommer att få en bekräftelse via e-post.',
      'success'
    );
  };

  const handleBookingCancel = () => {
    setShowForm(false);
    setSelectedTime(null);
  };

  const confirmDelete = (id: string) => {
    // Close the confirmation modal
    setModalOpen(false);

    // Delete the booking
    storage.deleteBooking(id);
    setBookings(storage.getBookings());

    // Show success message after a brief delay
    setTimeout(() => {
      showModal(
        'Bokning borttagen',
        'Din bokning har tagits bort.',
        'info'
      );
    }, 150);
  };

  const handleBookingDelete = (id: string) => {
    showModal(
      'Bekräfta avbokning',
      'Är du säker på att du vill avboka denna tid? Detta går inte att ångra.',
      'warning',
      [
        {
          label: 'Avbryt',
          onClick: () => {
            setModalOpen(false);
          },
          variant: 'secondary'
        },
        {
          label: 'Ja, avboka',
          onClick: () => {
            confirmDelete(id);
          },
          variant: 'primary'
        }
      ]
    );
  };

  const handleBookingEdit = (booking: Booking) => {
    setEditBooking(booking);
    setEditModalOpen(true);
  };

  const handleBookingUpdate = (updatedBooking: Booking) => {
    storage.updateBooking(updatedBooking.id, updatedBooking);
    setBookings(storage.getBookings());
    setEditModalOpen(false);
    setEditBooking(null);

    showModal(
      'Bokning uppdaterad!',
      'Din bokning har uppdaterats.',
      'success'
    );
  };

  const bookedDates = Array.from(new Set(bookings.map(b => b.date)));

  // Get fully closed dates (allDay blocked dates)
  const closedDates = settings?.blockedDates
    ?.filter(d => d.allDay)
    .map(d => d.date) || [];

  // Get closed weekdays (0=Sunday, 6=Saturday)
  const closedWeekdays = settings?.blockedWeekdays
    ?.filter(w => w.enabled)
    .map(w => w.dayOfWeek) || [];

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950 px-4 py-8">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-indigo-200/20 dark:bg-indigo-900/10 blur-3xl -z-10 pointer-events-none rounded-full transform -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-full h-96 bg-purple-200/20 dark:bg-purple-900/10 blur-3xl -z-10 pointer-events-none rounded-full transform translate-y-1/2"></div>

      <div className="relative z-10 max-w-7xl mx-auto">
        
        {/* Header Section */}
        <header className="flex flex-col items-center justify-center mb-12 sm:mb-16 relative">
          <div className="text-center space-y-4 max-w-2xl px-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extralight tracking-tight text-zinc-900 dark:text-white">
              Boka din tid
              <span className="block font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 mt-2">
                Enkelt & Smidigt
              </span>
            </h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 font-light max-w-lg mx-auto leading-relaxed">
              Välj en tid som passar dig i vår kalender nedan. Vi ser fram emot att träffa dig.
            </p>
          </div>

        </header>

        {/* Main Glass Card */}
        <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 dark:border-white/5 overflow-hidden">
          
          {/* Tab Navigation */}
          <div className="border-b border-zinc-200/50 dark:border-zinc-700/50 p-6 flex justify-center sticky top-0 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md z-20">
            <div className="bg-zinc-100/50 dark:bg-zinc-800/50 backdrop-blur-sm p-1.5 rounded-full inline-flex relative shadow-inner">
              <button
                onClick={() => setActiveTab('book')}
                className={`relative z-10 px-6 sm:px-8 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeTab === 'book'
                    ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-300 shadow-md transform scale-105'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Boka tid
              </button>
              <button
                onClick={() => setActiveTab('list')}
                className={`relative z-10 px-6 sm:px-8 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeTab === 'list'
                    ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-300 shadow-md transform scale-105'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <span>Mina bokningar</span>
                {bookings.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-zinc-800">
                    {bookings.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => router.push('/demo/booking/settings')}
                className="relative z-10 px-4 sm:px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/50 dark:hover:bg-zinc-700/50 flex items-center gap-2"
                title="Inställningar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">Inställningar</span>
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6 sm:p-10 min-h-[500px]">
            {activeTab === 'book' ? (
              <div className={`flex flex-col gap-10 justify-center items-center xl:items-start transition-all duration-500 ${selectedDate ? 'xl:flex-row' : ''}`}>
                
                {/* Left Side: Calendar */}
                <div className={`w-full space-y-8 animate-fadeIn transition-all duration-500 ${selectedDate ? 'xl:w-auto xl:flex-1' : 'max-w-5xl mx-auto'}`}>
                  {settings?.calendarView === 'dual' ? (
                     <div className="flex justify-center xl:block">
                      <DualCalendar
                        onDateSelect={handleDateSelect}
                        selectedDate={selectedDate}
                        bookedDates={bookedDates}
                        closedDates={closedDates}
                        closedWeekdays={closedWeekdays}
                      />
                    </div>
                  ) : (
                    <div className="flex justify-center xl:block">
                      <Calendar
                        onDateSelect={handleDateSelect}
                        selectedDate={selectedDate}
                        bookedDates={bookedDates}
                        closedDates={closedDates}
                        closedWeekdays={closedWeekdays}
                      />
                    </div>
                  )}
                  
                  {/* Instructions (Horizontal Features) */}
                   {!selectedDate && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 max-w-5xl mx-auto">
                      {[
                        { step: "1", title: "Välj Datum", desc: "Hitta en dag som passar dig i kalendern ovan." },
                        { step: "2", title: "Välj Tid", desc: "Klicka på en ledig tid i listan som dyker upp." },
                        { step: "3", title: "Bekräfta", desc: "Fyll i dina uppgifter och få bekräftelse direkt." }
                      ].map((item, i) => (
                        <div key={i} className="bg-white/50 dark:bg-zinc-800/30 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-700/50 hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1">
                          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center font-bold text-xl mb-4 shadow-sm">
                            {item.step}
                          </div>
                          <h4 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 mb-2">{item.title}</h4>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Side: Form / Slots */}
                <div className={`w-full xl:w-[400px] flex-shrink-0 transition-all duration-500 ${selectedDate ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 hidden xl:block xl:w-0 overflow-hidden'}`}>
                  {selectedDate && !showForm && (
                     <div className="flex justify-center xl:block">
                      <TimeSlots
                        selectedDate={selectedDate}
                        selectedTime={selectedTime}
                        onTimeSelect={handleTimeSelect}
                        bookings={bookings}
                        settings={settings}
                      />
                    </div>
                  )}

                  {selectedDate && selectedTime && showForm && (
                    <div className="flex justify-center xl:block">
                      <BookingForm
                        selectedDate={selectedDate}
                        selectedTime={selectedTime}
                        onSubmit={handleBookingSubmit}
                        onCancel={handleBookingCancel}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex justify-center w-full max-w-4xl mx-auto animate-fadeIn">
                <BookingList bookings={bookings} onDelete={handleBookingDelete} onEdit={handleBookingEdit} />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center pb-8 opacity-60 hover:opacity-100 transition-opacity duration-300">
           <p className="text-zinc-500 dark:text-zinc-500 font-medium">Bokningskalender © {new Date().getFullYear()}</p>
           <p className="text-sm text-zinc-400 dark:text-zinc-600 mt-2">Frågor? <a href="mailto:info@intenzze.com" className="hover:text-indigo-500 underline decoration-indigo-300">info@intenzze.com</a></p>
        </footer>
      </div>

      {/* Modals */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        actions={modalConfig.actions}
      />
      <EditBookingModal
        booking={editBooking}
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditBooking(null);
        }}
        onSave={handleBookingUpdate}
        onError={(message) => {
          showModal('Fel vid redigering', message, 'error');
        }}
        existingBookings={bookings}
      />
    </div>
  );
}
