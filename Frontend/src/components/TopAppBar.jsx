import React, { useState, useEffect } from 'react';
import ProfileModal from './ProfileModal';

const AVATAR_STYLES = [
  { id: 'adventurer', getUrl: (name) => `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name || 'User')}` },
  { id: 'bottts', getUrl: (name) => `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || 'User')}` },
  { id: 'lorelei', getUrl: (name) => `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(name || 'User')}` },
  { id: 'notionists', getUrl: (name) => `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(name || 'User')}` },
  { id: 'thumbs', getUrl: (name) => `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name || 'User')}` },
  { id: 'fun-emoji', getUrl: (name) => `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(name || 'User')}` },
  { id: 'initials', getUrl: (name) => `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'User')}` },
  { id: 'anonymous', getUrl: () => `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23222"><path d="M10,80 Q50,90 90,80 L85,70 L15,70 Z M25,70 L30,30 C30,10 70,10 70,30 L75,70 Z"/></svg>` }
];

const TopAppBar = ({ authToken, currentScreen, setCurrentScreen, onLogout }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(AVATAR_STYLES[3].getUrl());
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);

  // Decode JWT to get user info
  const decodeToken = (token) => {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) { return null; }
  };
  const user = decodeToken(authToken);
  const isAdmin = user?.email === 'admin@secureshare.com';
  
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

  useEffect(() => {
    if (isAdminModalOpen && isAdmin) {
      const fetchUsers = async () => {
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
          const res = await fetch(`${API_URL}/api/admin/users`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          if (res.ok) setAdminUsers(await res.json());
        } catch (e) {}
      };
      fetchUsers();
    }
  }, [isAdminModalOpen, isAdmin, authToken]);

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
          {isAdmin && (
            <button 
              className="admin-panel-btn"
              onClick={() => setIsAdminModalOpen(true)}
            >
              <span className="material-symbols-outlined" style={{fontSize: '18px'}}>manage_accounts</span>
              Admin Panel
            </button>
          )}
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
        
        .admin-panel-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: var(--primary);
          color: var(--on-primary);
          border: none;
          padding: 8px 16px;
          border-radius: var(--radius-full);
          font-family: var(--font-body);
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: background-color 0.2s, transform 0.1s;
        }
        .admin-panel-btn:hover {
          background-color: var(--inverse-surface);
        }
        .admin-panel-btn:active {
          transform: scale(0.97);
        }

        .admin-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .admin-modal-content {
          background-color: var(--surface);
          padding: 24px;
          border-radius: var(--radius-lg);
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
          width: 100%;
          max-width: 600px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
        }
        .admin-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .admin-modal-body {
          overflow-y: auto;
          padding-right: 8px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .admin-user-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background-color: var(--surface-container-lowest);
          border: 1px solid var(--outline-variant);
          border-radius: var(--radius-md);
        }
        .admin-action-btn {
          font-family: var(--font-body);
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 8px 16px;
          border-radius: var(--radius-full);
          border: none;
          color: white;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .admin-action-btn:hover {
          opacity: 0.9;
        }
        .admin-action-btn.unblock { background-color: var(--status-emerald); }
        .admin-action-btn.block { background-color: var(--status-critical); }
      `}</style>
      <ProfileModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        authToken={authToken}
        onProfileUpdate={loadProfile}
      />

      {/* Admin Panel Modal */}
      {isAdminModalOpen && isAdmin && (
        <div className="admin-modal-overlay" onClick={() => setIsAdminModalOpen(false)}>
          <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="font-headline-sm text-primary">Super Admin: User Management</h3>
              <button className="icon-btn" onClick={() => setIsAdminModalOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="admin-modal-body">
              {adminUsers.map(u => (
                <div key={u.id} className="admin-user-row">
                  <div>
                    <div className="font-body-lg text-primary font-semibold">{u.email}</div>
                    <div className="font-code-sm text-on-surface-variant">@{u.username} • {u.is_verified ? 'Verified' : 'Unverified'}</div>
                  </div>
                  <button 
                    onClick={async () => {
                      try {
                        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                        const res = await fetch(`${API_URL}/api/admin/users/${u.id}/block`, {
                          method: 'PUT',
                          headers: { 'Authorization': `Bearer ${authToken}` }
                        });
                        if (res.ok) {
                          const data = await res.json();
                          setAdminUsers(adminUsers.map(user => user.id === u.id ? { ...user, is_blocked: data.is_blocked } : user));
                        }
                      } catch(e) { console.error(e); }
                    }}
                    className={`admin-action-btn ${u.is_blocked ? 'unblock' : 'block'}`}
                  >
                    {u.is_blocked ? 'Unblock User' : 'Block User'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default TopAppBar;
