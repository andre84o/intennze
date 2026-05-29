export interface Booking {
    id: string;
    date: string;
    timeSlot: string;
    name: string;
    email: string;
    phone: string;
    notes?: string;
    createdAt: string;
}
export interface TimeSlot {
    time: string;
    available: boolean;
}
//# sourceMappingURL=booking.d.ts.map