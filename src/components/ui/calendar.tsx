"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayButton } from "react-day-picker";

import { cn } from "@/lib/utils";

/**
 * Global calendar — "Glassy" design.
 * Elevated rounded card with a soft gradient + shadow, indigo accent,
 * generous tap targets, and optional event dots.
 *
 * - Standalone: renders as its own glassy card.
 * - Inside a Popover ([data-slot=popover-content]): the card chrome is
 *   dropped so it blends into the popover's own surface (no double border).
 * - Pass `eventDays` (days-of-month) to mark days that have activity.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  eventDays = [],
  ...props
}: React.ComponentProps<typeof DayPicker> & { eventDays?: number[] }) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5 shadow-xl shadow-slate-300/40",
        // Blend into a surrounding popover instead of stacking card chrome.
        "[[data-slot=popover-content]_&]:rounded-none [[data-slot=popover-content]_&]:border-0 [[data-slot=popover-content]_&]:bg-transparent [[data-slot=popover-content]_&]:p-4 [[data-slot=popover-content]_&]:shadow-none",
        className
      )}
      classNames={{
        months: "relative flex flex-col",
        month: "flex flex-col gap-4",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous:
          "inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-indigo-600 aria-disabled:opacity-40",
        button_next:
          "inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-indigo-600 aria-disabled:opacity-40",
        month_caption: "flex h-9 items-center justify-center",
        caption_label: "text-base font-semibold text-slate-900 select-none",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "flex-1 select-none pb-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400",
        week: "mt-1.5 flex w-full",
        day: "flex-1 p-0.5 text-center",
        today: "",
        outside: "text-slate-300",
        disabled: "text-slate-300 opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("size-4", className)} {...rest} />
          ) : (
            <ChevronRight className={cn("size-4", className)} {...rest} />
          ),
        DayButton: (dayProps) => (
          <CalendarDayButton {...dayProps} eventDays={eventDays} />
        ),
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  eventDays = [],
  ...props
}: React.ComponentProps<typeof DayButton> & { eventDays?: number[] }) {
  const hasEvent = eventDays.includes(day.date.getDate());

  return (
    <button
      data-day={day.date.toLocaleDateString()}
      className={cn(
        "relative mx-auto flex size-10 items-center justify-center rounded-2xl text-sm text-slate-700 transition-all",
        "hover:bg-indigo-50 hover:text-indigo-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40",
        modifiers.today &&
          !modifiers.selected &&
          "font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-300",
        modifiers.selected &&
          "bg-indigo-600 font-medium text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-600 hover:text-white",
        className
      )}
      {...props}
    >
      {day.date.getDate()}
      {hasEvent && (
        <span
          className={cn(
            "absolute bottom-1.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full",
            modifiers.selected ? "bg-white/80" : "bg-indigo-500"
          )}
        />
      )}
    </button>
  );
}

export { Calendar, CalendarDayButton };
