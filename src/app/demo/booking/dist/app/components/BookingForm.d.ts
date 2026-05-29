import { Booking } from '../types/booking';
interface BookingFormProps {
    selectedDate: string;
    selectedTime: string;
    onSubmit: (booking: Omit<Booking, 'id' | 'createdAt'>) => void;
    onCancel: () => void;
}
export default function BookingForm({ selectedDate, selectedTime, onSubmit, onCancel }: BookingFormProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=BookingForm.d.ts.map