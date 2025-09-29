// 발행 관리자 - 모든 플랫폼의 발행을 통합 관리

import { PublishResult, WorkflowData, PublishOption } from '../types/publishing.types';
import { NaverPublisher } from './naver-publisher';

export interface PublishConfig {
  platform: string;
  option: PublishOption;
  scheduledTime?: string;
  boardCategory?: string;
  credentials?: {
    username: string;
    password: string;
  };
}

export class PublishManager {
  private static instance: PublishManager;
  
  private publishers: Map<string, any> = new Map();

  private constructor() {
    // 각 플랫폼별 발행자 등록
    this.publishers.set('naver', new NaverPublisher());
    // 추후 다른 플랫폼 추가
    // this.publishers.set('tistory', new TistoryPublisher());
  }

  public static getInstance(): PublishManager {
    if (!PublishManager.instance) {
      PublishManager.instance = new PublishManager();
    }
    return PublishManager.instance;
  }

  /**
   * 지원되는 플랫폼 목록 반환
   */
  getSupportedPlatforms(): string[] {
    return Array.from(this.publishers.keys());
  }

  /**
   * 플랫폼별 발행 실행
   */
  async publish(
    platform: string, 
    data: WorkflowData, 
    content: string, 
    config: PublishConfig
  ): Promise<PublishResult> {
    try {
      const publisher = this.publishers.get(platform);
      
      if (!publisher) {
        return {
          success: false,
          message: `지원되지 않는 플랫폼입니다: ${platform}`
        };
      }

      console.log(`🚀 ${platform} 발행 시작...`);
      
      const result = await publisher.publish(data, content, config);
      
      if (result.success) {
        console.log(`✅ ${platform} 발행 성공!`);
      } else {
        console.error(`❌ ${platform} 발행 실패:`, result.message);
      }
      
      return result;

    } catch (error) {
      console.error(`❌ ${platform} 발행 중 오류:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 플랫폼별 로그인 상태 확인
   */
  async getLoginStatus(platform: string): Promise<boolean> {
    const publisher = this.publishers.get(platform);
    return publisher ? await publisher.getLoginStatus() : false;
  }

  /**
   * 플랫폼별 로그아웃
   */
  async logout(platform: string): Promise<boolean> {
    const publisher = this.publishers.get(platform);
    return publisher ? await publisher.logout() : false;
  }

  /**
   * 모든 플랫폼에서 로그아웃
   */
  async logoutAll(): Promise<void> {
    const logoutPromises = Array.from(this.publishers.values()).map(
      publisher => publisher.logout().catch(() => false)
    );
    
    await Promise.all(logoutPromises);
    console.log('👋 모든 플랫폼에서 로그아웃 완료');
  }

  /**
   * 네이버 블로그 전용 발행 메서드
   */
  async publishToNaver(params: {
    credentials: { username: string; password: string };
    content: string;
    imageUrls: Record<string, string>;
    publishOption: PublishOption;
    scheduledDate?: string;
    scheduledHour?: string;
    scheduledMinute?: string;
    boardCategory?: string;
    onStatusUpdate?: (status: any) => void;
    copyToClipboard?: () => Promise<boolean>;
    saveAccount?: (username: string, password: string) => void;
    data?: WorkflowData; // WorkflowData 추가
  }): Promise<PublishResult> {
    try {
      const naverPublisher = this.publishers.get('naver');
      
      if (!naverPublisher) {
        return {
          success: false,
          message: '네이버 발행자를 찾을 수 없습니다.'
        };
      }

      const result = await naverPublisher.publishToNaverBlog(
        params.credentials,
        params.publishOption,
        params.scheduledDate,
        params.scheduledHour,
        params.scheduledMinute,
        params.onStatusUpdate,
        params.copyToClipboard,
        params.saveAccount,
        false, // timeError
        { content: params.content }, // editedContent
        params.imageUrls,
        (data: any) => console.log('발행 완료:', data),
        params.data, // WorkflowData 전달
        params.boardCategory // 게시판 카테고리 전달
      );

      return result;

    } catch (error) {
      console.error('네이버 발행 중 오류:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '네이버 발행 중 오류가 발생했습니다.'
      };
    }
  }
}