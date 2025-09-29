import { useState, useCallback, useEffect } from 'react';

export interface LLMSettings {
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
  const [settings, setSettings] = useState<LLMSettings>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedSettings = await window.electronAPI.getLLMSettings();
      setSettings(loadedSettings || {});
    } catch (error) {
      console.error('설정 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async (newSettings: LLMSettings) => {
    setIsLoading(true);
    try {
      await window.electronAPI.saveLLMSettings(newSettings);
      setSettings(newSettings);
      return { success: true };
    } catch (error) {
      console.error('설정 저장 실패:', error);
      return { success: false, error: error instanceof Error ? error.message : '설정 저장 실패' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const testAPIConnection = useCallback(async (config: any) => {
    setIsTesting(true);
    try {
      const result = await window.electronAPI.testLLMConfig(config);
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
    const appliedSettings = settings.appliedSettings;
    
    return {
      writing: appliedSettings?.writing?.provider && appliedSettings?.writing?.model 
        ? `${appliedSettings.writing.provider} ${appliedSettings.writing.model}` 
        : '미설정',
      image: appliedSettings?.image?.provider && appliedSettings?.image?.model 
        ? `${appliedSettings.image.provider} ${appliedSettings.image.model}` 
        : '미설정'
    };
  }, [settings]);

  // 컴포넌트 마운트 시 설정 로드
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    isLoading,
    isTesting,
    loadSettings,
    saveSettings,
    testAPIConnection,
    getModelStatus
  };
};