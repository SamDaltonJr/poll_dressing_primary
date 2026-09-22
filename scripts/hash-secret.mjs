// Print the SHA-256 hex digest the app compares against for the volunteer
// access code (campaignSettings/{slug}.accessCodeHash) and the statewide admin
// password (campaignSettings/{slug}.adminPasswordHash).
//
// Firestore rules block clients from writing those fields, so paste the output
// into the doc via the Firebase console.
//
// Usage: node scripts/hash-secret.mjs "<secret>"
import { createHash } from 'node:crypto';

const secret = process.argv[2];
if (!secret) {
  console.error('usage: node scripts/hash-secret.mjs "<secret>"');
  process.exit(2);
}
console.log(createHash('sha256').update(secret, 'utf8').digest('hex'));
