'use client';

import { useState } from 'react';
import { getDaysInMonth, getMonthName, getWeekdayNames, formatDate } from '../lib/utils';

interface DualCalendarProps {
  onDateSelect: (date: string) => void;
  selectedDate: string | null;
  bookedDates?: string[];
  closedDates?: string[]; // Dates that are fully closed
  closedWeekdays?: number[]; // Days of week that are closed (0=Sunday, 6=Saturday)
}

export default function DualCalendar({ onDateSelect, selectedDate, bookedDates = [], closedDates = [], closedWeekdays = [] }: DualCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Calculate first and second month
  const year1 = currentDate.getFullYear();
  const month1 = currentDate.getMonth();

  const secondMonthDate = new Date(year1, month1 + 1, 1);
  const year2 = secondMonthDate.getFullYear();
  const month2 = secondMonthDate.getMonth();

  const days1 = getDaysInMonth(year1, month1);
  const days2 = getDaysInMonth(year2, month2);
  const weekdays = getWeekdayNames();
  const today = formatDate(new Date());

  // Minimum booking date is tomorrow (24 hours in advance)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = formatDate(minDate);

  const previousMonths = () => {
    // Move back 2 months
    setCurrentDate(new Date(year1, month1 - 2, 1));
  };

  const nextMonths = () => {
    // Move forward 2 months
    setCurrentDate(new Date(year1, month1 + 2, 1));
  };

  const isCurrentMonth = (date: Date, monthToCheck: number) => date.getMonth() === monthToCheck;
  const isPastDate = (date: Date) => {
    const dateStr = formatDate(date);
    return dateStr < minDateStr;
  };

  const renderMonth = (days: Date[], month: number, year: number) => {
    return (
      <div className="flex-1 min-w-[280px]">
        {/* Month header - hidden on mobile since it's shown in navigation header */}
        <h3 className="hidden lg:block text-lg font-semibold text-center mb-4 text-black dark:text-white">
          {getMonthName(month)} {year}
        </h3>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekdays.map(day => (
            <div key={day} className="text-center text-sm font-medium text-zinc-700 dark:text-zinc-400">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((date, index) => {
            const dateStr = formatDate(date);
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === today;
            const inCurrentMonth = isCurrentMonth(date, month);
            const isPast = isPastDate(date);
            const hasBooking = bookedDates.includes(dateStr);
            const isClosed = closedDates.includes(dateStr) || closedWeekdays.includes(date.getDay());

            return (
              <button
                key={index}
                onClick={() => !isPast && !isClosed && onDateSelect(dateStr)}
                disabled={isPast || isClosed}
                className={`
                  aspect-square p-2 rounded-lg text-sm font-medium transition-all
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
      </div>
    );
  };

  return (
    <div className="w-full max-w-md lg:max-w-none bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-4 sm:p-6 border border-zinc-200 dark:border-zinc-800">
      {/* Navigation header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <button
          onClick={previousMonths}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-700 dark:text-zinc-300"
          aria-label="Föregående månader"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="text-center">
          <h2 className="text-lg sm:text-xl font-semibold text-black dark:text-white">
            <span className="hidden lg:inline">Dubbel månadsvy</span>
            <span className="lg:hidden">{getMonthName(month1)} {year1}</span>
          </h2>
          <p className="hidden lg:block text-sm text-zinc-600 dark:text-zinc-400">
            Navigerar 2 månader åt gången
          </p>
        </div>

        <button
          onClick={nextMonths}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-700 dark:text-zinc-300"
          aria-label="Nästa månader"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Two calendars side by side on large screens, single on mobile */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {renderMonth(days1, month1, year1)}
        <div className="hidden lg:block w-px bg-zinc-200 dark:bg-zinc-700 self-stretch"></div>
        <div className="hidden lg:block flex-1">
          {renderMonth(days2, month2, year2)}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 sm:mt-6 flex flex-wrap gap-3 sm:gap-4 text-xs text-zinc-700 dark:text-zinc-400 justify-center">
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
