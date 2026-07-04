import { useRef, useState } from 'react';
import { Pokemon, TypeIndex, Typing, typingKey } from '@/lib/typings';
import PokemonSlot, { SlotState } from './PokemonSlot';
import AdvantageCountLabel from './AdvantageCountLabel';
import RandomizeButton from './RandomizeButton';

interface OutputTeamProps {
  slots: SlotState[];
  allPokemon: Pokemon[];
  activePool: Pokemon[];
  typeIndex: TypeIndex;
  advantageCount: number | null;
  candidateTeams: Typing[][];
  inputComplete: boolean;
  onSlotSelect: (index: number, pokemon: Pokemon) => void;
  onRandomize: () => void;
  /** receives the array of refs (one per slot) after render */
  onRefsReady?: (refs: React.RefObject<HTMLDivElement>[]) => void;
  /** which output slot index is hovered (-1 = none) */
  hoveredIndex?: number;
  onHoverChange?: (index: number, hovered: boolean) => void;
  /** set of output slot indices that have lines (for highlight ring) */
  highlightedIndices?: Set<number>;
}

export default function OutputTeam({
  slots,
  allPokemon,
  activePool,
  typeIndex,
  advantageCount,
  candidateTeams,
  inputComplete,
  onSlotSelect,
  onRandomize,
  onRefsReady,
  hoveredIndex = -1,
  onHoverChange,
  highlightedIndices,
}: OutputTeamProps) {
  const [forcedOpenIndex, setForcedOpenIndex] = useState<number | null>(null);

  // stable ref array — one entry per slot
  const refsRef = useRef<React.RefObject<HTMLDivElement>[]>([]);
  if (refsRef.current.length !== slots.length) {
    refsRef.current = Array.from({ length: slots.length }, (_, i) =>
      refsRef.current[i] ?? { current: null }
    );
    onRefsReady?.(refsRef.current);
  }

  function poolForSlot(slot: SlotState): Pokemon[] {
    if (!slot.filled) return inputComplete ? activePool : [];
    const key = typingKey(slot.pokemon.typing);
    const names = typeIndex[key] ?? [];
    const nameSet = new Set(names);
    return activePool.filter(p => nameSet.has(p.name));
  }

  const hasEmptyOutputSlots = inputComplete && slots.some(s => !s.filled);

  return (
    <div className="flex flex-col gap-2">
      <p className="font-bold text-gray-800">Your Team</p>
      {slots.map((slot, i) => {
        const pool = poolForSlot(slot);
        const hasOptions = pool.length > 1;
        return (
          <PokemonSlot
            key={i}
            ref={refsRef.current[i]}
            slot={slot}
            pool={pool}
            allPokemon={allPokemon}
            onSelect={p => onSlotSelect(i, p)}
            variant="output"
            disabled={!inputComplete}
            forceOpen={forcedOpenIndex === i}
            onSelectorClose={() => setForcedOpenIndex(null)}
            showChevron={hasOptions && inputComplete}
            highlighted={highlightedIndices?.has(i) ?? false}
            onHoverChange={h => onHoverChange?.(i, h)}
          />
        );
      })}
      {hasEmptyOutputSlots && (
        <p className="text-xs text-gray-500 italic mt-1">
          The remaining slots can't add any more type advantages — pick any Pokémon you like.
        </p>
      )}
      <div className="flex items-center gap-3 mt-2">
        <RandomizeButton candidateTeams={candidateTeams} onRandomize={onRandomize} />
        <AdvantageCountLabel advantageCount={advantageCount} />
      </div>
    </div>
  );
}
