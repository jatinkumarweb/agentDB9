import * as vscode from 'vscode';
import * as fs from 'fs';

let agentTerminal: vscode.Terminal | undefined;
let logWatcher: fs.FSWatcher | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('AgentDB9 Terminal Integration activated');

    // Create agent terminal
    const showTerminalCommand = vscode.commands.registerCommand('agentdb9.showAgentTerminal', () => {
        createAgentTerminal();
    });

    const clearTerminalCommand = vscode.commands.registerCommand('agentdb9.clearAgentTerminal', () => {
        if (agentTerminal) {
            agentTerminal.dispose();
            agentTerminal = undefined;
        }
        createAgentTerminal();
    });

    context.subscriptions.push(showTerminalCommand, clearTerminalCommand);

    // Auto-create terminal on startup if configured
    const config = vscode.workspace.getConfiguration('agentdb9.terminal');
    if (config.get('autoShow')) {
        createAgentTerminal();
    }

    // Watch the log file for changes
    watchLogFile();
}

function createAgentTerminal() {
    if (!agentTerminal) {
        agentTerminal = vscode.window.createTerminal({
            name: '🤖 Agent Terminal',
            shellPath: '/bin/bash',
            shellArgs: ['-c', 'tail -f /home/coder/workspace/.agent-terminal.log 2>/dev/null || echo "Waiting for agent commands..."']
        });

        // Show the terminal
        agentTerminal.show(true);

        // Handle terminal disposal
        vscode.window.onDidCloseTerminal((terminal) => {
            if (terminal === agentTerminal) {
                agentTerminal = undefined;
            }
        });
    } else {
        agentTerminal.show(true);
    }
}

function watchLogFile() {
    const config = vscode.workspace.getConfiguration('agentdb9.terminal');
    const logFile = config.get<string>('logFile') || '/home/coder/workspace/.agent-terminal.log';

    try {
        // Watch for file creation/changes
        const logDir = logFile.substring(0, logFile.lastIndexOf('/'));
        
        logWatcher = fs.watch(logDir, (eventType, filename) => {
            if (filename === '.agent-terminal.log' && eventType === 'change') {
                // Auto-show terminal when log file is updated
                if (config.get('autoShow') && !agentTerminal) {
                    createAgentTerminal();
                }
            }
        });
    } catch (error) {
        console.error('Failed to watch log file:', error);
    }
}

export function deactivate() {
    if (logWatcher) {
        logWatcher.close();
    }
    if (agentTerminal) {
        agentTerminal.dispose();
    }
}
