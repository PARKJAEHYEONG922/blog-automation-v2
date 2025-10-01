/**
 * 설정 관리 서비스
 * LLM 설정 저장/로드 및 API 테스트 로직 담당
 */

export interface LLMConfig {
  provider: string;
  model: string;
  apiKey: string;
  quality?: string;
  size?: string;
  style?: string;
}

export interface LLMSettings {
  writing: LLMConfig;
  image: LLMConfig;
}

export interface ProviderApiKeys {
  claude: string;
  openai: string;
  gemini: string;
  runware: string;
}

export interface LLMSettingsData {
  settings: LLMSettings;
  appliedSettings: LLMSettings;
  providerApiKeys: ProviderApiKeys;
}

export interface APITestResult {
  success: boolean;
  message: string;
}

class SettingsServiceClass {
  /**
   * LLM 설정 로드
   */
  async loadSettings(): Promise<LLMSettingsData> {
    try {
      const cachedData = await window.electronAPI?.getLLMSettings?.();

      if (cachedData && cachedData.settings) {
        return {
          settings: cachedData.settings,
          appliedSettings: cachedData.appliedSettings || this.getDefaultSettings(),
          providerApiKeys: cachedData.providerApiKeys || this.getDefaultApiKeys()
        };
      }

      // 기본값 반환
      return {
        settings: this.getDefaultSettings(),
        appliedSettings: this.getDefaultSettings(),
        providerApiKeys: this.getDefaultApiKeys()
      };
    } catch (error) {
      console.error('설정 로드 실패:', error);
      return {
        settings: this.getDefaultSettings(),
        appliedSettings: this.getDefaultSettings(),
        providerApiKeys: this.getDefaultApiKeys()
      };
    }
  }

  /**
   * LLM 설정 저장
   */
  async saveSettings(data: LLMSettingsData): Promise<{ success: boolean; error?: string }> {
    try {
      await window.electronAPI.saveLLMSettings(data);
      console.log('✅ LLM 설정 저장 완료');
      return { success: true };
    } catch (error) {
      console.error('설정 저장 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '설정 저장 실패'
      };
    }
  }

  /**
   * API 키 테스트
   */
  async testAPIConnection(config: LLMConfig): Promise<APITestResult> {
    try {
      const result = await window.electronAPI.testLLMConfig(config);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'API 테스트 실패'
      };
    }
  }

  /**
   * 적용된 설정에서 현재 모델 상태 가져오기
   */
  getModelStatus(appliedSettings: LLMSettings): { writing: string; image: string } {
    return {
      writing: appliedSettings?.writing?.provider && appliedSettings?.writing?.model
        ? `${appliedSettings.writing.provider} ${appliedSettings.writing.model}`
        : '미설정',
      image: appliedSettings?.image?.provider && appliedSettings?.image?.model
        ? `${appliedSettings.image.provider} ${appliedSettings.image.model}`
        : '미설정'
    };
  }

  /**
   * 특정 타입(writing/image)의 현재 설정 가져오기
   */
  async getCurrentConfig(type: 'writing' | 'image'): Promise<LLMConfig | null> {
    try {
      const data = await this.loadSettings();
      return data.appliedSettings[type];
    } catch (error) {
      console.error(`${type} 설정 로드 실패:`, error);
      return null;
    }
  }

  /**
   * 기본 LLM 설정
   */
  private getDefaultSettings(): LLMSettings {
    return {
      writing: {
        provider: 'claude',
        model: 'claude-sonnet-4-20250514',
        apiKey: ''
      },
      image: {
        provider: 'gemini',
        model: 'gemini-2.5-flash-image-preview',
        apiKey: '',
        style: 'photographic',
        quality: 'high',
        size: '1024x1024'
      }
    };
  }

  /**
   * 기본 API 키
   */
  private getDefaultApiKeys(): ProviderApiKeys {
    return {
      claude: '',
      openai: '',
      gemini: '',
      runware: ''
    };
  }
}

export const SettingsService = new SettingsServiceClass();
