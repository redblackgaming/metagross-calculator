import { useState } from 'react';
import { GetStaticProps } from 'next';
import path from 'path';
import fs from 'fs';
import { Pokemon, TypeIndex } from '@/lib/typings';
import { buildTypeIndex, buildFilteredTypeIndex } from '@/lib/buildTypeIndex';
import TeamCalculator from '@/components/TeamCalculator';
import SafestTeams from '@/components/SafestTeams';

type View = 'calculator' | 'safest-teams';

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

const VIEW_TITLES: Record<View, string> = {
  'calculator': 'Pokémon Team Calculator',
  'safest-teams': 'Safest Teams',
};

export default function Home({ allPokemon, champions, allTypeIndex, championsTypeIndex }: HomeProps) {
  const [view, setView] = useState<View>('calculator');
  const [drawerOpen, setDrawerOpen] = useState(false);

  function navigate(v: View) {
    setView(v);
    setDrawerOpen(false);
  }

  return (
    <div className="min-h-screen pokeball-bg flex flex-col">
      {/* Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-64 z-50 flex flex-col shadow-2xl transition-transform duration-300 border-r-4 border-black ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ backgroundColor: '#CA0000' }}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b-2 border-black/30">
          <span className="text-white font-bold text-lg">Menu</span>
          <button
            onClick={() => setDrawerOpen(false)}
            className="text-white hover:text-red-200 transition-colors p-1"
            aria-label="Close menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-6 h-6">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <nav className="flex flex-col p-4 gap-2">
          <button
            onClick={() => navigate('calculator')}
            className={`text-left px-4 py-3 rounded-xl font-semibold transition-colors ${view === 'calculator' ? 'bg-black/40 text-white' : 'bg-black/20 text-white hover:bg-black/30'}`}
          >
            🧮 Team Calculator
          </button>
          <button
            onClick={() => navigate('safest-teams')}
            className={`text-left px-4 py-3 rounded-xl font-semibold transition-colors ${view === 'safest-teams' ? 'bg-black/40 text-white' : 'bg-black/20 text-white hover:bg-black/30'}`}
          >
            🛡️ Safest Teams
          </button>
        </nav>
      </div>

      {/* Header */}
      <header className="flex-shrink-0 py-4 px-4 text-white border-b-4 border-black" style={{ backgroundColor: '#CA0000' }}>
        <div className="relative flex items-center justify-center">
          <button
            onClick={() => setDrawerOpen(true)}
            className="absolute left-0 text-white hover:text-red-200 transition-colors p-1"
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M3 6.75A.75.75 0 0 1 3.75 6h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6.75ZM3 12a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Zm0 5.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd"/>
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-center">{VIEW_TITLES[view]}</h1>
        </div>
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

      {/* View */}
      {view === 'calculator' && (
        <TeamCalculator
          allPokemon={allPokemon}
          champions={champions}
          allTypeIndex={allTypeIndex}
          championsTypeIndex={championsTypeIndex}
        />
      )}
      {view === 'safest-teams' && <SafestTeams />}
    </div>
  );
}
