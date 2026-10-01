/**
 * Secure Logging Utility
 * Ensures secrets, API keys, and sensitive tokens are NEVER logged to console or files.
 */

const SENSITIVE_PATTERNS = [
  /sk-or-v1-[a-zA-Z0-9_-]{20,}/g,
  /Bearer\s+[a-zA-Z0-9._-]+/gi,
  /"apiKey":\s*"[^"]+"/gi,
  /OPENROUTER_API_KEY=[^\s]+/gi
];

function sanitize(message: unknown): unknown {
  if (typeof message === 'string') {
    let sanitized = message;
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED_SECRET]');
    }
    return sanitized;
  }
  if (message && typeof message === 'object') {
    try {
      const json = JSON.stringify(message);
      let sanitized = json;
      for (const pattern of SENSITIVE_PATTERNS) {
        sanitized = sanitized.replace(pattern, '[REDACTED_SECRET]');
      }
      return JSON.parse(sanitized);
    } catch {
      return '[Unserializable Object]';
    }
  }
  return message;
}

export const logger = {
  info: (msg: string, ...args: unknown[]) => {
    const timestamp = new Date().toISOString();
    console.log(`[INFO]  [${timestamp}]`, sanitize(msg), ...args.map(sanitize));
  },
  warn: (msg: string, ...args: unknown[]) => {
    const timestamp = new Date().toISOString();
    console.warn(`[WARN]  [${timestamp}]`, sanitize(msg), ...args.map(sanitize));
  },
  error: (msg: string, ...args: unknown[]) => {
    const timestamp = new Date().toISOString();
    console.error(`[ERROR] [${timestamp}]`, sanitize(msg), ...args.map(sanitize));
  },
  debug: (msg: string, ...args: unknown[]) => {
    if (process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      console.debug(`[DEBUG] [${timestamp}]`, sanitize(msg), ...args.map(sanitize));
    }
  }
};
