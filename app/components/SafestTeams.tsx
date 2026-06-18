import { useState, useEffect, useRef } from 'react';
import { copyToClipboard } from '@/lib/clipboard';
import { useRouter } from 'next/router';
import { Pokemon, TypeIndex, Typing, typingKey, uncoveredTypes } from '@/lib/typings';
import { ALL_TYPES } from '@/lib/typeChart';
import PokemonSlot, { SlotState } from '@/components/PokemonSlot';
import PoolFilterDropdown from '@/components/PoolFilterDropdown';
import RandomizeButton from '@/components/RandomizeButton';

interface SafestTeamsProps {
  allPokemon: Pokemon[];
  champions: string[];
  championsTypeIndex: TypeIndex;
  bestTeams: number[][][];
}

function decodeTeam(raw: number[][]): Typing[] {
  return raw.map(indices =>
    indices.length === 1
      ? [ALL_TYPES[indices[0]]] as Typing
      : [ALL_TYPES[indices[0]], ALL_TYPES[indices[1]]] as Typing
  );
}

function pickPokemon(typings: Typing[], typeIndex: TypeIndex, pool: Pokemon[]): Pokemon[] {
  const nameToId = new Map(pool.map(p => [p.name, p.id]));
  return typings.map(typing => {
    const key = typingKey(typing);
    const names = (typeIndex[key] ?? []).filter(n => nameToId.has(n));
    if (names.length === 0) return { id: 0, name: typing.join('/'), typing };
    const name = names[Math.floor(Math.random() * names.length)];
    return { id: nameToId.get(name) ?? 0, name, typing };
  });
}

function buildSlots(bestTeams: number[][][], typeIndex: TypeIndex, pool: Pokemon[]): SlotState[] {
  const raw = bestTeams[Math.floor(Math.random() * bestTeams.length)];
  const typings = decodeTeam(raw);
  return pickPokemon(typings, typeIndex, pool).map(p => ({ filled: true as const, pokemon: p }));
}

function ShareModal({ slots, onClose }: { slots: SlotState[]; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  async function copyLink() {
    const ids = slots
      .filter((s): s is { filled: true; pokemon: Pokemon } => s.filled)
      .map(s => s.pokemon.id);
    const url = `${window.location.origin}/safest-teams?team=${ids.join(',')}`;
    await copyToClipboard(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <button
            onClick={copyLink}
            className="flex flex-col items-center gap-1 w-24 p-3 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-colors"
          >
            <span className="text-2xl">🔗</span>
            <span className="text-xs font-semibold text-gray-700 text-center leading-tight">
              {copied ? '✓ Copied!' : 'Copy Link'}
            </span>
            <span className="text-[10px] text-gray-400 text-center leading-tight">Share URL</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function getUncoveredTypes(slots: SlotState[], pool: Pokemon[]): string {
  const typings = slots
    .filter((s): s is { filled: true; pokemon: Pokemon } => s.filled)
    .map(s => s.pokemon.typing);
  const types = uncoveredTypes(typings, pool);
  if (types.length === 0) return 'none';
  return types.map(t =>
    '(' + t.map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(',') + ')'
  ).join(', ');
}

export default function SafestTeams({ allPokemon, champions, championsTypeIndex, bestTeams }: SafestTeamsProps) {
  const router = useRouter();
  const idToPokemon = new Map(allPokemon.map(p => [p.id, p]));
  const [hydrated, setHydrated] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [forcedOpenIndex, setForcedOpenIndex] = useState<number | null>(null);

  const pool = allPokemon.filter(p => champions.includes(p.name));

  const [slots, setSlots] = useState<SlotState[] | null>(null);

  useEffect(() => {
    if (!router.isReady || hydrated) return;
    setHydrated(true);

    const qTeam = router.query.team;
    if (typeof qTeam === 'string' && qTeam.length > 0) {
      const ids = qTeam.split(',').map(Number).filter(Boolean);
      const parsed: SlotState[] = ids.map(id => {
        const pokemon = idToPokemon.get(id);
        return pokemon ? { filled: true as const, pokemon } : { filled: false as const };
      });
      setSlots(parsed);
    } else {
      setSlots(buildSlots(bestTeams, championsTypeIndex, pool));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query]);

  function poolForSlot(slot: SlotState): Pokemon[] {
    if (!slot.filled) return [];
    const key = typingKey(slot.pokemon.typing);
    const names = new Set(championsTypeIndex[key] ?? []);
    return pool.filter(p => names.has(p.name));
  }

  function handleRandomize() {
    setSlots(buildSlots(bestTeams, championsTypeIndex, pool));
  }

  function handleSlotSelect(index: number, pokemon: Pokemon) {
    setSlots(prev => prev ? prev.map((s, i) => i === index ? { filled: true as const, pokemon } : s) : prev);
  }

  const fakeCandidateTeams: Typing[][] = [[], []];

  return (
    <main className="flex flex-col flex-1 items-center px-6 py-4 gap-6">
      <div className="flex justify-center">
        <PoolFilterDropdown
          value="champions"
          hasFilledSlots={false}
          onChange={() => {}}
          options={['champions']}
        />
      </div>

      {/* Team grid + buttons */}
      <div className="flex flex-col gap-4">
        {slots && (
          <p className="text-sm text-gray-700 w-[80vw] md:w-[25vw]">
            This team has a{' '}
            <span className="relative inline-block group">
              <span className="underline decoration-dotted cursor-help">S.T.A.B.</span>
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-none">
                Same Type Attack Bonus
              </span>
            </span>
            {' '}move for all but the following types:{' '}
            <span className="font-semibold">{getUncoveredTypes(slots, pool)}</span>
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-[80vw] md:w-[25vw]">
          {(slots ?? Array(4).fill({ filled: false })).map((slot, i) => {
            const slotPool = slot.filled ? poolForSlot(slot) : [];
            return (
              <PokemonSlot
                key={i}
                slot={slot}
                pool={slotPool}
                allPokemon={allPokemon}
                onSelect={p => handleSlotSelect(i, p)}
                variant="output"
                showChevron={slotPool.length > 1}
                forceOpen={forcedOpenIndex === i}
                onSelectorClose={() => setForcedOpenIndex(null)}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-3 w-[80vw] md:w-[25vw]">
          <RandomizeButton candidateTeams={fakeCandidateTeams} onRandomize={handleRandomize} />
          <button
            onClick={() => setShareOpen(true)}
            className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors"
          >
            Share
          </button>
        </div>
      </div>

      {shareOpen && slots && (
        <ShareModal slots={slots} onClose={() => setShareOpen(false)} />
      )}
    </main>
  );
}
