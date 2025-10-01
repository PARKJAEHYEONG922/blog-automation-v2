import { useState, useCallback, useEffect } from 'react';
import { SettingsService, LLMSettings, LLMSettingsData, LLMConfig } from '../services/settings-service';

// 레거시 인터페이스 (기존 코드 호환성)
export interface LLMSettingsLegacy {
  appliedSettings?: {
    writing?: {
      provider: string;
      model: string;
      apiKey: string;
    };
    image?: {
      provider: string;
      model: string;
      apiKey: string;
      style?: string;
      quality?: string;
      size?: string;
    };
  };
}

export const useSettings = () => {
  const [settingsData, setSettingsData] = useState<LLMSettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await SettingsService.loadSettings();
      setSettingsData(data);
    } catch (error) {
      console.error('설정 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async (newSettings: LLMSettingsData) => {
    setIsLoading(true);
    try {
      const result = await SettingsService.saveSettings(newSettings);
      if (result.success) {
        setSettingsData(newSettings);
      }
      return result;
    } catch (error) {
      console.error('설정 저장 실패:', error);
      return { success: false, error: error instanceof Error ? error.message : '설정 저장 실패' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const testAPIConnection = useCallback(async (config: LLMConfig) => {
    setIsTesting(true);
    try {
      const result = await SettingsService.testAPIConnection(config);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'API 테스트 실패'
      };
    } finally {
      setIsTesting(false);
    }
  }, []);

  const getModelStatus = useCallback(() => {
    if (!settingsData) {
      return { writing: '미설정', image: '미설정' };
    }
    return SettingsService.getModelStatus(settingsData.appliedSettings);
  }, [settingsData]);

  // 컴포넌트 마운트 시 설정 로드
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings: settingsData?.appliedSettings, // 레거시 호환성
    settingsData, // 새로운 전체 데이터
    isLoading,
    isTesting,
    loadSettings,
    saveSettings,
    testAPIConnection,
    getModelStatus
  };
};