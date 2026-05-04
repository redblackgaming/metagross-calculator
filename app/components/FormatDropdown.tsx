import { useState } from 'react';
import ConfirmDialog from './ConfirmDialog';

export type Format = 'singles-3' | 'doubles-4' | 'singles-6' | 'doubles-6';

export const FORMAT_TEAM_SIZE: Record<Format, number> = {
  'singles-3': 3,
  'doubles-4': 4,
  'singles-6': 6,
  'doubles-6': 6,
};

interface FormatDropdownProps {
  value: Format;
  hasFilledSlots: boolean;
  onChange: (v: Format) => void;
}

export default function FormatDropdown({ value, hasFilledSlots, onChange }: FormatDropdownProps) {
  const [pendingValue, setPendingValue] = useState<Format | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Format;
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

  return (
    <>
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wide">
        Format
        <select value={value} onChange={handleChange} className="border rounded px-2 py-1 font-normal normal-case tracking-normal text-base text-gray-800">
          <option value="singles-3">Singles (3v3)</option>
          <option value="doubles-4">Doubles (4v4)</option>
          <option value="singles-6">Singles (6v6)</option>
          <option value="doubles-6">Doubles (6v6)</option>
        </select>
      </label>
      {pendingValue && (
        <ConfirmDialog
          message="Changing the format will clear both teams. Continue?"
          onConfirm={handleConfirm}
          onCancel={() => setPendingValue(null)}
        />
      )}
    </>
  );
}
