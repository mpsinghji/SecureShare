import React, { useState, useEffect } from 'react';
import ProfileModal from './ProfileModal';

const AVATAR_STYLES = [
  { id: 'boy', getUrl: (name) => `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(name)}` },
  { id: 'girl', getUrl: (name) => `https://avatar.iran.liara.run/public/girl?username=${encodeURIComponent(name)}` },
  { id: 'initials', getUrl: (name) => `https://avatar.iran.liara.run/username?username=${encodeURIComponent(name)}` },
  { id: 'anonymous', getUrl: () => `https://lh3.googleusercontent.com/aida-public/AB6AXuCXpxJ0VJCS_a6U_-8fC-u_eoVt0m8QWjTbqOqP-AkqYzYPyP1DkBMMxqONexP9fVqZ9inW8FjhMKjSypl0l1lB7opfDPnvG6T7xSrIrcF6MtapPdpIEnujtouhUaEdHyJ4ZzS-cWEgTZWhQxW0FbNlRaoSgWUbgipgtVvH4OHI1yrc7V2W52MZhl826u3fpryTcqE7o5SjwjPsGElmFzQzyU2ayJjk-qn6cJZNLvSvVOuNqkKUp52hMx5Rou5oNl1gGX0fbOkuoI0` }
];

const TopAppBar = ({ authToken, currentScreen, setCurrentScreen, onLogout }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(AVATAR_STYLES[3].getUrl());
  
  const loadProfile = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/user/profile`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        const style = AVATAR_STYLES.find(s => s.id === data.avatar_style) || AVATAR_STYLES[3];
        setAvatarUrl(style.getUrl(data.username || data.email));
      }
    } catch (err) {
      console.error("Failed to load header profile", err);
    }
  };

  useEffect(() => {
    if (authToken) loadProfile();
  }, [authToken]);

  return (
    <header className="top-app-bar">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary" style={{ fontSize: '28px' }}>shield</span>
        <h1 className="font-headline-md text-primary">SecureShare</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="desktop-nav">
          <button 
            className={`nav-link font-label-caps ${currentScreen === 'dashboard' ? 'active text-primary' : 'text-on-surface-variant'}`}
            onClick={() => setCurrentScreen('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`nav-link font-label-caps ${currentScreen === 'documents' ? 'active text-primary' : 'text-on-surface-variant'}`}
            onClick={() => setCurrentScreen('documents')}
          >
            Documents
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="avatar bg-primary-container" onClick={() => setIsModalOpen(true)} title="Edit Profile">
            <img src={avatarUrl} alt="User Profile" />
          </div>
          <button 
            className="icon-btn text-on-surface-variant hover-text-critical" 
            onClick={onLogout}
            title="Logout"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </div>
      <style>{`
        .top-app-bar {
          width: 100%;
          position: sticky;
          top: 0;
          background-color: var(--surface);
          border-bottom: 1px solid var(--outline-variant);
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--margin-desktop);
          height: 64px;
        }
        @media (max-width: 768px) {
          .top-app-bar {
            padding: 0 var(--margin-mobile);
          }
          .desktop-nav {
            display: none;
          }
        }
        .desktop-nav {
          display: flex;
          gap: 24px;
          margin-right: 24px;
        }
        .nav-link {
          transition: color 0.2s;
        }
        .nav-link:hover {
          color: var(--primary);
        }
        .avatar {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 1px solid var(--outline-variant);
          cursor: pointer;
          transition: border-color 0.2s, transform 0.2s;
        }
        .avatar:hover {
          border-color: var(--primary);
          transform: scale(1.05);
        }
        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .icon-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border-radius: var(--radius-full);
          transition: background-color 0.2s, color 0.2s;
        }
        .icon-btn:hover {
          background-color: var(--surface-container-high);
        }
        .hover-text-critical:hover {
          color: var(--status-critical) !important;
        }
      `}</style>
      <ProfileModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        authToken={authToken}
        onProfileUpdate={loadProfile}
      />
    </header>
  );
};

export default TopAppBar;
