import { Pokemon, TypeIndex } from '../typings';
import { calculate } from '../calculate';

self.onmessage = function (e: MessageEvent<{ inputTeam: Pokemon[]; typeIndex: TypeIndex; teamSize: number }>) {
  const { inputTeam, typeIndex, teamSize } = e.data;
  const result = calculate(inputTeam, typeIndex, teamSize);
  self.postMessage(result);
};
