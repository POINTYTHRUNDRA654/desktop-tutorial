import { BSAArchive, BSADirectory, BSAFileEntry } from '../shared/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * BSA Archive Parser for Fallout 4
 * Parses Bethesda Softworks Archive files to extract file listings
 * Used for unused asset detection and archive analysis
 */
export class BSAParser {
  private static readonly BSA_HEADER_SIZE = 36;
  private static readonly BSA_VERSION_FO4 = 105; // Fallout 4 BSA version

  /**
   * Parse a BSA archive file
   */
  static async parseArchive(filePath: string): Promise<BSAArchive> {
    try {
      const buffer = await fs.promises.readFile(filePath);
      return this.parseBuffer(buffer, filePath);
    } catch (error) {
      throw new Error(`Failed to parse BSA archive ${filePath}: ${error}`);
    }
  }

  /**
   * Parse BSA data from buffer
   */
  private static parseBuffer(buffer: Buffer, filePath: string): BSAArchive {
    if (buffer.length < this.BSA_HEADER_SIZE) {
      throw new Error('BSA file too small to contain valid header');
    }

    // Read BSA header
    const magic = buffer.readUInt32LE(0);
    if (magic !== 0x00415342) { // 'BSA\0'
      throw new Error('Invalid BSA magic number');
    }

    const version = buffer.readUInt32LE(4);
    const offset = buffer.readUInt32LE(8);
    const archiveFlags = buffer.readUInt32LE(12);
    const folderCount = buffer.readUInt32LE(16);
    const fileCount = buffer.readUInt32LE(20);
    const folderNameLength = buffer.readUInt32LE(24);
    const fileNameLength = buffer.readUInt32LE(28);
    const fileFlags = buffer.readUInt32LE(32);

    if (version !== this.BSA_VERSION_FO4) {
      throw new Error(`Unsupported BSA version: ${version}. Expected ${this.BSA_VERSION_FO4}`);
    }

    // Parse directories and files
    const directories = this.parseDirectories(buffer, offset, folderCount, fileCount);

    return {
      path: filePath,
      version,
      directories,
      totalFiles: fileCount,
      totalSizeCompressed: this.calculateTotalSize(directories, true),
      totalSizeUncompressed: this.calculateTotalSize(directories, false)
    };
  }

  /**
   * Parse directory and file structures
   */
  private static parseDirectories(
    buffer: Buffer,
    offset: number,
    folderCount: number,
    totalFileCount: number
  ): BSADirectory[] {
    const directories: BSADirectory[] = [];
    let currentOffset = offset;

    for (let i = 0; i < folderCount; i++) {
      // Read folder record
      const folderHash = buffer.readBigUInt64LE(currentOffset);
      const fileCount = buffer.readUInt32LE(currentOffset + 8);
      const folderNameOffset = buffer.readUInt32LE(currentOffset + 12);
      currentOffset += 16;

      // Read folder name
      const folderName = this.readBString(buffer, folderNameOffset);

      // Read file records for this folder
      const files: BSAFileEntry[] = [];
      for (let j = 0; j < fileCount; j++) {
        const fileHash = buffer.readBigUInt64LE(currentOffset);
        const fileSize = buffer.readUInt32LE(currentOffset + 8);
        const fileOffset = buffer.readUInt32LE(currentOffset + 12);
        currentOffset += 16;

        // File name will be read from the name block later
        files.push({
          filename: '', // Will be filled in later
          size: fileSize,
          offset: fileOffset,
          compressed: false // Will be determined from flags
        });
      }

      directories.push({
        name: folderName,
        files
      });
    }

    // Read file names block
    const fileNames = this.readFileNames(buffer, currentOffset, totalFileCount);

    // Assign file names to file entries
    let fileNameIndex = 0;
    for (const directory of directories) {
      for (const file of directory.files) {
        if (fileNameIndex < fileNames.length) {
          file.filename = fileNames[fileNameIndex++];
        }
      }
    }

    return directories;
  }

  /**
   * Read null-terminated string from buffer
   */
  private static readBString(buffer: Buffer, offset: number): string {
    let end = offset;
    while (end < buffer.length && buffer[end] !== 0) {
      end++;
    }
    return buffer.toString('utf8', offset, end);
  }

  /**
   * Read all file names from the names block
   */
  private static readFileNames(buffer: Buffer, offset: number, count: number): string[] {
    const names: string[] = [];
    let currentOffset = offset;

    for (let i = 0; i < count; i++) {
      const name = this.readBString(buffer, currentOffset);
      names.push(name);
      currentOffset += name.length + 1; // +1 for null terminator
    }

    return names;
  }

  /**
   * Calculate total size of all files in directories
   */
  private static calculateTotalSize(directories: BSADirectory[], compressed: boolean): number {
    let total = 0;
    for (const dir of directories) {
      for (const file of dir.files) {
        total += file.size;
      }
    }
    return total;
  }

  /**
   * Extract file data from BSA archive
   */
  static async extractFile(archive: BSAArchive, filePath: string): Promise<Buffer> {
    const buffer = await fs.promises.readFile(archive.path);

    // Find the file in the archive
    for (const dir of archive.directories) {
      for (const file of dir.files) {
        const fullPath = path.join(dir.name, file.filename).replace(/\\/g, '/');
        if (fullPath === filePath) {
          // Extract file data
          const fileData = buffer.subarray(file.offset, file.offset + file.size);
          return fileData;
        }
      }
    }

    throw new Error(`File not found in BSA archive: ${filePath}`);
  }

  /**
   * List all files in BSA archive
   */
  static listFiles(archive: BSAArchive): string[] {
    const files: string[] = [];
    for (const dir of archive.directories) {
      for (const file of dir.files) {
        files.push(path.join(dir.name, file.filename).replace(/\\/g, '/'));
      }
    }
    return files;
  }

  /**
   * Check if file exists in BSA archive
   */
  static fileExists(archive: BSAArchive, filePath: string): boolean {
    return this.listFiles(archive).includes(filePath);
  }
}