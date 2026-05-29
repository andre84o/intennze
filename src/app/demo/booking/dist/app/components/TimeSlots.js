'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { generateTimeSlots } from '../lib/utils';
export default function TimeSlots({ selectedDate, selectedTime, onTimeSelect, bookings }) {
    const timeSlots = generateTimeSlots();
    const bookedSlots = bookings
        .filter(b => b.date === selectedDate)
        .map(b => b.timeSlot);
    return (_jsxs("div", { className: "w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: "V\u00E4lj tid" }), _jsx("div", { className: "grid grid-cols-2 gap-3", children: timeSlots.map(slot => {
                    const isBooked = bookedSlots.includes(slot);
                    const isSelected = slot === selectedTime;
                    return (_jsx("button", { onClick: () => !isBooked && onTimeSelect(slot), disabled: isBooked, className: `
                p-3 rounded-lg text-sm font-medium transition-all
                ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
                ${!isSelected && !isBooked ? 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700' : ''}
                ${isBooked ? 'bg-zinc-50 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 cursor-not-allowed line-through' : 'cursor-pointer'}
              `, children: slot }, slot));
                }) }), _jsx("div", { className: "mt-4 text-xs text-zinc-600 dark:text-zinc-400", children: _jsx("p", { children: "\u00D6ppettider: 09:00 - 18:00" }) })] }));
}
//# sourceMappingURL=TimeSlots.js.map