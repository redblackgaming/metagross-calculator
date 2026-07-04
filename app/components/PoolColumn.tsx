import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Pokemon, getSpriteUrl, getSpriteId } from '@/lib/typings';

interface Props {
  pool: Pokemon[];
  allPokemon: Pokemon[];
  /** called by parent to receive the ref map after mount */
  onRefsReady: (refs: Map<string, React.RefObject<HTMLElement | null>>) => void;
  /** names of pool pokemon that have at least one line coming in */
  highlightedNames: Set<string>;
}

export default function PoolColumn({ pool, allPokemon, onRefsReady, highlightedNames }: Props) {
  // stable ref map: pokemon.name → ref to its row element
  const refsMap = useRef<Map<string, React.RefObject<HTMLElement | null>>>(new Map());

  // rebuild ref map when pool changes
  useEffect(() => {
    const next = new Map<string, React.RefObject<HTMLElement | null>>();
    for (const p of pool) {
      // reuse existing ref if already there to keep identity stable
      next.set(p.name, refsMap.current.get(p.name) ?? { current: null });
    }
    refsMap.current = next;
    onRefsReady(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool]);

  return (
    <div className="flex flex-col gap-1 overflow-y-auto max-h-[60vh] pr-1">
      {pool.map(p => {
        const ref = refsMap.current.get(p.name) ?? { current: null };
        const highlighted = highlightedNames.has(p.name);
        const label = p.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const spriteId = getSpriteId(p, allPokemon);
        const spriteUrl = getSpriteUrl(spriteId);

        return (
          <div
            key={p.name}
            ref={el => { (ref as React.MutableRefObject<HTMLElement | null>).current = el; }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors text-sm font-medium select-none
              ${highlighted
                ? 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-300'
                : 'bg-gray-100 text-gray-500'
              }`}
          >
            <div className="relative w-8 h-8 flex-shrink-0">
              <Image
                src={spriteUrl}
                alt={p.name}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <span className="truncate">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
