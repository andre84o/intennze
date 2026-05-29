import { Booking } from '../types/booking';
interface EditBookingModalProps {
    booking: Booking | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedBooking: Booking) => void;
    onError: (message: string) => void;
    existingBookings: Booking[];
}
export default function EditBookingModal({ booking, isOpen, onClose, onSave, onError, existingBookings }: EditBookingModalProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=EditBookingModal.d.ts.map