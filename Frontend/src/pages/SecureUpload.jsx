import React, { useState, useRef } from 'react';
import { showToast } from '../utils/toast';

const SecureUpload = ({ authToken, setCurrentScreen }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [expiry, setExpiry] = useState('never');
  const [customDate, setCustomDate] = useState('');
  const [allowPrint, setAllowPrint] = useState(false);
  const [deleteOnExpiry, setDeleteOnExpiry] = useState(false);
  const [shareMode, setShareMode] = useState('public'); // 'public' or 'users'
  const [sharedUsers, setSharedUsers] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      if (f.size > MAX_FILE_SIZE) {
        setError(`File exceeds 50MB limit (${formatFileSize(f.size)})`);
        return;
      }
      setFile(f);
      setError('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      if (f.size > MAX_FILE_SIZE) {
        setError(`File exceeds 50MB limit (${formatFileSize(f.size)})`);
        return;
      }
      setFile(f);
      setError('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    if (expiry !== 'never') {
      let expiresAt;
      if (expiry === 'custom' && customDate) {
        expiresAt = new Date(customDate);
      } else {
        expiresAt = new Date();
        if (expiry === '1h') expiresAt.setHours(expiresAt.getHours() + 1);
        else if (expiry === '24h') expiresAt.setHours(expiresAt.getHours() + 24);
        else if (expiry === '7d') expiresAt.setDate(expiresAt.getDate() + 7);
      }
      if (expiresAt) {
        formData.append('expires_at', expiresAt.toISOString());
      }
    }
    
    formData.append('allow_print', allowPrint);
    formData.append('delete_on_expiry', deleteOnExpiry);
    
    if (shareMode === 'users' && sharedUsers.trim()) {
      formData.append('shared_with_usernames', sharedUsers);
    }

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
        setUploadProgress(100);
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
      setUploadProgress(0);
    }
  };

  return (
    <div className="upload-container">
      <div className="header-section mb-8">
        <h2 className="font-headline-lg text-primary">Secure Upload</h2>
        <p className="font-body-lg text-on-surface-variant">Encrypt and upload a new document to the SecureShare network.</p>
      </div>

      <div 
        className={`card text-center py-12 border-dashed border-2 relative ${dragActive ? 'drag-active' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.mp4,.mov"
        />
        
        <div className="upload-icon mx-auto mb-4" onClick={() => fileInputRef.current.click()} style={{ cursor: 'pointer' }}>
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '48px' }}>
            {file ? 'draft' : 'cloud_upload'}
          </span>
        </div>
        
        {file ? (
          <>
            <h3 className="font-headline-md text-primary mb-1">{file.name}</h3>
            <p className="font-body-md text-on-surface-variant mb-4">{formatFileSize(file.size)} — Ready for encryption</p>
            
            {uploading && (
              <div className="upload-progress-bar mb-6">
                <div className="upload-progress-fill" style={{ width: '100%' }}></div>
              </div>
            )}
            
            <div className="settings-grid mb-8">
              <div className="setting-card">
                <label className="font-label-caps text-primary block mb-3 text-left">Share Mode</label>
                <select 
                  value={shareMode} 
                  onChange={(e) => setShareMode(e.target.value)}
                  className="bg-surface-container border border-outline-variant rounded-md p-2 text-on-surface w-full mb-3"
                >
                  <option value="public">Public Link</option>
                  <option value="users">Specific SecureShare Users</option>
                </select>
                {shareMode === 'users' && (
                  <input 
                    type="text"
                    placeholder="Enter usernames (comma separated)"
                    value={sharedUsers}
                    onChange={(e) => setSharedUsers(e.target.value)}
                    className="bg-surface-container border border-outline-variant rounded-md p-2 text-on-surface w-full"
                  />
                )}
              </div>

              <div className="setting-card">
                <label className="font-label-caps text-primary block mb-3 text-left">Auto-Delete Timer</label>
                <select 
                  value={expiry} 
                  onChange={(e) => setExpiry(e.target.value)}
                  className="bg-surface-container border border-outline-variant rounded-md p-2 text-on-surface w-full mb-3"
                >
                  <option value="never">Never (Keep Forever)</option>
                  <option value="1h">1 Hour</option>
                  <option value="24h">24 Hours</option>
                  <option value="7d">7 Days</option>
                  <option value="custom">Custom Range</option>
                </select>
                {expiry === 'custom' && (
                  <input 
                    type="datetime-local"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="date-picker-3d w-full mt-2 block"
                  />
                )}
              </div>
            </div>
            
            <div className="toggles-container mb-8">
              <div className="toggle-row">
                <div className="text-left">
                  <h4 className="font-label-caps text-on-surface mb-1">Allow Printing</h4>
                  <p className="font-body-sm text-on-surface-variant">Let viewers print or save as PDF securely.</p>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={allowPrint} onChange={(e) => setAllowPrint(e.target.checked)} />
                  <span className="slider"></span>
                </label>
              </div>
              
              <div className="toggle-row">
                <div className="text-left">
                  <h4 className="font-label-caps text-on-surface mb-1">Delete Permanently</h4>
                  <p className="font-body-sm text-on-surface-variant">Instead of just revoking access, erase file when expired.</p>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={deleteOnExpiry} onChange={(e) => setDeleteOnExpiry(e.target.checked)} disabled={expiry === 'never'} />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

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
            <p className="font-body-md text-on-surface-variant mb-2">Support for PDF, DOCX, XLSX, Images, Videos</p>
            <p className="font-body-sm text-on-surface-variant mb-6" style={{ opacity: 0.7 }}>Maximum file size: 50 MB</p>
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
        .drag-active {
          border-color: var(--primary) !important;
          background-color: var(--primary-container) !important;
          transform: scale(1.01);
          transition: all 0.2s ease;
        }
        .upload-progress-bar {
          width: 80%;
          max-width: 400px;
          height: 6px;
          background-color: var(--surface-container);
          border-radius: var(--radius-full);
          overflow: hidden;
          margin: 0 auto;
        }
        .upload-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--primary), var(--secondary));
          border-radius: var(--radius-full);
          animation: progress-indeterminate 1.5s ease-in-out infinite;
        }
        @keyframes progress-indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .settings-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          text-align: left;
        }
        .setting-card {
          background-color: var(--surface-container-lowest);
          border: 1px solid var(--outline-variant);
          border-radius: var(--radius-lg);
          padding: 20px;
        }
        .toggles-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          background-color: var(--surface-container-lowest);
          border: 1px solid var(--outline-variant);
          border-radius: var(--radius-lg);
          padding: 20px;
        }
        .toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        /* Modern Toggle Switch */
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 28px;
          flex-shrink: 0;
        }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: var(--surface-container-high);
          transition: .3s cubic-bezier(0.4, 0.0, 0.2, 1);
          border-radius: 34px;
          border: 1px solid var(--outline-variant);
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 3px;
          bottom: 3px;
          background-color: var(--on-surface-variant);
          transition: .3s cubic-bezier(0.4, 0.0, 0.2, 1);
          border-radius: 50%;
        }
        .toggle-switch input:checked + .slider {
          background-color: var(--primary);
          border-color: var(--primary);
        }
        .toggle-switch input:checked + .slider:before {
          transform: translateX(22px);
          background-color: var(--on-primary);
        }
        .toggle-switch input:disabled + .slider { opacity: 0.5; cursor: not-allowed; }
        
        /* 3D Date Picker */
        .date-picker-3d {
          background: linear-gradient(145deg, var(--surface-container-high), var(--surface-container-lowest));
          box-shadow: 4px 4px 10px rgba(0,0,0,0.3), -4px -4px 10px rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 8px;
          padding: 12px 16px;
          color: var(--on-surface);
          outline: none;
          transition: all 0.2s ease;
          font-family: var(--font-body);
        }
        .date-picker-3d:focus {
          box-shadow: inset 2px 2px 5px rgba(0,0,0,0.3), inset -2px -2px 5px rgba(255,255,255,0.02);
          border-color: var(--primary);
        }

        .w-48 { width: 192px; }
        .w-full { width: 100%; }
        .block { display: block; }
        .text-left { text-align: left; }
        .bg-surface-container { background-color: var(--surface-container); }
        .border { border-width: 1px; border-style: solid; }
        .border-outline-variant { border-color: var(--outline-variant); }
        .rounded-md { border-radius: var(--radius-md); }
        .p-2 { padding: 8px; }
        .mb-3 { margin-bottom: 12px; }
        .mt-2 { margin-top: 8px; }
      `}</style>
    </div>
  );
};

export default SecureUpload;

