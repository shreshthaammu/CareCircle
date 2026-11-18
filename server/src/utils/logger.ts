const SENSITIVE_KEYS = new Set([
  'passcode',
  'password',
  'token',
  'authorization',
  'secret',
  'jwt',
  'elderHash',
  'caretakerHash',
  'familyHash',
  'phone',
  'elderEmail',
  'recipientEmail',
]);

function sanitize(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    // Redact email addresses
    let sanitized = obj.replace(/([a-zA-Z0-9_\-.]+)@([a-zA-Z0-9_\-.]+)\.([a-zA-Z]{2,5})/g, '[EMAIL]');
    // Redact 10-digit phone numbers
    sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
    return sanitized;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.has(key)) {
        cleaned[key] = '[REDACTED]';
      } else {
        cleaned[key] = sanitize(value);
      }
    }
    return cleaned;
  }
  return obj;
}

export const logger = {
  info: (msg: string, meta?: any) => {
    const time = new Date().toISOString();
    if (meta) {
      console.log(`[${time}] [INFO] ${msg}`, JSON.stringify(sanitize(meta)));
    } else {
      console.log(`[${time}] [INFO] ${msg}`);
    }
  },
  warn: (msg: string, meta?: any) => {
    const time = new Date().toISOString();
    if (meta) {
      console.warn(`[${time}] [WARN] ${msg}`, JSON.stringify(sanitize(meta)));
    } else {
      console.warn(`[${time}] [WARN] ${msg}`);
    }
  },
  error: (msg: string, error?: any) => {
    const time = new Date().toISOString();
    const errorDetails = error instanceof Error ? { message: error.message } : error;
    console.error(`[${time}] [ERROR] ${msg}`, JSON.stringify(sanitize(errorDetails)));
  },
  debug: (msg: string, meta?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      const time = new Date().toISOString();
      if (meta) {
        console.debug(`[${time}] [DEBUG] ${msg}`, JSON.stringify(sanitize(meta)));
      } else {
        console.debug(`[${time}] [DEBUG] ${msg}`);
      }
    }
  },
};
