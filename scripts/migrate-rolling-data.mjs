import { createClient } from '@supabase/supabase-js';

const allowed = new Set(['--dry-run', '--apply']);
for (const arg of process.argv.slice(2)) {
  if (!allowed.has(arg)) throw new Error(`Unknown option: ${arg}`);
}
if (process.argv.includes('--dry-run') && process.argv.includes('--apply')) {
  throw new Error('Choose either --dry-run (default) or --apply, not both.');
}
const apply = process.argv.includes('--apply');

const required = ['OLD_ROLLING_URL', 'OLD_ROLLING_KEY', 'MAIN_URL', 'MAIN_KEY'];
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} must be set in the local environment.`);
}

const oldDb = createClient(process.env.OLD_ROLLING_URL, process.env.OLD_ROLLING_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const mainDb = createClient(process.env.MAIN_URL, process.env.MAIN_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const tables = [
  'students',
  'classroom_layouts',
  'seats',
  'seating_periods',
  'seating_assignments',
  'reroll_history',
  'saved_class_groups',
];
const pageSize = 500;

async function readAll(client, table) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client.from(table).select('*').range(from, from + pageSize - 1);
    if (error) throw new Error(`Could not read ${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

for (const table of tables) {
  const sourceRows = await readAll(oldDb, table);
  const destinationRows = await readAll(mainDb, table);
  const destinationById = new Map(destinationRows.map((row) => [row.id, row]));
  const newRows = [];
  const conflicts = [];

  for (const row of sourceRows) {
    const existing = destinationById.get(row.id);
    if (!existing) newRows.push(row);
    else if (JSON.stringify(stable(existing)) !== JSON.stringify(stable(row))) conflicts.push(row.id);
  }

  console.log(`${table}: source ${sourceRows.length}, already identical ${sourceRows.length - newRows.length - conflicts.length}, to copy ${newRows.length}, conflicting IDs ${conflicts.length}`);
  if (conflicts.length) {
    console.error(`Conflict examples in ${table}: ${conflicts.slice(0, 10).join(', ')}`);
    throw new Error(`Stopped safely: destination contains different rows with matching ${table}.id.`);
  }
  if (apply && newRows.length) {
    for (let index = 0; index < newRows.length; index += 100) {
      const { error } = await mainDb.from(table).insert(newRows.slice(index, index + 100));
      if (error) throw new Error(`Could not copy ${table}: ${error.message}`);
    }
  }
}

if (!apply) {
  console.log('Dry run only; destination was not changed. Review the counts, then rerun with --apply to copy missing rows.');
} else {
  console.log('Copy completed. Run the verification queries in docs/DEPLOY-GUIDE.md before changing the old project schedule.');
}
