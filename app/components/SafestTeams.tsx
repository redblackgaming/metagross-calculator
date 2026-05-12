import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Pokemon, TypeIndex, Typing, typingKey } from '@/lib/typings';
import { ALL_TYPES } from '@/lib/typeChart';
import PokemonSlot, { SlotState } from '@/components/PokemonSlot';
import PoolFilterDropdown from '@/components/PoolFilterDropdown';
import RandomizeButton from '@/components/RandomizeButton';

type PoolFilter = 'champions' | 'all';

interface SafestTeamsProps {
  allPokemon: Pokemon[];
  champions: string[];
  allTypeIndex: TypeIndex;
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

// Reuse the same share modal style as InputTeam
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
    await navigator.clipboard.writeText(url);
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

export default function SafestTeams({ allPokemon, champions, allTypeIndex, championsTypeIndex, bestTeams }: SafestTeamsProps) {
  const router = useRouter();
  const idToPokemon = new Map(allPokemon.map(p => [p.id, p]));
  const [hydrated, setHydrated] = useState(false);
  const [poolFilter, setPoolFilter] = useState<PoolFilter>('champions');
  const [shareOpen, setShareOpen] = useState(false);
  const [forcedOpenIndex, setForcedOpenIndex] = useState<number | null>(null);

  const activeTypeIndex = poolFilter === 'champions' ? championsTypeIndex : allTypeIndex;
  const activePool = poolFilter === 'champions'
    ? allPokemon.filter(p => champions.includes(p.name))
    : allPokemon;

  const [slots, setSlots] = useState<SlotState[] | null>(null);

  // Hydrate from URL query params on client, fall back to random team
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
      setSlots(buildSlots(bestTeams, activeTypeIndex, activePool));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query]);

  // Pool for a slot: all pokemon in the active pool with the same typing
  function poolForSlot(slot: SlotState): Pokemon[] {
    if (!slot.filled) return [];
    const key = typingKey(slot.pokemon.typing);
    const names = new Set(activeTypeIndex[key] ?? []);
    return activePool.filter(p => names.has(p.name));
  }

  const handlePoolFilterChange = useCallback((newFilter: PoolFilter) => {
    setPoolFilter(newFilter);
    const newTypeIndex = newFilter === 'champions' ? championsTypeIndex : allTypeIndex;
    const newPool = newFilter === 'champions'
      ? allPokemon.filter(p => champions.includes(p.name))
      : allPokemon;
    setSlots(buildSlots(bestTeams, newTypeIndex, newPool));
  }, [bestTeams, allPokemon, champions, allTypeIndex, championsTypeIndex]);

  const handleRandomize = useCallback(() => {
    setSlots(buildSlots(bestTeams, activeTypeIndex, activePool));
  }, [bestTeams, activeTypeIndex, activePool]);

  function handleSlotSelect(index: number, pokemon: Pokemon) {
    setSlots(prev => prev ? prev.map((s, i) => i === index ? { filled: true as const, pokemon } : s) : prev);
  }

  // RandomizeButton enables when candidateTeams.length > 1
  const fakeCandidateTeams: Typing[][] = [[], []];

  return (
    <main className="flex flex-col flex-1 items-center px-6 py-4 gap-6">
      {/* Pool filter — top of page like the calculator */}
      <div className="flex justify-center">
        <PoolFilterDropdown
          value={poolFilter}
          hasFilledSlots={false}
          onChange={handlePoolFilterChange}
        />
      </div>

      {/* Team row + buttons centered in remaining space */}
      <div className="flex flex-col flex-1 items-center justify-center gap-6">
        {/* Team row — each slot is 1/8 screen width */}
        <div className="flex flex-row gap-3 justify-center">
          {(slots ?? Array(4).fill({ filled: false })).map((slot, i) => {
            const pool = slot.filled ? poolForSlot(slot) : [];
            return (
              <div key={i} style={{ width: '12.5vw' }}>
                <PokemonSlot
                  slot={slot}
                  pool={pool}
                  allPokemon={allPokemon}
                  onSelect={p => handleSlotSelect(i, p)}
                  variant="output"
                  showChevron={pool.length > 1}
                  forceOpen={forcedOpenIndex === i}
                  onSelectorClose={() => setForcedOpenIndex(null)}
                />
              </div>
            );
          })}
        </div>

        {/* Buttons — same style as calculator */}
        <div className="flex items-center gap-3">
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
