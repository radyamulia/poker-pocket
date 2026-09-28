import { useEffect, useState } from 'react';
import { marked } from 'marked';
import guideContent from '../lib/guideContent';

const guideHtml = marked.parse(guideContent);

export default function GuideModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button type="button" className="guide-btn" onClick={() => setOpen(true)} aria-label="Buka panduan bermain">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9.5" />
          <line x1="12" y1="10.5" x2="12" y2="16.5" />
          <circle cx="12" cy="7.5" r="0.5" fill="currentColor" stroke="none" />
        </svg>
        <span className="guide-btn-label">Panduan</span>
      </button>

      {open && (
        <div className="guide-modal-overlay" onClick={() => setOpen(false)}>
          <div className="guide-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Panduan bermain">
            <button type="button" className="guide-modal-close" onClick={() => setOpen(false)} aria-label="Tutup panduan">
              ✕
            </button>
            <div className="guide-modal-body markdown-body" dangerouslySetInnerHTML={{ __html: guideHtml }} />
          </div>
        </div>
      )}
    </>
  );
}
