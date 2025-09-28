import simpleGit, { SimpleGit, StatusResult, LogResult } from 'simple-git';
import { MCPTool, GitStatus, GitCommit } from '@agentdb9/shared';
import { logger } from '../utils/logger';

export class GitTools {
  private git: SimpleGit;

  constructor(workingDir?: string) {
    this.git = simpleGit(workingDir || process.cwd());
  }

  public getTools(): MCPTool[] {
    return [
      {
        name: 'git_status',
        description: 'Get the current git repository status',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'git_add',
        description: 'Add files to the git staging area',
        inputSchema: {
          type: 'object',
          properties: {
            files: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Array of file paths to add' 
            }
          },
          required: ['files']
        }
      },
      {
        name: 'git_commit',
        description: 'Commit staged changes with a message',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Commit message' }
          },
          required: ['message']
        }
      },
      {
        name: 'git_push',
        description: 'Push commits to remote repository',
        inputSchema: {
          type: 'object',
          properties: {
            remote: { type: 'string', description: 'Remote name', default: 'origin' },
            branch: { type: 'string', description: 'Branch name' }
          },
          required: []
        }
      },
      {
        name: 'git_pull',
        description: 'Pull changes from remote repository',
        inputSchema: {
          type: 'object',
          properties: {
            remote: { type: 'string', description: 'Remote name', default: 'origin' },
            branch: { type: 'string', description: 'Branch name' }
          },
          required: []
        }
      },
      {
        name: 'git_checkout',
        description: 'Checkout a branch or commit',
        inputSchema: {
          type: 'object',
          properties: {
            branch: { type: 'string', description: 'Branch name or commit hash' }
          },
          required: ['branch']
        }
      },
      {
        name: 'git_create_branch',
        description: 'Create a new branch',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Branch name' },
            checkout: { type: 'boolean', description: 'Whether to checkout the new branch', default: true }
          },
          required: ['name']
        }
      },
      {
        name: 'git_list_branches',
        description: 'List all branches',
        inputSchema: {
          type: 'object',
          properties: {
            remote: { type: 'boolean', description: 'Include remote branches', default: false }
          },
          required: []
        }
      },
      {
        name: 'git_current_branch',
        description: 'Get the current branch name',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'git_diff',
        description: 'Show differences between commits, commit and working tree, etc',
        inputSchema: {
          type: 'object',
          properties: {
            file: { type: 'string', description: 'Specific file to show diff for' },
            staged: { type: 'boolean', description: 'Show staged changes', default: false }
          },
          required: []
        }
      },
      {
        name: 'git_log',
        description: 'Show commit history',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of commits to show', default: 10 },
            oneline: { type: 'boolean', description: 'Show one line per commit', default: false }
          },
          required: []
        }
      },
      {
        name: 'git_reset',
        description: 'Reset current HEAD to the specified state',
        inputSchema: {
          type: 'object',
          properties: {
            mode: { 
              type: 'string', 
              enum: ['soft', 'mixed', 'hard'],
              description: 'Reset mode',
              default: 'mixed'
            },
            commit: { type: 'string', description: 'Commit hash or reference', default: 'HEAD' }
          },
          required: []
        }
      },
      {
        name: 'git_stash',
        description: 'Stash changes in a dirty working directory',
        inputSchema: {
          type: 'object',
          properties: {
            action: { 
              type: 'string', 
              enum: ['push', 'pop', 'list', 'apply', 'drop'],
              description: 'Stash action',
              default: 'push'
            },
            message: { type: 'string', description: 'Stash message (for push action)' },
            index: { type: 'number', description: 'Stash index (for pop, apply, drop actions)' }
          },
          required: ['action']
        }
      },
      {
        name: 'git_init',
        description: 'Initialize a new git repository',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to initialize repository in' }
          },
          required: []
        }
      },
      {
        name: 'git_clone',
        description: 'Clone a repository',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Repository URL to clone' },
            path: { type: 'string', description: 'Local path to clone to' },
            branch: { type: 'string', description: 'Specific branch to clone' }
          },
          required: ['url']
        }
      }
    ];
  }

  public async getStatus(): Promise<GitStatus> {
    try {
      const status: StatusResult = await this.git.status();
      const currentBranch = await this.getCurrentBranch();
      
      return {
        branch: currentBranch,
        ahead: status.ahead,
        behind: status.behind,
        modified: status.modified,
        added: status.created,
        deleted: status.deleted,
        untracked: status.not_added
      };
    } catch (error) {
      logger.error('Failed to get git status:', error);
      throw new Error(`Failed to get git status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async add(files: string[]): Promise<void> {
    try {
      await this.git.add(files);
      logger.info(`Added files to git: ${files.join(', ')}`);
    } catch (error) {
      logger.error('Failed to add files to git:', error);
      throw new Error(`Failed to add files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async commit(message: string): Promise<void> {
    try {
      await this.git.commit(message);
      logger.info(`Committed with message: ${message}`);
    } catch (error) {
      logger.error('Failed to commit:', error);
      throw new Error(`Failed to commit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async push(remote: string = 'origin', branch?: string): Promise<void> {
    try {
      if (branch) {
        await this.git.push(remote, branch);
      } else {
        await this.git.push();
      }
      logger.info(`Pushed to ${remote}${branch ? `/${branch}` : ''}`);
    } catch (error) {
      logger.error('Failed to push:', error);
      throw new Error(`Failed to push: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async pull(remote: string = 'origin', branch?: string): Promise<void> {
    try {
      if (branch) {
        await this.git.pull(remote, branch);
      } else {
        await this.git.pull();
      }
      logger.info(`Pulled from ${remote}${branch ? `/${branch}` : ''}`);
    } catch (error) {
      logger.error('Failed to pull:', error);
      throw new Error(`Failed to pull: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async checkout(branch: string): Promise<void> {
    try {
      await this.git.checkout(branch);
      logger.info(`Checked out branch: ${branch}`);
    } catch (error) {
      logger.error(`Failed to checkout branch ${branch}:`, error);
      throw new Error(`Failed to checkout branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async createBranch(name: string, checkout: boolean = true): Promise<void> {
    try {
      if (checkout) {
        await this.git.checkoutLocalBranch(name);
      } else {
        await this.git.branch([name]);
      }
      logger.info(`Created branch: ${name}${checkout ? ' and checked out' : ''}`);
    } catch (error) {
      logger.error(`Failed to create branch ${name}:`, error);
      throw new Error(`Failed to create branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getBranches(includeRemote: boolean = false): Promise<string[]> {
    try {
      const branches = await this.git.branch(includeRemote ? ['-a'] : []);
      return branches.all.filter(branch => branch !== 'HEAD');
    } catch (error) {
      logger.error('Failed to get branches:', error);
      throw new Error(`Failed to get branches: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getCurrentBranch(): Promise<string> {
    try {
      const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
      return branch.trim();
    } catch (error) {
      logger.error('Failed to get current branch:', error);
      throw new Error(`Failed to get current branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getDiff(file?: string, staged: boolean = false): Promise<string> {
    try {
      const options = [];
      if (staged) {
        options.push('--cached');
      }
      if (file) {
        options.push(file);
      }
      
      const diff = await this.git.diff(options);
      return diff;
    } catch (error) {
      logger.error('Failed to get diff:', error);
      throw new Error(`Failed to get diff: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getLog(limit: number = 10): Promise<GitCommit[]> {
    try {
      const log: LogResult = await this.git.log({ maxCount: limit });
      
      return log.all.map(commit => ({
        hash: commit.hash,
        message: commit.message,
        author: commit.author_name,
        date: new Date(commit.date)
      }));
    } catch (error) {
      logger.error('Failed to get git log:', error);
      throw new Error(`Failed to get git log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async reset(mode: 'soft' | 'mixed' | 'hard' = 'mixed', commit: string = 'HEAD'): Promise<void> {
    try {
      await this.git.reset([`--${mode}`, commit]);
      logger.info(`Reset ${mode} to ${commit}`);
    } catch (error) {
      logger.error(`Failed to reset ${mode} to ${commit}:`, error);
      throw new Error(`Failed to reset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async stash(action: 'push' | 'pop' | 'list' | 'apply' | 'drop', options?: { message?: string; index?: number }): Promise<any> {
    try {
      switch (action) {
        case 'push':
          const pushArgs = ['push'];
          if (options?.message) {
            pushArgs.push('-m', options.message);
          }
          await this.git.stash(pushArgs);
          logger.info(`Stashed changes${options?.message ? ` with message: ${options.message}` : ''}`);
          break;

        case 'pop':
          const popArgs = ['pop'];
          if (options?.index !== undefined) {
            popArgs.push(`stash@{${options.index}}`);
          }
          await this.git.stash(popArgs);
          logger.info(`Popped stash${options?.index !== undefined ? ` at index ${options.index}` : ''}`);
          break;

        case 'list':
          const list = await this.git.stash(['list']);
          logger.info('Listed stashes');
          return list;

        case 'apply':
          const applyArgs = ['apply'];
          if (options?.index !== undefined) {
            applyArgs.push(`stash@{${options.index}}`);
          }
          await this.git.stash(applyArgs);
          logger.info(`Applied stash${options?.index !== undefined ? ` at index ${options.index}` : ''}`);
          break;

        case 'drop':
          const dropArgs = ['drop'];
          if (options?.index !== undefined) {
            dropArgs.push(`stash@{${options.index}}`);
          }
          await this.git.stash(dropArgs);
          logger.info(`Dropped stash${options?.index !== undefined ? ` at index ${options.index}` : ''}`);
          break;

        default:
          throw new Error(`Unknown stash action: ${action}`);
      }
    } catch (error) {
      logger.error(`Failed to ${action} stash:`, error);
      throw new Error(`Failed to ${action} stash: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async init(path?: string): Promise<void> {
    try {
      if (path) {
        await this.git.cwd(path);
      }
      await this.git.init();
      logger.info(`Initialized git repository${path ? ` in ${path}` : ''}`);
    } catch (error) {
      logger.error('Failed to initialize git repository:', error);
      throw new Error(`Failed to initialize git repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async clone(url: string, path?: string, branch?: string): Promise<void> {
    try {
      const options: string[] = [];
      if (branch) {
        options.push('-b', branch);
      }
      if (path) {
        options.push(path);
      }
      
      if (path) {
        await this.git.clone(url, path, options);
      } else {
        await this.git.clone(url, options);
      }
      logger.info(`Cloned repository ${url}${path ? ` to ${path}` : ''}${branch ? ` (branch: ${branch})` : ''}`);
    } catch (error) {
      logger.error(`Failed to clone repository ${url}:`, error);
      throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async isRepository(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch {
      return false;
    }
  }

  public setWorkingDirectory(path: string): void {
    this.git = simpleGit(path);
  }
}