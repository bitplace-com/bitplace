import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * WalletCallbackPage
 * 
 * This page handles the return from Phantom mobile deeplink.
 * It extracts any URL parameters, attempts to close itself,
 * and falls back to redirecting to the main app.
 */
export default function WalletCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'redirecting' | 'manual'>('processing');

  useEffect(() => {
    const handleCallback = async () => {
      // Parse URL parameters that Phantom might have passed
      const urlParams = new URLSearchParams(window.location.search);
      const phantomData = urlParams.get('data');
      const errorCode = urlParams.get('errorCode');
      const errorMessage = urlParams.get('errorMessage');

      console.log('[WalletCallback] Processing callback', { 
        hasData: !!phantomData, 
        errorCode, 
        errorMessage,
        href: window.location.href
      });

      // If there's an error from Phantom, just redirect back
      if (errorCode) {
        console.log('[WalletCallback] Phantom returned error:', errorCode, errorMessage);
        setStatus('redirecting');
        navigate('/', { replace: true });
        return;
      }

      // Try to send message to opener window (if popup flow)
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage({
            type: 'PHANTOM_WALLET_CALLBACK',
            data: phantomData,
            success: true,
          }, window.location.origin);
          
          console.log('[WalletCallback] Sent postMessage to opener');
          
          // Try to close this window
          window.close();
          
          // If close didn't work, wait and check
          setTimeout(() => {
            if (!window.closed) {
              setStatus('manual');
            }
          }, 500);
          return;
        } catch (err) {
          console.log('[WalletCallback] Failed to send postMessage:', err);
        }
      }

      // No opener - this is likely the Phantom in-app browser returning
      // The best we can do is redirect to home - the session was already established
      // in the main flow before the deeplink
      setStatus('redirecting');
      
      // Small delay to ensure any pending localStorage writes are complete
      await new Promise(r => setTimeout(r, 300));
      
      // Redirect to home
      navigate('/', { replace: true });
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-6 max-w-sm">
        {status === 'processing' && (
          <>
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-foreground font-medium">Completing wallet connection...</p>
          </>
        )}
        
        {status === 'redirecting' && (
          <>
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-foreground font-medium">Redirecting to Bitplace...</p>
          </>
        )}
        
        {status === 'manual' && (
          <>
            <div className="text-4xl mb-4">✓</div>
            <p className="text-foreground font-medium mb-2">Wallet connected!</p>
            <p className="text-muted-foreground text-sm mb-4">
              If this window doesn't close automatically:
            </p>
            <div className="space-y-2">
              <button
                onClick={() => window.close()}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
              >
                Close this window
              </button>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium"
              >
                Return to Bitplace
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
