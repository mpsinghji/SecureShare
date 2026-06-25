export const showToast = (message, type = 'success') => {
  // Check if toast container exists, if not create it
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    Object.assign(container.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: '9999',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    });
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const bgColor = type === 'success' ? 'var(--status-emerald)' : 'var(--status-critical)';
  const icon = type === 'success' ? 'check_circle' : 'error';

  Object.assign(toast.style, {
    backgroundColor: bgColor,
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontFamily: 'var(--font-inter)',
    fontSize: '14px',
    fontWeight: '500',
    opacity: '0',
    transform: 'translateX(100%)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  });

  toast.innerHTML = `
    <span class="material-symbols-outlined" style="font-size: 20px">${icon}</span>
    ${message}
  `;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  });

  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode === container) {
        container.removeChild(toast);
      }
    }, 300);
  }, 3000);
};
