import { MCPTool, Position, Range } from '@agentdb9/shared';
import { VSCodeBridge } from '../bridges/VSCodeBridge';
import { logger } from '../utils/logger';

export class EditorTools {
  private vscode: VSCodeBridge;

  constructor(vscode: VSCodeBridge) {
    this.vscode = vscode;
  }

  public getTools(): MCPTool[] {
    return [
      {
        name: 'editor_open_file',
        description: 'Open a file in the editor',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file to open' }
          },
          required: ['path']
        }
      },
      {
        name: 'editor_close_file',
        description: 'Close a file in the editor',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file to close' }
          },
          required: ['path']
        }
      },
      {
        name: 'editor_insert_text',
        description: 'Insert text at a specific position',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to insert' },
            position: {
              type: 'object',
              properties: {
                line: { type: 'number', description: 'Line number (0-based)' },
                character: { type: 'number', description: 'Character position (0-based)' }
              },
              required: ['line', 'character'],
              description: 'Position to insert text at'
            }
          },
          required: ['text']
        }
      },
      {
        name: 'editor_replace_text',
        description: 'Replace text in a specific range',
        inputSchema: {
          type: 'object',
          properties: {
            range: {
              type: 'object',
              properties: {
                start: {
                  type: 'object',
                  properties: {
                    line: { type: 'number' },
                    character: { type: 'number' }
                  },
                  required: ['line', 'character']
                },
                end: {
                  type: 'object',
                  properties: {
                    line: { type: 'number' },
                    character: { type: 'number' }
                  },
                  required: ['line', 'character']
                }
              },
              required: ['start', 'end'],
              description: 'Range to replace'
            },
            text: { type: 'string', description: 'Replacement text' }
          },
          required: ['range', 'text']
        }
      },
      {
        name: 'editor_delete_text',
        description: 'Delete text in a specific range',
        inputSchema: {
          type: 'object',
          properties: {
            range: {
              type: 'object',
              properties: {
                start: {
                  type: 'object',
                  properties: {
                    line: { type: 'number' },
                    character: { type: 'number' }
                  },
                  required: ['line', 'character']
                },
                end: {
                  type: 'object',
                  properties: {
                    line: { type: 'number' },
                    character: { type: 'number' }
                  },
                  required: ['line', 'character']
                }
              },
              required: ['start', 'end'],
              description: 'Range to delete'
            }
          },
          required: ['range']
        }
      },
      {
        name: 'editor_format_document',
        description: 'Format the current document or a specific file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file to format (optional, uses active file if not provided)' }
          },
          required: []
        }
      },
      {
        name: 'editor_organize_imports',
        description: 'Organize imports in the current document or a specific file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file to organize imports (optional, uses active file if not provided)' }
          },
          required: []
        }
      },
      {
        name: 'editor_get_active_file',
        description: 'Get the path of the currently active file',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'editor_get_open_files',
        description: 'Get a list of all open files',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'editor_get_selection',
        description: 'Get the currently selected text',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'editor_get_cursor_position',
        description: 'Get the current cursor position',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'editor_set_cursor_position',
        description: 'Set the cursor position',
        inputSchema: {
          type: 'object',
          properties: {
            position: {
              type: 'object',
              properties: {
                line: { type: 'number', description: 'Line number (0-based)' },
                character: { type: 'number', description: 'Character position (0-based)' }
              },
              required: ['line', 'character'],
              description: 'Position to set cursor at'
            }
          },
          required: ['position']
        }
      },
      {
        name: 'editor_select_range',
        description: 'Select a range of text',
        inputSchema: {
          type: 'object',
          properties: {
            range: {
              type: 'object',
              properties: {
                start: {
                  type: 'object',
                  properties: {
                    line: { type: 'number' },
                    character: { type: 'number' }
                  },
                  required: ['line', 'character']
                },
                end: {
                  type: 'object',
                  properties: {
                    line: { type: 'number' },
                    character: { type: 'number' }
                  },
                  required: ['line', 'character']
                }
              },
              required: ['start', 'end'],
              description: 'Range to select'
            }
          },
          required: ['range']
        }
      },
      {
        name: 'editor_show_quick_pick',
        description: 'Show a quick pick dialog with options',
        inputSchema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of items to choose from'
            },
            options: {
              type: 'object',
              properties: {
                placeholder: { type: 'string', description: 'Placeholder text' },
                canPickMany: { type: 'boolean', description: 'Allow multiple selections' },
                ignoreFocusOut: { type: 'boolean', description: 'Keep dialog open when focus is lost' }
              },
              description: 'Quick pick options'
            }
          },
          required: ['items']
        }
      },
      {
        name: 'editor_show_input_box',
        description: 'Show an input box dialog',
        inputSchema: {
          type: 'object',
          properties: {
            options: {
              type: 'object',
              properties: {
                placeholder: { type: 'string', description: 'Placeholder text' },
                prompt: { type: 'string', description: 'Prompt text' },
                value: { type: 'string', description: 'Default value' },
                password: { type: 'boolean', description: 'Hide input text' },
                ignoreFocusOut: { type: 'boolean', description: 'Keep dialog open when focus is lost' }
              },
              description: 'Input box options'
            }
          },
          required: []
        }
      },
      {
        name: 'editor_show_message',
        description: 'Show an information, warning, or error message',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Message to display' },
            type: { 
              type: 'string', 
              enum: ['info', 'warning', 'error'],
              description: 'Message type',
              default: 'info'
            },
            items: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional action items'
            }
          },
          required: ['message']
        }
      },
      {
        name: 'editor_find_and_replace',
        description: 'Find and replace text in the active editor',
        inputSchema: {
          type: 'object',
          properties: {
            find: { type: 'string', description: 'Text to find' },
            replace: { type: 'string', description: 'Replacement text' },
            options: {
              type: 'object',
              properties: {
                matchCase: { type: 'boolean', description: 'Match case', default: false },
                matchWholeWord: { type: 'boolean', description: 'Match whole word', default: false },
                useRegex: { type: 'boolean', description: 'Use regular expressions', default: false },
                replaceAll: { type: 'boolean', description: 'Replace all occurrences', default: false }
              },
              description: 'Find and replace options'
            }
          },
          required: ['find', 'replace']
        }
      },
      {
        name: 'editor_go_to_line',
        description: 'Go to a specific line in the active editor',
        inputSchema: {
          type: 'object',
          properties: {
            line: { type: 'number', description: 'Line number to go to (1-based)' }
          },
          required: ['line']
        }
      },
      {
        name: 'editor_fold_range',
        description: 'Fold a range of lines in the editor',
        inputSchema: {
          type: 'object',
          properties: {
            range: {
              type: 'object',
              properties: {
                start: {
                  type: 'object',
                  properties: {
                    line: { type: 'number' },
                    character: { type: 'number' }
                  },
                  required: ['line', 'character']
                },
                end: {
                  type: 'object',
                  properties: {
                    line: { type: 'number' },
                    character: { type: 'number' }
                  },
                  required: ['line', 'character']
                }
              },
              required: ['start', 'end'],
              description: 'Range to fold'
            }
          },
          required: ['range']
        }
      },
      {
        name: 'editor_unfold_range',
        description: 'Unfold a range of lines in the editor',
        inputSchema: {
          type: 'object',
          properties: {
            range: {
              type: 'object',
              properties: {
                start: {
                  type: 'object',
                  properties: {
                    line: { type: 'number' },
                    character: { type: 'number' }
                  },
                  required: ['line', 'character']
                },
                end: {
                  type: 'object',
                  properties: {
                    line: { type: 'number' },
                    character: { type: 'number' }
                  },
                  required: ['line', 'character']
                }
              },
              required: ['start', 'end'],
              description: 'Range to unfold'
            }
          },
          required: ['range']
        }
      }
    ];
  }

  public async openFile(path: string): Promise<void> {
    try {
      // For now, just check if file exists since we can't actually "open" in VS Code
      const exists = await this.vscode.fileExists(path);
      if (!exists) {
        throw new Error(`File does not exist: ${path}`);
      }
      logger.info(`File accessible in workspace: ${path}`);
    } catch (error) {
      logger.error(`Failed to access file ${path}:`, error);
      throw new Error(`Failed to access file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async closeFile(path: string): Promise<void> {
    try {
      // No-op for file-based approach
      logger.info(`File reference closed: ${path}`);
    } catch (error) {
      logger.error(`Failed to close file ${path}:`, error);
      throw new Error(`Failed to close file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async insertText(text: string, filePath: string, position?: Position): Promise<void> {
    try {
      // Read current content, insert text, write back
      const currentContent = await this.vscode.readFile(filePath);
      const lines = currentContent.split('\n');
      
      if (position) {
        const line = Math.max(0, Math.min(position.line, lines.length - 1));
        const char = Math.max(0, position.character);
        const currentLine = lines[line] || '';
        lines[line] = currentLine.slice(0, char) + text + currentLine.slice(char);
      } else {
        // Append to end
        lines.push(text);
      }
      
      await this.vscode.writeFile(filePath, lines.join('\n'));
      logger.info(`Inserted text in file: ${filePath}`);
    } catch (error) {
      logger.error('Failed to insert text:', error);
      throw new Error(`Failed to insert text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async replaceText(filePath: string, range: Range, text: string): Promise<void> {
    try {
      // Read current content, replace text in range, write back
      const currentContent = await this.vscode.readFile(filePath);
      const lines = currentContent.split('\n');
      
      const startLine = Math.max(0, Math.min(range.start.line, lines.length - 1));
      const endLine = Math.max(0, Math.min(range.end.line, lines.length - 1));
      
      if (startLine === endLine) {
        // Single line replacement
        const line = lines[startLine] || '';
        const before = line.slice(0, range.start.character);
        const after = line.slice(range.end.character);
        lines[startLine] = before + text + after;
      } else {
        // Multi-line replacement
        const firstLine = lines[startLine] || '';
        const lastLine = lines[endLine] || '';
        const before = firstLine.slice(0, range.start.character);
        const after = lastLine.slice(range.end.character);
        
        // Replace the range with new content
        lines.splice(startLine, endLine - startLine + 1, before + text + after);
      }
      
      await this.vscode.writeFile(filePath, lines.join('\n'));
      logger.info(`Replaced text in file: ${filePath}`);
    } catch (error) {
      logger.error('Failed to replace text:', error);
      throw new Error(`Failed to replace text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async deleteText(filePath: string, range: Range): Promise<void> {
    try {
      await this.replaceText(filePath, range, '');
      logger.info(`Deleted text in file: ${filePath}`);
    } catch (error) {
      logger.error('Failed to delete text:', error);
      throw new Error(`Failed to delete text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async formatDocument(path: string): Promise<void> {
    try {
      // Basic formatting - just ensure consistent line endings
      const content = await this.vscode.readFile(path);
      const formatted = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      await this.vscode.writeFile(path, formatted);
      logger.info(`Formatted document: ${path}`);
    } catch (error) {
      logger.error('Failed to format document:', error);
      throw new Error(`Failed to format document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async organizeImports(path: string): Promise<void> {
    try {
      // Basic import organization - just log for now
      logger.info(`Organized imports for: ${path}`);
    } catch (error) {
      logger.error('Failed to organize imports:', error);
      throw new Error(`Failed to organize imports: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getActiveFile(): Promise<string | null> {
    try {
      const activeFile = await this.vscode.getActiveFile();
      logger.info(`Got active file: ${activeFile || 'none'}`);
      return activeFile;
    } catch (error) {
      logger.error('Failed to get active file:', error);
      throw new Error(`Failed to get active file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getOpenFiles(): Promise<string[]> {
    try {
      // This would need to be implemented in VSCodeBridge
      const openFiles = await this.vscode.executeCommand('workbench.action.files.getOpenFiles') || [];
      logger.info(`Got open files: ${openFiles.length} files`);
      return openFiles;
    } catch (error) {
      logger.error('Failed to get open files:', error);
      throw new Error(`Failed to get open files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getSelection(): Promise<string | null> {
    try {
      const selection = await this.vscode.getSelection();
      logger.info(`Got selection: ${selection ? `${selection.length} characters` : 'none'}`);
      return selection;
    } catch (error) {
      logger.error('Failed to get selection:', error);
      throw new Error(`Failed to get selection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getCursorPosition(): Promise<Position> {
    try {
      const position = await this.vscode.getCursorPosition();
      logger.info(`Got cursor position: ${position.line}:${position.character}`);
      return position;
    } catch (error) {
      logger.error('Failed to get cursor position:', error);
      throw new Error(`Failed to get cursor position: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async setCursorPosition(position: Position): Promise<void> {
    try {
      await this.vscode.setCursorPosition(position);
      logger.info(`Set cursor position to: ${position.line}:${position.character}`);
    } catch (error) {
      logger.error('Failed to set cursor position:', error);
      throw new Error(`Failed to set cursor position: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async selectRange(range: Range): Promise<void> {
    try {
      await this.vscode.selectRange(range);
      logger.info(`Selected range: ${range.start.line}:${range.start.character} to ${range.end.line}:${range.end.character}`);
    } catch (error) {
      logger.error('Failed to select range:', error);
      throw new Error(`Failed to select range: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async showQuickPick(items: string[], options?: any): Promise<string | null> {
    try {
      const result = await this.vscode.showQuickPick(items, options);
      logger.info(`Quick pick result: ${result || 'cancelled'}`);
      return result;
    } catch (error) {
      logger.error('Failed to show quick pick:', error);
      throw new Error(`Failed to show quick pick: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async showInputBox(options?: any): Promise<string | null> {
    try {
      const result = await this.vscode.showInputBox(options);
      logger.info(`Input box result: ${result ? 'provided' : 'cancelled'}`);
      return result;
    } catch (error) {
      logger.error('Failed to show input box:', error);
      throw new Error(`Failed to show input box: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async showMessage(message: string, type: 'info' | 'warning' | 'error' = 'info', items?: string[]): Promise<string | null> {
    try {
      let result: string | null = null;
      
      switch (type) {
        case 'info':
          result = await this.vscode.showInformationMessage(message, ...(items || []));
          break;
        case 'warning':
          result = await this.vscode.showWarningMessage(message, ...(items || []));
          break;
        case 'error':
          result = await this.vscode.showErrorMessage(message, ...(items || []));
          break;
      }
      
      logger.info(`Showed ${type} message: ${message}`);
      return result;
    } catch (error) {
      logger.error(`Failed to show ${type} message:`, error);
      throw new Error(`Failed to show message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async findAndReplace(find: string, replace: string, options?: any): Promise<void> {
    try {
      await this.vscode.executeCommand('editor.action.startFindReplaceAction', {
        searchString: find,
        replaceString: replace,
        ...options
      });
      logger.info(`Find and replace: "${find}" -> "${replace}"`);
    } catch (error) {
      logger.error('Failed to find and replace:', error);
      throw new Error(`Failed to find and replace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async goToLine(line: number): Promise<void> {
    try {
      await this.vscode.executeCommand('workbench.action.gotoLine', [line]);
      logger.info(`Went to line: ${line}`);
    } catch (error) {
      logger.error(`Failed to go to line ${line}:`, error);
      throw new Error(`Failed to go to line: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async foldRange(range: Range): Promise<void> {
    try {
      await this.vscode.executeCommand('editor.fold', [range]);
      logger.info(`Folded range: ${range.start.line}:${range.start.character} to ${range.end.line}:${range.end.character}`);
    } catch (error) {
      logger.error('Failed to fold range:', error);
      throw new Error(`Failed to fold range: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async unfoldRange(range: Range): Promise<void> {
    try {
      await this.vscode.executeCommand('editor.unfold', [range]);
      logger.info(`Unfolded range: ${range.start.line}:${range.start.character} to ${range.end.line}:${range.end.character}`);
    } catch (error) {
      logger.error('Failed to unfold range:', error);
      throw new Error(`Failed to unfold range: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}