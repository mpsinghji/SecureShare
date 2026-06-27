import React, { useState, useEffect } from 'react';
import { showToast } from '../utils/toast';

const AVATAR_STYLES = [
  { id: 'adventurer', label: 'Adventurer', getUrl: (name) => `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name || 'User')}` },
  { id: 'bottts', label: 'Bottts', getUrl: (name) => `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || 'User')}` },
  { id: 'lorelei', label: 'Lorelei', getUrl: (name) => `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(name || 'User')}` },
  { id: 'notionists', label: 'Notion', getUrl: (name) => `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(name || 'User')}` },
  { id: 'thumbs', label: 'Thumbs', getUrl: (name) => `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name || 'User')}` },
  { id: 'fun-emoji', label: 'Emoji', getUrl: (name) => `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(name || 'User')}` },
  { id: 'initials', label: 'Initials', getUrl: (name) => `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'User')}` },
  { id: 'anonymous', label: 'Anonymous', getUrl: () => `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23222"><path d="M10,80 Q50,90 90,80 L85,70 L15,70 Z M25,70 L30,30 C30,10 70,10 70,30 L75,70 Z"/></svg>` }
];

const ProfileModal = ({ authToken, isOpen, onClose, onProfileUpdate }) => {
  const [profile, setProfile] = useState({ username: '', avatar_style: 'anonymous', email: '', newPassword: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/user/profile`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      if (response.ok) {
        setProfile({
          username: data.username || '',
          avatar_style: data.avatar_style || 'anonymous',
          email: data.email || ''
        });
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/user/profile`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: profile.username,
          avatar_style: profile.avatar_style,
          newPassword: profile.newPassword
        })
      });
      
      if (response.ok) {
        showToast('Profile updated', 'success');
        onProfileUpdate(); // tell parent to refresh
        onClose();
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to update profile', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentAvatarUrl = AVATAR_STYLES.find(s => s.id === profile.avatar_style)?.getUrl(profile.username || profile.email) || AVATAR_STYLES[3].getUrl();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="font-headline-md text-primary">Customize Profile</h2>
          <button className="icon-btn" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <span className="material-symbols-outlined spin text-primary" style={{fontSize: '32px'}}>autorenew</span>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="avatar-preview-section">
              <div className="large-avatar">
                <img src={currentAvatarUrl} alt="Preview" />
              </div>
              <p className="font-label-caps text-on-surface-variant mt-2">{profile.email}</p>
            </div>

            <div className="form-group mb-4">
              <label className="font-label-caps text-on-surface-variant mb-1 block">Display Name</label>
              <div className="input-group">
                <span className="material-symbols-outlined icon">badge</span>
                <input 
                  type="text" 
                  className="custom-input" 
                  placeholder="Enter your name" 
                  value={profile.username}
                  onChange={(e) => setProfile({...profile, username: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group mb-4">
              <label className="font-label-caps text-on-surface-variant mb-1 block">Change / Set Password</label>
              <div className="input-group">
                <span className="material-symbols-outlined icon">key</span>
                <input 
                  type="password" 
                  className="custom-input" 
                  placeholder="New password (leave blank to keep current)" 
                  value={profile.newPassword || ''}
                  onChange={(e) => setProfile({...profile, newPassword: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group mb-6">
              <label className="font-label-caps text-on-surface-variant mb-2 block">Avatar Style</label>
              <div className="avatar-grid">
                {AVATAR_STYLES.map(style => (
                  <div 
                    key={style.id} 
                    className={`avatar-option ${profile.avatar_style === style.id ? 'selected' : ''}`}
                    onClick={() => setProfile({...profile, avatar_style: style.id})}
                  >
                    <div className="avatar-img-wrapper">
                      <img src={style.getUrl(profile.username || profile.email)} alt={style.label} />
                    </div>
                    <span className="font-label-sm">{style.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" className="ghost-btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="action-btn" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          animation: fadeIn 0.2s ease-out;
        }
        .modal-content {
          background: var(--surface);
          border-radius: var(--radius-xl);
          width: 90%;
          max-width: 450px;
          padding: 24px;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);
          animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .avatar-preview-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 24px;
        }
        .large-avatar {
          width: 96px;
          height: 96px;
          border-radius: var(--radius-full);
          overflow: hidden;
          border: 4px solid var(--secondary-container);
          background: var(--surface-container);
        }
        .large-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .avatar-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        .avatar-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          padding: 8px;
          border-radius: var(--radius-lg);
          transition: background-color 0.2s, transform 0.1s;
        }
        .avatar-option:hover {
          background-color: var(--surface-container-high);
        }
        .avatar-option:active {
          transform: scale(0.95);
        }
        .avatar-option.selected {
          background-color: var(--secondary-container);
        }
        .avatar-option.selected .avatar-img-wrapper {
          border-color: var(--on-secondary-container);
        }
        .avatar-option.selected span {
          color: var(--on-secondary-container);
          font-weight: 600;
        }
        .avatar-img-wrapper {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-full);
          overflow: hidden;
          margin-bottom: 8px;
          border: 2px solid transparent;
          transition: border-color 0.2s;
        }
        .avatar-img-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .flex { display: flex; }
        .justify-end { justify-content: flex-end; }
        .justify-center { justify-content: center; }
        .gap-3 { gap: 12px; }
        .py-8 { padding-top: 32px; padding-bottom: 32px; }
        .mb-1 { margin-bottom: 4px; }
        .mb-2 { margin-bottom: 8px; }
        .mb-4 { margin-bottom: 16px; }
        .mb-6 { margin-bottom: 24px; }
        .mt-2 { margin-top: 8px; }
        .block { display: block; }
        
        .input-group {
          position: relative;
          width: 100%;
        }
        .input-group .icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--on-surface-variant);
        }
        .custom-input {
          background-color: var(--surface-container);
          border: 1px solid var(--border-subtle);
          padding: 12px 16px 12px 40px;
          width: 100%;
          border-radius: var(--radius-md);
          color: var(--on-surface);
          font-family: var(--font-inter);
          outline: none;
          transition: border-color 0.2s, background-color 0.2s;
        }
        .custom-input:focus {
          border-color: var(--primary);
          background-color: var(--surface-container-high);
        }
        
        .action-btn {
          background-color: var(--primary);
          color: var(--on-primary);
          border: none;
          border-radius: 9999px;
          padding: 12px 28px !important;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: transform 0.1s, opacity 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .action-btn:hover {
          opacity: 0.9;
        }
        .action-btn:active {
          transform: scale(0.95);
        }
        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .ghost-btn {
          background-color: transparent;
          color: var(--primary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-full);
          padding: 10px 24px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s, transform 0.1s;
        }
        .ghost-btn:hover {
          background-color: var(--surface-container);
        }
        .ghost-btn:active {
          transform: scale(0.95);
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ProfileModal;
