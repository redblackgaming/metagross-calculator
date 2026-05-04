import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Pokemon, getSpriteUrl, getSpriteId } from '@/lib/typings';
import PokemonSelector from './PokemonSelector';

export type SlotState = { filled: false } | { filled: true; pokemon: Pokemon };

interface PokemonSlotProps {
  slot: SlotState;
  pool: Pokemon[];
  allPokemon?: Pokemon[]; // needed for base-form sprite lookup
  onSelect: (p: Pokemon) => void;
  variant: 'input' | 'output';
  disabled?: boolean;
  forceOpen?: boolean;
  onSelectorClose?: () => void;
  showChevron?: boolean;
}

const FALLBACK_SUFFIXES = ['mf_n', 'uk_n', 'md_n', 'fd_n', 'fo_n', 'mo_n'];

export default function PokemonSlot({
  slot,
  pool,
  allPokemon = [],
  onSelect,
  variant,
  disabled = false,
  forceOpen = false,
  onSelectorClose,
  showChevron = false,
}: PokemonSlotProps) {
  const [localOpen, setLocalOpen] = useState(false);
  const [suffixIndex, setSuffixIndex] = useState(0);

  useEffect(() => {
    setSuffixIndex(0);
  }, [slot.filled ? slot.pokemon.id : null]);
  const selectorOpen = forceOpen || localOpen;

  const label = slot.filled
    ? slot.pokemon.name.charAt(0).toUpperCase() + slot.pokemon.name.slice(1)
    : '—';

  const bg = disabled
    ? 'bg-gray-400 cursor-not-allowed opacity-50'
    : variant === 'output'
      ? 'bg-indigo-500 hover:bg-indigo-400 cursor-pointer'
      : 'bg-purple-600 hover:bg-purple-500 cursor-pointer';

  const spriteUrl = slot.filled
    ? getSpriteUrl(getSpriteId(slot.pokemon, allPokemon), FALLBACK_SUFFIXES[suffixIndex])
    : 'https://www.pokemon.com/favicon.ico';

  function handleClick() {
    if (disabled) return;
    setLocalOpen(true);
  }

  function handleClose() {
    setLocalOpen(false);
    onSelectorClose?.();
  }

  function handleSpriteError() {
    if (suffixIndex < FALLBACK_SUFFIXES.length - 1) {
      setSuffixIndex(i => i + 1);
    }
  }

  return (
    <>
      <div
        onClick={handleClick}
        className={`relative flex items-center justify-between ${bg} rounded-2xl px-4 py-3 select-none transition-colors shadow-md min-h-[72px]`}
      >
        <span className={`text-white font-semibold text-sm truncate pr-2 ${!slot.filled ? 'opacity-50 italic' : ''}`}>
          {label}
          {showChevron && <span className="ml-1.5 opacity-60">▼</span>}
        </span>
        <div className="flex-shrink-0 w-10 h-10 relative">
          <Image
            key={spriteUrl}
            src={spriteUrl}
            alt={slot.filled ? slot.pokemon.name : 'empty'}
            fill
            className="object-contain"
            style={slot.filled ? { filter: 'drop-shadow(1px 0 0 black) drop-shadow(-1px 0 0 black) drop-shadow(0 1px 0 black) drop-shadow(0 -1px 0 black)' } : undefined}
            unoptimized
            onError={slot.filled ? handleSpriteError : undefined}
          />
        </div>
      </div>

      {selectorOpen && (
        <PokemonSelector
          pool={pool}
          onSelect={p => { onSelect(p); handleClose(); }}
          onClose={handleClose}
        />
      )}
    </>
  );
}
