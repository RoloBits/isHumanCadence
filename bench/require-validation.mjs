// Guard for the aalto scripts: validation/ is gitignored, was never committed,
// and exists only on the maintainer's machine. Fail with an explanation
// instead of a tsx stack trace about a missing file.
import { existsSync } from 'node:fs';

if (!existsSync('validation')) {
  console.error(
    'validation/ (the Aalto 168K-typist dataset and its scripts) is gitignored and was\n' +
      'never committed — it exists only on the maintainer\'s machine. This script cannot\n' +
      'run from a clone. For accuracy measurements that do work from a clone, use:\n' +
      '  npm run bench   (see bench/README.md)',
  );
  process.exit(1);
}
