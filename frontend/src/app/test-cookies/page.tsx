'use client';

import { useEffect, useState } from 'react';

export default function TestCookiesPage() {
  const [cookies, setCookies] = useState<string>('');
  const [authToken, setAuthToken] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    // Get all cookies
    setCookies(document.cookie);
    
    // Get auth token specifically
    const authCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth-token='));
    
    if (authCookie) {
      setAuthToken(authCookie.split('=')[1]);
    }
  }, []);

  const testLogin = async () => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'demo@agentdb9.com',
          password: 'demo123'
        }),
      });

      const data = await response.json();
      console.log('Login response:', data);
      
      // Refresh cookie display
      setTimeout(() => {
        setCookies(document.cookie);
        const authCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('auth-token='));
        
        if (authCookie) {
          setAuthToken(authCookie.split('=')[1]);
        }
      }, 100);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const checkDebugAuth = async () => {
    try {
      const response = await fetch('/api/debug/auth');
      const data = await response.json();
      console.log('Debug auth data:', data);
      setDebugInfo(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Debug auth failed:', error);
      setDebugInfo(`ERROR: ${error}`);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Cookie Test Page</h1>
      
      <div className="mb-4 space-x-2">
        <button 
          onClick={testLogin}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Test Login
        </button>
        <button 
          onClick={checkDebugAuth}
          className="bg-purple-500 text-white px-4 py-2 rounded"
        >
          Check Auth Debug
        </button>
      </div>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold">All Cookies:</h2>
        <pre className="bg-gray-100 p-2 rounded">{cookies || 'No cookies'}</pre>
      </div>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Auth Token:</h2>
        <pre className="bg-gray-100 p-2 rounded break-all">{authToken || 'No auth token'}</pre>
      </div>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Debug Info:</h2>
        <pre className="bg-gray-100 p-2 rounded text-sm">{debugInfo || 'Click "Check Auth Debug" to see server-side auth state'}</pre>
      </div>
      
      <div className="mb-4">
        <a href="/chat" className="bg-green-500 text-white px-4 py-2 rounded inline-block">
          Go to Chat (will test middleware)
        </a>
      </div>
    </div>
  );
}