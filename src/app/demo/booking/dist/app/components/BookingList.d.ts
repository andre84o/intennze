import { Booking } from '../types/booking';
interface BookingListProps {
    bookings: Booking[];
    onDelete: (id: string) => void;
    onEdit: (booking: Booking) => void;
}
export default function BookingList({ bookings, onDelete, onEdit }: BookingListProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=BookingList.d.ts.map