import React, { useState, useEffect } from 'react';

const SecureViewer = ({ authToken, document, onClose }) => {
  const [docUrl, setDocUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!document) return;

    const fetchDocumentUrl = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_URL}/api/documents/${document.id}/view`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
          const data = await response.json();
          setDocUrl(data.url);
        } else {
          setError('Failed to fetch document');
        }
      } catch (err) {
        console.error(err);
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentUrl();
  }, [document, authToken]);

  if (!document) return <div className="p-8 text-on-surface">No document selected.</div>;

  return (
    <div className="viewer-container">
      <div className="viewer-header">
        <h2 className="font-headline-md text-on-surface">Viewing: {document.name}</h2>
        <button className="icon-btn" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      
      <div className="viewer-canvas">
        <div className="pdf-page">
          <div className="watermark">CONFIDENTIAL</div>
          {loading && <div className="content-placeholder"><p className="mt-4 font-body-lg text-on-surface-variant">Loading document...</p></div>}
          {error && <div className="content-placeholder"><p className="mt-4 font-body-lg text-status-critical">{error}</p></div>}
          {!loading && !error && docUrl && (
             <iframe 
               src={docUrl} 
               width="100%" 
               height="100%" 
               style={{ border: 'none', position: 'relative', zIndex: 1 }}
               title={document.name}
             />
          )}
        </div>
      </div>

      <style>{`
        .viewer-container {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 64px);
          background-color: var(--inverse-surface);
        }
        .viewer-header {
          height: 64px;
          background-color: var(--surface);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          border-bottom: 1px solid var(--outline-variant);
        }
        .icon-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-full);
          color: var(--on-surface-variant);
          transition: background-color 0.2s;
        }
        .icon-btn:hover {
          background-color: var(--surface-container);
          color: var(--primary);
        }
        .viewer-canvas {
          flex-grow: 1;
          display: flex;
          justify-content: center;
          padding: 24px;
          overflow-y: auto;
        }
        .pdf-page {
          width: 100%;
          max-width: 800px;
          height: 1000px;
          background-color: white;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-family: var(--font-mono);
          font-size: 24px;
          color: rgba(0,0,0,0.1);
          pointer-events: none;
          white-space: nowrap;
        }
        .content-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: absolute;
          z-index: 2;
        }
      `}</style>
    </div>
  );
};

export default SecureViewer;
