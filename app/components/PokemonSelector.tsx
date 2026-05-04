import { useEffect, useRef, useState } from 'react';
import { Pokemon } from '@/lib/typings';

interface PokemonSelectorProps {
  pool: Pokemon[];
  onSelect: (p: Pokemon) => void;
  onClose: () => void;
}

export default function PokemonSelector({ pool, onSelect, onClose }: PokemonSelectorProps) {
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = pool.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  // Reset highlight when filter changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  // Scroll highlighted item into view
  useEffect(() => {
    const item = listRef.current?.children[highlightedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(i => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[highlightedIndex]) {
          onSelect(filtered[highlightedIndex]);
          onClose();
        }
      }
    }
    function handleOutsideClick(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, [onClose, onSelect, filtered, highlightedIndex]);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40">
      <div ref={containerRef} className="bg-white rounded-lg shadow-xl w-72 p-3">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search Pokémon..."
          className="w-full border rounded px-2 py-1 mb-2 text-base"
        />
        <ul ref={listRef} className="max-h-60 overflow-y-auto divide-y">
          {filtered.map((p, i) => (
            <li
              key={p.name}
              onClick={() => { onSelect(p); onClose(); }}
              className={`px-2 py-1.5 md:py-1.5 py-3 cursor-pointer text-sm capitalize ${
                i === highlightedIndex ? 'bg-purple-100 text-purple-900' : 'hover:bg-gray-50'
              }`}
            >
              {p.name}
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-2 py-1.5 text-sm text-gray-400">No results</li>
          )}
        </ul>
      </div>
    </div>
  );
}
