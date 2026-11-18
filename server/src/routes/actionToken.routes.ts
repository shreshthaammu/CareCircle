import { Router, Request, Response } from 'express';
import { tokenService } from '../services/token.service.js';
import { doseRepo } from '../repositories/dose.repo.js';
import { auditRepo } from '../repositories/audit.repo.js';
import { actionTokenLimiter } from '../middleware/rateLimiters.js';
import { DoseStatus } from '../types/index.js';

const router = Router();

/**
 * GET /api/action-token/execute
 * Single-use one-tap action link clicked from an email reminder
 */
router.get('/execute', actionTokenLimiter, (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    res.status(400).send(renderResponseHtml('Invalid Link', 'This action link is invalid or expired.', false));
    return;
  }
  res.type('html').send(`<!doctype html>
    <html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Confirm medication action</title></head>
    <body><main><h1>Confirm this medication action</h1>
    <p>Press confirm to update the dose. Opening this link alone will not change your medication record.</p>
    <button id="confirm" type="button">Confirm action</button>
    <p id="status" aria-live="polite"></p></main>
    <script>
      document.getElementById('confirm').addEventListener('click', async () => {
        const status = document.getElementById('status');
        const button = document.getElementById('confirm');
        button.disabled = true;
        status.textContent = 'Saving...';
        try {
          const response = await fetch('/api/action-token/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CareCircle-CSRF': '1' },
            body: JSON.stringify({ token: '${token}' })
          });
          document.open();
          document.write(await response.text());
          document.close();
        } catch {
          status.textContent = 'Could not save your response. Please open the CareCircle app and try again.';
          button.disabled = false;
        }
      });
    </script></body></html>`);
});

router.post('/execute', actionTokenLimiter, async (req: Request, res: Response) => {
  const token = typeof req.body?.token === 'string' ? req.body.token : '';
  if (!token) {
    res.status(400).send(renderResponseHtml('Invalid Request', 'No action token was provided in the link.', false));
    return;
  }

  const payload = await tokenService.consumeToken(token);
  if (!payload) {
    res.status(400).send(
      renderResponseHtml(
        'Link Expired or Already Used',
        'This one-tap link has already been used or has expired. If you need to record a medication status, please open the CareCircle app.',
        false
      )
    );
    return;
  }

  const { circleId, doseId, action } = payload;
  const dose = await doseRepo.getById(doseId);

  if (!dose || dose.circleId !== circleId) {
    res.status(404).send(renderResponseHtml('Dose Not Found', 'Could not locate the scheduled dose record.', false));
    return;
  }

  if (action === 'taken') {
    await doseRepo.markDoseStatus(doseId, 'taken' as DoseStatus, 'ELDER', 'Elder (via Email)');
    await auditRepo.record(circleId, 'ELDER', 'Elder', 'DOSE_STATUS_CHANGED', `Marked ${dose.medicationName} as TAKEN via one-tap email link`);

    res.send(
      renderResponseHtml(
        '✓ Dose Recorded as Taken!',
        `Thank you! We have marked your dose of ${dose.medicationName} (${dose.dosage}) as taken. Great job keeping your routine on track!`,
        true
      )
    );
  } else if (action === 'snooze') {
    const snoozeUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await doseRepo.markDoseStatus(doseId, 'snoozed' as DoseStatus, 'ELDER', 'Elder (via Email)', snoozeUntil);
    await auditRepo.record(circleId, 'ELDER', 'Elder', 'DOSE_STATUS_CHANGED', `Snoozed ${dose.medicationName} for 15 minutes via email link`);

    res.send(
      renderResponseHtml(
        '⏰ Snoozed for 15 Minutes',
        `We have snoozed your dose of ${dose.medicationName}. We will remind you again in 15 minutes.`,
        true
      )
    );
  }
});

function renderResponseHtml(title: string, message: string, success: boolean): string {
  const color = success ? '#0D9488' : '#DC2626';
  const bgColor = success ? '#F0FDFA' : '#FEF2F2';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — CareCircle</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F7F3EA; margin: 0; padding: 24px; display: flex; align-items: center; justify-content: center; min-height: 90vh; }
    .card { max-width: 500px; width: 100%; background: #FFFFFF; border-radius: 20px; border: 1px solid #EDE4D4; padding: 36px 28px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.06); }
    .badge { display: inline-flex; width: 72px; height: 72px; border-radius: 50%; background-color: ${bgColor}; color: ${color}; align-items: center; justify-content: center; font-size: 36px; margin-bottom: 20px; }
    h1 { color: #1C1917; font-size: 26px; margin: 0 0 12px 0; }
    p { font-size: 18px; color: #57534E; line-height: 1.5; margin: 0 0 28px 0; }
    .btn { display: inline-block; padding: 14px 28px; border-radius: 12px; background-color: #0D9488; color: #FFFFFF; text-decoration: none; font-weight: bold; font-size: 18px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${success ? '✓' : '⚠️'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/" class="btn">Open CareCircle App</a>
  </div>
</body>
</html>`;
}

export default router;
