const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = './public';

(async () => {
  if (!fs.existsSync(OUTPUT_DIR)) {
    await fs.promises.mkdir(OUTPUT_DIR);
  }

  const distFiles = await fs.promises.readdir('dist');

  const allFiles = [
    'package.json',
    'LICENSE',
    'README.md',
    ...distFiles.map((file) => `dist/${file}`),
  ];

  await fs.promises.mkdir(path.resolve(OUTPUT_DIR, 'dist'));
  await Promise.all(
    allFiles.map((src) =>
      fs.promises.copyFile(src, path.resolve(OUTPUT_DIR, src)),
    ),
  );
})();
