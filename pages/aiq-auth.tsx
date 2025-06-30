import React, { useState } from 'react';
import type { FormEvent } from 'react';

interface PromptModalProps {
  onSubmit: (value: string, domain: string, setError: (error: string | null) => void) => void;
  initialValue: string;
  initialDomain: string;
  responseData: any;
  clientError: string | null;
  serverError: string | null;
}

function PromptModal({ onSubmit, initialValue, initialDomain, responseData, clientError, serverError }: PromptModalProps) {
  const [value, setValue] = useState(initialValue);
  const [domain, setDomain] = useState(initialDomain);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    onSubmit(value, domain, (errorMessage) => {
      setError(errorMessage);
      setIsSubmitting(false);
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#343541] rounded-lg p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-semibold mb-6 text-black dark:text-white text-center">Enter Authentication Details</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="domain" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Domain URL
            </label>
            <input
              id="domain"
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded mb-4 bg-white dark:bg-[#40414F] text-black dark:text-white"
              placeholder="Enter domain URL..."
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="promptKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Consent Prompt Key
            </label>
            <input
              id="promptKey"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded mb-2 bg-white dark:bg-[#40414F] text-black dark:text-white"
              placeholder="Enter consent prompt key..."
              autoFocus
              autoComplete="off"
            />
            {error && (
              <div className="mb-4 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm">
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {clientError && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="font-semibold text-red-800 dark:text-red-400 mb-2">Client Error:</p>
              <p className="text-red-700 dark:text-red-300">{clientError}</p>
            </div>
          )}

          {serverError && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="font-semibold text-red-800 dark:text-red-400 mb-2">Server Error:</p>
              <p className="text-red-700 dark:text-red-300">{serverError}</p>
            </div>
          )}



          {responseData && (serverError || clientError) && (
            <div className="mb-4 p-4 bg-gray-800 text-gray-100 rounded-lg font-mono text-sm overflow-x-auto">
              <p className="font-semibold mb-2">Response:</p>
              <pre className="whitespace-pre-wrap">{JSON.stringify(responseData, null, 2)}</pre>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#76b900] text-white rounded hover:bg-[#5a9100] focus:outline-none transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {isSubmitting ? 'Processing...' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AIQAuthPage() {
  const [showPrompt, setShowPrompt] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseError, setResponseError] = useState<string | null>(null);
  const [responseData, setResponseData] = useState<any>(null);

  const [authSuccess, setAuthSuccess] = useState(false);
  const [currentPopup, setCurrentPopup] = useState<Window | null>(null);
  const [authProviderName, setAuthProviderName] = useState<string | null>(null);

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (currentPopup && !currentPopup.closed) {
        try {
          currentPopup.document.title = `Authentication was successfully granted for authentication provider ${authProviderName}`;
        } catch (e) {
          console.log('Could not update popup title due to cross-origin restrictions');
        }
      }
      
      setShowPrompt(false);
      setAuthSuccess(true);
      setIsProcessing(false);
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentPopup, authProviderName]);

  const handleSubmit = async (key: string, domain: string, setModalError: (error: string | null) => void) => {
    setIsProcessing(true);
    setError(null);
    setResponseError(null);
    setResponseData(null);
    setAuthSuccess(false);
    setAuthProviderName(null);
    
    try {
      const response = await fetch(`${domain}/auth/prompt-uri`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ "consent_prompt_key": key }),
      });

      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        
        if (!response.ok) {
          setResponseData(data);
          const errorMessage = data.detail || data.message || data.error || `Error: ${response.status} - ${response.statusText}`;
          setModalError(errorMessage);
          setIsProcessing(false);
          return;
        }

        setResponseData(data);

        if (data.redirect_url) {
          setAuthProviderName(data.auth_provider_name);
          const popup = window.open(
            data.redirect_url,
            'auth-popup',
            'width=600,height=700,scrollbars=yes,resizable=yes'
          );
          setCurrentPopup(popup);
          setModalError(null);
          return;
        }
      }

      if (!response.ok) {
        const errorMessage = `Error: ${response.status} - ${response.statusText}`;
        setModalError(errorMessage);
        setIsProcessing(false);
        return;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setModalError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#343541]">
      {/* Green Banner */}
      <div className="bg-[#76b900] text-white py-4 px-6 text-center">
        <h1 className="text-2xl font-bold">NeMo-Agent-Toolkit</h1>
      </div>
      
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        {showPrompt && !authSuccess && (
          <PromptModal
            onSubmit={handleSubmit}
            initialValue=""
            initialDomain="http://localhost:8000"
            responseData={responseData}
            clientError={error}
            serverError={responseError}
          />
        )}
      </div>

      {authSuccess && (
        <div className="fixed inset-0 z-[9999] bg-gray-50 dark:bg-[#343541] flex items-center justify-center">
          <div className="w-full max-w-md mx-auto p-6">
            <div className="bg-white dark:bg-[#343541] rounded-lg shadow-lg p-8 text-center border border-gray-200 dark:border-gray-600">
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Authentication was successfully granted for authentication provider {authProviderName}
                </h1>
              </div>
              
              <button
                onClick={() => {
                  setShowPrompt(true);
                  setAuthSuccess(false);
                  setError(null);
                  setResponseError(null);
                  setResponseData(null);
                  setAuthProviderName(null);
                }}
                className="w-full mt-3 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
              >
                Authenticate Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 