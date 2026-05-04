import { Pokemon, TypeIndex, Typing } from '../typings';

export interface Strategy {
  calculate(
    inputTeam: Pokemon[],
    typeIndex: TypeIndex,
    teamSize: number
  ): Promise<{
    advantageCount: number;
    candidateTeams: Typing[][];
  }>;
}
