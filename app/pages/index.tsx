import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { GetStaticProps } from 'next';
import path from 'path';
import fs from 'fs';
import { Pokemon, Typing, TypeIndex, randomizer } from '@/lib/typings';
import { buildTypeIndex, buildFilteredTypeIndex } from '@/lib/buildTypeIndex';
import { MaximizeAdvantagesStrategy } from '@/lib/strategies/MaximizeAdvantagesStrategy';
import { SlotState } from '@/components/PokemonSlot';
import PoolFilterDropdown from '@/components/PoolFilterDropdown';
import FormatDropdown, { Format, FORMAT_TEAM_SIZE } from '@/components/FormatDropdown';
import InputTeam from '@/components/InputTeam';
import OutputTeam from '@/components/OutputTeam';

type PoolFilter = 'champions' | 'all';

interface HomeProps {
  allPokemon: Pokemon[];
  champions: string[];
  allTypeIndex: TypeIndex;
  championsTypeIndex: TypeIndex;
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  const allPokemon: Pokemon[] = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data/pokemon.json'), 'utf-8')
  );
  const champions: string[] = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data/champions.json'), 'utf-8')
  );
  const allTypeIndex = buildTypeIndex(allPokemon);
  const championsTypeIndex = buildFilteredTypeIndex(allPokemon, champions);
  return { props: { allPokemon, champions, allTypeIndex, championsTypeIndex } };
};

const emptySlots = (size: number): SlotState[] =>
  Array.from({ length: size }, () => ({ filled: false as const }));

export default function Home({ allPokemon, champions, allTypeIndex, championsTypeIndex }: HomeProps) {
  const router = useRouter();
  const idToPokemon = useMemo(() => new Map(allPokemon.map(p => [p.id, p])), [allPokemon]);

  // --- Parse initial state from QSPs (only on first render, router.query populated client-side) ---
  const [hydrated, setHydrated] = useState(false);
  const [poolFilter, setPoolFilter] = useState<PoolFilter>('champions');
  const [format, setFormat] = useState<Format>('doubles-4');
  const teamSize = FORMAT_TEAM_SIZE[format];
  const [inputSlots, setInputSlots] = useState<SlotState[]>(emptySlots(FORMAT_TEAM_SIZE['doubles-4']));
  const [outputSlots, setOutputSlots] = useState<SlotState[]>(emptySlots(FORMAT_TEAM_SIZE['doubles-4']));
  const [advantageCount, setAdvantageCount] = useState<number | null>(null);
  const [candidateTeams, setCandidateTeams] = useState<Typing[][]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcElapsed, setCalcElapsed] = useState(0); // seconds since calculation started

  const strategy = useMemo(() => new MaximizeAdvantagesStrategy(), []);

  const activeTypeIndex = poolFilter === 'champions' ? championsTypeIndex : allTypeIndex;
  const activePool = poolFilter === 'champions'
    ? allPokemon.filter(p => champions.includes(p.name))
    : allPokemon;

  // Tick elapsed time while calculating
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

  // Hydrate state from QSPs once router is ready
  useEffect(() => {
    if (!router.isReady || hydrated) return;
    setHydrated(true);

    const qRoster = router.query.roster;
    const qFormat = router.query.format;
    const qInput = router.query.input;

    const parsedRoster: PoolFilter =
      qRoster === 'all' ? 'all' : 'champions';
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

    // Derive the active index/pool for the parsed roster right here
    const parsedTypeIndex = parsedRoster === 'champions' ? championsTypeIndex : allTypeIndex;
    const parsedPool = parsedRoster === 'champions'
      ? allPokemon.filter(p => champions.includes(p.name))
      : allPokemon;
    runCalculation(parsedSlots, parsedTypeIndex, parsedPool, parsedSize);
  }, [router.isReady, router.query, hydrated, idToPokemon, allPokemon, champions, allTypeIndex, championsTypeIndex, runCalculation]);

  // Build a shareable URL from current state — only called when user clicks Copy Link
  const buildShareUrl = useCallback((slots: SlotState[]) => {
    const ids = slots
      .filter((s): s is { filled: true; pokemon: Pokemon } => s.filled)
      .map(s => s.pokemon.id);
    const params = new URLSearchParams({ roster: poolFilter, format });
    if (ids.length > 0) params.set('input', ids.join(','));
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }, [poolFilter, format]);

  // Push roster/format to URL (no input — that's only written on share)
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
    // advantageCount and candidateTeams unchanged — typing is the same
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
    <div className="min-h-screen pokeball-bg flex flex-col">
      <header className="flex-shrink-0 py-4 px-4 text-white border-b-4 border-black" style={{ backgroundColor: '#CA0000' }}>
        <h1 className="text-2xl font-bold text-center">Pokémon Team Calculator</h1>
        <p className="text-center text-sm text-red-300/50 mt-1 flex items-center justify-center gap-1">
          made with ♥ by{' '}
          <a
            href="https://youtube.com/@redblackgaming"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-300/50 hover:text-red-200/70 transition-colors flex items-center gap-1"
          >
            redblackgaming
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
            </svg>
          </a>
        </p>
      </header>
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
    </div>
  );
}
