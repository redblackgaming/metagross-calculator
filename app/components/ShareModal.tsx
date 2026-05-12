import { useEffect, useRef, useState } from 'react';
import { Pokemon } from '@/lib/typings';
import { copyToClipboard } from '@/lib/clipboard';

interface ShareModalProps {
  team: Pokemon[];
  onClose: () => void;
}

// Converts a pokemon name from API format (e.g. "mr-mime") to Showdown format ("Mr. Mime")
function toShowdownName(name: string): string {
  return name
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    // Fix known special cases
    .replace(/^Mr /, 'Mr. ')
    .replace(/^Mrs /, 'Mrs. ')
    .replace(/^Mime Jr$/, 'Mime Jr.')
    .replace(/^Type Null$/, 'Type: Null');
}

function buildShowdownText(team: Pokemon[]): string {
  return team
    .map(p => toShowdownName(p.name))
    .join('\n\n');
}

type CopyState = 'idle' | 'copied' | 'error';

export default function ShareModal({ team, onClose }: ShareModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [linkState, setLinkState] = useState<CopyState>('idle');
  const [showdownCopyState, setShowdownCopyState] = useState<CopyState>('idle');

  // Close on Escape or outside click
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  async function copyLink() {
    try {
      await copyToClipboard(window.location.href);
      setLinkState('copied');
      setTimeout(() => setLinkState('idle'), 2000);
    } catch {
      setLinkState('error');
    }
  }

  async function copyShowdown() {
    try {
      await copyToClipboard(buildShowdownText(team));
      setShowdownCopyState('copied');
      setTimeout(() => setShowdownCopyState('idle'), 2000);
    } catch {
      setShowdownCopyState('error');
    }
  }

  function downloadShowdown() {
    const text = buildShowdownText(team);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'team.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  const actions: Array<{
    icon: string;
    label: string;
    sublabel: string;
    state?: CopyState;
    onClick: () => void;
  }> = [
    {
      icon: '🔗',
      label: 'Copy Link',
      sublabel: 'Share this page URL',
      state: linkState,
      onClick: copyLink,
    },
    {
      icon: '📋',
      label: 'Copy Team',
      sublabel: 'Showdown import format',
      state: showdownCopyState,
      onClick: copyShowdown,
    },
    {
      icon: '⬇️',
      label: 'Download',
      sublabel: 'Save as team.txt',
      onClick: downloadShowdown,
    },
  ];

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 max-w-full mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Share Team</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex gap-3 justify-center">
          {actions.map(({ icon, label, sublabel, state, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="flex flex-col items-center gap-1 w-20 p-3 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-colors"
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-xs font-semibold text-gray-700 text-center leading-tight">
                {state === 'copied' ? '✓ Copied!' : label}
              </span>
              <span className="text-[10px] text-gray-400 text-center leading-tight">
                {sublabel}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
