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
    url.includes('/api/v1/sentinel')
  );
}

/**
 * Shared authenticated fetch wrapper.
 * Retrieves a fresh Firebase ID token for each request and attaches
 * Authorization: Bearer <token> while preserving all existing headers and options.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlStr = typeof input === 'string' ? input : input.toString();
  const headers = new Headers(init?.headers);

  // Retrieve fresh Firebase ID token if user is signed in
  const currentUser = auth.currentUser;
  let token: string | null = null;
  if (currentUser) {
    try {
      token = await currentUser.getIdToken();
    } catch (tokenErr) {
      console.warn('[apiFetch] Could not retrieve fresh ID token:', tokenErr);
    }
  }

  // Always prefer the freshly issued Firebase token over any stale caller-supplied header.
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // If a protected endpoint is called without a token, do not silently send an unauthenticated request.
  // Handle missing authentication safely and consistently with the existing sign-in flow.
  if (!token && isProtectedEndpoint(urlStr)) {
    triggerAuthError('session_expired', 'Session expired, please sign in again.');
    return new Response(
      JSON.stringify({ error: 'UNAUTHENTICATED', message: 'Sign in to continue.' }),
      {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'Content-Type': 'application/json' },
      }
    );
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
