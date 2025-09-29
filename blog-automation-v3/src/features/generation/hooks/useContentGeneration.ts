import { useState, useCallback } from 'react';
import { ContentState, WorkSummaryData } from '../types/generation.types';

export const useContentGeneration = (initialContent: string = '') => {
  const [contentState, setContentState] = useState<ContentState>({
    originalContent: initialContent,
    editedContent: initialContent,
    isEdited: false
  });

  const updateContent = useCallback((newContent: string) => {
    setContentState(prev => ({
      ...prev,
      editedContent: newContent,
      isEdited: newContent !== prev.originalContent
    }));
  }, []);

  const resetContent = useCallback(() => {
    setContentState(prev => ({
      ...prev,
      editedContent: prev.originalContent,
      isEdited: false
    }));
  }, []);

  const generateWorkSummary = useCallback((content: string, keywords: { main: string; sub: string[] }): WorkSummaryData => {
    const words = content.split(/\s+/).filter(word => word.length > 0);
    const totalWords = words.length;
    
    // 키워드 카운트
    const contentLower = content.toLowerCase();
    const mainKeywordCount = (contentLower.match(new RegExp(keywords.main.toLowerCase(), 'g')) || []).length;
    const subKeywordCount = keywords.sub.reduce((count, keyword) => {
      return count + (contentLower.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
    }, 0);

    // 이미지 카운트 (이미지) 태그 개수
    const imageCount = (content.match(/\(이미지\)/g) || []).length;

    // 예상 읽기 시간 (분) - 한국어 기준 약 300자/분
    const estimatedReadTime = Math.ceil(content.length / 300);

    return {
      totalWords,
      mainKeywordCount,
      subKeywordCount,
      imageCount,
      estimatedReadTime
    };
  }, []);

  return {
    contentState,
    updateContent,
    resetContent,
    generateWorkSummary
  };
};