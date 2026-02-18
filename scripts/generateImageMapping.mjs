import fs from 'fs';

const imagesDir = './visual-guide-images';
const outputFilePath = './src/renderer/src/generatedImageMap.ts';

// Read all files in the visual-guide-images directory
const files = fs.readdirSync(imagesDir);

// Generate a mapping of pageId to image file
const imageMap = files.reduce((map, file) => {
  const match = file.match(/page-(\d+)-([a-z0-9-]+)\.png/i);
  if (match) {
    const pageId = match[2];
    map[pageId] = file;
  }
  return map;
}, {});

// Generate the TypeScript file
const fileContent = `// This file is auto-generated. Do not edit manually.
export const imageMap = ${JSON.stringify(imageMap, null, 2)};
`;

// Write the mapping to a file
fs.writeFileSync(outputFilePath, fileContent);

console.log(`Image map generated at ${outputFilePath}`);