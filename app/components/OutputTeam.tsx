import { useState } from 'react';
import { Pokemon, TypeIndex, Typing, typingKey } from '@/lib/typings';
import PokemonSlot, { SlotState } from './PokemonSlot';
import AdvantageCountLabel from './AdvantageCountLabel';
import RandomizeButton from './RandomizeButton';

interface OutputTeamProps {
  slots: SlotState[];
  allPokemon: Pokemon[];   // full DB — for base-form sprite lookup
  activePool: Pokemon[];   // filtered pool — for slot pool logic
  typeIndex: TypeIndex;
  advantageCount: number | null;
  candidateTeams: Typing[][];
  inputComplete: boolean;
  onSlotSelect: (index: number, pokemon: Pokemon) => void;
  onRandomize: () => void;
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
}: OutputTeamProps) {
  const [forcedOpenIndex, setForcedOpenIndex] = useState<number | null>(null);

  const filledTeam = slots
    .filter((s): s is { filled: true; pokemon: Pokemon } => s.filled)
    .map(s => s.pokemon);

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
            slot={slot}
            pool={pool}
            allPokemon={allPokemon}
            onSelect={p => onSlotSelect(i, p)}
            variant="output"
            disabled={!inputComplete}
            forceOpen={forcedOpenIndex === i}
            onSelectorClose={() => setForcedOpenIndex(null)}
            showChevron={hasOptions && inputComplete}
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
