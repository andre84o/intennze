interface CalendarProps {
    onDateSelect: (date: string) => void;
    selectedDate: string | null;
    bookedDates?: string[];
}
export default function Calendar({ onDateSelect, selectedDate, bookedDates }: CalendarProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Calendar.d.ts.map