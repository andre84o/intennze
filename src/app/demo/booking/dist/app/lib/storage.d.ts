import { Booking } from '../types/booking';
export declare const storage: {
    getBookings: () => Booking[];
    saveBooking: (booking: Booking) => void;
    updateBooking: (id: string, updatedBooking: Booking) => void;
    deleteBooking: (id: string) => void;
    getBookingsByDate: (date: string) => Booking[];
};
//# sourceMappingURL=storage.d.ts.map