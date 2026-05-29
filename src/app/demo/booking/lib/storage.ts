import { Booking, Settings } from '../types/booking';

const STORAGE_KEY = 'bookings';
const SETTINGS_KEY = 'settings';

const DEFAULT_SETTINGS: Settings = {
  businessHours: {
    startTime: '09:00',
    endTime: '18:00',
  },
  timeInterval: 60,
  businessName: 'Bookningskalender',
  contactEmail: 'info@intenzze.com',
  contactPhone: '070-123 45 67',
  advanceBookingHours: 24,
  theme: 'system',
  emailNotifications: true,
  calendarView: 'single',
  blockedDates: [],
  blockedWeekdays: [
    { dayOfWeek: 0, enabled: false }, // Söndag - öppen som standard
    { dayOfWeek: 1, enabled: false }, // Måndag
    { dayOfWeek: 2, enabled: false }, // Tisdag
    { dayOfWeek: 3, enabled: false }, // Onsdag
    { dayOfWeek: 4, enabled: false }, // Torsdag
    { dayOfWeek: 5, enabled: false }, // Fredag
    { dayOfWeek: 6, enabled: false }, // Lördag
  ],
  recurringBlockedTimes: [],
};

export const storage = {
  getBookings: (): Booking[] => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading bookings:', error);
      return [];
    }
  },

  saveBooking: (booking: Booking): void => {
    if (typeof window === 'undefined') return;
    try {
      const bookings = storage.getBookings();
      bookings.push(booking);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
    } catch (error) {
      console.error('Error saving booking:', error);
    }
  },

  updateBooking: (id: string, updatedBooking: Booking): void => {
    if (typeof window === 'undefined') return;
    try {
      const bookings = storage.getBookings();
      const index = bookings.findIndex(b => b.id === id);
      if (index !== -1) {
        bookings[index] = updatedBooking;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
      }
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  },

  deleteBooking: (id: string): void => {
    if (typeof window === 'undefined') return;
    try {
      const bookings = storage.getBookings();
      const filtered = bookings.filter(b => b.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting booking:', error);
    }
  },

  getBookingsByDate: (date: string): Booking[] => {
    return storage.getBookings().filter(b => b.date === date);
  },

  getSettings: (): Settings => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error reading settings:', error);
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings: (settings: Settings): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  },

  resetSettings: (): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch (error) {
      console.error('Error resetting settings:', error);
    }
  }
};
