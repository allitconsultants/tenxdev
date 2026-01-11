'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Upload, FileText, X, Loader2, CheckCircle } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';

interface TurnstileOptions {
  sitekey: string;
  callback: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
}

interface TurnstileApi {
  render: (container: string | HTMLElement, options: TurnstileOptions) => string;
  reset: (widgetId: string) => void;
  getResponse: (widgetId: string) => string | undefined;
  remove: (widgetId: string) => void;
}

interface JobOption {
  id: string;
  title: string;
}

interface JobApplicationFormProps {
  jobs: JobOption[];
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  linkedIn?: string;
  portfolio?: string;
  coverLetter?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export function JobApplicationForm({ jobs }: JobApplicationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>();

  // Helper to get turnstile API
  const getTurnstile = (): TurnstileApi | null => {
    return (window as unknown as { turnstile?: TurnstileApi }).turnstile || null;
  };

  // Load Turnstile script
  useEffect(() => {
    if (!document.getElementById('turnstile-script')) {
      const script = document.createElement('script');
      script.id = 'turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);

      script.onload = () => {
        const turnstile = getTurnstile();
        if (turnstileRef.current && turnstile) {
          const id = turnstile.render(turnstileRef.current, {
            sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
            callback: (token: string) => {
              setTurnstileToken(token);
              setIsVerified(true);
            },
            'error-callback': () => {
              setTurnstileToken(null);
              setIsVerified(false);
            },
            'expired-callback': () => {
              setTurnstileToken(null);
              setIsVerified(false);
            },
            theme: 'auto',
          });
          setWidgetId(id);
        }
      };
    } else {
      const turnstile = getTurnstile();
      if (turnstile && turnstileRef.current && !widgetId) {
        const id = turnstile.render(turnstileRef.current, {
          sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
          callback: (token: string) => {
            setTurnstileToken(token);
            setIsVerified(true);
          },
          'error-callback': () => {
            setTurnstileToken(null);
            setIsVerified(false);
          },
          'expired-callback': () => {
            setTurnstileToken(null);
            setIsVerified(false);
          },
          theme: 'auto',
        });
        setWidgetId(id);
      }
    }

    return () => {
      const turnstile = getTurnstile();
      if (widgetId && turnstile) {
        turnstile.remove(widgetId);
      }
    };
  }, [widgetId]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMessage('Please upload a PDF or Word document.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('File size must be less than 10MB.');
      return;
    }
    setResumeFile(file);
    setErrorMessage('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setResumeFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!isVerified || !turnstileToken) {
      setErrorMessage('Please complete the verification.');
      return;
    }

    if (!resumeFile) {
      setErrorMessage('Please upload your resume.');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('resume', resumeFile);
      formData.append('firstName', data.firstName);
      formData.append('lastName', data.lastName);
      formData.append('email', data.email);
      formData.append('phone', data.phone);
      formData.append('position', data.position);
      formData.append('turnstileToken', turnstileToken);

      if (data.linkedIn) formData.append('linkedIn', data.linkedIn);
      if (data.portfolio) formData.append('portfolio', data.portfolio);
      if (data.coverLetter) formData.append('coverLetter', data.coverLetter);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/careers/apply`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        setSubmitStatus('success');
        reset();
        setResumeFile(null);
        const turnstile = getTurnstile();
        if (widgetId && turnstile) {
          turnstile.reset(widgetId);
          setIsVerified(false);
          setTurnstileToken(null);
        }
      } else {
        setSubmitStatus('error');
        setErrorMessage(result.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setSubmitStatus('error');
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
          Application Submitted!
        </h3>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Thank you for your interest in joining TenxDev. We'll review your application
          and get back to you within 5 business days.
        </p>
        <Button
          className="mt-6"
          onClick={() => {
            setSubmitStatus('idle');
          }}
        >
          Submit Another Application
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Name Fields */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Input
          label="First Name *"
          placeholder="John"
          {...register('firstName', { required: 'First name is required' })}
          error={errors.firstName?.message}
        />
        <Input
          label="Last Name *"
          placeholder="Doe"
          {...register('lastName', { required: 'Last name is required' })}
          error={errors.lastName?.message}
        />
      </div>

      {/* Contact Fields */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Input
          label="Email *"
          type="email"
          placeholder="john@example.com"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          })}
          error={errors.email?.message}
        />
        <Input
          label="Phone *"
          type="tel"
          placeholder="(555) 123-4567"
          {...register('phone', { required: 'Phone number is required' })}
          error={errors.phone?.message}
        />
      </div>

      {/* Position Select */}
      <div>
        <label
          htmlFor="position"
          className="mb-2 block text-sm font-medium text-neutral-900 dark:text-neutral-100"
        >
          Position Applying For *
        </label>
        <select
          id="position"
          {...register('position', { required: 'Please select a position' })}
          className="w-full rounded-lg border border-border-light bg-surface-light px-4 py-3 text-neutral-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border-dark dark:bg-surface-dark dark:text-neutral-100"
        >
          <option value="">Select a position...</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title}
            </option>
          ))}
        </select>
        {errors.position && (
          <p className="mt-1 text-sm text-red-500">{errors.position.message}</p>
        )}
      </div>

      {/* Resume Upload */}
      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-900 dark:text-neutral-100">
          Resume *
        </label>
        <div
          className={cn(
            'relative rounded-lg border-2 border-dashed p-6 text-center transition-colors',
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-neutral-300 dark:border-neutral-700',
            resumeFile && 'border-solid border-green-500 bg-green-50 dark:bg-green-900/20'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />

          {resumeFile ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="h-8 w-8 text-green-600 dark:text-green-400" />
              <div className="text-left">
                <p className="font-medium text-neutral-900 dark:text-white">
                  {resumeFile.name}
                </p>
                <p className="text-sm text-neutral-500">
                  {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile();
                }}
                className="ml-4 rounded-full p-1 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="h-10 w-10 text-neutral-400" />
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                <span className="font-medium text-primary">Click to upload</span> or drag
                and drop
              </p>
              <p className="mt-1 text-xs text-neutral-500">PDF or Word (max 10MB)</p>
            </div>
          )}
        </div>
      </div>

      {/* Optional Fields */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Input
          label="LinkedIn Profile"
          placeholder="https://linkedin.com/in/yourprofile"
          {...register('linkedIn')}
        />
        <Input
          label="Portfolio / GitHub"
          placeholder="https://github.com/yourusername"
          {...register('portfolio')}
        />
      </div>

      {/* Cover Letter */}
      <div>
        <label
          htmlFor="coverLetter"
          className="mb-2 block text-sm font-medium text-neutral-900 dark:text-neutral-100"
        >
          Cover Letter (Optional)
        </label>
        <textarea
          id="coverLetter"
          rows={4}
          placeholder="Tell us why you'd be a great fit for this role..."
          {...register('coverLetter')}
          className="w-full rounded-lg border border-border-light bg-surface-light px-4 py-3 text-neutral-900 placeholder:text-neutral-500 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border-dark dark:bg-surface-dark dark:text-neutral-100"
        />
      </div>

      {/* US Citizenship Notice */}
      <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>Important:</strong> All positions require US citizenship and current
          US residency. By submitting this application, you confirm that you meet these
          requirements.
        </p>
      </div>

      {/* Turnstile Verification */}
      <div className="flex flex-col items-center">
        <div ref={turnstileRef} />
        {isVerified && (
          <p className="mt-2 text-sm text-green-600 dark:text-green-400">
            Verification successful!
          </p>
        )}
      </div>

      {/* Error Messages */}
      {(errorMessage || submitStatus === 'error') && (
        <div className="rounded-lg bg-red-100 p-4 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          {errorMessage || 'Something went wrong. Please try again or email us directly.'}
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isSubmitting || !isVerified}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Submitting Application...
          </>
        ) : (
          'Submit Application'
        )}
      </Button>

      <p className="text-center text-xs text-neutral-500">
        Your information will be kept confidential and used only for recruitment purposes.
      </p>
    </form>
  );
}
