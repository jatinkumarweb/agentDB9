import fs from 'fs/promises';
import path from 'path';
import chokidar from 'chokidar';
import { MCPTool, DirectoryEntry, FileStats } from '@agentdb9/shared';
import { logger } from '../utils/logger';

export class FileSystemTools {
  private watchers = new Map<string, chokidar.FSWatcher>();

  public getTools(): MCPTool[] {
    return [
      {
        name: 'fs_read_file',
        description: 'Read the contents of a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file to read' }
          },
          required: ['path']
        }
      },
      {
        name: 'fs_write_file',
        description: 'Write content to a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file to write' },
            content: { type: 'string', description: 'Content to write to the file' }
          },
          required: ['path', 'content']
        }
      },
      {
        name: 'fs_create_file',
        description: 'Create a new file with optional content',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file to create' },
            content: { type: 'string', description: 'Initial content for the file', default: '' }
          },
          required: ['path']
        }
      },
      {
        name: 'fs_delete_file',
        description: 'Delete a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file to delete' }
          },
          required: ['path']
        }
      },
      {
        name: 'fs_rename_file',
        description: 'Rename or move a file',
        inputSchema: {
          type: 'object',
          properties: {
            oldPath: { type: 'string', description: 'Current path of the file' },
            newPath: { type: 'string', description: 'New path for the file' }
          },
          required: ['oldPath', 'newPath']
        }
      },
      {
        name: 'fs_copy_file',
        description: 'Copy a file to a new location',
        inputSchema: {
          type: 'object',
          properties: {
            source: { type: 'string', description: 'Source file path' },
            destination: { type: 'string', description: 'Destination file path' }
          },
          required: ['source', 'destination']
        }
      },
      {
        name: 'fs_create_directory',
        description: 'Create a directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the directory to create' }
          },
          required: ['path']
        }
      },
      {
        name: 'fs_delete_directory',
        description: 'Delete a directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the directory to delete' },
            recursive: { type: 'boolean', description: 'Whether to delete recursively', default: false }
          },
          required: ['path']
        }
      },
      {
        name: 'fs_list_directory',
        description: 'List contents of a directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the directory to list' }
          },
          required: ['path']
        }
      },
      {
        name: 'fs_exists',
        description: 'Check if a file or directory exists',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to check' }
          },
          required: ['path']
        }
      },
      {
        name: 'fs_get_stats',
        description: 'Get file or directory statistics',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to get stats for' }
          },
          required: ['path']
        }
      },
      {
        name: 'fs_watch_file',
        description: 'Watch a file or directory for changes',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to watch' },
            watchId: { type: 'string', description: 'Unique identifier for this watch' }
          },
          required: ['path', 'watchId']
        }
      },
      {
        name: 'fs_unwatch_file',
        description: 'Stop watching a file or directory',
        inputSchema: {
          type: 'object',
          properties: {
            watchId: { type: 'string', description: 'Watch identifier to stop' }
          },
          required: ['watchId']
        }
      }
    ];
  }

  public async readFile(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      logger.info(`Read file: ${filePath}`);
      return content;
    } catch (error) {
      logger.error(`Failed to read file ${filePath}:`, error);
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async writeFile(filePath: string, content: string): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(filePath, content, 'utf-8');
      logger.info(`Wrote file: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to write file ${filePath}:`, error);
      throw new Error(`Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async createFile(filePath: string, content: string = ''): Promise<void> {
    try {
      // Check if file already exists
      const exists = await this.exists(filePath);
      if (exists) {
        throw new Error(`File already exists: ${filePath}`);
      }

      await this.writeFile(filePath, content);
      logger.info(`Created file: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to create file ${filePath}:`, error);
      throw error;
    }
  }

  public async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      logger.info(`Deleted file: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to delete file ${filePath}:`, error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async renameFile(oldPath: string, newPath: string): Promise<void> {
    try {
      // Ensure destination directory exists
      const dir = path.dirname(newPath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.rename(oldPath, newPath);
      logger.info(`Renamed file: ${oldPath} -> ${newPath}`);
    } catch (error) {
      logger.error(`Failed to rename file ${oldPath} to ${newPath}:`, error);
      throw new Error(`Failed to rename file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async copyFile(source: string, destination: string): Promise<void> {
    try {
      // Ensure destination directory exists
      const dir = path.dirname(destination);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.copyFile(source, destination);
      logger.info(`Copied file: ${source} -> ${destination}`);
    } catch (error) {
      logger.error(`Failed to copy file ${source} to ${destination}:`, error);
      throw new Error(`Failed to copy file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async createDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      logger.info(`Created directory: ${dirPath}`);
    } catch (error) {
      logger.error(`Failed to create directory ${dirPath}:`, error);
      throw new Error(`Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async deleteDirectory(dirPath: string, recursive: boolean = false): Promise<void> {
    try {
      if (recursive) {
        await fs.rm(dirPath, { recursive: true, force: true });
      } else {
        await fs.rmdir(dirPath);
      }
      logger.info(`Deleted directory: ${dirPath}`);
    } catch (error) {
      logger.error(`Failed to delete directory ${dirPath}:`, error);
      throw new Error(`Failed to delete directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async listDirectory(dirPath: string): Promise<DirectoryEntry[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const result: DirectoryEntry[] = [];

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const stats = await fs.stat(fullPath);
        
        result.push({
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          path: fullPath,
          size: entry.isFile() ? stats.size : undefined,
          lastModified: stats.mtime
        });
      }

      logger.info(`Listed directory: ${dirPath} (${result.length} entries)`);
      return result;
    } catch (error) {
      logger.error(`Failed to list directory ${dirPath}:`, error);
      throw new Error(`Failed to list directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  public async isDirectory(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  public async isFile(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  public async getFileStats(filePath: string): Promise<FileStats> {
    try {
      const stats = await fs.stat(filePath);
      
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        permissions: stats.mode.toString(8)
      };
    } catch (error) {
      logger.error(`Failed to get stats for ${filePath}:`, error);
      throw new Error(`Failed to get file stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async watchFile(filePath: string, watchId: string, callback?: (event: any) => void): Promise<string> {
    try {
      // Stop existing watcher if any
      if (this.watchers.has(watchId)) {
        await this.unwatchFile(watchId);
      }

      const watcher = chokidar.watch(filePath, {
        persistent: true,
        ignoreInitial: true
      });

      watcher.on('all', (event, path) => {
        const watchEvent = {
          type: event as 'created' | 'modified' | 'deleted',
          path,
          timestamp: new Date()
        };
        
        logger.info(`File watch event: ${event} on ${path}`);
        
        if (callback) {
          callback(watchEvent);
        }
      });

      this.watchers.set(watchId, watcher);
      logger.info(`Started watching: ${filePath} (ID: ${watchId})`);
      
      return watchId;
    } catch (error) {
      logger.error(`Failed to watch file ${filePath}:`, error);
      throw new Error(`Failed to watch file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async unwatchFile(watchId: string): Promise<void> {
    try {
      const watcher = this.watchers.get(watchId);
      if (watcher) {
        await watcher.close();
        this.watchers.delete(watchId);
        logger.info(`Stopped watching: ${watchId}`);
      }
    } catch (error) {
      logger.error(`Failed to unwatch ${watchId}:`, error);
      throw new Error(`Failed to unwatch file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async cleanup(): Promise<void> {
    // Close all watchers
    for (const [watchId, watcher] of this.watchers) {
      try {
        await watcher.close();
        logger.info(`Closed watcher: ${watchId}`);
      } catch (error) {
        logger.error(`Failed to close watcher ${watchId}:`, error);
      }
    }
    this.watchers.clear();
  }
}