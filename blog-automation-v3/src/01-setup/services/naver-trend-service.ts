export interface TrendKeyword {
  keyword: string;
  rank: number;
  rankChange: number | null;
}

export interface TrendCategory {
  name: string;
  value: string;
}

export interface TrendContent {
  metaUrl: string;
  title: string;
  myContent: boolean;
}

export class NaverTrendService {

  // 전체 카테고리 목록 (네이버 크리에이터 어드바이저 32개)
  static readonly ALL_CATEGORIES: TrendCategory[] = [
    { name: '비즈니스·경제', value: '비즈니스·경제' },
    { name: 'IT·컴퓨터', value: 'IT·컴퓨터' },
    { name: '음악', value: '음악' },
    { name: '영화', value: '영화' },
    { name: '문학·책', value: '문학·책' },
    { name: '미술·디자인', value: '미술·디자인' },
    { name: '공연·전시', value: '공연·전시' },
    { name: '드라마', value: '드라마' },
    { name: '스타·연예인', value: '스타·연예인' },
    { name: '만화·애니', value: '만화·애니' },
    { name: '방송', value: '방송' },
    { name: '일상·생각', value: '일상·생각' },
    { name: '육아·결혼', value: '육아·결혼' },
    { name: '반려동물', value: '반려동물' },
    { name: '좋은글·이미지', value: '좋은글·이미지' },
    { name: '패션·미용', value: '패션·미용' },
    { name: '인테리어·DIY', value: '인테리어·DIY' },
    { name: '요리·레시피', value: '요리·레시피' },
    { name: '상품리뷰', value: '상품리뷰' },
    { name: '원예·재배', value: '원예·재배' },
    { name: '게임', value: '게임' },
    { name: '스포츠', value: '스포츠' },
    { name: '사진', value: '사진' },
    { name: '자동차', value: '자동차' },
    { name: '취미', value: '취미' },
    { name: '국내여행', value: '국내여행' },
    { name: '세계여행', value: '세계여행' },
    { name: '맛집', value: '맛집' },
    { name: '사회·정치', value: '사회·정치' },
    { name: '건강·의학', value: '건강·의학' },
    { name: '어학·외국어', value: '어학·외국어' },
    { name: '교육·학문', value: '교육·학문' },
  ];

  // 기본 선택 카테고리 (처음 사용 시)
  static readonly DEFAULT_SELECTED = ['비즈니스·경제', 'IT·컴퓨터', '영화'];

  // localStorage 키
  private static readonly STORAGE_KEY = 'naver-trend-selected-categories';

  /**
   * localStorage에서 선택된 카테고리 가져오기
   */
  static getSelectedCategories(): string[] {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // 유효성 검사: 배열이고 최소 1개 이상
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('선택된 카테고리 불러오기 실패:', error);
    }
    return this.DEFAULT_SELECTED;
  }

  /**
   * localStorage에 선택 카테고리 저장
   */
  static saveSelectedCategories(categories: string[]): void {
    try {
      if (categories.length === 0) {
        throw new Error('최소 1개 이상의 카테고리를 선택해야 합니다.');
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(categories));
    } catch (error) {
      console.error('선택된 카테고리 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자가 선택한 카테고리 목록만 필터링
   */
  static getUserCategories(): TrendCategory[] {
    const selected = this.getSelectedCategories();
    return this.ALL_CATEGORIES.filter(cat => selected.includes(cat.value));
  }

  /**
   * 네이버 크리에이터 어드바이저에서 트렌드 키워드 가져오기
   * @param category 카테고리 (선택)
   * @param limit 가져올 개수 (기본 20)
   * @param date 날짜 (YYYY-MM-DD 형식, 선택)
   */
  static async getTrends(category?: string, limit: number = 20, date?: string): Promise<TrendKeyword[]> {
    try {
      // Main 프로세스에서 API 호출
      const result = await window.electronAPI?.getNaverTrends?.(category, limit, date);

      if (!result) {
        throw new Error('API 호출 실패');
      }

      if (result.needsLogin) {
        throw new Error('NEED_LOGIN');
      }

      if (result.error) {
        throw new Error(result.error);
      }

      return result.trends || [];

    } catch (error) {
      if ((error as Error).message === 'NEED_LOGIN') {
        throw error;
      }
      console.error('네이버 트렌드 가져오기 실패:', error);
      throw new Error('트렌드를 가져올 수 없습니다. 잠시 후 다시 시도해주세요.');
    }
  }

  /**
   * 네이버 로그인이 필요한지 확인
   */
  static async needsLogin(): Promise<boolean> {
    try {
      const cookies = await window.electronAPI?.getNaverCookies?.();
      return !cookies;
    } catch (error) {
      return true;
    }
  }

  /**
   * 특정 키워드의 상위 블로그 글 목록 가져오기
   * @param keyword 검색 키워드
   * @param date 날짜 (YYYY-MM-DD)
   * @param limit 가져올 개수 (기본 20)
   */
  static async getTrendContents(keyword: string, date: string, limit: number = 20): Promise<TrendContent[]> {
    try {
      const result = await window.electronAPI?.getTrendContents?.(keyword, date, limit);

      if (!result) {
        throw new Error('API 호출 실패');
      }

      if (result.needsLogin) {
        throw new Error('NEED_LOGIN');
      }

      if (result.error) {
        throw new Error(result.error);
      }

      return result.contents || [];

    } catch (error) {
      if ((error as Error).message === 'NEED_LOGIN') {
        throw error;
      }
      console.error('트렌드 콘텐츠 가져오기 실패:', error);
      throw new Error('블로그 글 목록을 가져올 수 없습니다.');
    }
  }
}