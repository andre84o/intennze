'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { getDaysInMonth, getMonthName, getWeekdayNames, formatDate } from '../lib/utils';
export default function Calendar({ onDateSelect, selectedDate, bookedDates = [] }) {
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
    const isCurrentMonth = (date) => date.getMonth() === month;
    const isPastDate = (date) => {
        const dateStr = formatDate(date);
        return dateStr < minDateStr;
    };
    return (_jsxs("div", { className: "w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("button", { onClick: previousMonth, className: "p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors", "aria-label": "F\u00F6reg\u00E5ende m\u00E5nad", children: _jsx("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 19l-7-7 7-7" }) }) }), _jsxs("h2", { className: "text-xl font-semibold", children: [getMonthName(month), " ", year] }), _jsx("button", { onClick: nextMonth, className: "p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors", "aria-label": "N\u00E4sta m\u00E5nad", children: _jsx("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 5l7 7-7 7" }) }) })] }), _jsx("div", { className: "grid grid-cols-7 gap-2 mb-2", children: weekdays.map(day => (_jsx("div", { className: "text-center text-sm font-medium text-zinc-600 dark:text-zinc-400", children: day }, day))) }), _jsx("div", { className: "grid grid-cols-7 gap-2", children: days.map((date, index) => {
                    const dateStr = formatDate(date);
                    const isSelected = dateStr === selectedDate;
                    const isToday = dateStr === today;
                    const inCurrentMonth = isCurrentMonth(date);
                    const isPast = isPastDate(date);
                    const hasBooking = bookedDates.includes(dateStr);
                    return (_jsx("button", { onClick: () => !isPast && onDateSelect(dateStr), disabled: isPast, className: `
                aspect-square p-2 rounded-lg text-sm font-medium transition-all
                ${!inCurrentMonth ? 'text-zinc-300 dark:text-zinc-700' : ''}
                ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
                ${!isSelected && isToday ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : ''}
                ${!isSelected && !isToday && inCurrentMonth && !isPast ? 'hover:bg-zinc-100 dark:hover:bg-zinc-800' : ''}
                ${isPast ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                ${hasBooking && !isSelected ? 'ring-2 ring-green-500' : ''}
              `, children: date.getDate() }, index));
                }) }), _jsxs("div", { className: "mt-4 flex flex-wrap gap-4 text-xs text-zinc-600 dark:text-zinc-400", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-4 h-4 bg-blue-100 dark:bg-blue-900 rounded" }), _jsx("span", { children: "Idag" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-4 h-4 ring-2 ring-green-500 rounded" }), _jsx("span", { children: "Har bokningar" })] })] })] }));
}
//# sourceMappingURL=Calendar.js.map