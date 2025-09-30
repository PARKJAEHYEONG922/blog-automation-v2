import React, { useState, useEffect } from 'react';
import { NaverTrendService } from '../../../shared/services/content/naver-trend-service';
import Button from '../../../shared/components/ui/Button';

interface CategorySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const CategorySettingsModal: React.FC<CategorySettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // 모달 열릴 때 현재 선택된 카테고리 불러오기
  useEffect(() => {
    if (isOpen) {
      const current = NaverTrendService.getSelectedCategories();
      setSelectedCategories(current);
    }
  }, [isOpen]);

  const handleToggleCategory = (categoryValue: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryValue)) {
        // 최소 1개는 선택되어야 함
        if (prev.length === 1) {
          alert('최소 1개 이상의 카테고리를 선택해야 합니다.');
          return prev;
        }
        return prev.filter(v => v !== categoryValue);
      } else {
        return [...prev, categoryValue];
      }
    });
  };

  const handleReset = () => {
    setSelectedCategories(NaverTrendService.DEFAULT_SELECTED);
  };

  const handleSave = () => {
    try {
      NaverTrendService.saveSelectedCategories(selectedCategories);
      onSave();
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const handleSelectAll = () => {
    setSelectedCategories(NaverTrendService.ALL_CATEGORIES.map(cat => cat.value));
  };

  const handleDeselectAll = () => {
    // 기본값으로 설정 (최소 1개 보장)
    setSelectedCategories(NaverTrendService.DEFAULT_SELECTED);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-2xl">⚙️</span>
                <h2 className="text-2xl font-bold">관심 카테고리 설정</h2>
              </div>
              <p className="text-white/90 text-sm">
                보고 싶은 카테고리를 선택하세요 · 선택됨: {selectedCategories.length}개
              </p>
            </div>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Quick Actions */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              전체 선택
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >
              전체 해제
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-sm bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors"
            >
              기본값으로
            </button>
          </div>

          {/* Category Grid */}
          <div className="grid grid-cols-4 gap-3">
            {NaverTrendService.ALL_CATEGORIES.map((category) => {
              const isSelected = selectedCategories.includes(category.value);
              return (
                <label
                  key={category.value}
                  className={`flex items-center space-x-2 p-3 rounded-xl cursor-pointer transition-all border-2 ${
                    isSelected
                      ? 'bg-gradient-to-br from-orange-50 to-pink-50 border-orange-300 shadow-sm'
                      : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleCategory(category.value)}
                    className="w-4 h-4 text-orange-500 rounded focus:ring-2 focus:ring-orange-500 cursor-pointer"
                  />
                  <span className={`text-sm font-medium ${isSelected ? 'text-orange-700' : 'text-gray-700'}`}>
                    {category.name}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <Button onClick={onClose} variant="secondary">
            취소
          </Button>
          <Button onClick={handleSave} className="px-6">
            저장
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CategorySettingsModal;