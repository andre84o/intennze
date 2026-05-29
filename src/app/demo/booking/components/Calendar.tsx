'use client';

import { useState } from 'react';
import { getDaysInMonth, getMonthName, getWeekdayNames, formatDate } from '../lib/utils';

interface CalendarProps {
  onDateSelect: (date: string) => void;
  selectedDate: string | null;
  bookedDates?: string[];
  closedDates?: string[]; // Dates that are fully closed
  closedWeekdays?: number[]; // Days of week that are closed (0=Sunday, 6=Saturday)
}

export default function Calendar({ onDateSelect, selectedDate, bookedDates = [], closedDates = [], closedWeekdays = [] }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const days = getDaysInMonth(year, month);
  const weekdays = getWeekdayNames();
  const today = formatDate(new Date());

  // Minimum booking date is tomorrow (24 hours in advance)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = formatDate(minDate);

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const isCurrentMonth = (date: Date) => date.getMonth() === month;
  const isPastDate = (date: Date) => {
    const dateStr = formatDate(date);
    return dateStr < minDateStr;
  };

  return (
    <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-4 sm:p-6 border border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <button
          onClick={previousMonth}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-700 dark:text-zinc-300"
          aria-label="Föregående månad"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h2 className="text-lg sm:text-xl font-semibold text-black dark:text-white">
          {getMonthName(month)} {year}
        </h2>

        <button
          onClick={nextMonth}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-700 dark:text-zinc-300"
          aria-label="Nästa månad"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
        {weekdays.map(day => (
          <div key={day} className="text-center text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-400">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((date, index) => {
          const dateStr = formatDate(date);
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === today;
          const inCurrentMonth = isCurrentMonth(date);
          const isPast = isPastDate(date);
          const hasBooking = bookedDates.includes(dateStr);
          const isClosed = closedDates.includes(dateStr) || closedWeekdays.includes(date.getDay());

          return (
            <button
              key={index}
              onClick={() => !isPast && !isClosed && onDateSelect(dateStr)}
              disabled={isPast || isClosed}
              className={`
                aspect-square p-1 sm:p-2 rounded-lg text-xs sm:text-sm font-medium transition-all
                ${!inCurrentMonth ? 'text-zinc-300 dark:text-zinc-700' : 'text-black dark:text-white'}
                ${isSelected ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400' : ''}
                ${!isSelected && isClosed && inCurrentMonth ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-400 dark:text-rose-500 cursor-not-allowed' : ''}
                ${!isSelected && !isClosed && isToday ? 'bg-zinc-200 dark:bg-zinc-700 text-black dark:text-white font-bold' : ''}
                ${!isSelected && !isClosed && !isToday && inCurrentMonth && !isPast ? 'hover:bg-zinc-100 dark:hover:bg-zinc-800' : ''}
                ${isPast && !isClosed ? 'opacity-40 cursor-not-allowed' : ''}
                ${!isPast && !isClosed ? 'cursor-pointer' : ''}
                ${hasBooking && !isSelected && !isClosed ? 'ring-2 ring-green-500 dark:ring-green-600' : ''}
              `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 sm:gap-4 text-xs text-zinc-700 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
          <span>Idag</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 ring-2 ring-green-500 dark:ring-green-600 rounded"></div>
          <span>Har bokningar</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-indigo-600 dark:bg-indigo-500 rounded"></div>
          <span>Vald dag</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-rose-100 dark:bg-rose-900/30 rounded"></div>
          <span>Stängt</span>
        </div>
      </div>
    </div>
  );
}
