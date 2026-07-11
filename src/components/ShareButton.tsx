import { useEffect, useRef, useState } from 'react';

/**
 * Shares the current page URL (which encodes the active search as `?q=`).
 * Uses the native share sheet where available, otherwise copies the link.
 */
export function ShareButton() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  async function share() {
    const url = window.location.href;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: document.title, url });
        return;
      } catch {
        // User dismissed the sheet, or sharing failed — fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. no permission): select-and-copy via prompt is
      // more annoying than helpful, so quietly do nothing.
    }
  }

  return (
    <button
      type="button"
      className="share-btn"
      onClick={() => void share()}
      aria-label="Share a link to this forecast"
    >
      {copied ? 'Link copied ✓' : 'Share'}
    </button>
  );
}
