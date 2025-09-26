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
    <div style={{
      width: '320px',
      backgroundColor: 'white',
      borderLeft: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      {/* 헤더 */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px'
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            margin: 0,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            실시간 로그
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={clearLogs}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                backgroundColor: '#e5e7eb',
                color: '#374151',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              title="로그 지우기"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#d1d5db';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
              }}
            >
              🗑️
            </button>
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: '#6b7280'
        }}>
          <span>총 {logs.length}개</span>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={isAutoScroll}
              onChange={(e) => setIsAutoScroll(e.target.checked)}
              style={{
                width: '12px',
                height: '12px'
              }}
            />
            <span>자동 스크롤</span>
          </label>
        </div>
      </div>

      {/* 로그 목록 */}
      <div 
        ref={logContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
          gap: '4px'
        }}
        onScroll={(e) => {
          const target = e.target as HTMLDivElement;
          const isScrolledToBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 10;
          setIsAutoScroll(isScrolledToBottom);
        }}
      >
        {logs.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            로그가 없습니다
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              style={{
                padding: '8px',
                borderRadius: '4px',
                fontSize: '12px',
                border: '1px solid #e5e7eb',
                marginBottom: '4px',
                color: log.level === 'error' ? '#dc2626' : log.level === 'warning' ? '#d97706' : '#2563eb',
                backgroundColor: log.level === 'error' ? '#fef2f2' : log.level === 'warning' ? '#fffbeb' : '#eff6ff'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '4px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span>{getLogLevelIcon(log.level)}</span>
                  <span style={{
                    fontWeight: '500',
                    textTransform: 'capitalize'
                  }}>
                    {log.level}
                  </span>
                </div>
                <span style={{ color: '#6b7280' }}>{formatTime(log.timestamp)}</span>
              </div>
              <div style={{
                color: '#1f2937',
                wordBreak: 'break-all',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.25'
              }}>
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