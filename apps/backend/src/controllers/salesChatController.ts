import type { Request, Response } from 'express';
import type { ToolUseBlock } from '@anthropic-ai/sdk/resources/messages';
import { streamSalesChat } from '../services/claudeService.js';
import { calendarService } from '../services/calendarService.js';
import { emailService } from '../services/emailService.js';
import { telegramService } from '../services/telegramService.js';
import { logger } from '../utils/logger.js';
import type { SalesChatInput } from '../validators/salesChat.js';
import type {
  SSEEvent,
  GetAvailableSlotsInput,
  BookDemoInput,
  CollectLeadInfoInput,
  LeadFormField,
  LeadInfo,
} from '../types/salesChat.js';

// Field definitions for lead form
const LEAD_FORM_FIELDS: Record<keyof LeadInfo, LeadFormField> = {
  name: { name: 'name', label: 'Your Name', type: 'text', required: true },
  email: { name: 'email', label: 'Email Address', type: 'email', required: true },
  company: { name: 'company', label: 'Company Name', type: 'text', required: true },
  phone: { name: 'phone', label: 'Phone Number', type: 'tel', required: false },
  companySize: {
    name: 'companySize',
    label: 'Company Size',
    type: 'select',
    required: false,
    options: [
      { value: '1-10', label: '1-10 employees' },
      { value: '11-50', label: '11-50 employees' },
      { value: '51-200', label: '51-200 employees' },
      { value: '201-1000', label: '201-1000 employees' },
      { value: '1000+', label: '1000+ employees' },
    ],
  },
  interests: {
    name: 'interests',
    label: 'What are you interested in?',
    type: 'text',
    required: false,
  },
  budgetRange: {
    name: 'budgetRange',
    label: 'Project Budget',
    type: 'select',
    required: false,
    options: [
      { value: '<10k', label: 'Under $10k' },
      { value: '10k-50k', label: '$10k - $50k' },
      { value: '50k-100k', label: '$50k - $100k' },
      { value: '100k+', label: '$100k+' },
      { value: 'not_sure', label: 'Not sure yet' },
    ],
  },
};

