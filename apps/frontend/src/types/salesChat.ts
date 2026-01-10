// Sales Chat Types for Frontend

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  timestamp: Date;
}

export interface LeadInfo {
  name?: string;
  email?: string;
  company?: string;
  phone?: string;
  companySize?: '1-10' | '11-50' | '51-200' | '201-1000' | '1000+';
  interests?: string[];
  budgetRange?: '<10k' | '10k-50k' | '50k-100k' | '100k+' | 'not_sure';
}

export interface TimeSlot {
  id: string;
  start: string;
  end: string;
  displayTime: string;
  displayDate: string;
}

export interface BookingResult {
  success: boolean;
  eventId?: string;
  meetLink?: string;
  startTime?: string;
  endTime?: string;
  error?: string;
}

export interface LeadFormField {
  name: keyof LeadInfo;
  label: string;
  type: 'text' | 'email' | 'tel' | 'select';
  required: boolean;
  options?: { value: string; label: string }[];
}

// SSE Event Types
export type SSEEvent =
  | { type: 'text_delta'; content: string }
  | { type: 'tool_use_start'; name: string }
  | { type: 'available_slots'; slots: TimeSlot[] }
  | { type: 'lead_form_request'; fields: LeadFormField[]; context?: string }
  | { type: 'booking_confirmed'; booking: BookingResult }
  | { type: 'error'; message: string }
  | { type: 'done' };

export interface SalesChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  availableSlots: TimeSlot[] | null;
  leadFormRequest: { fields: LeadFormField[]; context?: string } | null;
  bookingConfirmed: BookingResult | null;
  collectedLeadInfo: LeadInfo;
}
