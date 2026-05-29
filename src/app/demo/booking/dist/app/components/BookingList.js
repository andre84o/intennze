'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function BookingList({ bookings, onDelete, onEdit }) {
    const formatDisplayDate = (dateStr) => {
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
        return (_jsxs("div", { className: "w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: "Mina bokningar" }), _jsxs("div", { className: "text-center py-8 text-zinc-500 dark:text-zinc-400", children: [_jsx("svg", { className: "w-16 h-16 mx-auto mb-4 opacity-50", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" }) }), _jsx("p", { children: "Inga bokningar \u00E4nnu" })] })] }));
    }
    return (_jsxs("div", { className: "w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6", children: [_jsxs("h3", { className: "text-lg font-semibold mb-4", children: ["Mina bokningar (", bookings.length, ")"] }), _jsx("div", { className: "space-y-3", children: sortedBookings.map((booking) => (_jsxs("div", { className: "flex items-start gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-750 transition-colors", children: [_jsx("div", { className: "flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center", children: _jsx("svg", { className: "w-6 h-6 text-blue-600 dark:text-blue-300", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" }) }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium text-zinc-900 dark:text-zinc-100", children: booking.name }), _jsxs("p", { className: "text-sm text-zinc-600 dark:text-zinc-400", children: [formatDisplayDate(booking.date), " \u2022 ", booking.timeSlot] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => onEdit(booking), className: "flex-shrink-0 p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors", "aria-label": "Redigera bokning", children: _jsx("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" }) }) }), _jsx("button", { onClick: () => onDelete(booking.id), className: "flex-shrink-0 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors", "aria-label": "Ta bort bokning", children: _jsx("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" }) }) })] })] }), _jsxs("div", { className: "mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-zinc-500 dark:text-zinc-400", children: "E-post:" }), ' ', _jsx("span", { className: "text-zinc-700 dark:text-zinc-300", children: booking.email })] }), _jsxs("div", { children: [_jsx("span", { className: "text-zinc-500 dark:text-zinc-400", children: "Telefon:" }), ' ', _jsx("span", { className: "text-zinc-700 dark:text-zinc-300", children: booking.phone })] })] }), booking.notes && (_jsxs("div", { className: "mt-2 text-sm text-zinc-600 dark:text-zinc-400 italic", children: ["\"", booking.notes, "\""] }))] })] }, booking.id))) })] }));
}
//# sourceMappingURL=BookingList.js.map