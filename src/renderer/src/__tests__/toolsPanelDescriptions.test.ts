import fs from 'fs';
import path from 'path';

describe('ToolsInstallVerifyPanel descriptions', () => {
  const srcDir = path.join(__dirname, '..');
  const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.tsx'));

  it('every file that uses ToolsInstallVerifyPanel should provide a non-empty description prop', () => {
    const violationFiles: string[] = [];

    files.forEach((file) => {
      const text = fs.readFileSync(path.join(srcDir, file), 'utf-8');
      if (text.includes('ToolsInstallVerifyPanel')) {
        // check that the component has a description prop with some content
        // allow quoted strings or JSX expressions like {t(...)}
        const descRegex = /description\s*=\s*("([^"]*)"|\{([^}]*)\})/;
        const match = descRegex.exec(text);
        if (!match) {
          violationFiles.push(file);
        } else {
          const quoted = match[2];
          const expr = match[3];
          if ((quoted !== undefined && !quoted.trim()) || (expr !== undefined && !expr.trim())) {
            violationFiles.push(file);
          }
        }
      }
    });

    if (violationFiles.length > 0) {
      throw new Error(
        'The following files use ToolsInstallVerifyPanel without a description: ' + violationFiles.join(', ')
      );
    }
  });
});
