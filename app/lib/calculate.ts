import {
  Pokemon,
  TypeIndex,
  Typing,
  disadvantages,
  vsAdvantages,
  combinations,
  genVariations,
  typingKey,
} from './typings';

export function calculate(
  inputTeam: Pokemon[],
  typeIndex: TypeIndex,
  teamSize: number,
): { advantageCount: number; candidateTeams: Typing[][] } {
  // 1. Count how many opponents each type beats
  const advCounter = new Map<string, number>();
  for (const opp of inputTeam) {
    for (const t of disadvantages(opp.typing)) {
      advCounter.set(t, (advCounter.get(t) ?? 0) + 1);
    }
  }

  const effectiveTypes = [...advCounter.keys()] as Parameters<typeof genVariations>[0];
  if (effectiveTypes.length === 0) return { advantageCount: 0, candidateTeams: [] };

  // Sort best-coverage types first so we explore the most promising combos first
  const sortedTypes = [...effectiveTypes].sort(
    (a, b) => (advCounter.get(b) ?? 0) - (advCounter.get(a) ?? 0),
  ) as Parameters<typeof genVariations>[0];

  const k = Math.min(teamSize * 2, sortedTypes.length);

  // Track maxAdvs inline to avoid a 2.5M-entry spread into Math.max
  let maxAdvs = 0;
  const allTeams: Array<{ advs: number; team: Typing[] }> = [];
  for (const combo of combinations(sortedTypes, k)) {
    for (const team of genVariations(combo)) {
      const advs = vsAdvantages(team, inputTeam).length;
      if (advs > maxAdvs) maxAdvs = advs;
      allTeams.push({ advs, team });
    }
  }

  if (allTeams.length === 0) return { advantageCount: 0, candidateTeams: [] };

  const candidateTeams = allTeams
    .filter(({ advs }) => advs === maxAdvs)
    .map(({ team }) => team)
    .filter(team => team.every(typing => typingKey(typing) in typeIndex));

  if (candidateTeams.length === 0) return { advantageCount: 0, candidateTeams: [] };

  return { advantageCount: maxAdvs, candidateTeams };
}
