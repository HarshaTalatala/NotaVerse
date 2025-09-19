#!/usr/bin/env node
/*
  Simple pre-dev environment check for Vite Firebase variables.
  Usage: node scripts/predev-check-env.cjs && vite
*/
const fs = require('fs');
const path = require('path');

const REQUIRED = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

// Vite loads .env*. We just parse the plain .env for a quick human-friendly preflight.
const envPath = path.join(process.cwd(), '.env');
let content = '';
if (fs.existsSync(envPath)) {
  content = fs.readFileSync(envPath, 'utf8');
}
const lines = content.split(/\r?\n/).filter(line => line.trim() && !line.startsWith('#'));
const map = {};
for (const line of lines) {
  const idx = line.indexOf('=');
  if (idx === -1) continue;
  const key = line.slice(0, idx).trim();
  const val = line.slice(idx + 1).trim();
  map[key] = val;
}

console.log('[predev] Debug: found keys in .env =>', Object.keys(map));

const missing = REQUIRED.filter(k => map[k] === undefined);
if (missing.length) {
  console.warn('[predev] Missing keys in .env (may still exist in .env.local):', missing.join(', '));
} else {
  console.log('[predev] All required Firebase keys present in .env');
}

// Always exit 0 so dev can continue; this is informational.
