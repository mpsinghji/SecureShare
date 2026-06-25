import React, { useState, useRef } from 'react';
import { showToast } from '../utils/toast';

const SecureUpload = ({ authToken, setCurrentScreen }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      if (response.ok) {
        showToast('Document encrypted and uploaded successfully', 'success');
        // Redirect to documents view
        setCurrentScreen('documents');
      } else {
        const data = await response.json();
        const errorMsg = data.error || 'Upload failed';
        setError(errorMsg);
        showToast(errorMsg, 'error');
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Upload failed.');
      showToast('Network error. Upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <div className="header-section mb-8">
        <h2 className="font-headline-lg text-primary">Secure Upload</h2>
        <p className="font-body-lg text-on-surface-variant">Encrypt and upload a new document to the SecureShare network.</p>
      </div>

      <div className="card text-center py-12 border-dashed border-2 relative">
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept=".pdf,.docx,.xlsx"
        />
        
        <div className="upload-icon mx-auto mb-4" onClick={() => fileInputRef.current.click()} style={{ cursor: 'pointer' }}>
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '48px' }}>
            {file ? 'draft' : 'cloud_upload'}
          </span>
        </div>
        
        {file ? (
          <>
            <h3 className="font-headline-md text-primary mb-2">{file.name}</h3>
            <p className="font-body-md text-on-surface-variant mb-6">Ready for encryption</p>
            <div className="flex justify-center gap-4">
              <button 
                className="secondary-btn font-label-caps"
                onClick={() => setFile(null)}
                disabled={uploading}
              >
                Cancel
              </button>
              <button 
                className="primary-btn font-label-caps"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Encrypt & Upload'}
              </button>
            </div>
            {error && <p className="text-status-critical mt-4">{error}</p>}
          </>
        ) : (
          <>
            <h3 className="font-headline-md text-primary mb-2">Drag & Drop Files Here</h3>
            <p className="font-body-md text-on-surface-variant mb-6">Support for PDF, DOCX, XLSX (Max 50MB)</p>
            <button 
              className="primary-btn font-label-caps"
              onClick={() => fileInputRef.current.click()}
            >
              Browse Files
            </button>
          </>
        )}
      </div>

      <style>{`
        .upload-container {
          padding: var(--margin-desktop) 0;
          max-width: 800px;
          margin: 0 auto;
        }
        .border-dashed {
          border-style: dashed;
        }
        .upload-icon {
          width: 80px;
          height: 80px;
          background-color: var(--primary-container);
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        }
        .upload-icon:hover {
          transform: scale(1.05);
        }
        .mx-auto {
          margin-left: auto;
          margin-right: auto;
        }
        .primary-btn {
          background-color: var(--primary);
          color: white;
          padding: 8px 16px;
          border-radius: var(--radius-lg);
          transition: transform 0.1s;
        }
        .primary-btn:active:not(:disabled) {
          transform: scale(0.95);
        }
        .primary-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .secondary-btn {
          background-color: var(--surface-container-high);
          color: var(--on-surface);
          padding: 8px 16px;
          border-radius: var(--radius-lg);
        }
        .text-center {
          text-align: center;
        }
        .py-12 {
          padding-top: 48px;
          padding-bottom: 48px;
        }
        .text-status-critical {
          color: var(--status-critical);
        }
      `}</style>
    </div>
  );
};

export default SecureUpload;

