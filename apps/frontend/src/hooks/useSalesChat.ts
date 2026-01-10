'use client';

import { useState, useCallback, useRef } from 'react';
import type {
  ChatMessage,
  LeadInfo,
  TimeSlot,
  BookingResult,
  LeadFormField,
  SSEEvent,
  SalesChatState,
} from '../types/salesChat';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface UseSalesChatOptions {
  onBookingConfirmed?: (booking: BookingResult) => void;
}

export function useSalesChat(options: UseSalesChatOptions = {}) {
  const [state, setState] = useState<SalesChatState>({
    messages: [],
    isLoading: false,
    isStreaming: false,
    error: null,
    availableSlots: null,
    leadFormRequest: null,
    bookingConfirmed: null,
    collectedLeadInfo: {},
  });

  // Store selected slot ID so it persists through the lead info collection flow
  const selectedSlotIdRef = useRef<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const turnstileTokenRef = useRef<string>('');

  // Generate unique ID for messages
  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // Set Turnstile token (called from widget after verification)
  const setTurnstileToken = useCallback((token: string) => {
    turnstileTokenRef.current = token;
  }, []);

  // Update collected lead info and notify AI to proceed
  const updateLeadInfo = useCallback((info: Partial<LeadInfo>) => {
    const updatedInfo = { ...state.collectedLeadInfo, ...info };

    // Create a message summarizing the submitted info
    const infoSummary = [
      info.name && `Name: ${info.name}`,
      info.email && `Email: ${info.email}`,
      info.company && `Company: ${info.company}`,
    ].filter(Boolean).join(', ');

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: `I've submitted my contact information: ${infoSummary}. Please proceed with booking.`,
      timestamp: new Date(),
    };

    const messagesWithNew = [...state.messages, userMessage];

    setState((prev) => ({
      ...prev,
      collectedLeadInfo: updatedInfo,
      leadFormRequest: null,
      messages: [...prev.messages, userMessage],
    }));

    // Send to AI to proceed with booking (include the stored slot ID)
    sendMessageInternal(userMessage.content, messagesWithNew, selectedSlotIdRef.current || undefined);
  }, [state.messages, state.collectedLeadInfo]);

  // Select a time slot
  const selectTimeSlot = useCallback((slot: TimeSlot) => {
    // Store slot ID for later use when booking
    selectedSlotIdRef.current = slot.id;

    // Add a user message indicating slot selection
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: `I'd like to book the ${slot.displayTime} slot on ${slot.displayDate}`,
      timestamp: new Date(),
    };

    // Get current messages before setState (to avoid stale closure)
    const messagesWithNew = [...state.messages, userMessage];

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      availableSlots: null,
    }));

    // Send the selection to the backend with current messages
    sendMessageInternal(userMessage.content, messagesWithNew, slot.id);
  }, [state.messages]);

  // Clear available slots
  const clearSlots = useCallback(() => {
    setState((prev) => ({ ...prev, availableSlots: null }));
  }, []);

  // Clear lead form request
  const clearLeadForm = useCallback(() => {
    setState((prev) => ({ ...prev, leadFormRequest: null }));
  }, []);

  // Internal send message function - accepts currentMessages to avoid stale state
  const sendMessageInternal = async (
    content: string,
    currentMessages: ChatMessage[],
    selectedSlotId?: string
  ) => {
    if (!turnstileTokenRef.current) {
      setState((prev) => ({
        ...prev,
        error: 'Please complete security verification first',
      }));
      return;
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setState((prev) => ({
      ...prev,
      isLoading: true,
      isStreaming: true,
      error: null,
      availableSlots: null,
      leadFormRequest: null,
    }));

    // Add assistant message placeholder for streaming
    const assistantMessageId = generateId();
    setState((prev) => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          isStreaming: true,
          timestamp: new Date(),
        },
      ],
    }));

    try {
      // Prepare messages for API (exclude streaming flags and IDs)
      // Use currentMessages passed in to avoid stale state closure
      const apiMessages = currentMessages
        .filter((m) => m.content.trim())
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      // Add current message if not already added
      const lastMessage = apiMessages[apiMessages.length - 1];
      if (!lastMessage || lastMessage.content !== content) {
        apiMessages.push({ role: 'user' as const, content });
      }

      const response = await fetch(`${API_URL}/api/v1/sales-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          turnstileToken: turnstileTokenRef.current,
          leadInfo: state.collectedLeadInfo,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          selectedSlotId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Read the SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const event: SSEEvent = JSON.parse(data);
              handleSSEEvent(event, assistantMessageId);
            } catch {
              // Ignore parse errors for partial data
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return; // Request was cancelled
      }

      console.error('Sales chat error:', error);
      setState((prev) => ({
        ...prev,
        error: 'Failed to send message. Please try again.',
        messages: prev.messages.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: 'Sorry, something went wrong. Please try again.', isStreaming: false }
            : m
        ),
      }));
    } finally {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
        messages: prev.messages.map((m) =>
          m.id === assistantMessageId ? { ...m, isStreaming: false } : m
        ),
      }));
    }
  };

  // Handle SSE events
  const handleSSEEvent = (event: SSEEvent, assistantMessageId: string) => {
    switch (event.type) {
      case 'text_delta':
        setState((prev) => ({
          ...prev,
          messages: prev.messages.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: m.content + event.content }
              : m
          ),
        }));
        break;

      case 'tool_use_start':
        // Optionally show loading indicator for specific tools
        break;

      case 'available_slots':
        setState((prev) => ({
          ...prev,
          availableSlots: event.slots,
        }));
        break;

      case 'lead_form_request':
        setState((prev) => ({
          ...prev,
          leadFormRequest: {
            fields: event.fields,
            context: event.context,
          },
        }));
        break;

      case 'booking_confirmed':
        setState((prev) => ({
          ...prev,
          bookingConfirmed: event.booking,
        }));
        options.onBookingConfirmed?.(event.booking);
        break;

      case 'error':
        setState((prev) => ({
          ...prev,
          error: event.message,
        }));
        break;

      case 'done':
        // Stream complete
        break;
    }
  };

  // Public send message function
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || state.isLoading) return;

      // Add user message
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      // Get current messages including the new one (before setState)
      const messagesWithNew = [...state.messages, userMessage];

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
      }));

      await sendMessageInternal(content.trim(), messagesWithNew);
    },
    [state.isLoading, state.messages, state.collectedLeadInfo]
  );

  // Reset chat
  const resetChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    selectedSlotIdRef.current = null;
    setState({
      messages: [],
      isLoading: false,
      isStreaming: false,
      error: null,
      availableSlots: null,
      leadFormRequest: null,
      bookingConfirmed: null,
      collectedLeadInfo: {},
    });
  }, []);

  return {
    ...state,
    sendMessage,
    setTurnstileToken,
    updateLeadInfo,
    selectTimeSlot,
    clearSlots,
    clearLeadForm,
    resetChat,
  };
}
