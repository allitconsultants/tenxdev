import { google, calendar_v3 } from 'googleapis';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { TimeSlot, BookingResult, LeadInfo } from '../types/salesChat.js';

let calendarClient: calendar_v3.Calendar | null = null;

function getCalendarClient(): calendar_v3.Calendar {
  if (!calendarClient) {
    // Use Application Default Credentials (works with GCP Workload Identity)
    const auth = new google.auth.GoogleAuth({
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
    });
    calendarClient = google.calendar({ version: 'v3', auth });
  }
  return calendarClient;
}

interface GetAvailableSlotsOptions {
  preferredDate?: string;
  timePreference?: 'morning' | 'afternoon' | 'any';
  timezone?: string;
  daysAhead?: number;
}

// Business hours in Eastern Time (EST/EDT)
const BUSINESS_HOURS = {
  start: 8, // 8 AM ET
  end: 17, // 5 PM ET
  slotDurationMinutes: 30,
  timezone: 'America/New_York', // Always use ET for business hours
};

export const calendarService = {
  async getAvailableSlots(options: GetAvailableSlotsOptions = {}): Promise<TimeSlot[]> {
    const {
      preferredDate,
      timePreference = 'any',
      timezone = 'America/New_York',
      daysAhead = 7,
    } = options;

    const calendarId = config.googleCalendarId;
    logger.info({ calendarId: calendarId ? 'configured' : 'missing' }, 'Getting available slots');

    if (!calendarId) {
      logger.warn('GOOGLE_CALENDAR_ID not configured, returning mock slots');
      return generateMockSlots(timezone, daysAhead, preferredDate, timePreference);
    }

    try {
      const calendar = getCalendarClient();

      // Calculate time range
      const now = new Date();
      const startDate = preferredDate ? new Date(preferredDate) : now;
      // Ensure we don't query past dates
      if (startDate < now) {
        startDate.setTime(now.getTime());
      }
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + daysAhead);

      // Query busy times
      const freeBusyResponse = await calendar.freebusy.query({
        requestBody: {
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          timeZone: timezone,
          items: [{ id: calendarId }],
        },
      });

      const busyTimes =
        freeBusyResponse.data.calendars?.[calendarId]?.busy || [];

      // Generate available slots
      const slots: TimeSlot[] = [];
      const currentDate = new Date(startDate);
      currentDate.setHours(0, 0, 0, 0);

      while (currentDate < endDate) {
        // Skip weekends (check in ET timezone)
        if (!isWeekendInET(currentDate)) {
          const daySlots = generateDaySlots(
            currentDate,
            busyTimes,
            timezone,
            timePreference,
            now
          );
          slots.push(...daySlots);
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Limit to reasonable number of slots
      return slots.slice(0, 20);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch calendar availability');
      // Fall back to mock slots
      return generateMockSlots(timezone, daysAhead, preferredDate, timePreference);
    }
  },

  async bookDemo(options: {
    slotId: string;
    leadInfo: LeadInfo;
    meetingNotes?: string;
    timezone?: string;
  }): Promise<BookingResult> {
    const { slotId, leadInfo, meetingNotes, timezone = 'America/New_York' } = options;

    logger.info({ slotId, leadEmail: leadInfo.email }, 'Attempting to book demo');

    const calendarId = config.googleCalendarId;
    if (!calendarId) {
      logger.warn('GOOGLE_CALENDAR_ID not configured, returning mock booking');
      return {
        success: true,
        eventId: `mock-${Date.now()}`,
        meetLink: 'https://meet.google.com/mock-demo-link',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };
    }

    logger.info({ calendarId: calendarId.substring(0, 20) + '...' }, 'Using calendar for booking');

    try {
      const calendar = getCalendarClient();
      logger.info('Calendar client initialized, creating event...');

      // Parse slot ID to get start time
      const slotTime = new Date(slotId);
      const endTime = new Date(slotTime.getTime() + BUSINESS_HOURS.slotDurationMinutes * 60 * 1000);

      // Build event description
      const description = [
        `Demo with ${leadInfo.name} from ${leadInfo.company}`,
        '',
        '--- Lead Information ---',
        `Name: ${leadInfo.name}`,
        `Email: ${leadInfo.email}`,
        `Company: ${leadInfo.company}`,
        leadInfo.phone ? `Phone: ${leadInfo.phone}` : null,
        leadInfo.companySize ? `Company Size: ${leadInfo.companySize}` : null,
        leadInfo.interests?.length ? `Interests: ${leadInfo.interests.join(', ')}` : null,
        leadInfo.budgetRange ? `Budget Range: ${leadInfo.budgetRange}` : null,
        '',
        meetingNotes ? `--- Notes ---\n${meetingNotes}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      // Create the event with [PENDING] prefix (requires confirmation)
      const event = await calendar.events.insert({
        calendarId,
        requestBody: {
          summary: `[PENDING] Demo: ${leadInfo.company} - tenxdev.ai`,
          description,
          start: {
            dateTime: slotTime.toISOString(),
            timeZone: timezone,
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: timezone,
          },
          // Note: Service accounts can't invite attendees or create Meet links
          // Lead info is included in the description - team can add Meet link manually
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 60 },
              { method: 'popup', minutes: 15 },
            ],
          },
          extendedProperties: {
            private: {
              createdAt: new Date().toISOString(),
              status: 'pending',
            },
          },
        },
      });

      const meetLink = event.data.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === 'video'
      )?.uri;

      logger.info(
        { eventId: event.data.id, leadEmail: leadInfo.email },
        'Demo booked successfully'
      );

      return {
        success: true,
        eventId: event.data.id || undefined,
        meetLink: meetLink || undefined,
        startTime: slotTime.toISOString(),
        endTime: endTime.toISOString(),
      };
    } catch (error) {
      const err = error as Error & { code?: number; errors?: unknown[] };
      logger.error(
        {
          error: err.message,
          errorCode: err.code,
          errorDetails: err.errors,
          leadEmail: leadInfo.email,
        },
        'Failed to book demo'
      );
      return {
        success: false,
        error: 'Failed to create calendar event. Please try again or contact us directly.',
      };
    }
  },

  async confirmDemo(eventId: string): Promise<{ success: boolean; error?: string; alreadyConfirmed?: boolean }> {
    const calendarId = config.googleCalendarId;
    if (!calendarId) {
      return { success: false, error: 'Calendar not configured' };
    }

    try {
      const calendar = getCalendarClient();

      // Get the event
      const event = await calendar.events.get({ calendarId, eventId });
      const summary = event.data.summary || '';

      // Check if already confirmed
      if (!summary.startsWith('[PENDING]')) {
        return { success: true, alreadyConfirmed: true };
      }

      // Remove [PENDING] prefix and update status
      await calendar.events.patch({
        calendarId,
        eventId,
        requestBody: {
          summary: summary.replace('[PENDING] ', ''),
          extendedProperties: {
            private: {
              ...event.data.extendedProperties?.private,
              status: 'confirmed',
              confirmedAt: new Date().toISOString(),
            },
          },
        },
      });

      logger.info({ eventId }, 'Demo confirmed successfully');
      return { success: true };
    } catch (error) {
      logger.error({ error, eventId }, 'Failed to confirm demo');
      return { success: false, error: 'Failed to confirm demo' };
    }
  },

  async deleteEvent(eventId: string): Promise<boolean> {
    const calendarId = config.googleCalendarId;
    if (!calendarId) {
      return false;
    }

    try {
      const calendar = getCalendarClient();
      await calendar.events.delete({ calendarId, eventId });
      logger.info({ eventId }, 'Calendar event deleted');
      return true;
    } catch (error) {
      logger.error({ error, eventId }, 'Failed to delete calendar event');
      return false;
    }
  },

  async getPendingEvents(): Promise<Array<{ eventId: string; createdAt: string; summary: string }>> {
    const calendarId = config.googleCalendarId;
    if (!calendarId) {
      return [];
    }

    try {
      const calendar = getCalendarClient();

      // Query events for the next 14 days
      const now = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14);

      const response = await calendar.events.list({
        calendarId,
        timeMin: now.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];

      // Filter for [PENDING] events and extract relevant data
      return events
        .filter((event) => event.summary?.startsWith('[PENDING]'))
        .map((event) => ({
          eventId: event.id || '',
          createdAt: event.extendedProperties?.private?.createdAt || event.created || '',
          summary: event.summary || '',
        }))
        .filter((e) => e.eventId && e.createdAt);
    } catch (error) {
      logger.error({ error }, 'Failed to get pending events');
      return [];
    }
  },

  async getEvent(eventId: string): Promise<{ summary?: string; start?: string } | null> {
    const calendarId = config.googleCalendarId;
    if (!calendarId) {
      return null;
    }

    try {
      const calendar = getCalendarClient();
      const event = await calendar.events.get({ calendarId, eventId });
      return {
        summary: event.data.summary || undefined,
        start: event.data.start?.dateTime || event.data.start?.date || undefined,
      };
    } catch (error) {
      logger.error({ error, eventId }, 'Failed to get event');
      return null;
    }
  },
};

function generateDaySlots(
  date: Date,
  busyTimes: Array<{ start?: string | null; end?: string | null }>,
  userTimezone: string,
  timePreference: 'morning' | 'afternoon' | 'any',
  now: Date
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const { start, end, slotDurationMinutes, timezone: businessTz } = BUSINESS_HOURS;

  // Determine hours based on preference (in ET)
  let startHour = start;
  let endHour = end;
  if (timePreference === 'morning') {
    endHour = 12;
  } else if (timePreference === 'afternoon') {
    startHour = 12;
  }

  // Get the date string in ET to work with
  const dateStr = date.toLocaleDateString('en-CA', { timeZone: businessTz }); // YYYY-MM-DD format

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += slotDurationMinutes) {
      // Create slot time in ET by parsing the date and time
      const hourStr = hour.toString().padStart(2, '0');
      const minStr = minute.toString().padStart(2, '0');
      const etDateTimeStr = `${dateStr}T${hourStr}:${minStr}:00`;

      // Create date object - this will be interpreted as local time, then we adjust
      const slotStart = new Date(etDateTimeStr);

      // Convert ET time to UTC by getting the offset
      // This is a workaround since Node.js Date doesn't handle arbitrary timezones well
      const etOffset = getTimezoneOffset(slotStart, businessTz);
      slotStart.setTime(slotStart.getTime() + etOffset);

      // Skip slots in the past
      if (slotStart <= now) continue;

      const slotEnd = new Date(slotStart.getTime() + slotDurationMinutes * 60 * 1000);

      // Check if slot overlaps with any busy time
      const isBusy = busyTimes.some((busy) => {
        if (!busy.start || !busy.end) return false;
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        return slotStart < busyEnd && slotEnd > busyStart;
      });

      if (!isBusy) {
        // Display time in ET (since that's our business hours)
        slots.push({
          id: slotStart.toISOString(),
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          displayTime: slotStart.toLocaleTimeString('en-US', {
            timeZone: businessTz, // Always show in ET
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }) + ' ET',
          displayDate: slotStart.toLocaleDateString('en-US', {
            timeZone: businessTz,
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          }),
        });
      }
    }
  }

  return slots;
}

// Helper to get timezone offset in milliseconds
function getTimezoneOffset(date: Date, timezone: string): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return utcDate.getTime() - tzDate.getTime();
}

// Get day of week in a specific timezone (0=Sunday, 6=Saturday)
function getDayOfWeekInTimezone(date: Date, timezone: string): number {
  // Use Intl.DateTimeFormat for reliable timezone support
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  });
  const weekday = formatter.format(date);
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return dayMap[weekday] ?? 0;
}

// Check if a date is a weekend in ET
function isWeekendInET(date: Date): boolean {
  const dayOfWeek = getDayOfWeekInTimezone(date, 'America/New_York');
  return dayOfWeek === 0 || dayOfWeek === 6;
}

function generateMockSlots(
  userTimezone: string,
  daysAhead: number,
  preferredDate?: string,
  timePreference?: 'morning' | 'afternoon' | 'any'
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const now = new Date();
  const startDate = preferredDate ? new Date(preferredDate) : now;
  const { timezone: businessTz } = BUSINESS_HOURS;

  for (let day = 0; day < daysAhead && slots.length < 15; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day);

    // Skip weekends (check in ET timezone)
    if (isWeekendInET(date)) continue;

    // Generate slots at 9 AM, 11 AM, 2 PM, 4 PM ET (within 8-5 business hours)
    const hours =
      timePreference === 'morning'
        ? [8, 9, 10, 11]
        : timePreference === 'afternoon'
          ? [13, 14, 15, 16]
          : [9, 11, 14, 16];

    // Get the date string in ET
    const dateStr = date.toLocaleDateString('en-CA', { timeZone: businessTz });

    for (const hour of hours) {
      const hourStr = hour.toString().padStart(2, '0');
      const etDateTimeStr = `${dateStr}T${hourStr}:00:00`;

      const slotStart = new Date(etDateTimeStr);
      const etOffset = getTimezoneOffset(slotStart, businessTz);
      slotStart.setTime(slotStart.getTime() + etOffset);

      if (slotStart <= now) continue;

      const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

      slots.push({
        id: slotStart.toISOString(),
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        displayTime: slotStart.toLocaleTimeString('en-US', {
          timeZone: businessTz,
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }) + ' ET',
        displayDate: slotStart.toLocaleDateString('en-US', {
          timeZone: businessTz,
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        }),
      });
    }
  }

  return slots;
}
