#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const CACHE_FILE = path.join(__dirname, '../tmp/cache.json');
const OUTPUT_FILE = path.join(__dirname, '../data/pokemon.json');
const POKEAPI_GQL = 'https://graphql.pokeapi.co/v1beta2';

const QUERY = `
query samplePokeAPIquery {
  typings: pokemon(order_by: {id: asc}) {
    id
    name
    pokemontypes {
      type { name }
    }
  }
}
`;

function fetchFromAPI() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: QUERY });
    const url = new URL(POKEAPI_GQL);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}\nRaw: ${data.slice(0, 500)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function formatPokemon(p) {
  const types = p.pokemontypes;
  if (!types || types.length === 0) return null;
  const typing = [types[0].type.name];
  if (types.length > 1) typing.push(types[1].type.name);
  return { id: p.id, name: p.name, typing };
}

async function main() {
  // Ensure output directories exist
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

  let data;

  if (fs.existsSync(CACHE_FILE)) {
    console.log('Using cached data');
    data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } else {
    console.log('Fetching from PokeAPI...');
    try {
      data = await fetchFromAPI();
    } catch (err) {
      console.error(`Error fetching from PokeAPI: ${err.message}`);
      process.exit(1);
    }

    if (data.errors) {
      console.error('GraphQL errors:', JSON.stringify(data.errors, null, 2));
      process.exit(1);
    }

    if (!data.data || !data.data.typings) {
      console.error('Unexpected response shape:', JSON.stringify(data, null, 2).slice(0, 500));
      process.exit(1);
    }

    fs.writeFileSync(CACHE_FILE, JSON.stringify(data));
  }

  const typings = data.data?.typings;
  if (!typings || !Array.isArray(typings)) {
    console.error('No typings array in response. Keys:', Object.keys(data.data || {}));
    process.exit(1);
  }

  const pokemon = typings.map(formatPokemon).filter(Boolean);

  if (pokemon.length === 0) {
    console.error('Wrote 0 pokemon — something went wrong. Raw typings sample:', JSON.stringify(typings.slice(0, 3)));
    process.exit(1);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(pokemon, null, 2));
  console.log(`Wrote ${pokemon.length} pokemon to data/pokemon.json`);
}

main();
