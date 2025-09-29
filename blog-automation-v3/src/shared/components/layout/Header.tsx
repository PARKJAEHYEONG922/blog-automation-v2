import React from 'react';
import { Button } from '../ui';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  aiModelStatus: {
    writing: string;
    image: string;
  };
  onLLMSettings: () => void;
  onShowLogs: () => void;
  showLogs: boolean;
}

const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  aiModelStatus,
  onLLMSettings,
  onShowLogs,
  showLogs
}) => {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-lg">🤖</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-gray-900 leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-gray-500">{subtitle}</p>
              )}
              <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                <div className="flex items-center space-x-1.5">
                  <div className={`w-2 h-2 rounded-full ${
                    aiModelStatus.writing !== '미설정' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span>글쓰기: {aiModelStatus.writing}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className={`w-2 h-2 rounded-full ${
                    aiModelStatus.image !== '미설정' ? 'bg-purple-500' : 'bg-red-500'
                  }`}></div>
                  <span>이미지: {aiModelStatus.image}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              onClick={onShowLogs}
              className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                showLogs
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600'
                  : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 hover:-translate-y-0.5 shadow-sm'
              }`}
            >
              <span>📝</span>
              <span>로그</span>
            </Button>
            <Button
              variant="ghost"
              onClick={onLLMSettings}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 bg-white text-gray-600 border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 hover:-translate-y-0.5 shadow-sm"
            >
              <span>🤖</span>
              <span>API 설정</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;