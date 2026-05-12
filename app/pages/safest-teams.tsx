import { GetStaticProps } from 'next';
import path from 'path';
import fs from 'fs';
import { Pokemon, TypeIndex } from '@/lib/typings';
import { buildFilteredTypeIndex } from '@/lib/buildTypeIndex';
import Layout from '@/components/Layout';
import SafestTeams from '@/components/SafestTeams';
import bestTeamsData from '@/data/best-teams.json';

interface SafestTeamsPageProps {
  allPokemon: Pokemon[];
  champions: string[];
  championsTypeIndex: TypeIndex;
}

export const getStaticProps: GetStaticProps<SafestTeamsPageProps> = async () => {
  const allPokemon: Pokemon[] = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data/pokemon.json'), 'utf-8')
  );
  const champions: string[] = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data/champions.json'), 'utf-8')
  );
  const championsTypeIndex = buildFilteredTypeIndex(allPokemon, champions);
  return { props: { allPokemon, champions, championsTypeIndex } };
};

export default function SafestTeamsPage({ allPokemon, champions, championsTypeIndex }: SafestTeamsPageProps) {
  return (
    <Layout title="Safest Teams">
      <SafestTeams
        allPokemon={allPokemon}
        champions={champions}
        championsTypeIndex={championsTypeIndex}
        bestTeams={bestTeamsData as number[][][]}
      />
    </Layout>
  );
}
