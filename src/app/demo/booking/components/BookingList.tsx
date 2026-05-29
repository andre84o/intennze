'use client';

import { Booking } from '../types/booking';

interface BookingListProps {
  bookings: Booking[];
  onDelete: (id: string) => void;
  onEdit: (booking: Booking) => void;
}

export default function BookingList({ bookings, onDelete, onEdit }: BookingListProps) {
  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('sv-SE', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const sortedBookings = [...bookings].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.timeSlot.localeCompare(b.timeSlot);
  });

  if (bookings.length === 0) {
    return (
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-4 sm:p-6 border border-zinc-200 dark:border-zinc-800">
        <h3 className="text-base sm:text-lg font-semibold mb-4 text-black dark:text-white">Mina bokningar</h3>
        <div className="text-center py-6 sm:py-8 text-zinc-500 dark:text-zinc-400">
          <svg
            className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm sm:text-base">Inga bokningar ännu</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-4 sm:p-6 border border-zinc-200 dark:border-zinc-800">
      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-black dark:text-white">
        Mina bokningar ({bookings.length})
      </h3>

      <div className="space-y-3">
        {sortedBookings.map((booking) => (
          <div
            key={booking.id}
            className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-750 transition-colors"
          >
            <div className="hidden sm:flex flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900 rounded-lg items-center justify-center">
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                    {booking.name}
                  </p>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                    {formatDisplayDate(booking.date)} • {booking.timeSlot}
                  </p>
                </div>

                <div className="flex gap-1 sm:gap-2">
                  <button
                    onClick={() => onEdit(booking)}
                    className="flex-shrink-0 p-1.5 sm:p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    aria-label="Redigera bokning"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(booking.id)}
                    className="flex-shrink-0 p-1.5 sm:p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    aria-label="Ta bort bokning"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 text-xs sm:text-sm">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">E-post:</span>{' '}
                  <span className="text-zinc-700 dark:text-zinc-300">{booking.email}</span>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Telefon:</span>{' '}
                  <span className="text-zinc-700 dark:text-zinc-300">{booking.phone}</span>
                </div>
              </div>

              {booking.notes && (
                <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 italic">
                  &quot;{booking.notes}&quot;
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
