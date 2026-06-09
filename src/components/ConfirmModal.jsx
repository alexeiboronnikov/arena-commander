import React, { useEffect } from 'react';

export default function ConfirmModal({ title, message, onConfirm, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onConfirm, onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <span className="modal-title">{title || 'Confirm'}</span>
          <button className="modal-close" onClick={onClose}>[Esc]</button>
        </div>
        <div className="modal-body" style={{ textAlign: 'center', padding: '30px' }}>
          <p>{message}</p>
          <div style={{ marginTop: '20px' }}>
            <button className="nc-button" onClick={onClose}>Cancel [Esc]</button>
            <button className="nc-button" onClick={onConfirm} style={{ marginLeft: '10px', backgroundColor: '#AA0000', color: '#FFF' }}>Delete [Enter]</button>
          </div>
        </div>
      </div>
    </div>
  );
}
