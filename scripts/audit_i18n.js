const fs = require('fs');
const path = require('path');

global.localStorage = { getItem: () => 'en', setItem: () => {} };
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'i18n.js'), 'utf8') + '; globalThis.__i18n = I18n;');
global.I18n = global.__i18n;
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'i18n-en.js'), 'utf8'));

const han = /[\u3400-\u9fff]/;
const quoted = /(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
const files = ['index.html', ...fs.readdirSync(path.join(__dirname, '..', 'js'))
  .filter(name => name.endsWith('.js') && !name.startsWith('i18n'))
  .map(name => path.join('js', name))];
const residual = [];

for (const relative of files) {
  const source = fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
  for (const match of source.matchAll(quoted)) {
    const original = match[2].trim();
    if (!han.test(original)) continue;
    const representative = original.replace(/\$\{[^}]+\}/g, '1');
    const samples = representative.includes('<')
      ? representative.replace(/<[^>]*>/g, '\n').split(/\n+/).map(value => value.trim()).filter(Boolean)
      : [representative];
    for (const sample of samples) {
      if (!han.test(sample)) continue;
      const translated = __i18n.translateString(sample);
      if (han.test(translated)) residual.push({ file: relative, original: sample, translated });
    }
  }
}

console.log(`Representative English strings with Han characters: ${residual.length}`);
for (const item of residual.slice(0, 80)) {
  console.log(`${item.file}: ${item.original.replace(/\s+/g, ' ').slice(0, 130)}`);
}
process.exitCode = residual.length ? 1 : 0;
