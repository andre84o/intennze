'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export default function BookingForm({ selectedDate, selectedTime, onSubmit, onCancel }) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        notes: ''
    });
    const [errors, setErrors] = useState({});
    const validate = () => {
        const newErrors = {};
        if (!formData.name.trim()) {
            newErrors.name = 'Namn är obligatoriskt';
        }
        if (!formData.email.trim()) {
            newErrors.email = 'E-post är obligatoriskt';
        }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Ogiltig e-postadress';
        }
        if (!formData.phone.trim()) {
            newErrors.phone = 'Telefon är obligatoriskt';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            onSubmit({
                date: selectedDate,
                timeSlot: selectedTime,
                name: formData.name.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                notes: formData.notes.trim()
            });
        }
    };
    const formatDisplayDate = (dateStr) => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('sv-SE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };
    return (_jsxs("div", { className: "w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: "Bekr\u00E4fta bokning" }), _jsxs("div", { className: "mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg", children: [_jsx("p", { className: "text-sm font-medium text-blue-900 dark:text-blue-100", children: formatDisplayDate(selectedDate) }), _jsxs("p", { className: "text-sm text-blue-700 dark:text-blue-300", children: ["Tid: ", selectedTime] })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "name", className: "block text-sm font-medium mb-2", children: "Namn *" }), _jsx("input", { type: "text", id: "name", value: formData.name, onChange: (e) => setFormData({ ...formData, name: e.target.value }), className: `w-full px-4 py-2 rounded-lg border ${errors.name
                                    ? 'border-red-500 focus:ring-red-500'
                                    : 'border-zinc-300 dark:border-zinc-700 focus:ring-blue-500'} bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2`, placeholder: "Ditt namn" }), errors.name && (_jsx("p", { className: "mt-1 text-sm text-red-500", children: errors.name }))] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "email", className: "block text-sm font-medium mb-2", children: "E-post *" }), _jsx("input", { type: "email", id: "email", value: formData.email, onChange: (e) => setFormData({ ...formData, email: e.target.value }), className: `w-full px-4 py-2 rounded-lg border ${errors.email
                                    ? 'border-red-500 focus:ring-red-500'
                                    : 'border-zinc-300 dark:border-zinc-700 focus:ring-blue-500'} bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2`, placeholder: "din.email@exempel.se" }), errors.email && (_jsx("p", { className: "mt-1 text-sm text-red-500", children: errors.email }))] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "phone", className: "block text-sm font-medium mb-2", children: "Telefon *" }), _jsx("input", { type: "tel", id: "phone", value: formData.phone, onChange: (e) => setFormData({ ...formData, phone: e.target.value }), className: `w-full px-4 py-2 rounded-lg border ${errors.phone
                                    ? 'border-red-500 focus:ring-red-500'
                                    : 'border-zinc-300 dark:border-zinc-700 focus:ring-blue-500'} bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2`, placeholder: "070-123 45 67" }), errors.phone && (_jsx("p", { className: "mt-1 text-sm text-red-500", children: errors.phone }))] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "notes", className: "block text-sm font-medium mb-2", children: "Meddelande (valfritt)" }), _jsx("textarea", { id: "notes", value: formData.notes, onChange: (e) => setFormData({ ...formData, notes: e.target.value }), className: "w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500", placeholder: "Eventuella \u00F6nskem\u00E5l eller fr\u00E5gor...", rows: 3 })] }), _jsxs("div", { className: "flex gap-3 pt-2", children: [_jsx("button", { type: "button", onClick: onCancel, className: "flex-1 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors", children: "Avbryt" }), _jsx("button", { type: "submit", className: "flex-1 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors font-medium", children: "Boka" })] })] })] }));
}
//# sourceMappingURL=BookingForm.js.map