import React, { useState, useEffect } from 'react';
import { showToast } from '../utils/toast';

const AVATAR_STYLES = [
  { id: 'boy', label: 'Boy', getUrl: (name) => `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(name)}` },
  { id: 'girl', label: 'Girl', getUrl: (name) => `https://avatar.iran.liara.run/public/girl?username=${encodeURIComponent(name)}` },
  { id: 'initials', label: 'Initials', getUrl: (name) => `https://avatar.iran.liara.run/username?username=${encodeURIComponent(name)}` },
  { id: 'anonymous', label: 'Anonymous', getUrl: () => `https://lh3.googleusercontent.com/aida-public/AB6AXuCXpxJ0VJCS_a6U_-8fC-u_eoVt0m8QWjTbqOqP-AkqYzYPyP1DkBMMxqONexP9fVqZ9inW8FjhMKjSypl0l1lB7opfDPnvG6T7xSrIrcF6MtapPdpIEnujtouhUaEdHyJ4ZzS-cWEgTZWhQxW0FbNlRaoSgWUbgipgtVvH4OHI1yrc7V2W52MZhl826u3fpryTcqE7o5SjwjPsGElmFzQzyU2ayJjk-qn6cJZNLvSvVOuNqkKUp52hMx5Rou5oNl1gGX0fbOkuoI0` }
];

const ProfileModal = ({ authToken, isOpen, onClose, onProfileUpdate }) => {
  const [profile, setProfile] = useState({ username: '', avatar_style: 'anonymous', email: '' });
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
          avatar_style: profile.avatar_style
        })
      });
      
      if (response.ok) {
        showToast('Profile updated', 'success');
        onProfileUpdate(); // tell parent to refresh
        onClose();
      } else {
        showToast('Failed to update profile', 'error');
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
          border: 4px solid var(--primary-container);
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
          background-color: var(--primary-container);
        }
        .avatar-option.selected .avatar-img-wrapper {
          border-color: var(--primary);
        }
        .avatar-option.selected span {
          color: var(--primary);
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
