// One command for a clean rebuild: regenerate the pages, then tag them for the admin panel.
// Usage (from the site folder): node tools/build-all.js
// The annotator needs the "cheerio" package: run "npm install cheerio" once in any folder and set CHEERIO_PATH if it is not found.
const { execFileSync } = require('child_process'), path = require('path');
const site = path.resolve(__dirname, '..');
execFileSync(process.execPath, [path.join(__dirname, 'build-site.js'), site], { stdio: 'inherit' });
execFileSync(process.execPath, [path.join(__dirname, 'cms-annotate.js'), site], { stdio: 'inherit', env: process.env });
