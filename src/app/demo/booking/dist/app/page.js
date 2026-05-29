'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import Calendar from './components/Calendar';
import TimeSlots from './components/TimeSlots';
import BookingForm from './components/BookingForm';
import BookingList from './components/BookingList';
import Modal from './components/Modal';
import EditBookingModal from './components/EditBookingModal';
import { storage } from './lib/storage';
export default function Home() {
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [bookings, setBookings] = useState([]);
    const [activeTab, setActiveTab] = useState('book');
    const [modalOpen, setModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        title: '',
        message: '',
        type: 'success'
    });
    const [editBooking, setEditBooking] = useState(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    useEffect(() => {
        // Load bookings from localStorage when component mounts
        setBookings(storage.getBookings());
    }, []);
    const showModal = (title, message, type = 'success', actions) => {
        setModalConfig({ title, message, type, actions });
        setModalOpen(true);
    };
    const handleDateSelect = (date) => {
        setSelectedDate(date);
        setSelectedTime(null);
        setShowForm(false);
    };
    const handleTimeSelect = (time) => {
        setSelectedTime(time);
        setShowForm(true);
    };
    const handleBookingSubmit = (bookingData) => {
        // Final validation: check if the time slot is still available
        const isSlotTaken = bookings.some(b => b.date === bookingData.date && b.timeSlot === bookingData.timeSlot);
        if (isSlotTaken) {
            showModal('Dubbel bokning', 'Tyvärr, denna tid är redan bokad. Vänligen välj en annan tid.', 'error');
            return;
        }
        const newBooking = {
            ...bookingData,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString()
        };
        storage.saveBooking(newBooking);
        setBookings(storage.getBookings());
        // Reset state
        setSelectedDate(null);
        setSelectedTime(null);
        setShowForm(false);
        // Show success message
        showModal('Bokning bekräftad!', 'Din bokning är bekräftad! Du kommer att få en bekräftelse via e-post.', 'success');
    };
    const handleBookingCancel = () => {
        setShowForm(false);
        setSelectedTime(null);
    };
    const confirmDelete = (id) => {
        // Close the confirmation modal
        setModalOpen(false);
        // Delete the booking
        storage.deleteBooking(id);
        setBookings(storage.getBookings());
        // Show success message after a brief delay
        setTimeout(() => {
            showModal('Bokning borttagen', 'Din bokning har tagits bort.', 'info');
        }, 150);
    };
    const handleBookingDelete = (id) => {
        showModal('Bekräfta avbokning', 'Är du säker på att du vill avboka denna tid? Detta går inte att ångra.', 'warning', [
            {
                label: 'Avbryt',
                onClick: () => {
                    setModalOpen(false);
                },
                variant: 'secondary'
            },
            {
                label: 'Ja, avboka',
                onClick: () => {
                    confirmDelete(id);
                },
                variant: 'primary'
            }
        ]);
    };
    const handleBookingEdit = (booking) => {
        setEditBooking(booking);
        setEditModalOpen(true);
    };
    const handleBookingUpdate = (updatedBooking) => {
        storage.updateBooking(updatedBooking.id, updatedBooking);
        setBookings(storage.getBookings());
        setEditModalOpen(false);
        setEditBooking(null);
        showModal('Bokning uppdaterad!', 'Din bokning har uppdaterats.', 'success');
    };
    const bookedDates = Array.from(new Set(bookings.map(b => b.date)));
    return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-800 py-8 px-4", children: _jsxs("div", { className: "max-w-7xl mx-auto", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("h1", { className: "text-4xl font-bold text-zinc-900 dark:text-white mb-2", children: "Bookningskalender" }), _jsx("p", { className: "text-zinc-600 dark:text-zinc-400", children: "Boka tid enkelt och smidigt" })] }), _jsx("div", { className: "flex justify-center mb-8", children: _jsxs("div", { className: "bg-white dark:bg-zinc-900 rounded-lg shadow-md p-1 inline-flex", children: [_jsx("button", { onClick: () => setActiveTab('book'), className: `px-6 py-2 rounded-md font-medium transition-colors ${activeTab === 'book'
                                    ? 'bg-blue-500 text-white'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`, children: "Boka tid" }), _jsxs("button", { onClick: () => setActiveTab('list'), className: `px-6 py-2 rounded-md font-medium transition-colors ${activeTab === 'list'
                                    ? 'bg-blue-500 text-white'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`, children: ["Mina bokningar", bookings.length > 0 && (_jsx("span", { className: "ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs rounded-full", children: bookings.length }))] })] }) }), activeTab === 'book' ? (_jsxs("div", { className: "flex flex-col lg:flex-row gap-6 items-start justify-center", children: [_jsx(Calendar, { onDateSelect: handleDateSelect, selectedDate: selectedDate, bookedDates: bookedDates }), selectedDate && !showForm && (_jsx(TimeSlots, { selectedDate: selectedDate, selectedTime: selectedTime, onTimeSelect: handleTimeSelect, bookings: bookings })), selectedDate && selectedTime && showForm && (_jsx(BookingForm, { selectedDate: selectedDate, selectedTime: selectedTime, onSubmit: handleBookingSubmit, onCancel: handleBookingCancel })), !selectedDate && (_jsxs("div", { className: "w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: "Hur bokar jag?" }), _jsxs("ol", { className: "space-y-3 text-sm text-zinc-600 dark:text-zinc-400", children: [_jsxs("li", { className: "flex gap-3", children: [_jsx("span", { className: "flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-bold", children: "1" }), _jsx("span", { children: "V\u00E4lj ett datum i kalendern" })] }), _jsxs("li", { className: "flex gap-3", children: [_jsx("span", { className: "flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-bold", children: "2" }), _jsx("span", { children: "V\u00E4lj en ledig tid" })] }), _jsxs("li", { className: "flex gap-3", children: [_jsx("span", { className: "flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-bold", children: "3" }), _jsx("span", { children: "Fyll i dina uppgifter och bekr\u00E4fta" })] })] }), _jsx("div", { className: "mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg", children: _jsxs("p", { className: "text-sm text-amber-800 dark:text-amber-200", children: [_jsx("strong", { children: "Observera:" }), " Bokningar m\u00E5ste g\u00F6ras minst 24 timmar i f\u00F6rv\u00E4g."] }) })] }))] })) : (_jsx("div", { className: "flex justify-center", children: _jsx(BookingList, { bookings: bookings, onDelete: handleBookingDelete, onEdit: handleBookingEdit }) })), _jsx("div", { className: "mt-12 text-center text-sm text-zinc-500 dark:text-zinc-400", children: _jsx("p", { children: "Har du fr\u00E5gor? Kontakta oss p\u00E5 info@exempel.se eller 070-123 45 67" }) }), _jsx(Modal, { isOpen: modalOpen, onClose: () => setModalOpen(false), title: modalConfig.title, message: modalConfig.message, type: modalConfig.type, actions: modalConfig.actions }), _jsx(EditBookingModal, { booking: editBooking, isOpen: editModalOpen, onClose: () => {
                        setEditModalOpen(false);
                        setEditBooking(null);
                    }, onSave: handleBookingUpdate, onError: (message) => {
                        showModal('Fel vid redigering', message, 'error');
                    }, existingBookings: bookings })] }) }));
}
//# sourceMappingURL=page.js.map