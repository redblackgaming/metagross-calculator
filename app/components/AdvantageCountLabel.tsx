interface AdvantageCountLabelProps {
  advantageCount: number | null;
}

export default function AdvantageCountLabel({ advantageCount }: AdvantageCountLabelProps) {
  if (advantageCount === null) return null;
  return <span className="text-sm font-medium text-gray-700">{advantageCount} advantages</span>;
}
