'use client';

import { useState, useEffect, useRef } from 'react';

interface LogEntry {
  timestamp: string;
  message: string;
  stream?: 'stdout' | 'stderr';
}

interface ContainerLogsViewerProps {
  workspaceId: string;
  maxLines?: number;
  autoScroll?: boolean;
}

export function ContainerLogsViewer({ 
  workspaceId, 
  maxLines = 500,
  autoScroll = true 
}: ContainerLogsViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [filter, setFilter] = useState<'all' | 'stdout' | 'stderr'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchLogs();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [workspaceId]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/workspaces/${workspaceId}/logs?tail=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();
      const logEntries = data.data.logs.map((log: string) => parseLogEntry(log));
      setLogs(logEntries);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const startStreaming = async () => {
    try {
      setIsStreaming(true);
      setError(null);
      
      abortControllerRef.current = new AbortController();
      const token = localStorage.getItem('auth-token');
      
      const response = await fetch(`/api/workspaces/${workspaceId}/logs/stream`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to start log stream');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        const newLogs = lines.map(line => parseLogEntry(line));
        
        setLogs(prev => {
          const updated = [...prev, ...newLogs];
          return updated.slice(-maxLines);
        });
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  const parseLogEntry = (log: string): LogEntry => {
    // Try to parse timestamp and stream from log format
    const timestampMatch = log.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)/);
    const timestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString();
    
    // Detect stderr by common error patterns
    const isError = /error|exception|fatal|panic|fail/i.test(log);
    const stream = isError ? 'stderr' : 'stdout';
    
    return {
      timestamp,
      message: log,
      stream,
    };
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const downloadLogs = () => {
    const logText = logs.map(log => `[${log.timestamp}] ${log.message}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace-${workspaceId}-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter(log => {
    if (filter !== 'all' && log.stream !== filter) return false;
    if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Container Logs</h3>
          <div className="flex items-center space-x-2">
            {!isStreaming ? (
              <button
                onClick={startStreaming}
                className="px-3 py-1 text-xs font-medium text-white bg-green-500 rounded hover:bg-green-600"
              >
                Start Stream
              </button>
            ) : (
              <button
                onClick={stopStreaming}
                className="px-3 py-1 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600"
              >
                Stop Stream
              </button>
            )}
            <button
              onClick={fetchLogs}
              className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              disabled={isStreaming}
            >
              Refresh
            </button>
            <button
              onClick={downloadLogs}
              className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              disabled={logs.length === 0}
            >
              Download
            </button>
            <button
              onClick={clearLogs}
              className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-1 text-xs font-medium rounded ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('stdout')}
              className={`px-2 py-1 text-xs font-medium rounded ${
                filter === 'stdout'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Stdout
            </button>
            <button
              onClick={() => setFilter('stderr')}
              className={`px-2 py-1 text-xs font-medium rounded ${
                filter === 'stderr'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Stderr
            </button>
          </div>
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Logs Display */}
      <div 
        ref={logsContainerRef}
        className="p-4 bg-gray-900 text-gray-100 font-mono text-xs overflow-auto"
        style={{ height: '400px' }}
      >
        {loading && logs.length === 0 ? (
          <div className="text-gray-400">Loading logs...</div>
        ) : error ? (
          <div className="text-red-400">{error}</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-gray-400">No logs to display</div>
        ) : (
          <>
            {filteredLogs.map((log, index) => (
              <div
                key={index}
                className={`py-1 ${
                  log.stream === 'stderr' ? 'text-red-400' : 'text-gray-100'
                }`}
              >
                <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                {log.message}
              </div>
            ))}
            <div ref={logsEndRef} />
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
        <div>
          {isStreaming && (
            <span className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
              Streaming...
            </span>
          )}
        </div>
        <div>
          Showing {filteredLogs.length} of {logs.length} lines
        </div>
      </div>
    </div>
  );
}
