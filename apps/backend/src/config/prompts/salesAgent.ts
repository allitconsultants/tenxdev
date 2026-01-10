import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const SALES_AGENT_SYSTEM_PROMPT = `You are a concise, helpful sales assistant for tenxdev.ai.

## CRITICAL: Be Brief
- Keep responses SHORT (2-4 sentences max)
- Ask only ONE question at a time
- Don't overwhelm with bullet points or lists
- Get to the point quickly

## About tenxdev.ai:
- AI-powered software development consultancy
- Complete projects in 1/4 of the time at 1/4 of the cost
- Services: AI Development, Infrastructure, DevOps, Cloud Architecture, Platform Engineering, Consulting

## Pricing (only when asked):
- Discovery: $2,500+ | MVP Sprint: $15,000+ (2-4 weeks) | Ongoing: $8,000+/month

## Business Hours:
- Monday-Friday, 8:00 AM - 5:00 PM Eastern Time
- No weekend demos

## Your Approach:
1. Listen to what they need
2. Respond concisely - don't lecture
3. When they're interested in talking, offer to schedule a demo
4. Collect name, email, company before booking

## Key Rules:
- ONE question per response, not multiple
- No long explanations unless asked
- Don't repeat information they already told you
- When they want to schedule, just do it - don't keep asking questions

## Booking Flow (IMPORTANT):
1. When user FIRST asks to schedule → call \`get_available_slots\` (slots will be shown to user)
2. When user says "I'd like to book the X slot" → they have SELECTED a slot, do NOT call get_available_slots again!
3. After slot selection, if missing name/email/company → call \`collect_lead_info\`
4. Once you have name, email, company AND a slot was selected → call \`book_demo\`
   - IMPORTANT: Include a \`meeting_notes\` summary of what the user discussed (their project, needs, questions)

NEVER call \`get_available_slots\` after user has already selected a time slot. The slot selection message means they chose from the displayed options.

Current date/time will be provided with each message.`;

export const SALES_AGENT_TOOLS: Tool[] = [
  {
    name: 'get_available_slots',
    description:
      'Get available demo time slots for the next 7 days. Call this ONLY when user FIRST asks to schedule. Do NOT call this if user has already selected a slot (e.g. "I\'d like to book the 3:00 PM slot").',
    input_schema: {
      type: 'object' as const,
      properties: {
        preferred_date: {
          type: 'string',
          description: 'Optional preferred date in YYYY-MM-DD format',
        },
        time_preference: {
          type: 'string',
          enum: ['morning', 'afternoon', 'any'],
          description: 'Preferred time of day for the meeting',
        },
      },
      required: [],
    },
  },
  {
    name: 'book_demo',
    description:
      'Book a demo meeting. Only call this when you have: 1) All required lead information (name, email, company), and 2) The user has selected a specific time slot.',
    input_schema: {
      type: 'object' as const,
      properties: {
        slot_id: {
          type: 'string',
          description: 'The ID of the selected time slot from get_available_slots',
        },
        lead_info: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Full name of the contact' },
            email: { type: 'string', description: 'Email address' },
            company: { type: 'string', description: 'Company name' },
            phone: { type: 'string', description: 'Phone number (optional)' },
            company_size: {
              type: 'string',
              enum: ['1-10', '11-50', '51-200', '201-1000', '1000+'],
              description: 'Number of employees',
            },
            interests: {
              type: 'array',
              items: { type: 'string' },
              description: 'Services or topics they are interested in',
            },
            budget_range: {
              type: 'string',
              enum: ['<10k', '10k-50k', '50k-100k', '100k+', 'not_sure'],
              description: 'Approximate project budget',
            },
          },
          required: ['name', 'email', 'company'],
        },
        meeting_notes: {
          type: 'string',
          description:
            'REQUIRED: Summary of the conversation - what the prospect wants to discuss, their project details, challenges, and any specific questions they mentioned. This goes in the calendar event description.',
        },
      },
      required: ['slot_id', 'lead_info'],
    },
  },
  {
    name: 'collect_lead_info',
    description:
      'Request the frontend to display a form for collecting specific lead information fields. Use this when you need to gather contact details in a structured way.',
    input_schema: {
      type: 'object' as const,
      properties: {
        fields_needed: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'name',
              'email',
              'company',
              'phone',
              'company_size',
              'interests',
              'budget_range',
            ],
          },
          description: 'Which fields to collect from the user',
        },
        context: {
          type: 'string',
          description:
            'Brief explanation of why we need this information (shown to user)',
        },
      },
      required: ['fields_needed'],
    },
  },
];
