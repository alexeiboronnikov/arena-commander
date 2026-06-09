import React, { useEffect, useState } from 'react';
import './SourceSelector.css';

export default function SourceSelector({ activePanelId, onSelect, onClose, currentLocationPath }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const options = [
    { id: 'personal', name: 'My Arena', key: 'M' },
    { id: 'following', name: "I'm Following", key: 'F' },
    { id: 'followers', name: 'My Followers', key: 'R' },
    ...(currentLocationPath
      ? [{ id: 'current-location', name: 'Current location', key: 'C' }]
      : [])
  ];

  useEffect(() => {
    const handleKeyDown = (e) => {
      const handledKeys = [
        'Escape',
        'ArrowUp',
        'ArrowDown',
        'Enter',
        'm',
        'M',
        'f',
        'F',
        'r',
        'R',
        'c',
        'C'
      ];

      if (!handledKeys.includes(e.key)) return;

      // Important:
      // Stop the arrow/enter/key events from reaching the panels underneath.
      // Also prevent the browser from scrolling the underlying panel/page.
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowUp') {
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : options.length - 1));
      } else if (e.key === 'ArrowDown') {
        setSelectedIndex(prev => (prev < options.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'Enter') {
        onSelect(options[selectedIndex].id);
      } else {
        const key = e.key.toUpperCase();
        const optIndex = options.findIndex(opt => opt.key === key);

        if (optIndex !== -1) {
          onSelect(options[optIndex].id);
        }
      }
    };

    // Use capture phase so SourceSelector receives the event before Panel.jsx.
    window.addEventListener('keydown', handleKeyDown, true);

    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [selectedIndex, onSelect, onClose]);

  return (
    <div className="source-selector-overlay" onClick={onClose}>
      <div className="source-selector" onClick={e => e.stopPropagation()}>
        <div className="source-selector-header">
          Source {activePanelId === 'left' ? '1' : '2'}
        </div>
        <div className="source-selector-list">
          {options.map((opt, idx) => (
            <div 
              key={opt.id} 
              className={`source-selector-item ${idx === selectedIndex ? 'selected' : ''}`}
              onClick={() => onSelect(opt.id)}
            >
              <span className="source-selector-key">{opt.key}</span>
              <span className="source-selector-name">{opt.name}</span>
            </div>
          ))}
        </div>
        <div className="source-selector-footer">
          [↑↓] Select [ENTER] OK [ESC] Cancel
        </div>
      </div>
    </div>
  );
}
