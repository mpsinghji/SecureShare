import React, { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';
import { showToast } from '../utils/toast';

const Dashboard = ({ authToken }) => {
  const [stats, setStats] = useState({
    activeLinks: 0,
    totalViews: 0,
    totalPrints: 0,
    unauthorizedPrints: 0
  });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminUsers, setAdminUsers] = useState([]);

  // Decode JWT to get user info
  const decodeToken = (token) => {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) { return null; }
  };
  const user = decodeToken(authToken);
  const isAdmin = user?.email === 'admin@secureshare.com';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${authToken}` };
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const [statsRes, activitiesRes] = await Promise.all([
          fetch(`${API_URL}/api/dashboard/stats`, { headers }),
          fetch(`${API_URL}/api/dashboard/activities`, { headers })
        ]);
        
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
        if (activitiesRes.ok) {
          const activitiesData = await activitiesRes.json();
          setActivities(activitiesData);
        }

        if (isAdmin) {
          const usersRes = await fetch(`${API_URL}/api/admin/users`, { headers });
          if (usersRes.ok) setAdminUsers(await usersRes.json());
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authToken, isAdmin]);

  const handleEmergencyRevoke = async () => {
    if (!confirm('⚠️ EMERGENCY REVOKE: This will immediately revoke ALL your active documents. This cannot be undone. Continue?')) return;
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/documents/emergency-revoke`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        showToast(data.message, 'success');
        // Refresh stats
        const statsRes = await fetch(`${API_URL}/api/dashboard/stats`, { headers: { 'Authorization': `Bearer ${authToken}` } });
        if (statsRes.ok) setStats(await statsRes.json());
      } else {
        showToast('Emergency revoke failed', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    }
  };

  const handleExportAuditLog = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/audit/export`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = 'secureshare-audit-log.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        showToast('Audit log exported successfully', 'success');
      } else {
        showToast('Failed to export audit log', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    }
  };

  // Format timestamp helper
  const formatTimeAgo = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  return (
    <div className="dashboard-container">
      {/* Welcome Header */}
      <div className="header-section">
        <h2 className="font-headline-lg text-primary">Guardian Dashboard</h2>
        <p className="font-body-lg text-on-surface-variant">Monitoring encrypted assets across global nodes.</p>
      </div>

      {/* Bento Grid Stats Section */}
      <div className="stats-grid">
        {/* Stat Card: Active Links */}
        <div className="card stat-card group">
          <div className="flex justify-between items-center mb-4">
            <div className="icon-wrapper bg-primary-container">
              <span className="material-symbols-outlined text-primary">link</span>
            </div>
            <StatusBadge status="active" text="Active" />
          </div>
          <div className="font-headline-md text-primary mb-1">Active Links</div>
          <div className="stat-number text-primary">{loading ? '-' : stats.activeLinks}</div>
          <div className="progress-bar-container mt-4">
            <div className="progress-bar-fill bg-primary"></div>
          </div>
        </div>

        {/* Stat Card: Total Views */}
        <div className="card stat-card group">
          <div className="flex justify-between items-center mb-4">
            <div className="icon-wrapper" style={{ backgroundColor: 'var(--secondary-container)' }}>
              <span className="material-symbols-outlined text-secondary">visibility</span>
            </div>
            <span className="font-label-caps text-on-surface-variant">Total</span>
          </div>
          <div className="font-headline-md text-primary mb-1">Total Views</div>
          <div className="stat-number text-primary">{loading ? '-' : stats.totalViews.toLocaleString()}</div>
          <div className="chart-bars mt-4">
            <div className="chart-bar h-8"></div>
            <div className="chart-bar h-10"></div>
            <div className="chart-bar h-6"></div>
            <div className="chart-bar h-12 active-bar"></div>
            <div className="chart-bar h-9"></div>
          </div>
        </div>

        {/* Stat Card: Total Prints */}
        <div className="card stat-card group">
          <div className="flex justify-between items-center mb-4">
            <div className="icon-wrapper" style={{ backgroundColor: 'var(--error-container)' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--on-error-container)' }}>print</span>
            </div>
            {stats.unauthorizedPrints > 0 ? (
              <StatusBadge status="critical" text="Action Required" />
            ) : (
              <StatusBadge status="active" text="Secure" />
            )}
          </div>
          <div className="font-headline-md text-primary mb-1">Total Prints</div>
          <div className="stat-number text-primary">{loading ? '-' : stats.totalPrints.toLocaleString()}</div>
          <div className="mt-4 font-body-md text-on-surface-variant">
            {stats.unauthorizedPrints > 0 
              ? `${stats.unauthorizedPrints} prints detected from unauthorized IP ranges.`
              : 'No unauthorized prints detected.'}
          </div>
        </div>
      </div>

      <div className="content-grid">
        {/* Recent Activity Feed */}
        <div className="activity-feed">
          <div className="card p-0">
            <div className="card-header flex justify-between items-center">
              <h3 className="font-headline-sm text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-on-surface-variant">history</span>
                Recent Activity
              </h3>
              <button className="text-primary font-label-caps hover-underline" onClick={handleExportAuditLog}>Export Audit Log</button>
            </div>
            <div className="activity-list">
              {loading && (
                <div className="p-6">
                  <div className="skeleton h-6 w-3/4 mb-4"></div>
                  <div className="skeleton h-4 w-1/2"></div>
                </div>
              )}
              {!loading && activities.length === 0 && <div className="p-6 text-on-surface-variant">No recent activity.</div>}
              
              {!loading && activities.slice(0, 5).map(activity => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon-wrapper" style={{ backgroundColor: activity.action_type === 'print' && activity.status === 'unauthorized' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0,0,0,0.05)' }}>
                    <span className={`material-symbols-outlined ${activity.action_type === 'print' && activity.status === 'unauthorized' ? 'text-status-critical' : 'text-primary'}`}>
                      {activity.action_type === 'view' ? 'visibility' : activity.action_type === 'print' ? 'print' : 'description'}
                    </span>
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-start">
                      <p className="font-body-lg text-primary font-semibold">{activity.document_name}</p>
                      <span className="font-code-sm text-on-surface-variant">{formatTimeAgo(activity.timestamp)}</span>
                    </div>
                    <p className="font-body-md text-on-surface-variant">
                      {activity.action_type === 'view' ? 'Viewed by ' : activity.action_type === 'print' ? 'Printed by ' : 'Accessed by '}
                      <span className="text-primary font-medium">{activity.user_email}</span> from {activity.location}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`status-dot ${activity.status === 'verified' ? 'bg-status-emerald' : 'bg-status-critical'}`}></span>
                      <span className={`font-code-sm ${activity.status === 'verified' ? 'text-on-surface-variant' : 'text-status-critical'}`}>
                        {activity.status === 'verified' ? `IP: ${activity.ip_address} (Verified)` : 'Unauthorized Attempt'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side Panels */}
        <div className="side-panels">
          {/* Active Document Summary */}
          <div className="card">
            <h3 className="font-headline-sm text-primary mb-4">Security Health</h3>
            <div className="health-list flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="font-body-md text-on-surface-variant">End-to-End Encryption</span>
                <span className="text-status-emerald font-semibold">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-body-md text-on-surface-variant">Data Residency</span>
                <span className="text-primary font-semibold">EU-West-1</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-body-md text-on-surface-variant">Admin Sessions</span>
                <span className="text-primary font-semibold">1 Active</span>
              </div>
              <button className="emergency-btn font-label-caps mt-2" onClick={handleEmergencyRevoke}>Emergency Revoke All</button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-container {
          padding: var(--margin-desktop) 0;
          max-width: var(--max-content-width);
          margin: 0 auto;
        }
        .header-section {
          margin-bottom: 32px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 24px;
          margin-bottom: 40px;
        }
        @media (min-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .stat-card {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        }
        .icon-wrapper {
          padding: 8px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-number {
          font-size: 36px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .progress-bar-container {
          width: 100%;
          background-color: var(--surface-container);
          height: 4px;
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%;
          width: 75%;
        }
        .chart-bars {
          display: flex;
          gap: 4px;
          align-items: flex-end;
          height: 48px;
        }
        .chart-bar {
          width: 100%;
          background-color: var(--surface-container-high);
          border-radius: var(--radius-sm);
        }
        .chart-bar.h-8 { height: 32px; }
        .chart-bar.h-10 { height: 40px; }
        .chart-bar.h-6 { height: 24px; }
        .chart-bar.h-12 { height: 48px; }
        .chart-bar.h-9 { height: 36px; }
        .chart-bar.active-bar {
          background-color: var(--primary);
        }
        
        .content-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
        }
        @media (min-width: 1024px) {
          .content-grid {
            grid-template-columns: 2fr 1fr;
          }
        }
        
        .card.p-0 {
          padding: 0;
          overflow: hidden;
        }
        .card-header {
          padding: 16px 24px;
          background-color: var(--surface-container-low);
          border-bottom: 1px solid var(--border-subtle);
        }
        .hover-underline:hover {
          text-decoration: underline;
        }
        
        .activity-list {
          display: flex;
          flex-direction: column;
        }
        .activity-item {
          padding: 24px;
          display: flex;
          gap: 16px;
          border-bottom: 1px solid var(--border-subtle);
          transition: background-color 0.2s;
        }
        .activity-item:last-child {
          border-bottom: none;
        }
        .activity-item:hover {
          background-color: var(--surface-container-low);
        }
        .activity-icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .flex-grow {
          flex-grow: 1;
        }
        .font-semibold {
          font-weight: 600;
        }
        .font-medium {
          font-weight: 500;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: var(--radius-full);
        }
        .bg-status-emerald {
          background-color: var(--status-emerald);
        }
        .bg-status-critical {
          background-color: var(--status-critical);
        }
        
        .emergency-btn {
          width: 100%;
          padding: 8px 16px;
          background-color: var(--primary);
          color: white;
          border-radius: var(--radius-lg);
          transition: transform 0.1s;
        }
        .p-6 { padding: 24px; }
        
        .skeleton {
          background: linear-gradient(90deg, var(--surface-container) 25%, var(--surface-container-high) 50%, var(--surface-container) 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s infinite;
          border-radius: var(--radius-sm);
        }
        .h-6 { height: 24px; }
        .h-4 { height: 16px; }
        .w-3\\/4 { width: 75%; }
        .w-1\\/2 { width: 50%; }
        .mb-4 { margin-bottom: 16px; }
        
        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;

