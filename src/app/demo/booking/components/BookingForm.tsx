'use client';

import { useState, FormEvent } from 'react';
import { Booking } from '../types/booking';

interface BookingFormProps {
  selectedDate: string;
  selectedTime: string;
  onSubmit: (booking: Omit<Booking, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

export default function BookingForm({ selectedDate, selectedTime, onSubmit, onCancel }: BookingFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Namn är obligatoriskt';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-post är obligatoriskt';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ogiltig e-postadress';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefon är obligatoriskt';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (validate()) {
      onSubmit({
        date: selectedDate,
        timeSlot: selectedTime,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        notes: formData.notes.trim()
      });
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('sv-SE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-4 sm:p-6 border border-zinc-200 dark:border-zinc-800">
      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-black dark:text-white">Bekräfta bokning</h3>

      <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
          {formatDisplayDate(selectedDate)}
        </p>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Tid: {selectedTime}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            Namn *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={`w-full px-4 py-2 rounded-lg border ${
              errors.name
                ? 'border-red-500 focus:ring-red-500'
                : 'border-zinc-300 dark:border-zinc-700 focus:ring-blue-500'
            } bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2`}
            placeholder="Ditt namn"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500">{errors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            E-post *
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={`w-full px-4 py-2 rounded-lg border ${
              errors.email
                ? 'border-red-500 focus:ring-red-500'
                : 'border-zinc-300 dark:border-zinc-700 focus:ring-blue-500'
            } bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2`}
            placeholder="din.email@exempel.se"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-2">
            Telefon *
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className={`w-full px-4 py-2 rounded-lg border ${
              errors.phone
                ? 'border-red-500 focus:ring-red-500'
                : 'border-zinc-300 dark:border-zinc-700 focus:ring-blue-500'
            } bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2`}
            placeholder="070-123 45 67"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
          )}
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium mb-2">
            Meddelande (valfritt)
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Eventuella önskemål eller frågor..."
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Avbryt
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors font-medium"
          >
            Boka
          </button>
        </div>
      </form>
    </div>
  );
}
