'use client';

import { useState } from 'react';
import { User, X } from 'lucide-react';
import { Button } from '@/components/ui';
import type { LeadInfo, LeadFormField } from '@/types/salesChat';

interface LeadFormInlineProps {
  fields: LeadFormField[];
  context?: string;
  existingData: Partial<LeadInfo>;
  onSubmit: (data: Partial<LeadInfo>) => void;
  onCancel: () => void;
}

export function LeadFormInline({
  fields,
  context,
  existingData,
  onSubmit,
  onCancel,
}: LeadFormInlineProps) {
  const [formData, setFormData] = useState<Partial<LeadInfo>>(() => {
    // Initialize with existing data
    const initial: Partial<LeadInfo> = {};
    for (const field of fields) {
      if (existingData[field.name]) {
        initial[field.name] = existingData[field.name] as never;
      }
    }
    return initial;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (name: keyof LeadInfo, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label} is required`;
      }
      if (field.type === 'email' && formData[field.name]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.name] as string)) {
          newErrors[field.name] = 'Please enter a valid email';
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  const renderField = (field: LeadFormField) => {
    const baseInputClass =
      'w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
    const errorClass = errors[field.name]
      ? 'border-red-300 dark:border-red-600'
      : 'border-border-light dark:border-border-dark';
    const bgClass = 'bg-white dark:bg-neutral-700';

    switch (field.type) {
      case 'select':
        return (
          <select
            value={(formData[field.name] as string) || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            className={`${baseInputClass} ${errorClass} ${bgClass}`}
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            type={field.type}
            value={(formData[field.name] as string) || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.label}
            className={`${baseInputClass} ${errorClass} ${bgClass}`}
          />
        );
    }
  };

  return (
    <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-border-light dark:border-border-dark p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
          <User className="h-4 w-4 text-primary" />
          Your Information
        </div>
        <button
          onClick={onCancel}
          className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-neutral-500" />
        </button>
      </div>

      {context && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">{context}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {fields.map((field) => (
          <div key={field.name}>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {renderField(field)}
            {errors[field.name] && (
              <p className="text-xs text-red-500 mt-1">{errors[field.name]}</p>
            )}
          </div>
        ))}

        <Button type="submit" className="w-full" size="sm">
          Continue
        </Button>
      </form>
    </div>
  );
}
