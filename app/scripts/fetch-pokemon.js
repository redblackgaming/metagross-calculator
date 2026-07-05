#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const CACHE_FILE  = path.join(__dirname, '../tmp/cache.json');
const OUTPUT_FILE = path.join(__dirname, '../data/pokemon.json');
const BASE_URL    = 'https://pokeapi.co/api/v2';
const CONCURRENCY = 20;

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let d = '';
      res.on('data', c => { d += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch (e) { reject(new Error(`JSON parse failed for ${url}: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

async function fetchAllNames() {
  const first = await get(`${BASE_URL}/pokemon?limit=1`);
  const total = first.count;
  const data  = await get(`${BASE_URL}/pokemon?limit=${total}`);
  return data.results; // [{ name, url }]
}

async function fetchPokemon(url) {
  const data = await get(url);
  const types = data.types; // [{ slot, type: { name } }]
  if (!types || types.length === 0) return null;
  const sorted = [...types].sort((a, b) => a.slot - b.slot);
  const typing = sorted.map(t => t.type.name);
  return { id: data.id, name: data.name, typing };
}

async function runWithConcurrency(tasks, limit) {
  const results = new Array(tasks.length);
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

async function main() {
  fs.mkdirSync(path.dirname(CACHE_FILE),  { recursive: true });
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

  let pokemon;

  if (fs.existsSync(CACHE_FILE)) {
    console.log('Using cached data');
    pokemon = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } else {
    console.log('Fetching pokemon list from PokeAPI REST...');
    const names = await fetchAllNames();
    console.log(`Fetching ${names.length} pokemon (${CONCURRENCY} at a time)...`);

    const tasks = names.map(({ url }) => () => fetchPokemon(url));
    const raw   = await runWithConcurrency(tasks, CONCURRENCY);
    pokemon     = raw.filter(Boolean);

    if (pokemon.length === 0) {
      console.error('Fetched 0 pokemon — aborting without caching.');
      process.exit(1);
    }

    fs.writeFileSync(CACHE_FILE, JSON.stringify(pokemon));
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(pokemon, null, 2));
  console.log(`Wrote ${pokemon.length} pokemon to data/pokemon.json`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
