'use client';

import { useEffect, useState } from 'react';

export default function GlobalError({ error, reset }) {
  const [details, setDetails] = useState('');

  useEffect(() => {
    console.error('Global error:', error);
    setDetails(`${error?.name || 'Error'}: ${error?.message || 'Unknown'}\n\nStack:\n${error?.stack || 'No stack trace'}`);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
          fontFamily: 'monospace',
          padding: '2rem'
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            maxWidth: '700px',
            width: '100%'
          }}>
            <div style={{
              background: '#fee2e2',
              color: '#dc2626',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontWeight: 600
            }}>
              Global Error (Layout)
            </div>
            <pre style={{
              background: '#1e1e1e',
              color: '#d4d4d4',
              padding: '1rem',
              borderRadius: '8px',
              fontSize: '13px',
              overflow: 'auto',
              maxHeight: '400px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {details || 'Loading error details...'}
            </pre>
            <button
              onClick={() => reset()}
              style={{
                marginTop: '1rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
