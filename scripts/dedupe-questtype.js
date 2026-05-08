const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'shared', 'types.ts');
let txt = fs.readFileSync(filePath, 'utf8');

const regex = /export type QuestType[\s\S]*?;/g;
const matches = txt.match(regex) || [];
if (matches.length <= 1) {
  console.log('No duplicate QuestType declarations found.');
  process.exit(0);
}

// keep the first, remove the rest
let first = matches[0];
let newTxt = txt.replace(regex, (m, i) => {
  // the replace callback will be called for each match; we want to keep the first occurrence
  if (m === first) {
    first = null; // ensure only first is kept
    return m;
  }
  return ''; // remove duplicates
});

fs.writeFileSync(filePath, newTxt, 'utf8');
console.log(`Removed ${matches.length - 1} duplicate QuestType declaration(s).`);
