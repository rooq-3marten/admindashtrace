/**
 * Turns any failure into a short, plain message for the person using the portal.
 * Technical detail (stack traces, SQL, JSON) is never shown; it stays in the browser console.
 */
const NETWORK = 'Could not reach the server. Check your internet connection and try again.';
const GENERIC = 'Something went wrong. Please try again. If it keeps happening, contact your administrator.';

const looksTechnical = (m: string): boolean =>
  m.length > 160 || /[{}<>]|traceback|exception|stack|\bat\s+\S+:\d+|sql|undefined|null|TypeError|ReferenceError/i.test(m);

export function friendlyError(err: unknown, action = 'complete this action'): string {
  if (err) console.warn(`Failed to ${action}:`, err);
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : '';

  if (err instanceof TypeError || /failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
    return NETWORK;
  }
  if (/auth\/(popup-closed-by-user|cancelled-popup-request|popup-blocked)/.test(message)) {
    return 'Sign-in was cancelled or blocked. Please allow pop-ups and try again.';
  }
  if (/auth\/network-request-failed/.test(message)) return NETWORK;
  if (/auth\//.test(message)) return 'Sign-in could not be completed. Please try again.';
  const status = Number(/\(HTTP (\d{3})\)/.exec(message)?.[1]);
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to do this.';
  if (status === 404) return 'That item could not be found. It may have been removed.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500) return 'The server had a problem. Please try again shortly.';

  // A short, plain sentence written for people (e.g. "This agent is already approved.") is kept.
  if (message && !looksTechnical(message)) return message;
  return GENERIC;
}
