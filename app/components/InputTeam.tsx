import { useEffect, useRef, useState } from 'react';
import { Pokemon } from '@/lib/typings';
import PokemonSlot, { SlotState } from './PokemonSlot';

interface InputTeamProps {
  slots: SlotState[];
  pool: Pokemon[];
  allPokemon: Pokemon[];
  onSlotSelect: (index: number, pokemon: Pokemon) => void;
  buildShareUrl: (slots: SlotState[]) => string;
}

// Converts API name (e.g. "mr-mime") to Showdown format ("Mr. Mime")
function toShowdownName(name: string): string {
  return name
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .replace(/^Mr /, 'Mr. ')
    .replace(/^Mrs /, 'Mrs. ')
    .replace(/^Mime Jr$/, 'Mime Jr.')
    .replace(/^Type Null$/, 'Type: Null');
}

function buildShowdownText(team: Pokemon[]): string {
  return team.map(p => toShowdownName(p.name)).join('\n\n');
}

type CopyState = 'idle' | 'copied';

function ShareModal({ team, shareUrl, onClose }: {
  team: Pokemon[];
  shareUrl: string;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [linkState, setLinkState] = useState<CopyState>('idle');
  const [showdownState, setShowdownState] = useState<CopyState>('idle');

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setLinkState('copied');
    setTimeout(() => setLinkState('idle'), 2000);
  }

  async function copyShowdown() {
    await navigator.clipboard.writeText(buildShowdownText(team));
    setShowdownState('copied');
    setTimeout(() => setShowdownState('idle'), 2000);
  }

  function downloadShowdown() {
    const blob = new Blob([buildShowdownText(team)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'team.txt'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 max-w-full mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Share Team</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="flex gap-3 justify-center">
          {[
            { icon: '🔗', label: linkState === 'copied' ? '✓ Copied!' : 'Copy Link', sub: 'Share URL', onClick: copyLink },
            { icon: '📋', label: showdownState === 'copied' ? '✓ Copied!' : 'Copy Team', sub: 'Showdown format', onClick: copyShowdown },
            { icon: '⬇️', label: 'Download', sub: 'Save team.txt', onClick: downloadShowdown },
          ].map(({ icon, label, sub, onClick }) => (
            <button
              key={sub}
              onClick={onClick}
              className="flex flex-col items-center gap-1 w-24 p-3 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-colors"
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{label}</span>
              <span className="text-[10px] text-gray-400 text-center leading-tight">{sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function InputTeam({ slots, pool, allPokemon, onSlotSelect, buildShareUrl }: InputTeamProps) {
  const [openSlot, setOpenSlot] = useState<number>(-1);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const allFilled = slots.every(s => s.filled);
  const filledTeam = slots
    .filter((s): s is { filled: true; pokemon: Pokemon } => s.filled)
    .map(s => s.pokemon);

  function handleSelect(index: number, pokemon: Pokemon) {
    onSlotSelect(index, pokemon);
    const updatedSlots = slots.map((s, i) =>
      i === index ? { filled: true as const, pokemon } : s
    );
    const nextEmpty =
      updatedSlots.findIndex((s, i) => i > index && !s.filled) !== -1
        ? updatedSlots.findIndex((s, i) => i > index && !s.filled)
        : updatedSlots.findIndex((s, i) => i !== index && !s.filled);
    setTimeout(() => setOpenSlot(nextEmpty !== -1 ? nextEmpty : -1), 50);
  }

  function handleShareClick() {
    setShareUrl(buildShareUrl(slots));
    setShareOpen(true);
  }

  const selectedNames = new Set(slots.flatMap(s => s.filled ? [s.pokemon.name] : []));

  return (
    <div className="flex flex-col gap-2">
      <p className="font-bold text-gray-800">Opponent Team</p>
      {slots.map((slot, i) => {
        const slotPool = pool.filter(p =>
          !selectedNames.has(p.name) || (slot.filled && slot.pokemon.name === p.name)
        );
        return (
          <PokemonSlot
            key={i}
            slot={slot}
            pool={slotPool}
            allPokemon={allPokemon}
            onSelect={p => handleSelect(i, p)}
            variant="input"
            forceOpen={openSlot === i}
            onSelectorClose={() => setOpenSlot(-1)}
          />
        );
      })}
      {allFilled && (
        <div className="mt-2">
          <button
            onClick={handleShareClick}
            className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors"
          >
            Share
          </button>
        </div>
      )}
      {shareOpen && (
        <ShareModal
          team={filledTeam}
          shareUrl={shareUrl}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}

export type { SlotState };
