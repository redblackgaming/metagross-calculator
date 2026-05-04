import { Strategy } from './Strategy';
import { Pokemon, TypeIndex, Typing } from '../typings';

export class MaximizeAdvantagesStrategy implements Strategy {
  calculate(inputTeam: Pokemon[], typeIndex: TypeIndex, teamSize: number): Promise<{
    advantageCount: number;
    candidateTeams: Typing[][];
  }> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL('../workers/strategy.worker.ts', import.meta.url)
      );

      worker.onmessage = (e) => {
        resolve(e.data);
        worker.terminate();
      };

      worker.onerror = (err) => {
        reject(err);
        worker.terminate();
      };

      worker.postMessage({ inputTeam, typeIndex, teamSize });
    });
  }
}
