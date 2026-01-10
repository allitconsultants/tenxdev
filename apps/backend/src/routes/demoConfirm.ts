import { Router, type IRouter } from 'express';
import { confirmationService } from '../services/confirmationService.js';
import { calendarService } from '../services/calendarService.js';
import { logger } from '../utils/logger.js';

const router: IRouter = Router();

// HTML templates for responses
const successHtml = (dateStr: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Demo Confirmed - tenxdev.ai</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .card { background: white; padding: 48px; border-radius: 16px; text-align: center; max-width: 400px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
    .check { width: 80px; height: 80px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
    .check svg { width: 40px; height: 40px; stroke: white; stroke-width: 3; }
    h1 { color: #1f2937; margin: 0 0 16px; font-size: 24px; }
    p { color: #6b7280; margin: 0 0 8px; line-height: 1.6; }
    .time { color: #374151; font-weight: 600; margin-top: 16px; }
    a { color: #667eea; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">
      <svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <h1>Demo Confirmed!</h1>
    <p>You're all set for your demo with tenxdev.ai.</p>
    <p class="time">${dateStr}</p>
    <p style="margin-top: 24px;">We'll send you a reminder before your demo.</p>
    <p style="margin-top: 16px;"><a href="https://tenxdev.ai">Back to tenxdev.ai</a></p>
  </div>
</body>
</html>
`;

const alreadyConfirmedHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Already Confirmed - tenxdev.ai</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .card { background: white; padding: 48px; border-radius: 16px; text-align: center; max-width: 400px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
    .check { width: 80px; height: 80px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
    .check svg { width: 40px; height: 40px; stroke: white; stroke-width: 3; }
    h1 { color: #1f2937; margin: 0 0 16px; font-size: 24px; }
    p { color: #6b7280; margin: 0 0 8px; line-height: 1.6; }
    a { color: #667eea; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">
      <svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <h1>Already Confirmed</h1>
    <p>This demo was already confirmed.</p>
    <p>See you soon!</p>
    <p style="margin-top: 24px;"><a href="https://tenxdev.ai">Back to tenxdev.ai</a></p>
  </div>
</body>
</html>
`;

const expiredHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Link Expired - tenxdev.ai</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); }
    .card { background: white; padding: 48px; border-radius: 16px; text-align: center; max-width: 400px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
    .warn { width: 80px; height: 80px; background: #f59e0b; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
    .warn svg { width: 40px; height: 40px; stroke: white; stroke-width: 3; }
    h1 { color: #1f2937; margin: 0 0 16px; font-size: 24px; }
    p { color: #6b7280; margin: 0 0 8px; line-height: 1.6; }
    a { color: #667eea; text-decoration: none; }
    .btn { display: inline-block; background: #667eea; color: white !important; padding: 12px 24px; border-radius: 8px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="warn">
      <svg viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M12 3l9 16H3L12 3z" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <h1>Link Expired</h1>
    <p>This confirmation link has expired.</p>
    <p>The demo slot may have been released.</p>
    <p><a href="https://tenxdev.ai" class="btn">Book a New Demo</a></p>
  </div>
</body>
</html>
`;

const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Error - tenxdev.ai</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
    .card { background: white; padding: 48px; border-radius: 16px; text-align: center; max-width: 400px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
    .err { width: 80px; height: 80px; background: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
    .err svg { width: 40px; height: 40px; stroke: white; stroke-width: 3; }
    h1 { color: #1f2937; margin: 0 0 16px; font-size: 24px; }
    p { color: #6b7280; margin: 0 0 8px; line-height: 1.6; }
    a { color: #667eea; text-decoration: none; }
    .btn { display: inline-block; background: #667eea; color: white !important; padding: 12px 24px; border-radius: 8px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="err">
      <svg viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <h1>Something Went Wrong</h1>
    <p>We couldn't process your confirmation.</p>
    <p>Please contact us at hello@tenxdev.ai</p>
    <p><a href="https://tenxdev.ai" class="btn">Back to tenxdev.ai</a></p>
  </div>
</body>
</html>
`;

router.get('/', async (req, res) => {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    logger.warn('Demo confirm request without token');
    res.status(400).send(errorHtml);
    return;
  }

  try {
    // Verify the token
    const { eventId, email } = confirmationService.verifyToken(token);
    logger.info({ eventId, email }, 'Processing demo confirmation');

    // Confirm the demo in calendar
    const result = await calendarService.confirmDemo(eventId);

    if (!result.success) {
      logger.error({ eventId, error: result.error }, 'Failed to confirm demo');
      res.status(500).send(errorHtml);
      return;
    }

    if (result.alreadyConfirmed) {
      logger.info({ eventId }, 'Demo was already confirmed');
      res.send(alreadyConfirmedHtml);
      return;
    }

    // Get event details for success page
    const event = await calendarService.getEvent(eventId);
    let dateStr = 'your scheduled time';
    if (event?.start) {
      const startDate = new Date(event.start);
      dateStr = startDate.toLocaleString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short',
      });
    }

    logger.info({ eventId, email }, 'Demo confirmed successfully');
    res.send(successHtml(dateStr));
  } catch (error) {
    const err = error as Error;

    if (err.message === 'TOKEN_EXPIRED') {
      logger.warn({ token: token.substring(0, 20) }, 'Expired confirmation token used');
      res.status(410).send(expiredHtml);
      return;
    }

    if (err.message === 'TOKEN_INVALID') {
      logger.warn({ token: token.substring(0, 20) }, 'Invalid confirmation token used');
      res.status(400).send(errorHtml);
      return;
    }

    logger.error({ error: err }, 'Error processing demo confirmation');
    res.status(500).send(errorHtml);
  }
});

export default router;
