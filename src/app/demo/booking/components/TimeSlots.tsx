
'use client';

import { generateTimeSlots } from '../lib/utils';
import { Booking, Settings } from '../types/booking';

interface TimeSlotsProps {
  selectedDate: string;
  selectedTime: string | null;
  onTimeSelect: (time: string) => void;
  bookings: Booking[];
  settings?: Settings | null;
}

// Helper function to check if a time slot overlaps with a blocked time range
function isTimeInRange(slotStart: string, blockedStart: string, blockedEnd: string): boolean {
  // Convert "HH:MM" to minutes for easier comparison
  const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const slotMinutes = toMinutes(slotStart);
  const blockStartMinutes = toMinutes(blockedStart);
  const blockEndMinutes = toMinutes(blockedEnd);

  return slotMinutes >= blockStartMinutes && slotMinutes < blockEndMinutes;
}

export default function TimeSlots({ selectedDate, selectedTime, onTimeSelect, bookings, settings }: TimeSlotsProps) {
  const timeSlots = generateTimeSlots();
  const bookedSlots = bookings
    .filter(b => b.date === selectedDate)
    .map(b => b.timeSlot);

  // Get the day of week for the selected date (0 = Sunday, 6 = Saturday)
  const selectedDateObj = new Date(selectedDate + 'T00:00:00');
  const dayOfWeek = selectedDateObj.getDay();

  // Check if the entire day is blocked
  const isDayBlocked = () => {
    if (!settings) return false;

    // Check blocked weekdays
    const blockedWeekday = settings.blockedWeekdays?.find(w => w.dayOfWeek === dayOfWeek);
    if (blockedWeekday?.enabled) return true;

    // Check blocked specific dates
    const blockedDate = settings.blockedDates?.find(d => d.date === selectedDate && d.allDay);
    if (blockedDate) return true;

    return false;
  };

  // Check if a specific time slot is blocked
  const isSlotBlocked = (slot: string): { blocked: boolean; reason?: string } => {
    if (!settings) return { blocked: false };

    // Extract start time from slot (e.g., "09:00" from "09:00-10:00")
    const slotStart = slot.split('-')[0];

    // Check recurring blocked times
    for (const blockedTime of settings.recurringBlockedTimes || []) {
      // Check if this recurring time applies to this day
      const appliesToDay = blockedTime.daysOfWeek.length === 0 || blockedTime.daysOfWeek.includes(dayOfWeek);

      if (appliesToDay && isTimeInRange(slotStart, blockedTime.startTime, blockedTime.endTime)) {
        return { blocked: true, reason: blockedTime.reason };
      }
    }

    // Check blocked specific date with specific times or slots (not allDay)
    const blockedDate = settings.blockedDates?.find(d => d.date === selectedDate && !d.allDay);
    if (blockedDate) {
      // Check if using new startTime/endTime format
      if (blockedDate.startTime && blockedDate.endTime) {
        if (isTimeInRange(slotStart, blockedDate.startTime, blockedDate.endTime)) {
          return { blocked: true, reason: blockedDate.reason };
        }
      }
      // Check legacy blockedSlots format
      if (blockedDate.blockedSlots?.includes(slot)) {
        return { blocked: true, reason: blockedDate.reason };
      }
    }

    return { blocked: false };
  };

  // If the entire day is blocked, show a message
  if (isDayBlocked()) {
    const blockedWeekday = settings?.blockedWeekdays?.find(w => w.dayOfWeek === dayOfWeek && w.enabled);
    const blockedDate = settings?.blockedDates?.find(d => d.date === selectedDate && d.allDay);

    return (
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-4 sm:p-6 border border-zinc-200 dark:border-zinc-800">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-black dark:text-white">Välj tid</h3>
        <div className="p-6 text-center bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800">
          <svg className="w-12 h-12 mx-auto mb-3 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-medium text-rose-800 dark:text-rose-200">Stängt denna dag</p>
          {blockedDate && (
            <p className="text-sm text-rose-600 dark:text-rose-300 mt-1">{blockedDate.reason}</p>
          )}
          {blockedWeekday && !blockedDate && (
            <p className="text-sm text-rose-600 dark:text-rose-300 mt-1">Vi har stängt på {['söndagar', 'måndagar', 'tisdagar', 'onsdagar', 'torsdagar', 'fredagar', 'lördagar'][dayOfWeek]}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-4 sm:p-6 border border-zinc-200 dark:border-zinc-800">
      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-black dark:text-white">Välj tid</h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {timeSlots.map(slot => {
          const isBooked = bookedSlots.includes(slot);
          const blockInfo = isSlotBlocked(slot);
          const isBlocked = blockInfo.blocked;
          const isSelected = slot === selectedTime;
          const isDisabled = isBooked || isBlocked;

          return (
            <button
              key={slot}
              onClick={() => !isDisabled && onTimeSelect(slot)}
              disabled={isDisabled}
              title={isBlocked ? blockInfo.reason : undefined}
              className={`
                p-2 sm:p-3 rounded-lg text-sm font-medium transition-all relative
                ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
                ${!isSelected && !isDisabled ? 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-black dark:text-white' : ''}
                ${isBooked ? 'bg-zinc-50 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 cursor-not-allowed line-through' : ''}
                ${isBlocked && !isBooked ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 cursor-not-allowed' : ''}
                ${!isDisabled ? 'cursor-pointer' : ''}
              `}
            >
              {slot}
              {isBlocked && !isBooked && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 sm:mt-4 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
        <p>Öppettider: {settings?.businessHours?.startTime || '09:00'} - {settings?.businessHours?.endTime || '18:00'}</p>
        {settings?.recurringBlockedTimes && settings.recurringBlockedTimes.length > 0 && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <span className="w-3 h-3 bg-amber-500 rounded-full inline-block"></span>
            <span>= Blockerad tid ({settings.recurringBlockedTimes.map(t => t.reason).join(', ')})</span>
          </div>
        )}
      </div>
    </div>
  );
}
