import React, { useState, useEffect } from 'react';
import { NaverTrendService, TrendKeyword, TrendCategory } from '@/shared/services/content/naver-trend-service';
import { TrendAnalysisResult } from '@/shared/services/content/blog-trend-analyzer';
import Button from '@/shared/components/ui/Button';
import CategorySettingsModal from './CategorySettingsModal';
import TrendContentModal from './TrendContentModal';

interface TrendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisComplete: (result: TrendAnalysisResult) => void;
}

const TrendModal: React.FC<TrendModalProps> = ({ isOpen, onClose, onAnalysisComplete }) => {
  const [trends, setTrends] = useState<TrendKeyword[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userCategories, setUserCategories] = useState<TrendCategory[]>([]);

  // 콘텐츠 모달 상태
  const [showContentModal, setShowContentModal] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState<string>('');

  // 모달 열릴 때 사용자 카테고리 불러오기
  useEffect(() => {
    if (isOpen) {
      const categories = NaverTrendService.getUserCategories();
      setUserCategories(categories);

      // 초기 카테고리 설정
      if (!selectedCategory && categories.length > 0) {
        setSelectedCategory(categories[0].value);
      }

      // 초기 날짜 설정 (어제)
      if (!selectedDate) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        setSelectedDate(yesterday.toISOString().split('T')[0]);
      }
    }
  }, [isOpen]);

  // 모달이 열릴 때 또는 카테고리/날짜 변경 시 트렌드 로드
  useEffect(() => {
    if (isOpen && selectedDate) {
      loadTrends();
    }
  }, [isOpen, selectedCategory, selectedDate]);

  const loadTrends = async () => {
    setIsLoading(true);
    setError(null);
    setNeedsLogin(false);

    try {
      const keywords = await NaverTrendService.getTrends(selectedCategory, 20, selectedDate);
      setTrends(keywords);
    } catch (err) {
      const errorMessage = (err as Error).message;

      if (errorMessage === 'NEED_LOGIN') {
        setNeedsLogin(true);
        setError('네이버 로그인이 필요합니다.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await window.electronAPI?.openNaverLogin?.();

      if (result?.success) {
        await loadTrends();
        setNeedsLogin(false);
      } else {
        setError('로그인에 실패했습니다.');
      }
    } catch (error) {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeywordClick = (keyword: string) => {
    setSelectedKeyword(keyword);
    setShowContentModal(true);
  };

  const handleContentAnalysisComplete = (result: TrendAnalysisResult) => {
    setShowContentModal(false);
    onClose(); // 트렌드 모달도 닫기
    onAnalysisComplete(result); // Step1으로 전달
  };

  const setQuickDate = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleSettingsSave = () => {
    setShowSettings(false);
    // 카테고리 목록 새로고침
    const categories = NaverTrendService.getUserCategories();
    setUserCategories(categories);
    // 첫 번째 카테고리로 설정하고 트렌드 로드
    if (categories.length > 0) {
      setSelectedCategory(categories[0].value);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-fadeIn">

        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-3xl">🔥</span>
                <h2 className="text-2xl font-bold">네이버 검색 유입 트렌드</h2>
              </div>
              <p className="text-white/90 text-sm">실시간 인기 키워드로 블로그 글감을 찾아보세요</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSettings(true)}
                className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all"
                title="카테고리 설정"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Controls in Header */}
          <div className="mt-4 space-y-3">
            {/* Category & Refresh */}
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-white/20 backdrop-blur text-white border-2 border-white/30 rounded-xl focus:outline-none focus:border-white/60 text-sm font-medium placeholder-white/60 cursor-pointer"
                disabled={isLoading}
              >
                {userCategories.map((cat) => (
                  <option key={cat.value} value={cat.value} className="text-gray-900 bg-white">
                    {cat.name}
                  </option>
                ))}
              </select>
              <button
                onClick={loadTrends}
                disabled={isLoading}
                className="px-4 py-2.5 bg-white/20 backdrop-blur border-2 border-white/30 rounded-xl hover:bg-white/30 transition-all disabled:opacity-50"
              >
                <span className="text-lg">{isLoading ? '⏳' : '🔄'}</span>
              </button>
            </div>

            {/* Date Selector with Quick Buttons */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setQuickDate(1)}
                  className={`px-3 py-1.5 backdrop-blur border border-white/30 rounded-lg text-xs font-medium hover:bg-white/30 transition-all ${selectedDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] ? 'bg-white/40' : 'bg-white/20'}`}
                  disabled={isLoading}
                >
                  어제
                </button>
                <button
                  onClick={() => setQuickDate(2)}
                  className="px-3 py-1.5 bg-white/20 backdrop-blur border border-white/30 rounded-lg text-xs font-medium hover:bg-white/30 transition-all"
                  disabled={isLoading}
                >
                  그저께
                </button>
                <button
                  onClick={() => setQuickDate(7)}
                  className="px-3 py-1.5 bg-white/20 backdrop-blur border border-white/30 rounded-lg text-xs font-medium hover:bg-white/30 transition-all"
                  disabled={isLoading}
                >
                  일주일 전
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date(Date.now() - 86400000).toISOString().split('T')[0]}
                  min="2024-01-01"
                  className="flex-1 px-3 py-1.5 bg-white/20 backdrop-blur border border-white/30 rounded-lg focus:outline-none focus:border-white/60 text-sm text-white cursor-pointer"
                  disabled={isLoading}
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              {selectedDate && (
                <div className="text-xs text-white/80 text-center">
                  📅 {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 기준
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {/* Login Required */}
          {needsLogin && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔐</div>
              <p className="text-gray-700 text-lg mb-6 font-medium">
                네이버 로그인이 필요합니다
              </p>
              <Button onClick={handleLogin} disabled={isLoading} className="px-6 py-3">
                {isLoading ? '로그인 중...' : '네이버 로그인 하기'}
              </Button>
            </div>
          )}

          {/* Loading */}
          {isLoading && !needsLogin && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
              <p className="text-gray-600 mt-4 font-medium">트렌드 로딩 중...</p>
            </div>
          )}

          {/* Error */}
          {error && !needsLogin && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⚠️</div>
              <p className="text-red-600 mb-6 font-medium">{error}</p>
              <Button onClick={loadTrends} variant="secondary">
                다시 시도
              </Button>
            </div>
          )}

          {/* Trends List */}
          {!isLoading && !error && trends.length > 0 && (
            <div className="space-y-2">
              {trends.map((trend) => (
                <button
                  key={trend.rank}
                  onClick={() => handleKeywordClick(trend.keyword)}
                  className="w-full text-left px-5 py-4 rounded-xl bg-white border-2 border-gray-200 hover:border-orange-400 hover:shadow-lg transition-all duration-200 flex items-center justify-between group"
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <span className="text-base font-bold text-orange-500 mr-4 w-8 flex-shrink-0">
                      #{trend.rank}
                    </span>
                    <span className="text-gray-900 group-hover:text-orange-600 font-semibold text-base truncate">
                      {trend.keyword}
                    </span>
                  </div>

                  {/* Rank Change Badge */}
                  <div className="ml-3 flex-shrink-0">
                    {trend.rankChange === null ? (
                      <span className="text-xs px-3 py-1.5 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-full font-bold shadow-sm">
                        NEW
                      </span>
                    ) : trend.rankChange > 0 ? (
                      <span className="text-xs px-3 py-1.5 bg-gradient-to-r from-red-400 to-pink-500 text-white rounded-full font-bold flex items-center shadow-sm">
                        <span className="mr-1">▲</span> {trend.rankChange}
                      </span>
                    ) : trend.rankChange < 0 ? (
                      <span className="text-xs px-3 py-1.5 bg-gradient-to-r from-blue-400 to-cyan-500 text-white rounded-full font-bold flex items-center shadow-sm">
                        <span className="mr-1">▼</span> {Math.abs(trend.rankChange)}
                      </span>
                    ) : (
                      <span className="text-xs px-3 py-1.5 bg-gray-200 text-gray-600 rounded-full font-bold">
                        -
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && !needsLogin && trends.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-600 font-medium">트렌드 데이터가 없습니다</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-100 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            네이버 크리에이터 어드바이저 · 데이터 제공
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>

      {/* Category Settings Modal */}
      <CategorySettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSettingsSave}
      />

      {/* Trend Content Modal */}
      <TrendContentModal
        isOpen={showContentModal}
        onClose={() => setShowContentModal(false)}
        keyword={selectedKeyword}
        date={selectedDate}
        onAnalysisComplete={handleContentAnalysisComplete}
      />
    </div>
  );
};

export default TrendModal;