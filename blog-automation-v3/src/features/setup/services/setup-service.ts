/**
 * Setup 기능 관련 비즈니스 로직 서비스
 */

import { StorageService, SavedDocument } from '@/shared/services/storage/storage-service';
import {
  handleFileSystemError,
  handleAPIError,
  logError,
  getErrorMessage
} from '@/shared/utils/error-handler';

export interface DocumentLoadResult {
  writingStyles: SavedDocument[];
  seoGuides: SavedDocument[];
  selectedWritingStyles: SavedDocument[];
  selectedSeoGuide: SavedDocument | null;
}

class SetupServiceClass {

  /**
   * 저장된 문서들 로드 및 초기화
   */
  async loadDocuments(initialData?: {
    writingStylePaths?: string[];
    seoGuidePath?: string;
  }): Promise<DocumentLoadResult> {

    // 1. 말투 문서 로드
    const writingStyles = StorageService.getWritingStyles();

    // 2. SEO 가이드 로드
    let seoGuides: SavedDocument[] = [];
    let selectedSeoGuide: SavedDocument | null = null;

    try {
      const loadedSeoGuides = await window.electronAPI.loadDocuments('seoGuide');

      if (loadedSeoGuides && loadedSeoGuides.length > 0) {
        seoGuides = loadedSeoGuides;
        StorageService.saveSeoGuides(loadedSeoGuides);

        // 초기 데이터가 있으면 해당 SEO 가이드 선택
        if (initialData?.seoGuidePath) {
          selectedSeoGuide = seoGuides.find((doc: SavedDocument) =>
            doc.filePath === initialData.seoGuidePath
          ) || null;
        } else {
          // 기본 SEO 선택
          selectedSeoGuide = seoGuides.find((doc: SavedDocument) =>
            doc.name.includes('기본')
          ) || null;
        }
      } else {
        // SEO 가이드가 없으면 기본 생성
        await window.electronAPI.createDefaultSEO();
        const newSeoGuides = await window.electronAPI.loadDocuments('seoGuide');

        if (newSeoGuides && newSeoGuides.length > 0) {
          seoGuides = newSeoGuides;
          StorageService.saveSeoGuides(newSeoGuides);

          selectedSeoGuide = seoGuides.find((doc: SavedDocument) =>
            doc.name.includes('기본')
          ) || null;
        }
      }
    } catch (error) {
      handleFileSystemError(error, 'SEO 가이드 로드');
      // 로컬 스토리지에서 복원 시도
      seoGuides = StorageService.getSeoGuides();
      selectedSeoGuide = seoGuides.find((doc: SavedDocument) =>
        doc.name.includes('기본')
      ) || null;
    }

    // 3. 선택된 말투 복원
    let selectedWritingStyles: SavedDocument[] = [];

    if (initialData?.writingStylePaths && initialData.writingStylePaths.length > 0) {
      // Step2에서 돌아온 경우
      selectedWritingStyles = writingStyles.filter(doc =>
        initialData.writingStylePaths!.includes(doc.filePath)
      );
    } else {
      // localStorage에서 마지막 선택 상태 복원
      const savedIds = StorageService.getSelectedWritingStyleIds();
      if (savedIds.length > 0) {
        selectedWritingStyles = writingStyles.filter(doc =>
          savedIds.includes(doc.id)
        );
      }
    }

    return {
      writingStyles,
      seoGuides,
      selectedWritingStyles,
      selectedSeoGuide
    };
  }

  /**
   * 말투 문서 저장 (File 객체)
   */
  async saveWritingStyle(file: File): Promise<SavedDocument> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const name = file.name.replace(/\.[^/.]+$/, '');

          const savedDoc: SavedDocument = {
            id: `${Date.now()}-${Math.random()}`,
            name,
            content,
            filePath: `/말투/${file.name}`,
            createdAt: new Date().toISOString()
          };

          const updated = StorageService.addWritingStyle(savedDoc);
          console.log('✅ 말투 문서 저장 완료:', name);

