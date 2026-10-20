// Checks data/regions.json before every build so a typo can't break the live map.
import { readFileSync, existsSync } from 'node:fs';

const SUPERREGIONS = ['americas', 'asia-pacific', 'emea'];
const KEYS = ['id', 'name', 'superregion', 'lat', 'lng', 'website', 'logo'];
const regions = JSON.parse(readFileSync(new URL('../data/regions.json', import.meta.url), 'utf8'));
const errors = [];
const ids = new Set();

if (!Array.isArray(regions)) errors.push('regions.json must be an array');
regions.forEach((r, i) => {
  const where = `#${i} (${r.name ?? r.id ?? '?'})`;
  for (const k of Object.keys(r)) if (!KEYS.includes(k)) errors.push(`${where}: unknown field "${k}"`);
  if (!/^[a-z0-9-]+$/.test(r.id ?? '')) errors.push(`${where}: id must be lowercase letters, numbers and dashes`);
  if (ids.has(r.id)) errors.push(`${where}: duplicate id "${r.id}"`);
  ids.add(r.id);
  if (!r.name || typeof r.name !== 'string') errors.push(`${where}: name is required`);
  if (!SUPERREGIONS.includes(r.superregion)) errors.push(`${where}: superregion must be one of ${SUPERREGIONS.join(', ')}`);
  if (typeof r.lat !== 'number' || r.lat < -90 || r.lat > 90) errors.push(`${where}: lat must be a number between -90 and 90`);
  if (typeof r.lng !== 'number' || r.lng < -180 || r.lng > 180) errors.push(`${where}: lng must be a number between -180 and 180`);
  if (r.website !== null && !/^https?:\/\//.test(r.website ?? '')) errors.push(`${where}: website must start with http(s):// or be null`);
  if (r.logo !== null && !existsSync(new URL(`../public/${r.logo}`, import.meta.url))) errors.push(`${where}: logo file public/${r.logo} not found`);
  if (/@/.test(JSON.stringify(r))) errors.push(`${where}: looks like it contains an email address; the public map must not include contact emails`);
});

if (errors.length) {
  console.error(`regions.json has ${errors.length} problem(s):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`regions.json OK: ${regions.length} regions`);
