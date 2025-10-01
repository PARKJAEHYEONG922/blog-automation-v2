/**
 * LocalStorage 관리 서비스
 * 모든 localStorage 작업을 중앙화하여 관리
 */

export interface SavedDocument {
  id: string;
  name: string;
  content: string;
  filePath: string;
  createdAt: string;
}

export interface TrendAnalysisCache {
  contents: any[];
  mainKeyword: string;
  allTitles: string[];
  subKeywords: string[];
  direction: string;
}

class StorageServiceClass {
  // Storage Keys
  private readonly KEYS = {
    WRITING_STYLES: 'savedWritingStyles',
    SEO_GUIDES: 'savedSeoGuides',
    SELECTED_WRITING_STYLES: 'selectedWritingStyles',
    TREND_CACHE: 'trendAnalysisCache',
  } as const;

  // ========== Writing Styles ==========

  /**
   * 말투 문서 목록 가져오기
   */
  getWritingStyles(): SavedDocument[] {
    try {
      const data = localStorage.getItem(this.KEYS.WRITING_STYLES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('말투 문서 로드 실패:', error);
      return [];
    }
  }

  /**
   * 말투 문서 목록 저장
   */
  saveWritingStyles(documents: SavedDocument[]): void {
    try {
      localStorage.setItem(this.KEYS.WRITING_STYLES, JSON.stringify(documents));
    } catch (error) {
      console.error('말투 문서 저장 실패:', error);
    }
  }

  /**
   * 말투 문서 추가
   */
  addWritingStyle(document: SavedDocument): SavedDocument[] {
    const documents = this.getWritingStyles();
    const existingIndex = documents.findIndex(doc => doc.name === document.name);

    let updated: SavedDocument[];
    if (existingIndex !== -1) {
      // 기존 문서 업데이트
      updated = documents.map((doc, idx) => idx === existingIndex ? document : doc);
    } else {
      // 새 문서 추가
      updated = [...documents, document];
    }

    this.saveWritingStyles(updated);
    return updated;
  }

  /**
   * 말투 문서 삭제
   */
  deleteWritingStyle(docId: string): SavedDocument[] {
    const documents = this.getWritingStyles();
    const updated = documents.filter(doc => doc.id !== docId);
    this.saveWritingStyles(updated);
    return updated;
  }

  // ========== SEO Guides ==========

  /**
   * SEO 가이드 목록 가져오기
   */
  getSeoGuides(): SavedDocument[] {
    try {
      const data = localStorage.getItem(this.KEYS.SEO_GUIDES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('SEO 가이드 로드 실패:', error);
      return [];
    }
  }

  /**
   * SEO 가이드 목록 저장
   */
  saveSeoGuides(documents: SavedDocument[]): void {
    try {
      localStorage.setItem(this.KEYS.SEO_GUIDES, JSON.stringify(documents));
    } catch (error) {
      console.error('SEO 가이드 저장 실패:', error);
    }
  }

  /**
   * SEO 가이드 추가
   */
  addSeoGuide(document: SavedDocument): SavedDocument[] {
    const documents = this.getSeoGuides();
    const existingIndex = documents.findIndex(doc => doc.name === document.name);

    let updated: SavedDocument[];
    if (existingIndex !== -1) {
      // 기존 문서 업데이트
      updated = documents.map((doc, idx) => idx === existingIndex ? document : doc);
    } else {
      // 새 문서 추가
      updated = [...documents, document];
    }

    this.saveSeoGuides(updated);
    return updated;
  }

  /**
   * SEO 가이드 삭제
   */
  deleteSeoGuide(docId: string): SavedDocument[] {
    const documents = this.getSeoGuides();
    const updated = documents.filter(doc => doc.id !== docId);
    this.saveSeoGuides(updated);
    return updated;
  }

  // ========== Selected Writing Styles ==========

  /**
   * 선택된 말투 ID 목록 가져오기
   */
  getSelectedWritingStyleIds(): string[] {
    try {
      const data = localStorage.getItem(this.KEYS.SELECTED_WRITING_STYLES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('선택된 말투 로드 실패:', error);
      return [];
    }
  }

  /**
   * 선택된 말투 ID 목록 저장
   */
  saveSelectedWritingStyleIds(ids: string[]): void {
    try {
      localStorage.setItem(this.KEYS.SELECTED_WRITING_STYLES, JSON.stringify(ids));
    } catch (error) {
      console.error('선택된 말투 저장 실패:', error);
    }
  }

  // ========== Trend Analysis Cache ==========

  /**
   * 트렌드 분석 캐시 가져오기
   */
  getTrendCache(): TrendAnalysisCache | null {
    try {
      const data = localStorage.getItem(this.KEYS.TREND_CACHE);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('트렌드 캐시 로드 실패:', error);
      return null;
    }
  }

  /**
   * 트렌드 분석 캐시 저장
   */
  saveTrendCache(cache: TrendAnalysisCache): void {
    try {
      localStorage.setItem(this.KEYS.TREND_CACHE, JSON.stringify(cache));
    } catch (error) {
      console.error('트렌드 캐시 저장 실패:', error);
    }
  }

  /**
   * 트렌드 분석 캐시 삭제
   */
  clearTrendCache(): void {
    try {
      localStorage.removeItem(this.KEYS.TREND_CACHE);
    } catch (error) {
      console.error('트렌드 캐시 삭제 실패:', error);
    }
  }

  // ========== Utility ==========

  /**
   * 모든 데이터 초기화 (개발용)
   */
  clearAll(): void {
    try {
      Object.values(this.KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      console.log('✅ 모든 localStorage 데이터 삭제 완료');
    } catch (error) {
      console.error('데이터 초기화 실패:', error);
    }
  }
}

// 싱글톤 인스턴스 export
export const StorageService = new StorageServiceClass();
