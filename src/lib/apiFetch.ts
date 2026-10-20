/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TraceHarvest Shared Authenticated API Client
 * Uses Firebase ID tokens for administrative backend requests.
 */

import { auth } from './firebase';

export type AuthErrorType = 'session_expired' | 'not_an_admin';
export type AuthErrorHandler = (type: AuthErrorType, message: string) => void;

let globalAuthErrorHandler: AuthErrorHandler | null = null;
let isHandlingAuthError = false;

export function registerAuthErrorHandler(handler: AuthErrorHandler | null): () => void {
  globalAuthErrorHandler = handler;
  return () => {
    if (globalAuthErrorHandler === handler) {
      globalAuthErrorHandler = null;
    }
  };
}

function triggerAuthError(type: AuthErrorType, message: string) {
  if (isHandlingAuthError) return;
  isHandlingAuthError = true;
  try {
    globalAuthErrorHandler?.(type, message);
  } finally {
    setTimeout(() => {
      isHandlingAuthError = false;
    }, 1500);
  }
}

/**
 * Checks whether an endpoint path represents a protected backend route
 * that requires administrative authentication.
 */
function isProtectedEndpoint(url: string): boolean {
  return (
    url.includes('/admin/') ||
    url.endsWith('/admin/me') ||
    url.includes('/api/v1/admin') ||
    url.includes('/api/v1/documents') ||
    url.includes('/documents') ||
    url.includes('/api/v1/sentinel') ||
    url.includes('/api/v1/sync/status')
  );
}

function localResponse(status: number, error: string, message: string): Response {
  return new Response(JSON.stringify({ error, message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Shared authenticated fetch wrapper.
 * Retrieves a fresh Firebase ID token for each request and attaches
 * Authorization: Bearer <token> while preserving all existing headers and options.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlStr = typeof input === 'string' ? input : input.toString();
  const headers = new Headers(init?.headers);

  // Firebase restores a saved sign-in asynchronously. Wait for it, otherwise a page refresh
  // looks like "nobody is signed in" for a moment and would wrongly end the session.
  try {
    await auth.authStateReady();
  } catch {
    // fall through: currentUser below decides
  }

  // A fresh token for every call (Firebase refreshes it automatically when it is near expiry)
  const currentUser = auth.currentUser;
  let token: string | null = null;
  if (currentUser) {
    try {
      token = await currentUser.getIdToken();
    } catch (tokenErr) {
      console.warn('[apiFetch] Could not retrieve fresh ID token:', tokenErr);
    }
  }

  // Attach token if present and not already specified
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!token && isProtectedEndpoint(urlStr)) {
    // Never send a protected request without credentials.
    if (currentUser) {
      // Signed in, but a token could not be obtained (usually a network problem): not a logout.
      return localResponse(503, 'AUTH_UNAVAILABLE', 'Could not refresh your sign-in. Check your connection.');
    }
    // Nobody is signed in, so there is no session to expire: answer locally and stay quiet.
    return localResponse(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  // Centralized authentication and authorization error handling
  if (response.status === 401) {
    triggerAuthError('session_expired', 'Session expired, please sign in again.');
  } else if (response.status === 403) {
    try {
      const cloned = response.clone();
      const errorData = await cloned.json();
      if (errorData && errorData.error === 'NOT_AN_ADMIN') {
        triggerAuthError(
          'not_an_admin',
          errorData.message || 'This account is not authorized as an administrator.'
        );
      }
    } catch {
      // Ignore non-JSON response bodies
    }
  }

  return response;
}
