import { Typing } from '@/lib/typings';

interface RandomizeButtonProps {
  candidateTeams: Typing[][];
  onRandomize: () => void;
}

export default function RandomizeButton({ candidateTeams, onRandomize }: RandomizeButtonProps) {
  const disabled = candidateTeams.length <= 1;
  return (
    <button
      onClick={onRandomize}
      disabled={disabled}
      className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      Randomize
    </button>
  );
}
