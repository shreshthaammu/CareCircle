import { runSeed } from '../server/src/scripts/seed.js';

runSeed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
  });
