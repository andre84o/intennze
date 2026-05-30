// Export all components
export { default as BookingCalendar } from '../components/Calendar';
export { default as TimeSlots } from '../components/TimeSlots';
export { default as BookingForm } from '../components/BookingForm';
export { default as BookingList } from '../components/BookingList';
export { default as Modal } from '../components/Modal';
export { default as EditBookingModal } from '../components/EditBookingModal';

// Export types
export type { Booking } from '../types/booking';

// Export utilities
export { storage } from '../lib/storage';
export {
  generateTimeSlots,
  formatDate,
  getDaysInMonth,
  getMonthName,
  getWeekdayNames
} from '../lib/utils';

// Export main booking app page component
export { default as BookingApp } from '../page';
