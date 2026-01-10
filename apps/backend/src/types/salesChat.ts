// Sales Chat Types

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LeadInfo {
  name: string;
  email: string;
  company: string;
  phone?: string;
  companySize?: '1-10' | '11-50' | '51-200' | '201-1000' | '1000+';
  interests?: string[];
  budgetRange?: '<10k' | '10k-50k' | '50k-100k' | '100k+' | 'not_sure';
}

export interface TimeSlot {
  id: string;
  start: string; // ISO 8601
  end: string; // ISO 8601
  displayTime: string; // Human readable, e.g., "Mon Jan 15, 2:00 PM EST"
  displayDate: string; // e.g., "Monday, January 15"
}

export interface BookingResult {
  success: boolean;
  eventId?: string;
  meetLink?: string;
  startTime?: string;
  endTime?: string;
  error?: string;
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

export interface LeadFormField {
  name: keyof LeadInfo;
  label: string;
  type: 'text' | 'email' | 'tel' | 'select';
  required: boolean;
  options?: { value: string; label: string }[];
}

// Request/Response types
export interface SalesChatRequest {
  messages: ChatMessage[];
  turnstileToken: string;
  leadInfo?: Partial<LeadInfo>;
  timezone?: string;
  selectedSlotId?: string;
}

// Claude Tool Input Types
export interface GetAvailableSlotsInput {
  preferred_date?: string;
  time_preference?: 'morning' | 'afternoon' | 'any';
}

// Claude tool uses snake_case, so we define a separate interface for that
export interface BookDemoToolLeadInfo {
  name: string;
  email: string;
  company: string;
  phone?: string;
  company_size?: '1-10' | '11-50' | '51-200' | '201-1000' | '1000+';
  interests?: string[];
  budget_range?: '<10k' | '10k-50k' | '50k-100k' | '100k+' | 'not_sure';
}

export interface BookDemoInput {
  slot_id: string;
  lead_info: BookDemoToolLeadInfo;
  meeting_notes?: string;
}

export interface CollectLeadInfoInput {
  fields_needed: (keyof LeadInfo)[];
  context?: string;
}

export type ToolInput = GetAvailableSlotsInput | BookDemoInput | CollectLeadInfoInput;
