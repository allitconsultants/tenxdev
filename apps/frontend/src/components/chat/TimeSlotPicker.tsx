'use client';

import { useState, useMemo } from 'react';
import { Calendar, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui';
import type { TimeSlot } from '@/types/salesChat';

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  onSelect: (slot: TimeSlot) => void;
  onCancel: () => void;
}

export function TimeSlotPicker({ slots, onSelect, onCancel }: TimeSlotPickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const grouped: Record<string, TimeSlot[]> = {};
    for (const slot of slots) {
      if (!grouped[slot.displayDate]) {
        grouped[slot.displayDate] = [];
      }
      grouped[slot.displayDate].push(slot);
    }
    return grouped;
  }, [slots]);

  const handleConfirm = () => {
    const slot = slots.find((s) => s.id === selectedId);
    if (slot) {
      onSelect(slot);
    }
  };

  return (
    <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-border-light dark:border-border-dark p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
          <Calendar className="h-4 w-4 text-primary" />
          Select a Demo Time
        </div>
        <button
          onClick={onCancel}
          className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-neutral-500" />
        </button>
      </div>

      <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
        {Object.entries(slotsByDate).map(([date, dateSlots]) => (
          <div key={date}>
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
              {date}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {dateSlots.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => setSelectedId(slot.id)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-all ${
                    selectedId === slot.id
                      ? 'bg-primary text-white ring-2 ring-primary ring-offset-2 dark:ring-offset-neutral-800'
                      : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600 border border-border-light dark:border-border-dark'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  {slot.displayTime}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-border-light dark:border-border-dark">
        <Button
          onClick={handleConfirm}
          disabled={!selectedId}
          className="w-full"
          size="sm"
        >
          Confirm Time
        </Button>
      </div>
    </div>
  );
}
