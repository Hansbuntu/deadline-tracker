// Checks that the Supabase database is set up AND locked down.
// It acts as a stranger who isn't logged in, using only the public key,
// and expects every attempt to be refused by row-level security.
//
// Run with:  npm run check:db

import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  console.error('Missing settings: fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local')
  process.exit(1)
}
if (key.startsWith('sb_secret_')) {
  console.error('That is the SECRET key. .env.local needs the PUBLISHABLE key (sb_publishable_...).')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })
let failures = 0
const pass = (message) => console.log(`  ✓ ${message}`)
const fail = (message) => {
  failures += 1
  console.log(`  ✗ ${message}`)
}

console.log(`Checking ${new URL(url).host} as a visitor who is NOT logged in…\n`)

// 1. The table exists, but a stranger sees nothing in it.
const read = await supabase.from('opportunities').select('id').limit(1)
if (read.error) {
  fail(`Could not reach the table: ${read.error.message}. Has the migration been run?`)
} else if (read.data.length === 0) {
  pass('The opportunities table exists, and a stranger sees no rows')
} else {
  fail(`A stranger could read ${read.data.length} row(s)! Row-level security is not working.`)
}

// 2. A stranger cannot add rows.
const write = await supabase
  .from('opportunities')
  .insert({ name: 'Security check: this must be refused', deadline: '2030-01-01' })
  .select()
// Only count it as a pass if the refusal came from row-level security itself
// (Postgres error 42501), not from something else like a missing table.
if (write.error?.code === '42501') {
  pass('A stranger cannot add rows (refused by row-level security)')
} else if (write.error) {
  fail(`Adding a row failed, but not because of row-level security: ${write.error.message}`)
} else {
  fail('A stranger was able to add a row! Row-level security is not working.')
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
