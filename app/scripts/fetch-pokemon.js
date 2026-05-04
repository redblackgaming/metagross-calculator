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
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
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
  const typing = [types[0].type.name];
  if (types.length > 1) typing.push(types[1].type.name);
  return { id: p.id, name: p.name, typing };
}

async function main() {
  // Ensure output directories exist
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

  // If an override file exists, use it directly and skip fetching
  const OVERRIDE_FILE = path.join(__dirname, '../data/pokemon-override.json');
  if (fs.existsSync(OVERRIDE_FILE)) {
    console.log('Using pokemon-override.json');
    fs.copyFileSync(OVERRIDE_FILE, OUTPUT_FILE);
    const count = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')).length;
    console.log(`Wrote ${count} pokemon to data/pokemon.json (from override)`);
    return;
  }

  let data;

  if (fs.existsSync(CACHE_FILE)) {
    console.log('Using cached data');
    data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } else {
    console.log('Fetching from PokeAPI...');
    try {
      data = await fetchFromAPI();
      fs.writeFileSync(CACHE_FILE, JSON.stringify(data));
    } catch (err) {
      console.error(`Error fetching from PokeAPI: ${err.message}`);
      process.exit(1);
    }
  }

  const pokemon = data.data.typings.map(formatPokemon);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(pokemon, null, 2));
  console.log(`Wrote ${pokemon.length} pokemon to data/pokemon.json`);
}

main();
