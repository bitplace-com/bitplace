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

  const getAuthToken = useCallback(() => {
    return localStorage.getItem('bitplace_token');
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
      if (!response.ok) {
        throw new Error(data.error || 'Validation failed');
      }

      setValidationResult(data);
      return data;
    } catch (error) {
      console.error('Withdraw validation error:', error);
      toast.error('Failed to validate withdrawal');
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
      if (!response.ok) {
        throw new Error(data.error || 'Withdrawal failed');
      }

      if (data.ok) {
        toast.success(`Withdrew ${data.refundedTotal.toLocaleString()} PE`);
        // Dispatch event to refresh PE status
        window.dispatchEvent(new CustomEvent('bitplace:pe-refresh'));
      }

      setValidationResult(null);
      return data;
    } catch (error) {
      console.error('Withdraw commit error:', error);
      toast.error('Failed to withdraw contribution');
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
