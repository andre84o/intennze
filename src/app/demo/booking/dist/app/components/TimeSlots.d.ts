import { Booking } from '../types/booking';
interface TimeSlotsProps {
    selectedDate: string;
    selectedTime: string | null;
    onTimeSelect: (time: string) => void;
    bookings: Booking[];
}
export default function TimeSlots({ selectedDate, selectedTime, onTimeSelect, bookings }: TimeSlotsProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=TimeSlots.d.ts.map