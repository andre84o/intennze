'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { generateTimeSlots } from '../lib/utils';
export default function EditBookingModal({ booking, isOpen, onClose, onSave, onError, existingBookings }) {
    const [date, setDate] = useState('');
    const [timeSlot, setTimeSlot] = useState('');
    const [availableSlots, setAvailableSlots] = useState([]);
    const timeSlots = generateTimeSlots();
    useEffect(() => {
        if (booking && isOpen) {
            setDate(booking.date);
            setTimeSlot(booking.timeSlot);
        }
    }, [booking, isOpen]);
    useEffect(() => {
        if (date && booking) {
            // Get bookings for the selected date, excluding the current booking
            const bookedForDate = existingBookings
                .filter(b => b.date === date && b.id !== booking.id)
                .map(b => b.timeSlot);
            const available = timeSlots.filter(slot => !bookedForDate.includes(slot));
            setAvailableSlots(available);
            // If currently selected time is not available, clear it
            if (!available.includes(timeSlot) && timeSlot !== booking.timeSlot) {
                setTimeSlot('');
            }
        }
    }, [date, booking, existingBookings]);
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!booking || !date || !timeSlot)
            return;
        // Final validation: check if the time slot is still available
        const isSlotTaken = existingBookings.some(b => b.date === date && b.timeSlot === timeSlot && b.id !== booking.id);
        if (isSlotTaken) {
            onError('Tyvärr, denna tid är redan bokad. Vänligen välj en annan tid.');
            onClose();
            return;
        }
        const updatedBooking = {
            ...booking,
            date,
            timeSlot
        };
        onSave(updatedBooking);
        onClose();
    };
    if (!isOpen || !booking)
        return null;
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 1);
    const minDateStr = minDate.toISOString().split('T')[0];
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn", children: [_jsx("div", { className: "absolute inset-0 bg-black/50 backdrop-blur-sm", onClick: onClose }), _jsxs("div", { className: "relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full animate-slideUp", children: [_jsxs("div", { className: "p-6 border-b border-zinc-200 dark:border-zinc-800", children: [_jsx("h3", { className: "text-xl font-bold text-zinc-900 dark:text-white", children: "Redigera bokning" }), _jsx("p", { className: "text-sm text-zinc-600 dark:text-zinc-400 mt-1", children: booking.name })] }), _jsxs("form", { onSubmit: handleSubmit, className: "p-6 space-y-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "edit-date", className: "block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2", children: "Datum" }), _jsx("input", { type: "date", id: "edit-date", value: date, onChange: (e) => setDate(e.target.value), min: minDateStr, required: true, className: "w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white" })] }), date && (_jsxs("div", { children: [_jsx("label", { htmlFor: "edit-time", className: "block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2", children: "Tid" }), _jsxs("select", { id: "edit-time", value: timeSlot, onChange: (e) => setTimeSlot(e.target.value), required: true, className: "w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white", children: [_jsx("option", { value: "", children: "V\u00E4lj tid" }), booking.timeSlot && date === booking.date && (_jsxs("option", { value: booking.timeSlot, children: [booking.timeSlot, " (Nuvarande)"] })), availableSlots
                                                .filter(slot => slot !== booking.timeSlot || date !== booking.date)
                                                .map(slot => (_jsx("option", { value: slot, children: slot }, slot)))] }), availableSlots.length === 0 && date !== booking.date && (_jsx("p", { className: "text-sm text-amber-600 dark:text-amber-400 mt-2", children: "Inga lediga tider f\u00F6r detta datum." }))] })), _jsxs("div", { className: "flex gap-3 pt-4", children: [_jsx("button", { type: "button", onClick: onClose, className: "flex-1 px-6 py-3 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors", children: "Avbryt" }), _jsx("button", { type: "submit", disabled: !date || !timeSlot, className: "flex-1 px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors", children: "Spara" })] })] })] })] }));
}
//# sourceMappingURL=EditBookingModal.js.map