/**
 * Authentication helpers for API calls with automatic token refresh handling
 */

const SESSION_TOKEN_KEY = 'bitplace_session_token';

// Parse JWT payload to check expiry
export const parseJwtPayload = (token: string): { wallet: string; userId: string; exp: number; authProvider?: string } | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payloadB64 = parts[1];
    const decoded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(decoded));
    
    return {
      wallet: payload.wallet,
      userId: payload.userId,
      exp: payload.exp,
      authProvider: payload.authProvider,
    };
  } catch {
    return null;
  }
};

// Check if current session is Google-based
export const isGoogleSession = (): boolean => {
  const token = getSessionToken();
  if (!token) return false;
  const payload = parseJwtPayload(token);
  return payload?.authProvider === 'google' || payload?.authProvider === 'both';
};

// Check if current session is Google-only (no wallet)
export const isGoogleOnlySession = (): boolean => {
  const token = getSessionToken();
  if (!token) return false;
  const payload = parseJwtPayload(token);
  return payload?.authProvider === 'google';
};

// Check if token is expired (with 30s buffer)
export const isTokenExpired = (token: string): boolean => {
  const payload = parseJwtPayload(token);
  if (!payload) return true;
  
  // Add 30s buffer to avoid edge cases
  return Date.now() > (payload.exp - 30000);
};

// Get session token
export const getSessionToken = (): string | null => {
  return localStorage.getItem(SESSION_TOKEN_KEY);
};

// Get valid session token (returns null if expired)
export const getValidSessionToken = (): string | null => {
  const token = getSessionToken();
  if (!token) return null;
  if (isTokenExpired(token)) return null;
  return token;
};

// Clear session data
export const clearSession = (): void => {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem('bitplace_wallet_address');
  localStorage.removeItem('bitplace_user_data');
};

// Event for token expiry (other components can listen)
export const TOKEN_EXPIRED_EVENT = 'bitplace:token_expired';

export const dispatchTokenExpired = (): void => {
  window.dispatchEvent(new CustomEvent(TOKEN_EXPIRED_EVENT));
};

// Get auth headers or dispatch expiry event
export const getAuthHeadersOrExpire = (): { Authorization: string } | null => {
  const token = getValidSessionToken();
  if (!token) {
    dispatchTokenExpired();
    return null;
  }
  return { Authorization: `Bearer ${token}` };
};
