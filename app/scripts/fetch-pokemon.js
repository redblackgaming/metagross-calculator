#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const CACHE_FILE  = path.join(__dirname, '../tmp/cache.json');
const OUTPUT_FILE = path.join(__dirname, '../data/pokemon.json');
const GQL_HOST    = 'beta.pokeapi.co';
const GQL_PATH    = '/graphql/v1beta';

const QUERY = `
query {
  typings: pokemon_v2_pokemon(order_by: {id: asc}) {
    id
    name
    pokemon_v2_pokemontypes {
      pokemon_v2_type { name }
    }
  }
}
`;

function fetchFromAPI() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: QUERY });
    const req = https.request({
      hostname: GQL_HOST,
      path: GQL_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let d = '';
      res.on('data', c => { d += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch (e) { reject(new Error(`JSON parse failed: ${e.message}\nRaw: ${d.slice(0, 300)}`)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function formatPokemon(p) {
  const types = p.pokemon_v2_pokemontypes;
  if (!types || types.length === 0) return null;
  const typing = types.map(t => t.pokemon_v2_type.name);
  return { id: p.id, name: p.name, typing };
}

async function main() {
  fs.mkdirSync(path.dirname(CACHE_FILE),  { recursive: true });
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

  let raw;

  if (fs.existsSync(CACHE_FILE)) {
    console.log('Using cached data');
    raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } else {
    console.log('Fetching from PokeAPI GraphQL...');
    const res = await fetchFromAPI();

    if (res.errors) {
      console.error('GraphQL errors:', JSON.stringify(res.errors, null, 2));
      process.exit(1);
    }

    raw = res.data?.typings;
    if (!Array.isArray(raw) || raw.length === 0) {
      console.error('Empty or missing typings in response:', JSON.stringify(res).slice(0, 300));
      process.exit(1);
    }

    fs.writeFileSync(CACHE_FILE, JSON.stringify(raw));
  }

  const pokemon = raw.map(formatPokemon).filter(Boolean);

  if (pokemon.length === 0) {
    console.error('Formatted 0 pokemon — aborting.');
    process.exit(1);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(pokemon, null, 2));
  console.log(`Wrote ${pokemon.length} pokemon to data/pokemon.json`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
