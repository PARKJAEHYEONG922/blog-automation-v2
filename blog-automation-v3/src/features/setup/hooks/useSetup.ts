import { useState, useCallback } from 'react';
import { SetupData, DocumentData, TitleGenerationRequest } from '../types/setup.types';

export const useSetup = () => {
  const [setupData, setSetupData] = useState<SetupData>({
    writingStylePaths: [],
    seoGuidePath: '',
    topic: '',
    selectedTitle: '',
    mainKeyword: '',
    subKeywords: '',
    blogContent: '',
    isAIGenerated: false,
    generatedTitles: [],
    imagePrompts: [],
    imagePromptGenerationFailed: false
  });

  const [documents, setDocuments] = useState<{
    writingStyles: DocumentData[];
    seoGuides: DocumentData[];
  }>({
    writingStyles: [],
    seoGuides: []
  });

  const loadDocuments = useCallback(async () => {
    try {
      const [writingStyles, seoGuides] = await Promise.all([
        window.electronAPI.loadDocuments('writingStyle'),
        window.electronAPI.loadDocuments('seoGuide')
      ]);
      
      setDocuments({ writingStyles, seoGuides });
    } catch (error) {
      console.error('문서 로드 실패:', error);
    }
  }, []);

  const generateTitles = useCallback(async (request: TitleGenerationRequest) => {
    try {
      const response = await window.electronAPI.generateTitles(request);
      return response;
    } catch (error) {
      console.error('제목 생성 실패:', error);
      return { success: false, error: '제목 생성에 실패했습니다.' };
    }
  }, []);

  const saveDocument = useCallback(async (
    type: 'writingStyle' | 'seoGuide', 
    name: string, 
    content: string
  ) => {
    try {
      const filePath = await window.electronAPI.saveDocument(type, name, content);
      await loadDocuments(); // 문서 목록 새로고침
      return filePath;
    } catch (error) {
      console.error('문서 저장 실패:', error);
      throw error;
    }
  }, [loadDocuments]);

  const deleteDocument = useCallback(async (filePath: string) => {
    try {
      await window.electronAPI.deleteDocument(filePath);
      await loadDocuments(); // 문서 목록 새로고침
    } catch (error) {
      console.error('문서 삭제 실패:', error);
      throw error;
    }
  }, [loadDocuments]);

  return {
    setupData,
    setSetupData,
    documents,
    loadDocuments,
    generateTitles,
    saveDocument,
    deleteDocument
  };
};