          resolve(savedDoc);
        } catch (error) {
          const appError = handleFileSystemError(error, '말투 문서 저장');
          reject(new Error(appError.message));
        }
      };

      reader.onerror = () => {
        const error = new Error('파일 읽기 실패');
        logError(error, 'FileReader - saveWritingStyle');
        reject(error);
      };
      reader.readAsText(file);
    });
  }

  /**
   * 말투 문서 저장 (이름과 내용으로 직접)
   */
  async saveWritingStyleDirect(name: string, content: string): Promise<SavedDocument> {
    try {
      const filePath = await window.electronAPI.saveDocument('writingStyle', name, content);

      const savedDoc: SavedDocument = {
        id: `${Date.now()}-${Math.random()}`,
        name: name.trim(),
        content,
        filePath,
        createdAt: new Date().toISOString()
      };

      StorageService.addWritingStyle(savedDoc);
      console.log('✅ 말투 문서 저장 완료:', name);

      return savedDoc;
    } catch (error) {
      handleFileSystemError(error, '말투 문서 저장');
      throw error;
    }
  }

  /**
   * SEO 가이드 저장
   */
  async saveSeoGuide(file: File): Promise<SavedDocument> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const name = file.name.replace(/\.[^/.]+$/, '');

          const savedDoc: SavedDocument = {
            id: `${Date.now()}-${Math.random()}`,
            name,
            content,
            filePath: `/seoGuide/${file.name}`,
            createdAt: new Date().toISOString()
          };

          const updated = StorageService.addSeoGuide(savedDoc);
          console.log('✅ SEO 가이드 저장 완료:', name);

          resolve(savedDoc);
        } catch (error) {
          const appError = handleFileSystemError(error, 'SEO 가이드 저장');
          reject(new Error(appError.message));
        }
      };

      reader.onerror = () => {
        const error = new Error('파일 읽기 실패');
        logError(error, 'FileReader - saveSeoGuide');
        reject(error);
      };
      reader.readAsText(file);
    });
  }

  /**
   * 문서 삭제
   */
  async deleteDocument(
    docId: string,
    type: 'writingStyle' | 'seoGuide',
    docName: string
  ): Promise<{ writingStyles?: SavedDocument[]; seoGuides?: SavedDocument[] }> {
    try {
      if (type === 'writingStyle') {
        // 삭제할 문서 찾기
        const documents = StorageService.getWritingStyles();
        const docToDelete = documents.find(doc => doc.id === docId);

        // Electron API로 파일 삭제
        if (docToDelete?.filePath) {
          await window.electronAPI.deleteDocument(docToDelete.filePath);
        }

        // 로컬 스토리지에서 삭제
        const updated = StorageService.deleteWritingStyle(docId);
        return { writingStyles: updated };
      } else {
        // 삭제할 문서 찾기
        const documents = StorageService.getSeoGuides();
        const docToDelete = documents.find(doc => doc.id === docId);

        // Electron API로 파일 삭제
        if (docToDelete?.filePath) {
          await window.electronAPI.deleteDocument(docToDelete.filePath);
        }

        // 로컬 스토리지에서 삭제
        const updated = StorageService.deleteSeoGuide(docId);
        return { seoGuides: updated };
      }
    } catch (error) {
      const appError = handleFileSystemError(error, `${type === 'writingStyle' ? '말투' : 'SEO 가이드'} 삭제`);
      throw new Error(appError.message);
    }
  }

  /**
   * 선택된 말투 저장
   */
  saveSelectedWritingStyles(documents: SavedDocument[]): void {
    const ids = documents.map(doc => doc.id);
    StorageService.saveSelectedWritingStyleIds(ids);
  }

  /**
   * URL에서 블로그 글 크롤링
   */
  async crawlBlogContent(url: string): Promise<{ title: string; content: string } | null> {
    try {
      console.log('블로그 URL 크롤링 시작:', url);

      // BlogCrawler를 동적 import
      const { BlogCrawler } = await import('../../../shared/services/content/blog-crawler');
      const crawler = new BlogCrawler();

      // 임시 제목으로 크롤링 (실제 제목은 크롤링에서 추출됨)
      const result = await (crawler as any).crawlBlogContent(url, '크롤링중');

      if (result && result.success && result.textContent) {
        const title = result.title || '제목 없음';
        console.log('✅ 크롤링 성공:', title);
        return {
          title,
          content: result.textContent
        };
      } else {
        throw new Error(result.error || '크롤링 실패');
      }
    } catch (error) {
      handleAPIError(error, 'Blog Crawl');
      throw error;
    }
  }
}

// 싱글톤 인스턴스 export
export const SetupService = new SetupServiceClass();
