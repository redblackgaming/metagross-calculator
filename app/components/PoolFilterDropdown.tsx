import { useState } from 'react';
import ConfirmDialog from './ConfirmDialog';

interface PoolFilterDropdownProps {
  value: 'champions' | 'all';
  hasFilledSlots: boolean;
  onChange: (v: 'champions' | 'all') => void;
}

export default function PoolFilterDropdown({ value, hasFilledSlots, onChange }: PoolFilterDropdownProps) {
  const [pendingValue, setPendingValue] = useState<'champions' | 'all' | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as 'champions' | 'all';
    if (hasFilledSlots) {
      setPendingValue(next);
    } else {
      onChange(next);
    }
  }

  function handleConfirm() {
    if (pendingValue) onChange(pendingValue);
    setPendingValue(null);
  }

  function handleCancel() {
    setPendingValue(null);
  }

  return (
    <>
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wide">
        Roster
        <select value={value} onChange={handleChange} className="border rounded px-2 py-1 font-normal normal-case tracking-normal text-base text-gray-800">
          <option value="champions">Pokémon Champions</option>
          <option value="all">All Pokémon</option>
        </select>
      </label>
      {pendingValue && (
        <ConfirmDialog
          message="Changing the pool will clear both teams. Continue?"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
