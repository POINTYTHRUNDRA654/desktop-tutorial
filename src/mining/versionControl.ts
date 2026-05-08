import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  GitRepo,
  Remote,
  CommitResult,
  BranchResult,
  MergeResult,
  CommitHistory,
  DiffResult,
  DiffChunk,
  DiffLine,
  CommitChanges,
  PushResult,
  PullResult,
  CloneResult,
  BackupResult,
  RestoreResult,
  Backup
} from '../shared/types';

export class VersionControlEngine {
  private gitPath: string = 'git';

  // Git operations
  async initRepository(projectPath: string): Promise<GitRepo> {
    try {
      // Initialize git repository
      this.executeGit(['init'], { cwd: projectPath });

      // Create .gitignore for mod files
      const gitignorePath = path.join(projectPath, '.gitignore');
      const gitignoreContent = this.getDefaultGitignore();
      fs.writeFileSync(gitignorePath, gitignoreContent);

      // Stage and commit initial files
      this.executeGit(['add', '.'], { cwd: projectPath });
      this.executeGit(['commit', '-m', 'Initial commit'], { cwd: projectPath });

      return this.getRepositoryInfo(projectPath);
    } catch (error) {
      throw new Error(`Failed to initialize repository: ${error}`);
    }
  }

  async commit(message: string, files: string[] = []): Promise<CommitResult> {
    try {
      const cwd = this.getCurrentProjectPath();

      // Stage files if specified
      if (files.length > 0) {
        this.executeGit(['add', ...files], { cwd });
      } else {
        this.executeGit(['add', '.'], { cwd });
      }

      // Check if there are changes to commit
      const changesCount = this.countUncommittedChanges(cwd);
      if (changesCount === 0) {
        throw new Error('No changes to commit');
      }

      // Commit
      this.executeGit(['commit', '-m', message], { cwd });

      // Get commit info
      const logOutput = this.executeGit(['log', '-1', '--format=%H %s'], { cwd });
      const [hash, ...messageParts] = logOutput.trim().split(' ');

      return {
        success: true,
        hash,
        message: messageParts.join(' '),
        filesChanged: changesCount,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Failed to commit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createBranch(branchName: string): Promise<BranchResult> {
    try {
      const cwd = this.getCurrentProjectPath();
      this.executeGit(['checkout', '-b', branchName], { cwd });

      return {
        success: true,
        branchName
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async mergeBranch(source: string, target: string): Promise<MergeResult> {
    try {
      const cwd = this.getCurrentProjectPath();

      // Switch to target branch
      this.executeGit(['checkout', target], { cwd });

      // Merge source branch
      const result = this.executeGit(['merge', source, '--no-ff'], { cwd });

      const hasConflicts = result.includes('CONFLICT');
      const fastForward = result.includes('Fast-forward');

      return {
        success: !hasConflicts,
        merged: !hasConflicts,
        fastForward,
        conflicts: hasConflicts ? this.getConflictFiles(cwd) : []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        conflicts: [],
        merged: false,
        fastForward: false
      };
    }
  }

  // History & diff
  async getHistory(limit: number = 50): Promise<CommitHistory[]> {
    try {
      const cwd = this.getCurrentProjectPath();
      const logOutput = this.executeGit([
        'log',
        `--max-count=${limit}`,
        '--pretty=format:%H|%s|%an|%ae|%ad|%N',
        '--date=iso',
        '--name-only'
      ], { cwd });

      const commits: CommitHistory[] = [];
      const entries = logOutput.split('\n\n');

      for (const entry of entries) {
        const lines = entry.trim().split('\n');
        if (lines.length < 2) continue;

        const [hash, message, author, email, dateStr] = lines[0].split('|');
        const files = lines.slice(1).filter(line => line.trim());

        // Get insertions/deletions
        const statOutput = this.executeGit(['show', '--stat', '--oneline', hash], { cwd });
        const statLines = statOutput.split('\n');
        const statLine = statLines.find(line => /\d+ insertions?\(\+\), \d+ deletions?\(-\)/.test(line));

        let insertions = 0;
        let deletions = 0;
        if (statLine) {
          const match = statLine.match(/(\d+) insertions?\(\+\), (\d+) deletions?\(-\)/);
          if (match) {
            insertions = parseInt(match[1]);
            deletions = parseInt(match[2]);
          }
        }

        commits.push({
          hash,
          message,
          author,
          email,
          timestamp: new Date(dateStr).getTime(),
          branch: this.getCurrentBranch(cwd),
          filesChanged: files
        });
      }

      return commits;
    } catch (error) {
      console.error('Failed to get commit history:', error);
      return [];
    }
  }

  async diff(fileA: string, fileB: string): Promise<DiffResult> {
    try {
      const cwd = this.getCurrentProjectPath();
      const diffOutput = this.executeGit(['diff', fileA, fileB], { cwd });

      return this.parseDiffOutput(diffOutput, fileA, fileB);
    } catch (error) {
      throw new Error(`Failed to get diff: ${error}`);
    }
  }

  async showChanges(commitHash: string): Promise<CommitChanges> {
    try {
      const cwd = this.getCurrentProjectPath();

      // Get commit info
      const commitInfo = this.executeGit(['show', '--pretty=format:%H|%s|%an|%ad', '--date=iso', commitHash], { cwd });
      const [hash, message, author, dateStr] = commitInfo.split('|');

      // Get diff
      const diffOutput = this.executeGit(['show', '--pretty=format:', commitHash], { cwd });
      const files = this.parseDiffFiles(diffOutput);

      return {
        hash,
        message,
        author,
        date: new Date(dateStr).getTime(),
        files
      };
    } catch (error) {
      throw new Error(`Failed to show commit changes: ${error}`);
    }
  }

  // Remote operations
  async push(remote: string = 'origin', branch?: string): Promise<PushResult> {
    try {
      const cwd = this.getCurrentProjectPath();
      const currentBranch = branch || this.getCurrentBranch(cwd);

      this.executeGit(['push', remote, currentBranch], { cwd });

      return {
        success: true,
        pushed: 1,
        rejected: 0
      };
    } catch (error) {
      return {
        success: false,
        pushed: 0,
        rejected: 1,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async pull(remote: string = 'origin', branch?: string): Promise<PullResult> {
    try {
      const cwd = this.getCurrentProjectPath();
      const currentBranch = branch || this.getCurrentBranch(cwd);

      const result = this.executeGit(['pull', remote, currentBranch], { cwd });

      const hasConflicts = result.includes('CONFLICT');

      return {
        success: !hasConflicts,
        merged: 1,
        fetched: 1,
        conflicts: hasConflicts ? this.getConflictFiles(cwd) : []
      };
    } catch (error) {
      return {
        success: false,
        merged: 0,
        fetched: 0,
        conflicts: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async clone(repoUrl: string, localPath: string): Promise<CloneResult> {
    try {
      this.executeGit(['clone', repoUrl, localPath]);

      return {
        success: true,
        path: localPath
      };
    } catch (error) {
      return {
        success: false,
        path: localPath,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Backup & restore
  async createBackup(projectPath: string): Promise<BackupResult> {
    try {
      const timestamp = Date.now();
      const backupId = `backup_${timestamp}`;
      const backupPath = path.join(projectPath, '.git', 'backups', backupId);

      // Create backup directory
      fs.mkdirSync(backupPath, { recursive: true });

      // Copy current working directory (excluding .git)
      const files = fs.readdirSync(projectPath).filter(f => f !== '.git');
      for (const file of files) {
        const srcPath = path.join(projectPath, file);
        const destPath = path.join(backupPath, file);

        if (fs.statSync(srcPath).isDirectory()) {
          this.copyDirectory(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }

      // Create commit for backup
      this.executeGit(['add', '.'], { cwd: projectPath });
      this.executeGit(['commit', '-m', `Backup: ${new Date(timestamp).toISOString()}`], { cwd: projectPath });

      const size = this.getDirectorySize(backupPath);

      return {
        success: true,
        backupId,
        path: backupPath,
        size,
        timestamp
      };
    } catch (error) {
      return {
        success: false,
        backupId: '',
        path: '',
        size: 0,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async restoreBackup(backupId: string, targetPath: string): Promise<RestoreResult> {
    try {
      const projectPath = this.getCurrentProjectPath();
      const backupPath = path.join(projectPath, '.git', 'backups', backupId);

      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup not found');
      }

      // Copy backup files to target
      const files = fs.readdirSync(backupPath);
      let restoredCount = 0;

      for (const file of files) {
        const srcPath = path.join(backupPath, file);
        const destPath = path.join(targetPath, file);

        if (fs.statSync(srcPath).isDirectory()) {
          this.copyDirectory(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
        restoredCount++;
      }

      return {
        success: true,
        restoredFiles: restoredCount
      };
    } catch (error) {
      return {
        success: false,
        restoredFiles: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async listBackups(): Promise<Backup[]> {
    try {
      const projectPath = this.getCurrentProjectPath();
      const backupsDir = path.join(projectPath, '.git', 'backups');

      if (!fs.existsSync(backupsDir)) {
        return [];
      }

      const backupDirs = fs.readdirSync(backupsDir)
        .filter(dir => dir.startsWith('backup_'))
        .map(dir => {
          const backupPath = path.join(backupsDir, dir);
          const timestamp = parseInt(dir.replace('backup_', ''));
          const size = this.getDirectorySize(backupPath);

          return {
            id: dir,
            timestamp,
            size,
            path: backupPath,
            description: `Backup from ${new Date(timestamp).toLocaleString()}`
          };
        })
        .sort((a, b) => b.timestamp - a.timestamp);

      return backupDirs;
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  // Conflict resolution
  async resolveConflict(file: string, resolution: 'ours' | 'theirs' | 'manual'): Promise<void> {
    const cwd = this.getCurrentProjectPath();

    switch (resolution) {
      case 'ours':
        this.executeGit(['checkout', '--ours', file], { cwd });
        break;
      case 'theirs':
        this.executeGit(['checkout', '--theirs', file], { cwd });
        break;
      case 'manual':
        // For manual resolution, just mark as resolved
        this.executeGit(['add', file], { cwd });
        return;
    }

    // Stage the resolved file
    this.executeGit(['add', file], { cwd });
  }

  // Helper methods
  private executeGit(args: string[], options: { cwd?: string } = {}): string {
    try {
      const result = execSync(`${this.gitPath} ${args.join(' ')}`, {
        cwd: options.cwd,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      return result.toString();
    } catch (error: any) {
      if (error.stdout) {
        return error.stdout.toString();
      }
      throw error;
    }
  }

  private getCurrentProjectPath(): string {
    // This should be implemented to get the current project path from settings
    // For now, return a placeholder
    return process.cwd();
  }

  private getRepositoryInfo(projectPath: string): GitRepo {
    const remotes = this.getRemotes(projectPath);
    const currentBranch = this.getCurrentBranch(projectPath);
    const uncommittedChanges = this.countUncommittedChanges(projectPath);

    return {
      path: projectPath,
      initialized: true,
      currentBranch,
      remotes,
      uncommittedChanges
    };
  }

  private getRemotes(projectPath: string): Remote[] {
    try {
      const output = this.executeGit(['remote', '-v'], { cwd: projectPath });
      const lines = output.trim().split('\n');
      const remotes: Remote[] = [];

      for (const line of lines) {
        const [name, url] = line.split('\t');
        if (name && url) {
          const cleanUrl = url.split(' ')[0];
          const existing = remotes.find(r => r.name === name);
          if (existing) {
            existing.fetchUrl = cleanUrl;
          } else {
            remotes.push({ name, url: cleanUrl });
          }
        }
      }

      return remotes;
    } catch {
      return [];
    }
  }

  private getBranches(projectPath: string): string[] {
    try {
      const output = this.executeGit(['branch'], { cwd: projectPath });
      return output.trim().split('\n')
        .map(line => line.replace(/^\*\s*/, '').trim())
        .filter(line => line.length > 0);
    } catch {
      return [];
    }
  }

  private getCurrentBranch(projectPath: string): string {
    try {
      const output = this.executeGit(['branch', '--show-current'], { cwd: projectPath });
      return output.trim();
    } catch {
      return 'master';
    }
  }

  private countUncommittedChanges(projectPath: string): number {
    try {
      const output = this.executeGit(['status', '--porcelain'], { cwd: projectPath });
      const lines = output.trim().split('\n').filter(line => line.length > 0);
      return lines.length;
    } catch {
      return 0;
    }
  }

  private getConflictFiles(projectPath: string): string[] {
    try {
      const output = this.executeGit(['diff', '--name-only', '--diff-filter=U'], { cwd: projectPath });
      return output.trim().split('\n').filter(line => line.length > 0);
    } catch {
      return [];
    }
  }

  private parseDiffOutput(diffOutput: string, fileA: string, fileB: string): DiffResult {
    const lines = diffOutput.split('\n');
    let additions = 0;
    let deletions = 0;
    const chunks: DiffChunk[] = [];

    let currentChunk: any = null;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        if (currentChunk) {
          chunks.push(currentChunk);
        }

        const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
        if (match) {
          currentChunk = {
            oldStart: parseInt(match[1]),
            oldLines: parseInt(match[2] || '1'),
            newStart: parseInt(match[3]),
            newLines: parseInt(match[4] || '1'),
            lines: []
          };
        }
      } else if (currentChunk) {
        let type: 'add' | 'delete' | 'context' = 'context';
        let content = line;

        if (line.startsWith('+')) {
          type = 'add';
          content = line.substring(1);
          additions++;
        } else if (line.startsWith('-')) {
          type = 'delete';
          content = line.substring(1);
          deletions++;
        } else if (line.startsWith(' ')) {
          content = line.substring(1);
        }

        currentChunk.lines.push({
          type,
          content,
          lineNumber: currentChunk.lines.length + 1
        });
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return {
      fileA,
      fileB,
      additions,
      deletions,
      chunks
    };
  }

  private parseDiffFiles(diffOutput: string): DiffResult[] {
    const files: DiffResult[] = [];
    const fileSections = diffOutput.split('diff --git ');

    for (const section of fileSections.slice(1)) {
      const lines = section.split('\n');
      const fileLine = lines.find(line => line.startsWith('+++ b/'));
      if (fileLine) {
        const fileName = fileLine.replace('+++ b/', '');
        const diffContent = section;
        files.push(this.parseDiffOutput(diffContent, fileName, fileName));
      }
    }

    return files;
  }

  private getDefaultGitignore(): string {
    return `# Fallout 4 Mod Files
*.esp
*.esm
*.bsa
*.ba2

# Temporary files
*.tmp
*.bak
*.old

# Logs
*.log
logs/

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Editor files
.vscode/
.idea/
*.swp
*.swo

# Build outputs
dist/
build/
out/

# Node modules
node_modules/

# Python
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv/

# Backup files
*.orig
*.rej
`;
  }

  private copyDirectory(src: string, dest: string): void {
    fs.mkdirSync(dest, { recursive: true });
    const files = fs.readdirSync(src);

    for (const file of files) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);

      if (fs.statSync(srcPath).isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  private getDirectorySize(dirPath: string): number {
    let totalSize = 0;

    function calculateSize(itemPath: string): void {
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        const files = fs.readdirSync(itemPath);
        for (const file of files) {
          calculateSize(path.join(itemPath, file));
        }
      } else {
        totalSize += stats.size;
      }
    }

    calculateSize(dirPath);
    return totalSize;
  }
}