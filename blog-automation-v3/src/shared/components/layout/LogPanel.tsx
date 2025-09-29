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
    const handleLogMessage = (logData: any) => {
      const newLog: LogEntry = {
        level: logData.level || 'info',
        message: logData.message || String(logData),
        timestamp: logData.timestamp ? new Date(logData.timestamp) : new Date()
      };
      
      setLogs(prevLogs => {
        // 최대 500개 로그만 유지
        const newLogs = [...prevLogs, newLog];
        if (newLogs.length > 500) {
          newLogs.splice(0, newLogs.length - 500);
        }
        return newLogs;
      });
    };

    // 로그 수신 리스너 등록
    if (window.electronAPI?.onLogMessage) {
      const unsubscribe = window.electronAPI.onLogMessage(handleLogMessage);
      return unsubscribe;
    }
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
    <div className="w-240 bg-white border-l border-gray-200 flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
            <span className="text-base">📝</span>
            <span>실시간 로그</span>
          </h3>
          <button
            onClick={clearLogs}
            className="px-2 py-1 text-xs bg-gray-200 text-gray-600 border-none rounded hover:bg-gray-300 transition-colors duration-200"
            title="로그 지우기"
          >
            🗑️ 지우기
          </button>
        </div>
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span>총 {logs.length}개</span>
          </span>
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isAutoScroll}
              onChange={(e) => setIsAutoScroll(e.target.checked)}
              className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span>자동 스크롤</span>
          </label>
        </div>
      </div>

      {/* Log List */}
      <div 
        ref={logContainerRef}
        className="flex-1 overflow-y-auto p-2 space-y-2"
        onScroll={(e) => {
          const target = e.target as HTMLDivElement;
          const isScrolledToBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 10;
          setIsAutoScroll(isScrolledToBottom);
        }}
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            <div className="text-center">
              <div className="text-2xl mb-2">📄</div>
              <div>로그가 없습니다</div>
            </div>
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg text-xs border transition-all duration-200 hover:shadow-sm ${
                log.level === 'error' 
                  ? 'text-red-700 bg-red-50 border-red-200' 
                  : log.level === 'warning' 
                  ? 'text-amber-700 bg-amber-50 border-amber-200' 
                  : 'text-blue-700 bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1.5">
                  <span className="text-sm">{getLogLevelIcon(log.level)}</span>
                  <span className="font-medium capitalize">
                    {log.level}
                  </span>
                </div>
                <span className="text-gray-500 text-xs">{formatTime(log.timestamp)}</span>
              </div>
              <div className="text-gray-800 break-all whitespace-pre-wrap leading-relaxed">
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