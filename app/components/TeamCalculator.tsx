import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Pokemon, TypeIndex, randomizer } from '@/lib/typings';
import { MaximizeAdvantagesStrategy } from '@/lib/strategies/MaximizeAdvantagesStrategy';
import { SlotState } from '@/components/PokemonSlot';
import PoolFilterDropdown from '@/components/PoolFilterDropdown';
import FormatDropdown, { Format, FORMAT_TEAM_SIZE } from '@/components/FormatDropdown';
import InputTeam from '@/components/InputTeam';
import OutputTeam from '@/components/OutputTeam';

type PoolFilter = 'champions' | 'all';

interface TeamCalculatorProps {
  allPokemon: Pokemon[];
  champions: string[];
  allTypeIndex: TypeIndex;
  championsTypeIndex: TypeIndex;
}

const emptySlots = (size: number): SlotState[] =>
  Array.from({ length: size }, () => ({ filled: false as const }));

export default function TeamCalculator({ allPokemon, champions, allTypeIndex, championsTypeIndex }: TeamCalculatorProps) {
  const router = useRouter();
  const idToPokemon = useMemo(() => new Map(allPokemon.map(p => [p.id, p])), [allPokemon]);

  const [hydrated, setHydrated] = useState(false);
  const [poolFilter, setPoolFilter] = useState<PoolFilter>('champions');
  const [format, setFormat] = useState<Format>('doubles-4');
  const teamSize = FORMAT_TEAM_SIZE[format];
  const [inputSlots, setInputSlots] = useState<SlotState[]>(emptySlots(FORMAT_TEAM_SIZE['doubles-4']));
  const [outputSlots, setOutputSlots] = useState<SlotState[]>(emptySlots(FORMAT_TEAM_SIZE['doubles-4']));
  const [advantageCount, setAdvantageCount] = useState<number | null>(null);
  const [candidateTeams, setCandidateTeams] = useState<any[][]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcElapsed, setCalcElapsed] = useState(0);

  const strategy = useMemo(() => new MaximizeAdvantagesStrategy(), []);

  const activeTypeIndex = poolFilter === 'champions' ? championsTypeIndex : allTypeIndex;
  const activePool = poolFilter === 'champions'
    ? allPokemon.filter(p => champions.includes(p.name))
    : allPokemon;

  useEffect(() => {
    if (!isCalculating) { setCalcElapsed(0); return; }
    setCalcElapsed(0);
    const interval = setInterval(() => setCalcElapsed(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isCalculating]);

  const runCalculation = useCallback(async (
    slots: SlotState[],
    typeIndex: TypeIndex,
    pool: Pokemon[],
    size: number,
  ) => {
    const allFilled = slots.every(s => s.filled);
    if (!allFilled) {
      setOutputSlots(emptySlots(size));
      setAdvantageCount(null);
      setCandidateTeams([]);
      return;
    }
    const filledTeam = slots.map(s => (s as { filled: true; pokemon: Pokemon }).pokemon);
    setIsCalculating(true);
    setOutputSlots(emptySlots(size));
    setAdvantageCount(null);
    setCandidateTeams([]);
    const result = await strategy.calculate(filledTeam, typeIndex, size);
    setCandidateTeams(result.candidateTeams);
    setAdvantageCount(result.advantageCount);
    if (result.candidateTeams.length > 0) {
      const team = randomizer(result.candidateTeams, typeIndex, pool);
      const filled = team.map((p: Pokemon) => ({ filled: true as const, pokemon: p }));
      const padded: SlotState[] = [
        ...filled,
        ...Array.from({ length: size - filled.length }, () => ({ filled: false as const })),
      ];
      setOutputSlots(padded);
    }
    setIsCalculating(false);
  }, [strategy]);

  useEffect(() => {
    if (!router.isReady || hydrated) return;
    setHydrated(true);

    const qRoster = router.query.roster;
    const qFormat = router.query.format;
    const qInput = router.query.input;

    const parsedRoster: PoolFilter = qRoster === 'all' ? 'all' : 'champions';
    const parsedFormat: Format =
      ['singles-3', 'doubles-4', 'singles-6', 'doubles-6'].includes(qFormat as string)
        ? (qFormat as Format)
        : 'doubles-4';
    const parsedSize = FORMAT_TEAM_SIZE[parsedFormat];

    let parsedSlots: SlotState[] = emptySlots(parsedSize);
    if (typeof qInput === 'string' && qInput.length > 0) {
      const ids = qInput.split(',').map(Number).filter(Boolean).slice(0, parsedSize);
      parsedSlots = Array.from({ length: parsedSize }, (_, i) => {
        const pokemon = idToPokemon.get(ids[i]);
        return pokemon ? { filled: true as const, pokemon } : { filled: false as const };
      });
    }

    setPoolFilter(parsedRoster);
    setFormat(parsedFormat);
    setInputSlots(parsedSlots);

    const parsedTypeIndex = parsedRoster === 'champions' ? championsTypeIndex : allTypeIndex;
    const parsedPool = parsedRoster === 'champions'
      ? allPokemon.filter(p => champions.includes(p.name))
      : allPokemon;
    runCalculation(parsedSlots, parsedTypeIndex, parsedPool, parsedSize);
  }, [router.isReady, router.query, hydrated, idToPokemon, allPokemon, champions, allTypeIndex, championsTypeIndex, runCalculation]);

  const buildShareUrl = useCallback((slots: SlotState[]) => {
    const ids = slots
      .filter((s): s is { filled: true; pokemon: Pokemon } => s.filled)
      .map(s => s.pokemon.id);
    const params = new URLSearchParams({ roster: poolFilter, format });
    if (ids.length > 0) params.set('input', ids.join(','));
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }, [poolFilter, format]);

  const pushDropdownQSP = useCallback((roster: PoolFilter, fmt: Format) => {
    router.replace(
      { pathname: router.pathname, query: { roster, format: fmt } },
      undefined,
      { shallow: true },
    );
  }, [router]);

  async function handleInputSlotSelect(index: number, pokemon: Pokemon) {
    const newSlots = inputSlots.map((s: SlotState, i: number) =>
      i === index ? { filled: true as const, pokemon } : s
    );
    setInputSlots(newSlots);
    await runCalculation(newSlots, activeTypeIndex, activePool, teamSize);
  }

  function handleOutputSlotSelect(index: number, pokemon: Pokemon) {
    setOutputSlots(outputSlots.map((s: SlotState, i: number) =>
      i === index ? { filled: true as const, pokemon } : s
    ));
  }

  function handleRandomize() {
    if (candidateTeams.length === 0) return;
    const team = randomizer(candidateTeams, activeTypeIndex, activePool);
    const filled = team.map((p: Pokemon) => ({ filled: true as const, pokemon: p }));
    const padded: SlotState[] = [
      ...filled,
      ...Array.from({ length: teamSize - filled.length }, () => ({ filled: false as const })),
    ];
    setOutputSlots(padded);
  }

  function handlePoolFilterChange(newFilter: PoolFilter) {
    setPoolFilter(newFilter);
    const cleared = emptySlots(teamSize);
    setInputSlots(cleared);
    setOutputSlots(emptySlots(teamSize));
    setAdvantageCount(null);
    setCandidateTeams([]);
    pushDropdownQSP(newFilter, format);
  }

  function handleFormatChange(newFormat: Format) {
    setFormat(newFormat);
    const newSize = FORMAT_TEAM_SIZE[newFormat];
    const cleared = emptySlots(newSize);
    setInputSlots(cleared);
    setOutputSlots(emptySlots(newSize));
    setAdvantageCount(null);
    setCandidateTeams([]);
    pushDropdownQSP(poolFilter, newFormat);
  }

  const hasFilledSlots = inputSlots.some((s: SlotState) => s.filled);

  return (
    <main className="px-6 py-4 pb-24 md:pb-8 flex flex-col flex-1">
      {isCalculating && (() => {
        const msg =
          calcElapsed >= 16
            ? { text: 'Please continue to wait, this could take an actual minute.', cls: 'text-red-400' }
            : calcElapsed >= 8
            ? { text: 'Sorry, still working — this team has MANY weaknesses.', cls: 'text-yellow-400' }
            : { text: 'Calculating optimal output team…', cls: 'text-gray-400' };
        return (
          <p className={`text-center text-sm font-medium mb-2 transition-colors ${msg.cls}`}>
            {msg.text}
          </p>
        );
      })()}
      <div className="flex justify-center gap-4 mb-4">
        <PoolFilterDropdown
          value={poolFilter}
          hasFilledSlots={hasFilledSlots}
          onChange={handlePoolFilterChange}
        />
        <FormatDropdown
          value={format}
          hasFilledSlots={hasFilledSlots}
          onChange={handleFormatChange}
        />
      </div>
      <div className="flex flex-col md:flex-row justify-evenly items-start gap-6">
        <div className="w-full md:w-80 md:order-1 order-2">
          <OutputTeam
            slots={outputSlots}
            allPokemon={allPokemon}
            typeIndex={activeTypeIndex}
            advantageCount={advantageCount}
            candidateTeams={candidateTeams}
            inputComplete={inputSlots.every((s: SlotState) => s.filled)}
            activePool={activePool}
            onSlotSelect={handleOutputSlotSelect}
            onRandomize={handleRandomize}
          />
        </div>
        <div className="w-full md:w-80 md:order-2 order-1">
          <InputTeam
            slots={inputSlots}
            pool={activePool}
            allPokemon={allPokemon}
            onSlotSelect={handleInputSlotSelect}
            buildShareUrl={buildShareUrl}
          />
        </div>
      </div>
    </main>
  );
}
