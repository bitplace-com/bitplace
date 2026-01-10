import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface WithdrawValidationResult {
  ok: boolean;
  validPixels: { x: number; y: number; amount: number; side: string }[];
  invalidPixels: { x: number; y: number; reason: string }[];
  totalRefund: number;
  previewPeStatusAfter: {
    peTotalPe: number;
    peUsed: number;
    peAvailable: number;
  };
}

interface WithdrawCommitResult {
  ok: boolean;
  withdrawnCount: number;
  refundedTotal: number;
  withdrawnPixels: { x: number; y: number; amount: number; side: string }[];
  peStatus: {
    peTotalPe: number;
    peUsed: number;
    peAvailable: number;
  };
}

export function useWithdrawContribution() {
  const [isValidating, setIsValidating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [validationResult, setValidationResult] = useState<WithdrawValidationResult | null>(null);

  const SESSION_TOKEN_KEY = 'bitplace_session_token';

  const getAuthToken = useCallback(() => {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  }, []);

  const validate = useCallback(async (pixels: { x: number; y: number }[]): Promise<WithdrawValidationResult | null> => {
    const token = getAuthToken();
    if (!token) {
      toast.error('Please connect your wallet first');
      return null;
    }

    setIsValidating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contribution-withdraw`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ pixels, action: 'validate' }),
        }
      );

      const data = await response.json();
      console.log('[useWithdrawContribution] Validate response:', data);
      if (!response.ok) {
        const errMsg = data.error || data.message || 'Validation failed';
        console.error('[useWithdrawContribution] Validate error:', data);
        toast.error(errMsg);
        throw new Error(errMsg);
      }

      setValidationResult(data);
      return data;
    } catch (error) {
      console.error('[useWithdrawContribution] Withdraw validation error:', error);
      const msg = error instanceof Error ? error.message : 'Failed to validate withdrawal';
      if (!msg.includes('Validation failed')) {
        toast.error(msg);
      }
      return null;
    } finally {
      setIsValidating(false);
    }
  }, [getAuthToken]);

  const commit = useCallback(async (pixels: { x: number; y: number }[]): Promise<WithdrawCommitResult | null> => {
    const token = getAuthToken();
    if (!token) {
      toast.error('Please connect your wallet first');
      return null;
    }

    setIsCommitting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contribution-withdraw`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ pixels, action: 'commit' }),
        }
      );

      const data = await response.json();
      console.log('[useWithdrawContribution] Commit response:', data);
      if (!response.ok) {
        const errMsg = data.error || data.message || 'Withdrawal failed';
        console.error('[useWithdrawContribution] Commit error:', data);
        toast.error(errMsg);
        throw new Error(errMsg);
      }

      if (data.ok) {
        toast.success(`Withdrew ${data.refundedTotal.toLocaleString()} PE`);
        // Dispatch event to refresh PE status
        window.dispatchEvent(new CustomEvent('bitplace:pe-refresh'));
      } else {
        const errMsg = data.error || data.message || 'Withdrawal failed';
        toast.error(errMsg);
      }

      setValidationResult(null);
      return data;
    } catch (error) {
      console.error('[useWithdrawContribution] Withdraw commit error:', error);
      const msg = error instanceof Error ? error.message : 'Failed to withdraw contribution';
      if (!msg.includes('Withdrawal failed')) {
        toast.error(msg);
      }
      return null;
    } finally {
      setIsCommitting(false);
    }
  }, [getAuthToken]);

  const clearValidation = useCallback(() => {
    setValidationResult(null);
  }, []);

  return {
    isValidating,
    isCommitting,
    validationResult,
    validate,
    commit,
    clearValidation,
  };
}
