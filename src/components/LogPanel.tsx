import React, { useState, useEffect, useRef } from 'react';

interface LogEntry {
  level: string;
  message: string;
  timestamp: Date;
}

interface LogPanelProps {
  isVisible: boolean;
}

const LogPanel: React.FC<LogPanelProps> = ({ isVisible }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleLogMessage = (logData: LogEntry) => {
      setLogs(prevLogs => {
        // 최대 500개 로그만 유지
        const newLogs = [...prevLogs, logData];
        if (newLogs.length > 500) {
          newLogs.splice(0, newLogs.length - 500);
        }
        return newLogs;
      });
    };

    // 로그 수신 리스너 등록
    if (window.electronAPI) {
      window.electronAPI.onLogMessage(handleLogMessage);
    }

    return () => {
      // 컴포넌트 언마운트 시 리스너 제거
      if (window.electronAPI) {
        window.electronAPI.removeLogListener();
      }
    };
  }, []);

  // 자동 스크롤
  useEffect(() => {
    if (isAutoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isAutoScroll]);

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  const getLogLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(timestamp));
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">실시간 로그</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={clearLogs}
              className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              title="로그 지우기"
            >
              🗑️
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span>총 {logs.length}개</span>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={isAutoScroll}
              onChange={(e) => setIsAutoScroll(e.target.checked)}
              className="w-3 h-3"
            />
            <span>자동 스크롤</span>
          </label>
        </div>
      </div>

      {/* 로그 목록 */}
      <div 
        ref={logContainerRef}
        className="flex-1 overflow-y-auto p-2 space-y-1"
        onScroll={(e) => {
          const target = e.target as HTMLDivElement;
          const isScrolledToBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 10;
          setIsAutoScroll(isScrolledToBottom);
        }}
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            로그가 없습니다
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className={`p-2 rounded text-xs border ${getLogLevelColor(log.level)}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <span>{getLogLevelIcon(log.level)}</span>
                  <span className="font-medium capitalize">{log.level}</span>
                </div>
                <span className="text-gray-500">{formatTime(log.timestamp)}</span>
              </div>
              <div className="text-gray-800 break-all whitespace-pre-wrap leading-tight">
                {log.message}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LogPanel;