function sendSSE(res: Response, event: SSEEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

export async function handleSalesChat(req: Request, res: Response): Promise<void> {
  const input = req.body as SalesChatInput;
  const { messages, timezone = 'America/New_York', leadInfo, selectedSlotId } = input;

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  // Handle client disconnect
  let isClientConnected = true;
  req.on('close', () => {
    isClientConnected = false;
    logger.debug('Client disconnected from sales chat stream');
  });

  try {
    await streamSalesChat(messages, timezone, {
      onTextDelta: (text) => {
        if (isClientConnected) {
          sendSSE(res, { type: 'text_delta', content: text });
        }
      },

      onToolUseStart: (name) => {
        if (isClientConnected) {
          sendSSE(res, { type: 'tool_use_start', name });
        }
      },

      onToolUseComplete: async (toolUse: ToolUseBlock): Promise<string> => {
        const { name, input: toolInput } = toolUse;

        try {
          switch (name) {
            case 'get_available_slots': {
              const input = toolInput as GetAvailableSlotsInput;
              const slots = await calendarService.getAvailableSlots({
                preferredDate: input.preferred_date,
                timePreference: input.time_preference,
                timezone,
              });

              if (isClientConnected) {
                sendSSE(res, { type: 'available_slots', slots });
              }

              // Return summary for Claude
              if (slots.length === 0) {
                return 'No available slots found for the requested time period. Please ask if they would like to try a different date range.';
              }
              const slotSummary = slots
                .slice(0, 5)
                .map((s) => `${s.displayDate} at ${s.displayTime}`)
                .join(', ');
              return `Found ${slots.length} available slots. First few options: ${slotSummary}. The user can now select a time from the displayed options.`;
            }

            case 'collect_lead_info': {
              const input = toolInput as CollectLeadInfoInput;
              const fields = input.fields_needed
                .map((fieldName) => LEAD_FORM_FIELDS[fieldName])
                .filter(Boolean);

              if (isClientConnected) {
                sendSSE(res, {
                  type: 'lead_form_request',
                  fields,
                  context: input.context,
                });
              }

              return `Form displayed to collect: ${input.fields_needed.join(', ')}. Wait for the user to submit the form before proceeding.`;
            }

            case 'book_demo': {
              const toolInput2 = toolInput as BookDemoInput;

              // Merge any existing lead info (convert from snake_case tool input to camelCase)
              const fullLeadInfo: LeadInfo = {
                name: toolInput2.lead_info.name || leadInfo?.name || '',
                email: toolInput2.lead_info.email || leadInfo?.email || '',
                company: toolInput2.lead_info.company || leadInfo?.company || '',
                phone: toolInput2.lead_info.phone || leadInfo?.phone,
                companySize: toolInput2.lead_info.company_size || leadInfo?.companySize,
                interests: toolInput2.lead_info.interests || leadInfo?.interests,
                budgetRange: toolInput2.lead_info.budget_range || leadInfo?.budgetRange,
              };

              // Validate required fields
              if (!fullLeadInfo.name || !fullLeadInfo.email || !fullLeadInfo.company) {
                return 'Cannot book demo: Missing required fields (name, email, or company). Please use collect_lead_info first.';
              }

              // Use selectedSlotId from frontend (reliable) or fall back to AI's slot_id
              const slotIdToUse = selectedSlotId || toolInput2.slot_id;
              logger.info({ selectedSlotId, aiSlotId: toolInput2.slot_id, slotIdToUse }, 'Determining slot ID for booking');

              const booking = await calendarService.bookDemo({
                slotId: slotIdToUse,
                leadInfo: fullLeadInfo,
                meetingNotes: toolInput2.meeting_notes,
                timezone,
              });

              if (booking.success) {
                if (isClientConnected) {
                  sendSSE(res, { type: 'booking_confirmed', booking });
                }

                // Send confirmation email with confirmation link
                try {
                  await emailService.sendDemoConfirmation({
                    to: fullLeadInfo.email,
                    name: fullLeadInfo.name,
                    company: fullLeadInfo.company,
                    meetLink: booking.meetLink || '',
                    startTime: booking.startTime || '',
                    endTime: booking.endTime || '',
                    eventId: booking.eventId || '',
                  });
                } catch (emailError) {
                  logger.error({ emailError }, 'Failed to send demo confirmation email');
                }

                // Notify team via Telegram
                try {
                  await telegramService.sendMessage(
                    `🎉 *New Demo Booked!*\n\n` +
                      `*Name:* ${fullLeadInfo.name}\n` +
                      `*Email:* ${fullLeadInfo.email}\n` +
                      `*Company:* ${fullLeadInfo.company}\n` +
                      `*Time:* ${new Date(booking.startTime || '').toLocaleString()}\n` +
                      `*Meet Link:* ${booking.meetLink || 'N/A'}\n` +
                      (fullLeadInfo.companySize ? `*Size:* ${fullLeadInfo.companySize}\n` : '') +
                      (fullLeadInfo.budgetRange ? `*Budget:* ${fullLeadInfo.budgetRange}\n` : '') +
                      (toolInput2.meeting_notes ? `\n*Notes:*\n${toolInput2.meeting_notes}` : '')
                  );
                } catch (telegramError) {
                  logger.error({ telegramError }, 'Failed to send Telegram notification');
                }

                return `Demo successfully booked! A Google Meet link (${booking.meetLink}) has been created and a confirmation email sent to ${fullLeadInfo.email}. The meeting is scheduled for ${booking.startTime}.`;
              } else {
                if (isClientConnected) {
                  sendSSE(res, {
                    type: 'error',
                    message: booking.error || 'Failed to book demo',
                  });
                }
                return `Failed to book demo: ${booking.error}. Please apologize and offer to try again or suggest contacting us directly at hello@tenxdev.ai.`;
              }
            }

            default:
              return `Unknown tool: ${name}`;
          }
        } catch (error) {
          logger.error({ error, toolName: name }, 'Tool execution failed');
          return `Tool ${name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },

      onError: (error) => {
        logger.error({ error }, 'Sales chat stream error');
        if (isClientConnected) {
          sendSSE(res, {
            type: 'error',
            message: 'An error occurred. Please try again.',
          });
        }
      },

      onComplete: () => {
        if (isClientConnected) {
          sendSSE(res, { type: 'done' });
          res.end();
        }
      },
    });
  } catch (error) {
    logger.error({ error }, 'Sales chat handler error');
    if (isClientConnected) {
      sendSSE(res, {
        type: 'error',
        message: 'An error occurred. Please try again.',
      });
      res.end();
    }
  }
}
