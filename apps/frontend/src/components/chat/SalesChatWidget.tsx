'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useSalesChat } from '@/hooks/useSalesChat';
import { TimeSlotPicker } from './TimeSlotPicker';
import { LeadFormInline } from './LeadFormInline';
import type { BookingResult } from '@/types/salesChat';

declare global {
  interface Window {
    turnstile: {
      render: (container: string | HTMLElement, options: TurnstileOptions) => string;
      reset: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
  }
}

interface TurnstileOptions {
  sitekey: string;
  callback: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
}

export function SalesChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    isStreaming,
    error,
    availableSlots,
    leadFormRequest,
    bookingConfirmed,
    collectedLeadInfo,
    sendMessage,
    setTurnstileToken,
    updateLeadInfo,
    selectTimeSlot,
    clearSlots,
    clearLeadForm,
  } = useSalesChat({
    onBookingConfirmed: (booking: BookingResult) => {
      // Could show a toast or confetti here
      console.log('Demo booked!', booking);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, availableSlots, leadFormRequest]);

  // Load Turnstile script
  useEffect(() => {
    if (isOpen && !isVerified && !document.getElementById('turnstile-script')) {
      const script = document.createElement('script');
      script.id = 'turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);

      script.onload = () => {
        if (turnstileRef.current && window.turnstile) {
          const id = window.turnstile.render(turnstileRef.current, {
            sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
            callback: (token: string) => {
              setTurnstileToken(token);
              setIsVerified(true);
            },
            'error-callback': () => {
              console.error('Turnstile error');
            },
            'expired-callback': () => {
              setTurnstileToken('');
              setIsVerified(false);
            },
            theme: 'auto',
          });
          setWidgetId(id);
        }
      };
    }
  }, [isOpen, isVerified, setTurnstileToken]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !isVerified) return;
    await sendMessage(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all hover:bg-primary-dark hover:scale-110',
          isOpen && 'hidden'
        )}
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Chat Window */}
      <div
        className={cn(
          'fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-3rem)] rounded-2xl border border-border-light bg-surface-light shadow-2xl transition-all duration-300 dark:border-border-dark dark:bg-surface-dark',
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-primary to-primary-dark px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold flex items-center gap-2">
                tenxdev AI
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Sales Agent</span>
              </div>
              <div className="text-xs text-white/80">
                {isVerified ? (isStreaming ? 'Typing...' : 'Online') : 'Verify to chat'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1 transition-colors hover:bg-white/20"
            aria-label="Close chat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="h-[400px] overflow-y-auto p-4 space-y-4">
          {/* Welcome message if no messages */}
          {messages.length === 0 && isVerified && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="max-w-[80%] rounded-2xl bg-neutral-100 dark:bg-neutral-800 px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
                <p className="mb-2">Hi! I'm the tenxdev AI sales assistant.</p>
                <p>
                  I can help you learn about our services, answer questions, or schedule a demo
                  with our team. What brings you here today?
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn('flex gap-3', message.role === 'user' && 'flex-row-reverse')}
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  message.role === 'assistant'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-neutral-200 dark:bg-neutral-700'
                )}
              >
                {message.role === 'assistant' ? (
                  <Sparkles className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap',
                  message.role === 'assistant'
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                    : 'bg-primary text-white'
                )}
              >
                {message.content}
                {message.isStreaming && (
                  <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary animate-pulse" />
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && !isStreaming && messages.length > 0 && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="rounded-2xl bg-neutral-100 dark:bg-neutral-800 px-4 py-2">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-neutral-400 animate-bounce" />
                  <span className="h-2 w-2 rounded-full bg-neutral-400 animate-bounce [animation-delay:0.1s]" />
                  <span className="h-2 w-2 rounded-full bg-neutral-400 animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}

          {/* Time Slot Picker */}
          {availableSlots && availableSlots.length > 0 && (
            <TimeSlotPicker
              slots={availableSlots}
              onSelect={selectTimeSlot}
              onCancel={clearSlots}
            />
          )}

          {/* Lead Form Inline */}
          {leadFormRequest && (
            <LeadFormInline
              fields={leadFormRequest.fields}
              context={leadFormRequest.context}
              existingData={collectedLeadInfo}
              onSubmit={updateLeadInfo}
              onCancel={clearLeadForm}
            />
          )}

          {/* Booking Confirmation */}
          {bookingConfirmed && bookingConfirmed.success && (
            <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold mb-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Demo Booked!
              </div>
              <p className="text-sm text-green-600 dark:text-green-300 mb-2">
                Check your email for the calendar invite and Google Meet link.
              </p>
              {bookingConfirmed.meetLink && (
                <a
                  href={bookingConfirmed.meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Join Google Meet
                </a>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Turnstile Verification */}
        {!isVerified && (
          <div className="border-t border-border-light dark:border-border-dark p-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3 text-center">
              Please verify you're human to start chatting
            </p>
            <div ref={turnstileRef} className="flex justify-center" />
          </div>
        )}

        {/* Input */}
        {isVerified && (
          <div className="border-t border-border-light dark:border-border-dark p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  leadFormRequest
                    ? 'Please complete the form above...'
                    : 'Type your message...'
                }
                className="flex-1 rounded-xl border border-border-light bg-background-light px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border-dark dark:bg-background-dark disabled:opacity-50"
                disabled={isLoading || !!leadFormRequest}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || !!leadFormRequest}
                className="shrink-0 rounded-xl px-4"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
