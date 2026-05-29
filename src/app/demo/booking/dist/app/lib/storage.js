const STORAGE_KEY = 'bookings';
export const storage = {
    getBookings: () => {
        if (typeof window === 'undefined')
            return [];
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        }
        catch (error) {
            console.error('Error reading bookings:', error);
            return [];
        }
    },
    saveBooking: (booking) => {
        if (typeof window === 'undefined')
            return;
        try {
            const bookings = storage.getBookings();
            bookings.push(booking);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
        }
        catch (error) {
            console.error('Error saving booking:', error);
        }
    },
    updateBooking: (id, updatedBooking) => {
        if (typeof window === 'undefined')
            return;
        try {
            const bookings = storage.getBookings();
            const index = bookings.findIndex(b => b.id === id);
            if (index !== -1) {
                bookings[index] = updatedBooking;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
            }
        }
        catch (error) {
            console.error('Error updating booking:', error);
        }
    },
    deleteBooking: (id) => {
        if (typeof window === 'undefined')
            return;
        try {
            const bookings = storage.getBookings();
            const filtered = bookings.filter(b => b.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        }
        catch (error) {
            console.error('Error deleting booking:', error);
        }
    },
    getBookingsByDate: (date) => {
        return storage.getBookings().filter(b => b.date === date);
    }
};
//# sourceMappingURL=storage.js.map