export interface Booking {
  id: string;
  date: string; // YYYY-MM-DD format
  timeSlot: string; // e.g., "09:00-10:00"
  name: string;
  email: string;
  phone: string;
  notes?: string;
  createdAt: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

// Blockerad specifik dag (t.ex. Jul, Nyår)
export interface BlockedDate {
  id: string;
  date: string; // YYYY-MM-DD format
  reason: string; // t.ex. "Julafton", "Nyårsafton"
  allDay: boolean; // Om hela dagen är blockerad
  startTime?: string; // t.ex. "09:00" - om inte hela dagen
  endTime?: string; // t.ex. "12:00" - om inte hela dagen
  blockedSlots?: string[]; // Specifika tider om inte hela dagen (legacy)
}

// Blockerad veckodag (t.ex. stängt på söndagar)
export interface BlockedWeekday {
  dayOfWeek: number; // 0 = Söndag, 1 = Måndag, ..., 6 = Lördag
  enabled: boolean;
}

// Återkommande blockerad tid (t.ex. lunch varje dag)
export interface RecurringBlockedTime {
  id: string;
  startTime: string; // t.ex. "12:00"
  endTime: string; // t.ex. "13:00"
  reason: string; // t.ex. "Lunch", "Rast"
  daysOfWeek: number[]; // Vilka dagar som gäller (0-6), tom array = alla dagar
}

export interface Settings {
  businessHours: {
    startTime: string; // e.g., "09:00"
    endTime: string; // e.g., "18:00"
  };
  timeInterval: number; // minutes, e.g., 60
  businessName: string;
  contactEmail: string;
  contactPhone: string;
  advanceBookingHours: number; // minimum hours in advance for booking
  theme: 'light' | 'dark' | 'system';
  emailNotifications: boolean;
  calendarView: 'single' | 'dual'; // single month or dual months view

  // Blockerade tider
  blockedDates: BlockedDate[]; // Specifika blockerade datum
  blockedWeekdays: BlockedWeekday[]; // Blockerade veckodagar
  recurringBlockedTimes: RecurringBlockedTime[]; // Återkommande blockerade tider
}
