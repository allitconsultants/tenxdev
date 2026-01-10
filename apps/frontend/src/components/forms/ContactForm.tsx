'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Textarea } from '@/components/ui';
import type { ContactFormData } from '@tenxdev/shared-types';

const services = [
  { value: 'ai-development', label: 'AI-Powered Development' },
  { value: 'infrastructure', label: 'Infrastructure Engineering' },
  { value: 'devops', label: 'DevOps Automation' },
  { value: 'cloud', label: 'Cloud Architecture' },
  { value: 'platform', label: 'Platform Engineering' },
  { value: 'consulting', label: 'Consulting & Training' },
];

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>(
    'idle'
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>();

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/contact`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );

      if (response.ok) {
        setSubmitStatus('success');
        reset();
      } else {
        setSubmitStatus('error');
      }
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Input
          label="Name"
          placeholder="Your name"
          {...register('name', { required: 'Name is required' })}
          error={errors.name?.message}
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@company.com"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          })}
          error={errors.email?.message}
        />
      </div>

      <Input
        label="Company"
        placeholder="Your company (optional)"
        {...register('company')}
      />

      <div>
        <label
          htmlFor="service"
          className="mb-2 block text-sm font-medium text-neutral-900 dark:text-neutral-100"
        >
          Service Interested In
        </label>
        <select
          id="service"
          {...register('service', { required: 'Please select a service' })}
          className="w-full rounded-lg border border-border-light bg-surface-light px-4 py-3 text-neutral-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border-dark dark:bg-surface-dark dark:text-neutral-100"
        >
          <option value="">Select a service...</option>
          {services.map((service) => (
            <option key={service.value} value={service.value}>
              {service.label}
            </option>
          ))}
        </select>
        {errors.service && (
          <p className="mt-1 text-sm text-red-500">{errors.service.message}</p>
        )}
      </div>

      <Textarea
        label="Message"
        placeholder="Tell us about your project..."
        rows={5}
        {...register('message', { required: 'Message is required' })}
        error={errors.message?.message}
      />

      {submitStatus === 'success' && (
        <div className="rounded-lg bg-green-100 p-4 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          Thank you! We'll be in touch within 24 hours.
        </div>
      )}

      {submitStatus === 'error' && (
        <div className="rounded-lg bg-red-100 p-4 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          Something went wrong. Please try again or email us directly.
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
        Send Message
      </Button>
    </form>
  );
}
