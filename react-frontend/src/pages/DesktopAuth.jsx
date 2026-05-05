import { useEffect, useRef, useState } from 'react';
import { SignIn, useAuth, useUser } from '@clerk/clerk-react';
import { useSearchParams } from 'react-router-dom';

export default function DesktopAuth() {
  const { isSignedIn, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const [searchParams] = useSearchParams();
  const sentRef = useRef(false);
  const [status, setStatus] = useState('waiting'); // waiting | sending | success | error
  const [errorMessage, setErrorMessage] = useState('');

  const port = searchParams.get('port') || '27182';

  useEffect(() => {
    if (isSignedIn && clerkUser && !sentRef.current) {
      sentRef.current = true;
      sendToDesktop();
    }
  }, [isSignedIn, clerkUser]);

  async function sendToDesktop() {
    setStatus('sending');
    setErrorMessage('');
    try {
      const token = await getToken();
      const userData = {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress || '',
        firstName: clerkUser.firstName || '',
        lastName: clerkUser.lastName || '',
        token: token || '',
      };

      console.log('Attempting to connect to desktop on port:', port);

      // We use a shorter timeout for the fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`http://127.0.0.1:${port}/auth-callback`, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        setStatus('success');
      } else {
        throw new Error(`Server responded with ${res.status}`);
      }
    } catch (err) {
      console.error('Desktop connection error:', err);
      setStatus('error');
      setErrorMessage(err.message === 'AbortError' ? 'Connection timed out' : err.message);
      sentRef.current = false; // Allow retry
    }
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4] px-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-6">✅</div>
          <h1 className="text-2xl font-bold text-[#1a0f00] mb-2">Login Successful!</h1>
          <p className="text-gray-500 mb-8">You can now close this window and return to the SeedlingSpeaks app.</p>
          <div className="p-4 bg-green-50 rounded-2xl border border-green-100 text-green-700 text-sm font-medium">
            Widget is now active on your Mac
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4] px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/seedlinglabs-logo.png" className="w-16 h-16 rounded-full mx-auto mb-4 shadow-sm" alt="Logo" />
          <h1 className="text-2xl font-bold text-[#1a0f00]">Desktop Login</h1>
          <p className="text-gray-500 text-sm mt-1">Connect your account to the desktop widget</p>
        </div>

        {!isSignedIn ? (
          <SignIn 
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-xl border border-gray-100 rounded-3xl',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
              }
            }}
            routing="path"
            path="/desktop-auth"
          />
        ) : (
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 text-center">
            {status === 'sending' ? (
              <>
                <div className="w-10 h-10 border-4 border-gray-100 border-t-[#1a0f00] rounded-full animate-spin mx-auto mb-4"></div>
                <p className="font-semibold text-[#1a0f00]">Connecting to Widget...</p>
                <p className="text-xs text-gray-400 mt-2">Make sure the SeedlingSpeaks app is open on your Mac</p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-4">⚠️</div>
                <p className="font-semibold text-red-600">Connection Failed</p>
                <p className="text-sm text-gray-500 mt-2 mb-6">
                  {errorMessage || "We couldn't talk to the desktop app."}
                </p>
                <button 
                  onClick={sendToDesktop}
                  className="w-full bg-[#1a0f00] text-white py-3 rounded-xl font-bold hover:bg-black transition-all"
                >
                  Try Again
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
