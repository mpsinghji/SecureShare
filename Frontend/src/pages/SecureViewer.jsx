import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { showToast } from '../utils/toast';
import * as XLSX from 'xlsx';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const SecureViewer = ({ authToken, document, onClose }) => {
  const [docUrl, setDocUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Custom Render States
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [excelData, setExcelData] = useState(null);
  
  const [fullDoc, setFullDoc] = useState(document);
  // Security States
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    if (!document) return;

    const fetchDocumentUrl = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const headers = {};
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
        const response = await fetch(`${API_URL}/api/documents/${document.id}/view`, {
          headers
        });
        if (response.ok) {
          const data = await response.json();
          setDocUrl(data.url);
          if (data.document) setFullDoc(data.document);
        } else {
          const errData = await response.json().catch(() => ({}));
          setError(errData.error || 'Failed to fetch document');
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

  useEffect(() => {
    if (!docUrl || !fullDoc) return;
    const ext = fullDoc?.name?.split('.').pop().toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      const loadExcel = async () => {
        try {
          const response = await fetch(docUrl);
          const arrayBuffer = await response.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Generate data matrix
          const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          const cols = data.reduce((max, row) => Math.max(max, row.length), 0);
          
          const getColName = (n) => {
            let s = "";
            while(n >= 0) {
              s = String.fromCharCode((n % 26) + 65) + s;
              n = Math.floor(n / 26) - 1;
            }
            return s;
          };

          const escapeHtml = (val) => {
            if (val === undefined || val === null) return '';
            return String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
          };

          let html = '<table><thead><tr><th></th>';
          for(let i=0; i<cols; i++) {
            html += `<th>${getColName(i)}</th>`;
          }
          html += '</tr></thead><tbody>';
          
          data.forEach((row, rowIndex) => {
            html += `<tr><th class="row-num">${rowIndex + 1}</th>`;
            for(let i=0; i<cols; i++) {
              html += `<td>${escapeHtml(row[i])}</td>`;
            }
            html += '</tr>';
          });
          html += '</tbody></table>';
          
          setExcelData(html);
        } catch (err) {
          console.error("Error parsing Excel:", err);
          setError("Failed to load Excel securely.");
        }
      };
      loadExcel();
    }
  }, [docUrl, document]);

  // Anti-Piracy Measures
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault(); // Block right-click
    
    const handleKeyDown = (e) => {
      // Block F12, Ctrl+Shift+I, Ctrl+U, Ctrl+P, Ctrl+S
      if (
        e.keyCode === 123 || 
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || 
        (e.ctrlKey && (e.keyCode === 85 || e.keyCode === 80 || e.keyCode === 83)) ||
        (e.metaKey && (e.keyCode === 80 || e.keyCode === 83))
      ) {
        e.preventDefault();
      }
    };
    
    const handleVisibilityChange = () => {
      if (!window.document.body.classList.contains('allow-print')) {
        setIsHidden(window.document.hidden);
      }
    };
    const handleBlur = () => {
      if (!window.document.body.classList.contains('allow-print')) {
        setIsHidden(true); // Hide when window loses focus (e.g. Snipping Tool activated)
      }
    };
    const handleFocus = () => setIsHidden(false);

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleSecurePrint = () => {
    // IMPORTANT: use window.document.body — 'document' here is the file prop, NOT the DOM
    window.document.body.classList.add('allow-print');
    
    // Call print synchronously to avoid popup blockers
    window.print();
    
    const cleanup = () => {
      window.document.body.classList.remove('allow-print');
      window.removeEventListener('afterprint', cleanup);
    };
    
    window.addEventListener('afterprint', cleanup);
    // Fallback in case afterprint doesn't fire
    setTimeout(cleanup, 10000);
  };

  const handleShareLink = () => {
    const link = `${window.location.origin}/view/${document.id}`;
    navigator.clipboard.writeText(link).then(() => {
      showToast('Share link copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy link', 'error');
    });
  };

  if (!document && !fullDoc) return <div className="p-8 text-on-surface">No document selected.</div>;

  const ext = fullDoc?.name?.split('.').pop().toLowerCase();
  const isMedia = ['png', 'jpg', 'jpeg', 'mp4', 'mov'].includes(ext);

  return (
    <div className="viewer-container">
      <div className="viewer-header">
        <h2 className="font-headline-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">lock</span>
          Viewing: {fullDoc?.name || 'Loading...'}
        </h2>
        <div className="flex gap-4">
          {fullDoc?.allow_print && (
            <button className="secondary-btn flex items-center gap-2 font-label-caps" onClick={handleSecurePrint} title="Secure Print">
              <span className="material-symbols-outlined" style={{fontSize: '18px'}}>print</span>
              Print Securely
            </button>
          )}
          {!authToken ? (
            <button className="primary-btn font-label-caps" onClick={() => window.location.href = '/'}>
              Log In
            </button>
          ) : (
            <button className="icon-btn" onClick={onClose} title="Close">
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>
      </div>
      
      <div className="viewer-canvas">
        {isHidden && (
          <div className="security-overlay">
            <h3>Security Policy Enforced</h3>
            <p>Document hidden while window is out of focus to prevent unauthorized capture.</p>
          </div>
        )}
        
        <div className={`pdf-page ${isHidden ? 'blur-content' : ''} ${isMedia ? 'media-page' : ''}`}>
          <div className="watermark">CONFIDENTIAL</div>
          {loading && <div className="content-placeholder"><p className="mt-4 font-body-lg text-on-surface-variant">Loading document securely...</p></div>}
          {error && <div className="content-placeholder"><p className="mt-4 font-body-lg text-status-critical">{error}</p></div>}
          
          {!loading && !error && docUrl && (
            <div className="secure-renderer">
              {(() => {
                if (ext === 'pdf') {
                  return (
                    <div className="flex flex-col items-center">
                      <Document
                        file={docUrl}
                        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                        loading="Initializing Secure PDF Engine..."
                      >
                        <Page pageNumber={pageNumber} renderTextLayer={false} renderAnnotationLayer={false} className="canvas-shadow" />
                      </Document>
                      {numPages > 1 && (
                        <div className="pdf-controls mt-4 flex gap-4 items-center">
                          <button disabled={pageNumber <= 1} onClick={() => setPageNumber(p => p - 1)} className="secondary-btn font-label-caps">Previous</button>
                          <span className="font-code-sm">Page {pageNumber} of {numPages}</span>
                          <button disabled={pageNumber >= numPages} onClick={() => setPageNumber(p => p + 1)} className="secondary-btn font-label-caps">Next</button>
                        </div>
                      )}
                    </div>
                  );
                } else if (ext === 'xlsx' || ext === 'xls') {
                  return excelData ? (
                    <div className="excel-table-wrapper" dangerouslySetInnerHTML={{ __html: excelData }} />
                  ) : <p>Parsing Excel securely...</p>;
                } else if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
                  return <img src={docUrl} alt="Secure Image" style={{ maxWidth: '100%', pointerEvents: 'none' }} />;
                } else if (ext === 'mp4' || ext === 'mov') {
                  return <video src={docUrl} controls controlsList="nodownload" onContextMenu={(e) => e.preventDefault()} style={{ maxWidth: '100%' }} />;
                } else {
                  return <p>Unsupported format for secure viewing. Requires native download.</p>;
                }
              })()}
            </div>
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
          align-items: flex-start;
          padding: 32px;
          overflow-y: auto;
          width: 100%;
        }
        .pdf-page {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: white;
          box-shadow: 0 4px 24px rgba(0,0,0,0.35);
          position: relative;
          padding: 24px;
          border-radius: 4px;
          min-width: 300px;
        }
        .media-page {
          background-color: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
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
        
        .security-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.95);
          color: white;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        
        .blur-content {
          filter: blur(10px);
          opacity: 0.2;
          pointer-events: none;
        }

        .secure-renderer {
          width: auto;
          display: flex;
          justify-content: center;
          z-index: 1;
        }
        
        .canvas-shadow canvas {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        
        .secondary-btn {
          background-color: var(--surface-container-high);
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          transition: background-color 0.2s;
        }
        .secondary-btn:hover {
          background-color: var(--surface-container-highest);
        }
        .secondary-btn:disabled { opacity: 0.5; }
        
        .excel-table-wrapper {
          width: 100%;
          height: 100%;
          overflow: auto;
          background: white;
          padding: 0;
        }
        .excel-table-wrapper table {
          border-collapse: collapse;
          width: 100%;
          font-family: var(--font-body);
          color: black;
          font-size: 14px;
        }
        .excel-table-wrapper td, .excel-table-wrapper th {
          border: 1px solid #d1d5db;
          padding: 4px 8px;
          text-align: left;
          min-width: 80px;
        }
        .excel-table-wrapper th {
          background-color: #f3f4f6;
          font-weight: bold;
          text-align: center;
          color: #4b5563;
        }
        .excel-table-wrapper tr:first-child th {
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .excel-table-wrapper th.row-num {
          position: sticky;
          left: 0;
          z-index: 5;
          width: 40px;
          min-width: 40px;
        }
        .excel-table-wrapper tr:nth-child(even) {
          background-color: #f9fafb;
        }
        
        @media print {
          body:not(.allow-print) { display: none !important; }
          body.allow-print, body.allow-print #root, body.allow-print .viewer-container { 
            height: auto !important; 
            overflow: visible !important; 
            display: block !important; 
            background: white !important;
          }
          body.allow-print .viewer-header, body.allow-print .watermark, body.allow-print .pdf-controls { 
            display: none !important; 
          }
          body.allow-print .viewer-canvas { 
            padding: 0 !important; 
            overflow: visible !important; 
            height: auto !important; 
            display: block !important; 
          }
          body.allow-print .pdf-page { 
            box-shadow: none !important; 
            display: block !important; 
            width: auto !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SecureViewer;
