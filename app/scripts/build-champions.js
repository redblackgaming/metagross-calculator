const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../../champions-data/champions-clean-lower');
const outputPath = path.join(__dirname, '../data/champions.json');

const raw = fs.readFileSync(inputPath, 'utf-8');
const champions = raw.split('\n').map(line => line.trim()).filter(line => line.length > 0);

fs.writeFileSync(outputPath, JSON.stringify(champions, null, 2));
console.log(`Wrote ${champions.length} champions to ${outputPath}`);
