import React, { useState, useEffect } from 'react';
import { NaverTrendService, TrendContent } from '@/01-setup/services/naver-trend-service';
import { BlogTrendAnalyzer, TrendAnalysisResult, TrendAnalysisProgress } from '@/01-setup/services/blog-trend-analyzer';
import Button from '@/shared/components/ui/Button';
import { useDialog } from '@/app/DialogContext';

interface TrendContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  keyword: string;
  date: string;
  onAnalysisComplete: (result: TrendAnalysisResult) => void;
}

const TrendContentModal: React.FC<TrendContentModalProps> = ({
  isOpen,
  onClose,
  keyword,
  date,
  onAnalysisComplete
}) => {
  const { showAlert } = useDialog();
  const [contents, setContents] = useState<TrendContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  // 분석 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<TrendAnalysisProgress | null>(null);

  // 모달 열릴 때 콘텐츠 로드
  useEffect(() => {
    if (isOpen && keyword && date) {
      loadContents();
    }
  }, [isOpen, keyword, date]);

  const loadContents = async () => {
    setIsLoading(true);
    setError(null);
    setContents([]);
    setSelectedIndices([]);

    try {
      const result = await NaverTrendService.getTrendContents(keyword, date, 20);
      setContents(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSelect = (index: number) => {
    setSelectedIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        if (prev.length >= 3) {
          showAlert({ type: 'warning', message: '최대 3개까지만 선택할 수 있습니다.' });
          return prev;
        }
        return [...prev, index];
      }
    });
  };

  const handleAnalyze = async () => {
    if (selectedIndices.length === 0) {
      showAlert({ type: 'warning', message: '분석할 블로그 글을 1개 이상 선택해주세요.' });
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const selectedContents = selectedIndices.map(i => contents[i]);
      const urls = selectedContents.map(c => c.metaUrl);
      const titles = selectedContents.map(c => c.title);

      // 전체 제목 리스트 (최대 20개)
      const allTitles = contents.map(c => c.title);

      const result = await BlogTrendAnalyzer.analyzeTrendBlogs(
        urls,
        titles,
        keyword,
        (progress) => {
          setAnalysisProgress(progress);
        },
        allTitles  // 전체 제목 리스트 전달
      );

      // 분석 완료
      onAnalysisComplete(result);
      onClose();

    } catch (err) {
      setError((err as Error).message);
      showAlert({ type: 'error', message: '분석 실패: ' + (err as Error).message });
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(null);
    }
  };

  const getRankText = (rank: number) => {
    return `${rank}위`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-3xl">📊</span>
                <h2 className="text-2xl font-bold">"{keyword}" 상위 블로그 글 분석</h2>
              </div>
              <p className="text-white/90 text-sm">
                {new Date(date + 'T00:00:00').toLocaleDateString('ko-KR')} 기준 ·
                선택: {selectedIndices.length}/3
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isAnalyzing}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 분석하기 버튼 */}
          {!isAnalyzing && (
            <div className="mt-4">
              <button
                onClick={handleAnalyze}
                disabled={selectedIndices.length === 0 || isLoading}
                className="w-full bg-white text-purple-600 hover:bg-purple-50 border-2 border-white/30 font-bold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                ✨ 선택한 글 분석하기 ({selectedIndices.length}/3)
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">

          {/* 분석 중 */}
          {isAnalyzing && analysisProgress && (
            <div className="text-center py-12">
              <div className="mb-6">
                {analysisProgress.stage === 'crawling' && (
                  <div className="text-6xl mb-4 animate-bounce">🔍</div>
                )}
                {analysisProgress.stage === 'analyzing' && (
                  <div className="text-6xl mb-4 animate-pulse">🤖</div>
                )}
                {analysisProgress.stage === 'complete' && (
                  <div className="text-6xl mb-4">✨</div>
                )}
              </div>

              <p className="text-lg font-bold text-gray-800 mb-2">
                {analysisProgress.message}
              </p>

              {/* Progress Bar */}
              <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300"
                  style={{ width: `${(analysisProgress.current / analysisProgress.total) * 100}%` }}
                />
              </div>

              <p className="text-sm text-gray-600 mt-2">
                {analysisProgress.current}/{analysisProgress.total}
              </p>
            </div>
          )}

          {/* Loading */}
          {isLoading && !isAnalyzing && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              <p className="text-gray-600 mt-4 font-medium">블로그 글 목록 로딩 중...</p>
            </div>
          )}

          {/* Error */}
          {error && !isAnalyzing && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⚠️</div>
              <p className="text-red-600 mb-6 font-medium">{error}</p>
              <Button onClick={loadContents} variant="secondary">
                다시 시도
              </Button>
            </div>
          )}

          {/* Contents List */}
          {!isLoading && !error && !isAnalyzing && contents.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                💡 분석할 블로그 글을 최대 3개까지 선택하세요. 선택한 글들을 AI가 분석하여 새로운 제목과 키워드를 추천해드립니다.
              </p>

              {contents.map((content, index) => {
                const isSelected = selectedIndices.includes(index);
                return (
                  <div
                    key={index}
                    onClick={() => handleToggleSelect(index)}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 ${
                      isSelected
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-400 shadow-md'
                        : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* 커스텀 체크박스 */}
                      <div className="flex-shrink-0 mt-0.5">
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                          isSelected
                            ? 'bg-gradient-to-br from-blue-500 to-purple-600 border-blue-500'
                            : 'border-gray-300 bg-white hover:border-blue-400'
                        }`}>
                          {isSelected && (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* 순위 */}
                      <div className="flex-shrink-0">
                        <span className={`inline-block px-3 py-1 rounded-lg text-sm font-bold ${
                          isSelected
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {getRankText(index + 1)}
                        </span>
                      </div>

                      {/* 제목 */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-base font-semibold leading-relaxed ${
                          isSelected ? 'text-blue-700' : 'text-gray-900'
                        }`}>
                          {content.title}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && !isAnalyzing && contents.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-600 font-medium">블로그 글 데이터가 없습니다</p>
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
    </div>
  );
};

export default TrendContentModal;