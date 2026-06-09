import React, { useEffect } from 'react';

export default function PreviewModal({ item, onClose, onNavigate }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (onNavigate) onNavigate(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (onNavigate) onNavigate(-1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNavigate]);

  if (!item) return null;

  const renderContent = () => {
    const type = item.class || item.type;
    const imageUrl = item.image?.large?.src || item.image?.display?.url || item.image?.src;
    
    if (type === 'Image') {
      return <img src={imageUrl} alt={item.title} className="preview-image" />;
    } else if (type === 'Text') {
      return (
        <div 
          className="preview-text" 
          dangerouslySetInnerHTML={{ __html: item.content_html }} 
        />
      );
    } else if (type === 'Link') {
      return (
        <div className="preview-link">
          <h2>{item.title}</h2>
          <a href={item.source?.url} target="_blank" rel="noopener noreferrer">{item.source?.url}</a>
          {item.image && <img src={imageUrl} alt={item.title} className="preview-image" />}
        </div>
      );
    } else if (type === 'Attachment') {
      return (
        <div className="preview-attachment">
          <h2>{item.title}</h2>
          <p>Attachment: {item.attachment?.extension}</p>
          {item.image && <img src={imageUrl} alt={item.title} className="preview-image" />}
        </div>
      );
    } else if (type === 'Embed') {
      return (
        <div className="preview-embed">
          <h2>{item.title}</h2>
          <div dangerouslySetInnerHTML={{ __html: item.embed?.html }} />
        </div>
      );
    } else if (type === 'Channel') {
      return (
        <div className="preview-channel">
          <h2>{item.title}</h2>
          <p>{item.length} blocks</p>
        </div>
      );
    }
    return <div className="preview-unknown">Cannot preview this item type.</div>;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{item.title || 'Preview'}</span>
          <button className="modal-close" onClick={onClose}>[Esc]</button>
        </div>
        <div className="modal-body">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
