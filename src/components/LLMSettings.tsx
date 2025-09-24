import React, { useState, useEffect } from 'react';
import SimpleDialog from './SimpleDialog';
import { LLMClientFactory } from '../services/llm-client-factory';

interface LLMSettingsProps {
  onClose: () => void;
  onSettingsChange?: () => void; // 설정 변경 시 호출할 콜백 추가
}

interface LLMConfig {
  provider: string;
  model: string;
  apiKey: string;
  quality?: string;
  size?: string;
  style?: string; // 이미지 스타일 추가
}

interface LLMSettings {
  information: LLMConfig;
  writing: LLMConfig;
  image: LLMConfig;
}

interface ProviderApiKeys {
  claude: string;
  openai: string;
  gemini: string;
  runware: string;
  naver: string; // 네이버 검색 API 키 추가
}

// 성공한 설정들을 저장하는 구조
interface SuccessfulConfig {
  provider: string;
  model: string;
  apiKey: string;
}

interface SuccessfulConfigs {
  [configKey: string]: SuccessfulConfig; // "provider-model" 형태의 키로 저장
}

interface NaverApiKeys {
  clientId: string;
  clientSecret: string;
}

interface YouTubeApiKeys {
  apiKey: string;
}

const LLMSettings: React.FC<LLMSettingsProps> = ({ onClose, onSettingsChange }) => {
  // 탭 상태 관리
  const [activeMainTab, setActiveMainTab] = useState<'llm' | 'api'>('llm');
  const [activeApiTab, setActiveApiTab] = useState<'naver' | 'youtube'>('naver');
  
  // 제공자별 API 키 저장소
  const [providerApiKeys, setProviderApiKeys] = useState<ProviderApiKeys>({
    claude: '',
    openai: '',
    gemini: '',
    runware: '',
    naver: ''
  });

  // 성공한 설정들 저장소 (provider-model 키로 저장)
  const [successfulConfigs, setSuccessfulConfigs] = useState<SuccessfulConfigs>({});
  
  const [naverApiKeys, setNaverApiKeys] = useState<NaverApiKeys>({
    clientId: '',
    clientSecret: ''
  });
  
  const [youtubeApiKeys, setYoutubeApiKeys] = useState<YouTubeApiKeys>({
    apiKey: ''
  });
  
  // 네이버 API 테스트 상태
  const [naverTestingStatus, setNaverTestingStatus] = useState<{
    testing: boolean;
    success: boolean;
    message: string;
  }>({ testing: false, success: false, message: '' });

  // 유튜브 API 테스트 상태
  const [youtubeTestingStatus, setYoutubeTestingStatus] = useState<{
    testing: boolean;
    success: boolean;
    message: string;
  }>({ testing: false, success: false, message: '' });

  // LLM 설정 (UI에서 편집 중인 설정)
  const [settings, setSettings] = useState<LLMSettings>({
    information: { provider: 'gemini', model: 'gemini-2.0-flash', apiKey: '' },
    writing: { provider: 'claude', model: 'claude-sonnet-4-20250514', apiKey: '' },
    image: { provider: 'openai', model: 'gpt-image-1', apiKey: '', style: 'realistic' }
  });

  // 실제 적용된 설정 (테스트 성공한 설정만)
  const [appliedSettings, setAppliedSettings] = useState<LLMSettings>({
    information: { provider: '', model: '', apiKey: '' },
    writing: { provider: '', model: '', apiKey: '' },
    image: { provider: '', model: '', apiKey: '', style: 'realistic' }
  });

  const [activeTab, setActiveTab] = useState<'information' | 'writing' | 'image'>('information');
  
  // 다이얼로그 상태 관리
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'info' | 'warning' | 'error' | 'success' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });
  
  // 설정 로드 (캐시된 데이터 사용, API 호출 없음)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        console.log('🔄 LLMSettings: 캐시된 설정 로드 시작');
        
        // LLMClientFactory에서 캐시된 설정 가져오기 (API 호출 없음)
        const cachedData = LLMClientFactory.getCachedSettings();
        if (!cachedData) {
          console.warn('캐시된 설정이 없습니다. 기본값을 사용합니다.');
          return;
        }
        
        const loadedSettings = cachedData.settings;
        
        // 네이버 API 설정 로드
        try {
          const naverSettings = await (window as any).electronAPI.loadNaverApiSettings();
          
          if (naverSettings && naverSettings.success && naverSettings.data) {
            setNaverApiKeys({
              clientId: naverSettings.data.clientId || '',
              clientSecret: naverSettings.data.clientSecret || ''
            });
            
            if (naverSettings.data.isValid) {
              setNaverTestingStatus({
                testing: false,
                success: true,
                message: '✅ 저장된 네이버 API 설정이 로드되었습니다.'
              });
            }
          }
        } catch (error) {
          console.warn('네이버 API 설정 로드 실패:', error);
        }

        // 유튜브 API 설정 로드
        try {
          const youtubeSettings = await (window as any).electronAPI.loadYouTubeApiSettings();
          
          if (youtubeSettings && youtubeSettings.success && youtubeSettings.data) {
            setYoutubeApiKeys({
              apiKey: youtubeSettings.data.apiKey || ''
            });
            
            if (youtubeSettings.data.isValid) {
              setYoutubeTestingStatus({
                testing: false,
                success: true,
                message: '✅ 저장된 YouTube API 설정이 로드되었습니다.'
              });
            }
          }
        } catch (error) {
          console.warn('YouTube API 설정 로드 실패:', error);
        }
        
        // 제공자별 API 키 추출
        const extractedKeys: ProviderApiKeys = {
          claude: '',
          openai: '',
          gemini: '',
          runware: '',
          naver: ''
        };
        
        // 모든 탭에서 API 키 수집 - 가장 최근 값으로 업데이트
        const tabs = Object.keys(loadedSettings) as Array<keyof LLMSettings>;
        for (const tab of tabs) {
          const config = loadedSettings[tab];
          if (config.provider && config.apiKey) {
            const providerKey = config.provider as keyof ProviderApiKeys;
            // 이미 존재하는 키도 덮어쓰기 (가장 최근 저장된 값 사용)
            extractedKeys[providerKey] = config.apiKey;
          }
        }
        
        setProviderApiKeys(extractedKeys);
        
        // 설정 복원 - 같은 제공자를 사용하는 모든 탭에 같은 API 키 적용
        const restoredSettings = { ...loadedSettings };
        for (const tab of tabs) {
          const config = restoredSettings[tab];
          if (config.provider) {
            const providerKey = config.provider as keyof ProviderApiKeys;
            // 제공자별 저장소에서 API 키 가져오기
            const apiKey = extractedKeys[providerKey] || config.apiKey || '';
            restoredSettings[tab].apiKey = apiKey;
            
            // 같은 제공자를 사용하는 다른 탭들도 동일한 API 키로 설정
            for (const otherTab of tabs) {
              if (otherTab !== tab && restoredSettings[otherTab].provider === config.provider) {
                restoredSettings[otherTab].apiKey = apiKey;
              }
            }
          }
        }
        
        setSettings(restoredSettings);
        
        // 성공한 설정들을 successfulConfigs에 저장
        const successfulConfigsData: SuccessfulConfigs = {};
        const successfulSettings = { ...restoredSettings };
        for (const tab of tabs) {
          const isTestSuccessful = cachedData.testingStatus?.[tab]?.success;
          if (isTestSuccessful) {
            const config = restoredSettings[tab];
            const configKey = `${config.provider}-${config.model}`;
            successfulConfigsData[configKey] = {
              provider: config.provider,
              model: config.model,
              apiKey: config.apiKey
            };
          } else {
            // 테스트 성공하지 않은 설정은 appliedSettings에서 제거
            successfulSettings[tab] = { provider: '', model: '', apiKey: '', style: 'realistic' };
          }
        }
        setSuccessfulConfigs(successfulConfigsData);
        setAppliedSettings(successfulSettings);
        
        // 테스트 상태도 복원 (캐시된 데이터 사용)
        if (cachedData.testingStatus) {
          setTestingStatus(cachedData.testingStatus);
        }
      } catch (error) {
        // 에러 발생 시 무시 (기본값 사용)
      }
    };
    
    loadSettings();
  }, []);
  
  // API 키 테스트 상태 관리
  const [testingStatus, setTestingStatus] = useState<{
    [key: string]: {
      testing: boolean;
      success: boolean;
      message: string;
    }
  }>({});

  const providers = [
    { id: 'claude', name: 'Claude', icon: '🟠', color: 'orange' },
    { id: 'openai', name: 'OpenAI', icon: '🔵', color: 'blue' },
    { id: 'gemini', name: 'Gemini', icon: '🟢', color: 'green' },
    { id: 'runware', name: 'Runware', icon: '⚡', color: 'purple' }
  ];

  // Runware 스타일별 실제 모델 매핑
  const runwareStyleModels = {
    'sdxl-base': {
      realistic: 'civitai:4201@130072', // Realistic Vision V6.0
      photographic: 'civitai:102438@133677', // SDXL Base (사진 특화)
      illustration: 'civitai:24149@144666', // Mistoon Anime (일러스트)
      anime: 'civitai:24149@144666', // Mistoon Anime
      dreamy: 'civitai:1125067@1250712' // CyberRealistic (몽환적)
    },
    'flux-base': {
      realistic: 'flux-1-schnell', // FLUX 기본 (사실적)
      photographic: 'flux-1-dev', // FLUX Dev (사진)
      illustration: 'flux-1-schnell', // FLUX 기본 (일러스트)
      anime: 'flux-1-schnell', // FLUX 기본 (애니메이션)
      dreamy: 'flux-1-pro' // FLUX Pro (몽환적)
    }
  };

  const modelsByProvider = {
    claude: {
      text: [
        { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: '최신 고품질 모델', tier: 'premium' },
        { id: 'claude-opus-4-1-20250805', name: 'Claude Opus 4.1', description: '최고품질 모델', tier: 'premium' },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: '빠르고 경제적', tier: 'basic' }
      ]
    },
    openai: {
      text: [
        { id: 'gpt-5', name: 'GPT-5', description: '최고 성능 모델', tier: 'enterprise' },
        { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: '균형잡힌 성능', tier: 'premium' },
        { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: '빠르고 경제적', tier: 'basic' }
      ],
      image: [
        { id: 'gpt-image-1', name: 'GPT Image 1', description: '최고품질 이미지 생성', tier: 'enterprise' }
      ]
    },
    gemini: {
      text: [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: '최고성능 모델', tier: 'premium' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: '경제적 모델', tier: 'basic' }
      ],
      image: [
        { id: 'gemini-2.5-flash-image-preview', name: 'Gemini 2.5 Flash Image', description: '이미지 생성 및 편집', tier: 'enterprise' }
      ]
    },
    runware: {
      image: [
        { id: 'sdxl-base', name: 'Stable Diffusion XL', description: '다양한 스타일 지원 모델', tier: 'basic' },
        { id: 'flux-base', name: 'FLUX.1', description: '고품질 세밀한 생성 모델', tier: 'premium' }
      ]
    }
  };

  // API 키 삭제 함수
  const deleteApiKey = (category: keyof LLMSettings) => {
    const { provider, model } = settings[category];
    
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'API 키 삭제',
      message: `${provider.toUpperCase()} 제공자의 모든 API 키를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 모든 저장된 ${provider} API 키가 제거됩니다.`,
      onConfirm: () => {
        // 제공자별 API 키 삭제
        setProviderApiKeys(prev => ({
          ...prev,
          [provider as keyof ProviderApiKeys]: ''
        }));
        
        // 해당 제공자의 모든 성공한 설정 삭제
        setSuccessfulConfigs(prev => {
          const newConfigs = { ...prev };
          Object.keys(newConfigs).forEach(configKey => {
            if (configKey.startsWith(`${provider}-`)) {
              delete newConfigs[configKey];
            }
          });
          return newConfigs;
        });
        
        // 같은 제공자를 사용하는 모든 탭의 API 키 삭제
        setSettings(prev => {
          const newSettings = { ...prev };
          Object.keys(newSettings).forEach(tabKey => {
            const tab = tabKey as keyof LLMSettings;
            if (newSettings[tab].provider === provider) {
              newSettings[tab].apiKey = '';
            }
          });
          return newSettings;
        });
        
        // 해당 제공자의 모든 테스트 상태 초기화
        setTestingStatus(prev => {
          const newStatus = { ...prev };
          Object.keys(newStatus).forEach(tabKey => {
            const tab = tabKey as keyof LLMSettings;
            if (settings[tab].provider === provider) {
              newStatus[tab] = { testing: false, success: false, message: '' };
            }
          });
          return newStatus;
        });
        
        // appliedSettings에서도 해당 제공자 제거
        setAppliedSettings(prev => {
          const newApplied = { ...prev };
          Object.keys(newApplied).forEach(tabKey => {
            const tab = tabKey as keyof LLMSettings;
            if (newApplied[tab].provider === provider) {
              newApplied[tab] = { provider: '', model: '', apiKey: '', style: 'realistic' };
            }
          });
          return newApplied;
        });
        
        // 설정 변경 알림
        if (onSettingsChange) {
          onSettingsChange();
        }
      }
    });
  };

  const updateSetting = (category: keyof LLMSettings, field: keyof LLMConfig, value: string) => {
    if (field === 'provider') {
      // 제공자 변경 시 - 기존 API 키 유지
      const existingApiKey = value ? (providerApiKeys[value as keyof ProviderApiKeys] || '') : '';
      
      setSettings(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          provider: value,
          model: '', // 모델은 초기화
          apiKey: existingApiKey,
          style: category === 'image' ? 'realistic' : prev[category].style // 이미지 탭일 때만 스타일 초기화
        }
      }));
    } else if (field === 'apiKey') {
      // API 키 변경 시 - 제공자별 저장소에도 업데이트
      const provider = settings[category].provider;
      if (provider) {
        setProviderApiKeys(prev => ({
          ...prev,
          [provider as keyof ProviderApiKeys]: value
        }));
        
        // 같은 제공자를 사용하는 다른 탭의 API 키도 동시에 업데이트
        setSettings(prev => {
          const newSettings = { ...prev };
          Object.keys(newSettings).forEach(tabKey => {
            const tab = tabKey as keyof LLMSettings;
            if (newSettings[tab].provider === provider) {
              newSettings[tab].apiKey = value;
            }
          });
          return newSettings;
        });
      } else {
        // 제공자가 없는 경우 현재 탭만 업데이트
        setSettings(prev => ({
          ...prev,
          [category]: {
            ...prev[category],
            apiKey: value
          }
        }));
      }
    } else if (field === 'model') {
      // 모델 변경 시 - 성공했던 설정이 있으면 API 키 복원
      const provider = settings[category].provider;
      const configKey = `${provider}-${value}`;
      const successfulConfig = successfulConfigs[configKey];
      
      setSettings(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          model: value,
          // 성공했던 설정이 있으면 해당 API 키 사용, 없으면 현재 제공자의 API 키 유지
          apiKey: successfulConfig?.apiKey || prev[category].apiKey
        }
      }));
    } else {
      // 기타 필드
      setSettings(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [field]: value
        }
      }));
    }
    
    // API 키, 제공자, 모델이 변경되면 해당 탭의 테스트 상태 초기화
    if (field === 'apiKey' || field === 'provider' || field === 'model') {
      setTestingStatus(prev => ({
        ...prev,
        [category]: { testing: false, success: false, message: '' }
      }));
    }

    // 설정 변경 시 부모 컴포넌트에 알림
    if (onSettingsChange) {
      onSettingsChange();
    }
  };

  // API 키 테스트 함수
  const testApiKey = async (category: keyof LLMSettings) => {
    const { provider, apiKey, model } = settings[category];
    
    if (!apiKey || !provider || !model) {
      setTestingStatus(prev => ({
        ...prev,
        [category]: { testing: false, success: false, message: '❌ 제공자, 모델, API 키를 모두 입력해주세요.' }
      }));
      return;
    }

    // 테스트 시작
    setTestingStatus(prev => ({
      ...prev,
      [category]: { testing: true, success: false, message: '연결 테스트 중...' }
    }));

    try {
      // 실제 API 테스트
      const result = await testAPIConnection(provider, apiKey);
      
      if (result.success) {
        // 성공
        setTestingStatus(prev => ({
          ...prev,
          [category]: { 
            testing: false, 
            success: true, 
            message: `✅ ${provider.toUpperCase()} API 연결 성공! ${model} 모델이 적용되었습니다.` 
          }
        }));
        
        // 테스트 성공 시 appliedSettings 업데이트 및 저장
        try {
          // 성공한 설정을 successfulConfigs에 저장
          const configKey = `${provider}-${model}`;
          setSuccessfulConfigs(prev => ({
            ...prev,
            [configKey]: {
              provider,
              model,
              apiKey
            }
          }));
          
          // 테스트 성공한 설정을 appliedSettings에 반영
          const newAppliedSettings = {
            ...appliedSettings,
            [category]: settings[category]
          };
          setAppliedSettings(newAppliedSettings);
          
          // 성공한 테스트 상태도 업데이트
          const newTestingStatus = {
            ...testingStatus,
            [category]: { 
              testing: false, 
              success: true, 
              message: `✅ ${provider.toUpperCase()} API 연결 성공! ${model} 모델이 적용되었습니다.` 
            }
          };
          
          // 설정과 테스트 상태를 함께 저장
          const dataToSave = {
            settings: settings,
            testingStatus: newTestingStatus
          };
          
          const result = await (window as any).electronAPI.saveSettings(dataToSave);
          if (!result.success) {
            console.error('❌ 자동 저장 실패:', result.message);
          } else {
            // 설정 저장 성공 시 LLMClientFactory 캐시 업데이트
            try {
              LLMClientFactory.updateCachedSettings(dataToSave.settings, dataToSave.testingStatus);
            } catch (error) {
              console.error('LLMClientFactory 캐시 업데이트 실패:', error);
            }
            
            // 설정 저장 성공 시 부모 컴포넌트에 알림
            if (onSettingsChange) {
              onSettingsChange();
            }
          }
        } catch (error) {
          console.error('❌ 자동 저장 중 오류:', error);
        }
        
      } else {
        // 실패
        setTestingStatus(prev => ({
          ...prev,
          [category]: { 
            testing: false, 
            success: false, 
            message: `❌ 연결 실패: ${result.message}` 
          }
        }));
      }
    } catch (error: any) {
      // 에러
      console.error('API 테스트 에러:', error);
      setTestingStatus(prev => ({
        ...prev,
        [category]: { 
          testing: false, 
          success: false, 
          message: `❌ 연결 테스트 중 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}` 
        }
      }));
    }
  };

  // 실제 API 연결 테스트 (Electron IPC 사용)
  const testAPIConnection = async (provider: string, apiKey: string): Promise<{success: boolean, message: string}> => {
    console.log(`🔍 Testing ${provider} API with key: ${apiKey.substring(0, 10)}...`);
    
    try {
      // Electron IPC를 통해 Main process에서 API 테스트 실행
      const result = await (window as any).electronAPI.testAPI(provider, apiKey);
      
      console.log(`📡 ${provider} API 테스트 결과:`, result);
      return result;
      
    } catch (error: any) {
      console.error(`❌ ${provider} API 테스트 실패:`, error);
      
      if (error instanceof Error) {
        return { success: false, message: `연결 오류: ${error.message}` };
      }
      
      return { success: false, message: `연결 테스트 실패: ${String(error)}` };
    }
  };


  // 네이버 API 테스트 및 적용 함수
  const testAndApplyNaverApi = async () => {
    const { clientId, clientSecret } = naverApiKeys;
    
    if (!clientId.trim() || !clientSecret.trim()) {
      setNaverTestingStatus({
        testing: false,
        success: false,
        message: '❌ Client ID와 Client Secret을 모두 입력해주세요.'
      });
      return;
    }

    setNaverTestingStatus({ testing: true, success: false, message: '🔄 네이버 API 연결을 테스트 중입니다...' });
    
    try {
      // 네이버 블로그 검색 API로 테스트
      const response = await fetch('https://openapi.naver.com/v1/search/blog.json?query=테스트&display=1', {
        method: 'GET',
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNaverTestingStatus({
          testing: false,
          success: true,
          message: '✅ 네이버 API 연결에 성공했습니다!'
        });
        
        // 테스트 성공시 자동으로 저장 (success: true로 명시적으로 전달)
        console.log('🎯 테스트 성공! 저장 함수 호출 시도');
        await saveNaverApiToStorageWithStatus(true);
        console.log('✅ 저장 함수 호출 완료');
      } else {
        const errorText = await response.text();
        setNaverTestingStatus({
          testing: false,
          success: false,
          message: `❌ API 연결 실패: ${response.status} - ${errorText}`
        });
      }
    } catch (error: any) {
      setNaverTestingStatus({
        testing: false,
        success: false,
        message: `❌ 네트워크 오류: ${error.message}`
      });
    }
  };

  // 네이버 API 설정 저장 함수 (성공 상태를 명시적으로 전달)
  const saveNaverApiToStorageWithStatus = async (isValid: boolean) => {
    const { clientId, clientSecret } = naverApiKeys;
    
    console.log('🚀 네이버 API 저장 함수 호출됨:', { clientId: clientId.substring(0, 5) + '...', isValid });
    
    try {
      // 네이버 API 설정 저장
      console.log('📡 electronAPI.saveNaverApiSettings 호출');
      const result = await (window as any).electronAPI.saveNaverApiSettings({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        isValid: isValid
      });
      
      console.log('💾 저장 결과:', result);

      if (result.success) {
        setNaverTestingStatus(prev => ({
          ...prev,
          message: '✅ 네이버 API 연결 및 저장에 성공했습니다!'
        }));
      } else {
        setNaverTestingStatus({
          testing: false,
          success: false,
          message: `❌ 저장 실패: ${result.message}`
        });
      }
    } catch (error: any) {
      console.error('❌ 네이버 API 저장 중 에러:', error);
      setNaverTestingStatus({
        testing: false,
        success: false,
        message: `❌ 저장 오류: ${error.message}`
      });
    }
  };

  // 네이버 API 설정 저장 함수 (내부용 - 기존 호환성)
  const saveNaverApiToStorage = async () => {
    await saveNaverApiToStorageWithStatus(naverTestingStatus.success);
  };

  // 네이버 API 설정 삭제 함수
  const deleteNaverApi = async () => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: '네이버 API 설정 삭제',
      message: '네이버 API 설정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.',
      onConfirm: async () => {
        try {
          // API 키 삭제
          const result = await (window as any).electronAPI.deleteNaverApiSettings();
          
          if (result.success) {
            // UI 상태 초기화
            setNaverApiKeys({ clientId: '', clientSecret: '' });
            setNaverTestingStatus({ testing: false, success: false, message: '' });
            
            setDialog({
              isOpen: true,
              type: 'success',
              title: '삭제 완료',
              message: '네이버 API 설정이 성공적으로 삭제되었습니다.'
            });
          } else {
            setDialog({
              isOpen: true,
              type: 'error',
              title: '삭제 실패',
              message: `API 설정 삭제에 실패했습니다:\n${result.message}`
            });
          }
        } catch (error: any) {
          setDialog({
            isOpen: true,
            type: 'error',
            title: '삭제 오류',
            message: `API 설정 삭제 중 오류가 발생했습니다:\n${error.message}`
          });
        }
      }
    });
  };

  // 유튜브 API 테스트 및 적용 함수
  const testAndApplyYoutubeApi = async () => {
    const { apiKey } = youtubeApiKeys;
    
    if (!apiKey.trim()) {
      setYoutubeTestingStatus({
        testing: false,
        success: false,
        message: '❌ YouTube Data API 키를 입력해주세요.'
      });
      return;
    }

    setYoutubeTestingStatus({ testing: true, success: false, message: '🔄 YouTube API 연결을 테스트 중입니다...' });
    
    try {
      // YouTube API로 테스트 (검색 API 사용)
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&type=video&maxResults=1&key=${apiKey}`, {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        setYoutubeTestingStatus({
          testing: false,
          success: true,
          message: '✅ YouTube API 연결에 성공했습니다!'
        });
        
        // 테스트 성공시 자동으로 저장
        await saveYoutubeApiToStorageWithStatus(true);
      } else {
        const errorData = await response.json();
        let errorMessage = `❌ API 연결 실패: ${response.status}`;
        
        if (errorData.error) {
          errorMessage += ` - ${errorData.error.message}`;
          
          // 구체적인 해결 방법 제시
          if (errorData.error.message.includes('API key not valid')) {
            errorMessage += '\n\n해결 방법:\n1. API 키가 올바른지 확인\n2. YouTube Data API v3가 활성화되어 있는지 확인\n3. API 키 제한 설정 확인';
          }
        }
        
        setYoutubeTestingStatus({
          testing: false,
          success: false,
          message: errorMessage
        });
      }
    } catch (error: any) {
      setYoutubeTestingStatus({
        testing: false,
        success: false,
        message: `❌ 네트워크 오류: ${error.message}`
      });
    }
  };

  // 유튜브 API 설정 저장 함수
  const saveYoutubeApiToStorageWithStatus = async (isValid: boolean) => {
    const { apiKey } = youtubeApiKeys;
    
    try {
      const result = await (window as any).electronAPI.saveYouTubeApiSettings({
        apiKey: apiKey.trim(),
        isValid: isValid
      });

      if (result.success) {
        setYoutubeTestingStatus(prev => ({
          ...prev,
          message: '✅ YouTube API 연결 및 저장에 성공했습니다!'
        }));
      } else {
        setYoutubeTestingStatus({
          testing: false,
          success: false,
          message: `❌ 저장 실패: ${result.message}`
        });
      }
    } catch (error: any) {
      setYoutubeTestingStatus({
        testing: false,
        success: false,
        message: `❌ 저장 오류: ${error.message}`
      });
    }
  };

  // 유튜브 API 설정 삭제 함수
  const deleteYoutubeApi = async () => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'YouTube API 설정 삭제',
      message: 'YouTube API 설정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.',
      onConfirm: async () => {
        try {
          const result = await (window as any).electronAPI.deleteYouTubeApiSettings();
          
          if (result.success) {
            setYoutubeApiKeys({ apiKey: '' });
            setYoutubeTestingStatus({ testing: false, success: false, message: '' });
            
            setDialog({
              isOpen: true,
              type: 'success',
              title: '삭제 완료',
              message: 'YouTube API 설정이 성공적으로 삭제되었습니다.'
            });
          } else {
            setDialog({
              isOpen: true,
              type: 'error',
              title: '삭제 실패',
              message: `API 설정 삭제에 실패했습니다:\n${result.message}`
            });
          }
        } catch (error: any) {
          setDialog({
            isOpen: true,
            type: 'error',
            title: '삭제 오류',
            message: `API 설정 삭제 중 오류가 발생했습니다:\n${error.message}`
          });
        }
      }
    });
  };

  const saveSettings = async () => {
    try {
      console.log('💾 설정 저장 시도:', settings);
      
      // 설정과 테스트 상태를 함께 저장
      const dataToSave = {
        settings: settings,
        testingStatus: testingStatus
      };
      
      const result = await (window as any).electronAPI.saveSettings(dataToSave);
      console.log('💾 저장 결과:', result);
      
      if (result.success) {
        setDialog({
          isOpen: true,
          type: 'success',
          title: '저장 완료',
          message: '설정이 성공적으로 저장되었습니다.',
          onConfirm: () => onClose()
        });
      } else {
        console.error('❌ 저장 실패:', result.message);
        setDialog({
          isOpen: true,
          type: 'error',
          title: '저장 실패',
          message: `설정 저장에 실패했습니다:\n${result.message}`
        });
      }
    } catch (error: any) {
      console.error('❌ 설정 저장 오류:', error);
      setDialog({
        isOpen: true,
        type: 'error',
        title: '저장 오류',
        message: `설정 저장 중 오류가 발생했습니다:\n${error.message}`
      });
    }
  };

  const tabs = [
    { id: 'information', name: '🔍 정보처리 LLM', desc: '키워드 추천, 데이터 수집, 요약 등' },
    { id: 'writing', name: '✍️ 글쓰기 LLM', desc: '최종 콘텐츠 생성 (가장 중요!)' },
    { id: 'image', name: '🎨 이미지 LLM', desc: '글 내용 기반 이미지 생성' }
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-4">
      <div className="ultra-card p-6 slide-in">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="section-icon blue" style={{width: '40px', height: '40px', fontSize: '20px'}}>⚙️</div>
            <h2 className="text-2xl font-bold text-slate-900">API 설정</h2>
          </div>
        </div>

        {/* 메인 탭 네비게이션 */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setActiveMainTab('llm')}
            className={`flex-1 section-card cursor-pointer transition-all duration-200 ${
              activeMainTab === 'llm'
                ? 'ring-2 ring-blue-500 ring-offset-2 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
                : 'hover:shadow-lg hover:-translate-y-0.5'
            }`}
            style={{
              padding: '16px 20px',
              marginBottom: '0',
              background: activeMainTab === 'llm' 
                ? 'linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)' 
                : 'white'
            }}
          >
            <div className="flex items-center justify-center gap-3">
              <div className="text-2xl">🤖</div>
              <div className="text-center">
                <div className={`font-semibold text-sm ${
                  activeMainTab === 'llm' ? 'text-blue-900' : 'text-slate-900'
                }`}>
                  LLM 설정
                </div>
                <div className={`text-xs mt-1 ${
                  activeMainTab === 'llm' ? 'text-blue-600' : 'text-slate-500'
                }`}>
                  AI 모델 API 키 관리
                </div>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => setActiveMainTab('api')}
            className={`flex-1 section-card cursor-pointer transition-all duration-200 ${
              activeMainTab === 'api'
                ? 'ring-2 ring-green-500 ring-offset-2 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                : 'hover:shadow-lg hover:-translate-y-0.5'
            }`}
            style={{
              padding: '16px 20px',
              marginBottom: '0',
              background: activeMainTab === 'api' 
                ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)' 
                : 'white'
            }}
          >
            <div className="flex items-center justify-center gap-3">
              <div className="text-2xl">🔍</div>
              <div className="text-center">
                <div className={`font-semibold text-sm ${
                  activeMainTab === 'api' ? 'text-green-900' : 'text-slate-900'
                }`}>
                  구글,네이버 API 설정
                </div>
                <div className={`text-xs mt-1 ${
                  activeMainTab === 'api' ? 'text-green-600' : 'text-slate-500'
                }`}>
                  유튜브/네이버 API 키 관리
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* LLM 설정 탭 */}
        {activeMainTab === 'llm' && (
          <div>
            {/* 탭 네비게이션 */}
            <div className="flex gap-3 mb-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 section-card cursor-pointer transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'ring-2 ring-blue-500 ring-offset-2 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
                        : 'hover:shadow-lg hover:-translate-y-0.5'
                    }`}
                    style={{
                      padding: '20px 16px',
                      marginBottom: '0',
                      background: activeTab === tab.id 
                        ? 'linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)' 
                        : 'white'
                    }}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-3xl">
                        {tab.name.split(' ')[0]}
                      </div>
                      <div className="text-center">
                        <div className={`font-semibold text-sm ${
                          activeTab === tab.id ? 'text-blue-900' : 'text-slate-900'
                        }`}>
                          {tab.name.split(' ')[1]} {tab.name.split(' ')[2]}
                        </div>
                        <div className={`text-xs mt-1 ${
                          activeTab === tab.id ? 'text-blue-600' : 'text-slate-500'
                        }`}>
                          {tab.desc}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* 설정 내용 */}
              <div className="section-card" style={{padding: '20px', marginBottom: '24px'}}>
                <div>
                  {/* 1단계: 제공자 선택 */}
                  <div className="mb-6">
                    <label className="ultra-label" style={{fontSize: '13px', marginBottom: '8px'}}>
                      1단계: AI 제공자 선택
                    </label>
                    <select
                      value={settings[activeTab].provider}
                      onChange={(e) => {
                        updateSetting(activeTab, 'provider', e.target.value);
                        updateSetting(activeTab, 'model', ''); // 모델 초기화
                      }}
                      className="ultra-select w-full" style={{padding: '12px 16px', fontSize: '14px'}}
                    >
                      <option value="">제공자를 선택해주세요</option>
                      {providers
                        .filter(provider => {
                          // 이미지 탭에서는 Claude 제외 (이미지 생성 불가)
                          if (activeTab === 'image' && provider.id === 'claude') {
                            return false;
                          }
                          // 정보처리/글쓰기 탭에서는 Runware 제외 (텍스트 생성 불가)
                          if ((activeTab === 'information' || activeTab === 'writing') && provider.id === 'runware') {
                            return false;
                          }
                          return true;
                        })
                        .map((provider) => (
                          <option key={provider.id} value={provider.id}>
                            {provider.icon} {provider.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* 2단계: 모델 선택 */}
                  {settings[activeTab].provider && (
                    <div className="mb-6">
                      <label className="ultra-label" style={{fontSize: '13px', marginBottom: '8px'}}>
                        2단계: 모델 선택
                      </label>
                      <select
                        value={settings[activeTab].model}
                        onChange={(e) => updateSetting(activeTab, 'model', e.target.value)}
                        className="ultra-select w-full" style={{padding: '12px 16px', fontSize: '14px'}}
                      >
                        <option value="">모델을 선택해주세요</option>
                        {(() => {
                          const provider = settings[activeTab].provider;
                          const modelType = activeTab === 'image' ? 'image' : 'text';
                          const models = (modelsByProvider as any)[provider]?.[modelType] || [];
                          
                          return models.map((model: any) => (
                            <option key={model.id} value={model.id}>
                              {model.name} - {model.description} ({model.tier})
                            </option>
                          ));
                        })()}
                      </select>
                    </div>
                  )}

                  {/* 3단계: 이미지 생성 옵션 (이미지 탭일 때만 표시) */}
                  {activeTab === 'image' && settings[activeTab].provider && (
                    <div className="mb-6">
                      <label className="ultra-label" style={{fontSize: '13px', marginBottom: '8px'}}>
                        3단계: 이미지 생성 옵션
                      </label>
                          
                          {settings[activeTab].provider === 'openai' && (
                            <div className="space-y-4">
                              {/* 품질 선택 */}
                              <div>
                                <label className="text-xs font-medium text-gray-700 mb-2 block">품질 설정</label>
                                <select
                                  value={settings[activeTab].quality || 'high'}
                                  onChange={(e) => updateSetting(activeTab, 'quality', e.target.value)}
                                  className="ultra-select w-full" style={{padding: '8px 12px', fontSize: '13px'}}
                                >
                                  <option value="low">저품질 - $0.01/이미지 (빠른 생성)</option>
                                  <option value="medium">중품질 - $0.04/이미지 (균형)</option>
                                  <option value="high">고품질 - $0.17/이미지 (최고 품질, 권장)</option>
                                </select>
                              </div>
                              
                              {/* 해상도 선택 */}
                              <div>
                                <label className="text-xs font-medium text-gray-700 mb-2 block">해상도 설정</label>
                                <select
                                  value={settings[activeTab].size || '1024x1024'}
                                  onChange={(e) => updateSetting(activeTab, 'size', e.target.value)}
                                  className="ultra-select w-full" style={{padding: '8px 12px', fontSize: '13px'}}
                                >
                                  <option value="1024x1024">1024x1024 (정사각형)</option>
                                  <option value="1024x1536">1024x1536 (세로형)</option>
                                  <option value="1536x1024">1536x1024 (가로형)</option>
                                </select>
                              </div>
                              
                              {/* 스타일 선택 */}
                              <div>
                                <label className="text-xs font-medium text-gray-700 mb-2 block">이미지 스타일</label>
                                <select
                                  value={settings[activeTab].style || 'realistic'}
                                  onChange={(e) => updateSetting(activeTab, 'style', e.target.value)}
                                  className="ultra-select w-full" style={{padding: '8px 12px', fontSize: '13px'}}
                                >
                                  <option value="realistic">사실적</option>
                                  <option value="photographic">사진 같은</option>
                                  <option value="anime">애니메이션</option>
                                  <option value="illustration">일러스트</option>
                                  <option value="dreamy">몽환적</option>
                                </select>
                              </div>
                              
                              {/* 예상 비용 표시 */}
                              <div className="bg-blue-50 p-3 rounded border">
                                <div className="text-xs text-blue-700">
                                  <strong>💰 예상 비용:</strong>{' '}
                                  {settings[activeTab].quality === 'low' && '$0.01'}
                                  {settings[activeTab].quality === 'medium' && '$0.04'}
                                  {(settings[activeTab].quality === 'high' || !settings[activeTab].quality) && '$0.17'}
                                  /이미지 ({settings[activeTab].size || '1024x1024'})
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {settings[activeTab].provider === 'gemini' && (
                            <div className="space-y-4">
                              {/* 스타일 선택 */}
                              <div>
                                <label className="text-xs font-medium text-gray-700 mb-2 block">이미지 스타일</label>
                                <select
                                  value={settings[activeTab].style || 'realistic'}
                                  onChange={(e) => updateSetting(activeTab, 'style', e.target.value)}
                                  className="ultra-select w-full" style={{padding: '8px 12px', fontSize: '13px'}}
                                >
                                  <option value="realistic">사실적</option>
                                  <option value="photographic">사진 같은</option>
                                  <option value="anime">애니메이션</option>
                                  <option value="illustration">일러스트</option>
                                  <option value="dreamy">몽환적</option>
                                </select>
                              </div>
                              
                              <div className="bg-green-50 p-3 rounded border">
                                <div className="text-sm text-green-700 space-y-1">
                                  <div><strong>품질:</strong> 자동 최적화 (선택 불가)</div>
                                  <div><strong>해상도:</strong> 1024x1024 고정</div>
                                  <div><strong>💰 비용:</strong> $0.039/이미지 (고정)</div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {settings[activeTab].provider === 'runware' && (
                            <div className="space-y-4">
                              {/* 품질 선택 */}
                              <div>
                                <label className="text-xs font-medium text-gray-700 mb-2 block">품질 설정 (Steps)</label>
                                <select
                                  value={settings[activeTab].quality || 'medium'}
                                  onChange={(e) => updateSetting(activeTab, 'quality', e.target.value)}
                                  className="ultra-select w-full" style={{padding: '8px 12px', fontSize: '13px'}}
                                >
                                  <option value="low">저품질 - 10 steps (빠른 생성)</option>
                                  <option value="medium">중품질 - 15 steps (권장)</option>
                                  <option value="high">고품질 - 25 steps (최고 품질)</option>
                                </select>
                              </div>
                              
                              {/* 해상도 선택 */}
                              <div>
                                <label className="text-xs font-medium text-gray-700 mb-2 block">해상도 설정</label>
                                <select
                                  value={settings[activeTab].size || '1024x1024'}
                                  onChange={(e) => updateSetting(activeTab, 'size', e.target.value)}
                                  className="ultra-select w-full" style={{padding: '8px 12px', fontSize: '13px'}}
                                >
                                  <option value="1024x1024">1024x1024 (정사각형)</option>
                                  <option value="1024x1536">1024x1536 (세로형)</option>
                                  <option value="1536x1024">1536x1024 (가로형)</option>
                                  <option value="512x768">512x768 (초저가 세로형)</option>
                                  <option value="768x512">768x512 (초저가 가로형)</option>
                                </select>
                              </div>
                              
                              {/* 스타일 선택 */}
                              <div>
                                <label className="text-xs font-medium text-gray-700 mb-2 block">이미지 스타일</label>
                                <select
                                  value={settings[activeTab].style || 'realistic'}
                                  onChange={(e) => updateSetting(activeTab, 'style', e.target.value)}
                                  className="ultra-select w-full" style={{padding: '8px 12px', fontSize: '13px'}}
                                >
                                  {settings[activeTab].model === 'sdxl-base' ? (
                                    <>
                                      <option value="realistic">사실적 (Realistic Vision V6.0)</option>
                                      <option value="photographic">사진 같은 (SDXL Base)</option>
                                      <option value="illustration">일러스트 (Mistoon Anime)</option>
                                      <option value="anime">애니메이션 (Mistoon Anime)</option>
                                      <option value="dreamy">몽환적 (CyberRealistic)</option>
                                    </>
                                  ) : settings[activeTab].model === 'flux-base' ? (
                                    <>
                                      <option value="realistic">사실적 (FLUX Schnell)</option>
                                      <option value="photographic">사진 같은 (FLUX Dev)</option>
                                      <option value="illustration">일러스트 (FLUX Schnell)</option>
                                      <option value="anime">애니메이션 (FLUX Schnell)</option>
                                      <option value="dreamy">몽환적 (FLUX Pro)</option>
                                    </>
                                  ) : (
                                    <>
                                      <option value="realistic">사실적</option>
                                      <option value="photographic">사진 같은</option>
                                      <option value="anime">애니메이션</option>
                                      <option value="illustration">일러스트</option>
                                      <option value="dreamy">몽환적</option>
                                    </>
                                  )}
                                </select>
                              </div>
                              
                              {/* 예상 비용 표시 */}
                              <div className="bg-purple-50 p-3 rounded border border-purple-200">
                                <div className="text-xs text-purple-700">
                                  {(() => {
                                    const model = settings[activeTab].model;
                                    const style = settings[activeTab].style || 'realistic';
                                    
                                    if (model === 'sdxl-base') {
                                      const actualModel = runwareStyleModels['sdxl-base'][style as keyof typeof runwareStyleModels['sdxl-base']];
                                      return (
                                        <>
                                          <strong>⚡ 예상 비용:</strong> $0.0006/이미지 (초저가!)<br/>
                                          <strong>📐 해상도:</strong> {settings[activeTab].size || '1024x1024'}<br/>
                                          <strong>🎛️ 품질:</strong> {
                                            settings[activeTab].quality === 'low' ? '10 steps (빠름)' :
                                            settings[activeTab].quality === 'high' ? '25 steps (최고)' :
                                            '15 steps (권장)'
                                          }<br/>
                                          <strong>🎨 실제 모델:</strong> {actualModel}<br/>
                                          <strong>⚡ 속도:</strong> 2-3초
                                        </>
                                      );
                                    } else if (model === 'flux-base') {
                                      const actualModel = runwareStyleModels['flux-base'][style as keyof typeof runwareStyleModels['flux-base']];
                                      return (
                                        <>
                                          <strong>⚡ 예상 비용:</strong> $0.001~$0.003/이미지 (저가)<br/>
                                          <strong>📐 해상도:</strong> {settings[activeTab].size || '1024x1024'}<br/>
                                          <strong>🎛️ 품질:</strong> {
                                            settings[activeTab].quality === 'low' ? '4 steps (초고속)' :
                                            settings[activeTab].quality === 'high' ? '8 steps (최고)' :
                                            '6 steps (권장)'
                                          }<br/>
                                          <strong>🎨 실제 모델:</strong> {actualModel}<br/>
                                          <strong>⚡ 속도:</strong> 1-2초
                                        </>
                                      );
                                    } else {
                                      return (
                                        <>
                                          <strong>⚡ 예상 비용:</strong> $0.0006~$0.003/이미지<br/>
                                          <strong>📐 해상도:</strong> {settings[activeTab].size || '1024x1024'}<br/>
                                          <strong>🎛️ 품질:</strong> {
                                            settings[activeTab].quality === 'low' ? '10 steps (빠름)' :
                                            settings[activeTab].quality === 'high' ? '25 steps (최고)' :
                                            '15 steps (권장)'
                                          }
                                        </>
                                      );
                                    }
                                  })()}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {settings[activeTab].provider === 'claude' && (
                            <div className="bg-orange-50 p-3 rounded border border-orange-200">
                              <div className="text-sm text-orange-700">
                                ⚠️ Claude는 이미지 생성을 지원하지 않습니다.
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                  {/* 4단계: API 키 입력 */}
                  {settings[activeTab].provider && (
                    <div className="mb-6">
                      <label className="ultra-label" style={{fontSize: '13px', marginBottom: '8px'}}>
                        4단계: API 키 입력
                      </label>
                      <div className="mb-4">
                        <input
                          type="password"
                          value={settings[activeTab].apiKey}
                          onChange={(e) => updateSetting(activeTab, 'apiKey', e.target.value)}
                          placeholder={`${settings[activeTab].provider.toUpperCase()} API 키를 입력하세요`}
                          className="ultra-input w-full" style={{padding: '12px 16px', fontSize: '14px'}}
                        />
                      </div>

                      {/* 테스트 및 적용, 삭제 버튼 */}
                      <div className="flex justify-end !gap-2 !mt-4 !mb-4">
                        <button
                          onClick={() => deleteApiKey(activeTab)}
                          disabled={testingStatus[activeTab]?.testing || !settings[activeTab].apiKey}
                          className="ultra-btn px-4 py-2 text-xs"
                          style={{
                            background: '#64748b',
                            borderColor: '#64748b',
                            color: 'white'
                          }}
                        >
                          <span className="text-sm">🗑️</span>
                          <span>삭제</span>
                        </button>
                        
                        <button
                          onClick={() => testApiKey(activeTab)}
                          disabled={!settings[activeTab].apiKey || testingStatus[activeTab]?.testing || testingStatus[activeTab]?.success}
                          className="ultra-btn px-4 py-2 text-xs"
                          style={{
                            background: testingStatus[activeTab]?.success ? '#10b981' : '#10b981',
                            borderColor: testingStatus[activeTab]?.success ? '#10b981' : '#10b981',
                            color: 'white'
                          }}
                        >
                          <span className="text-sm">{testingStatus[activeTab]?.testing ? '🔄' : testingStatus[activeTab]?.success ? '✅' : '🧪'}</span>
                          <span>{testingStatus[activeTab]?.testing ? '테스트 중...' : testingStatus[activeTab]?.success ? '적용 완료' : '테스트 및 적용'}</span>
                        </button>
                      </div>
                      
                      {/* 테스트 결과 메시지 */}
                      {testingStatus[activeTab]?.message && (
                        <div className={`p-3 rounded-lg mt-3 ${
                          testingStatus[activeTab]?.success 
                            ? 'bg-green-50 border border-green-200' 
                            : testingStatus[activeTab]?.testing
                            ? 'bg-blue-50 border border-blue-200'
                            : 'bg-red-50 border border-red-200'
                        }`}>
                          <p className={`text-sm font-medium ${
                            testingStatus[activeTab]?.success 
                              ? 'text-green-800' 
                              : testingStatus[activeTab]?.testing
                              ? 'text-blue-800'
                              : 'text-red-800'
                          }`}>
                            {testingStatus[activeTab]?.message}
                          </p>
                        </div>
                      )}

                      {/* 로드된 설정 메시지 (테스트 메시지가 없고 API 키가 있을 때) */}
                      {!testingStatus[activeTab]?.message && settings[activeTab].apiKey && (
                        <div className="p-3 rounded-lg mt-3 bg-blue-50 border border-blue-200">
                          <p className="text-sm font-medium text-blue-800">
                            ✅ 저장된 {settings[activeTab].provider.toUpperCase()} API 설정이 로드되었습니다.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 현재 설정 요약 */}
                  {appliedSettings[activeTab].provider && (
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <h4 className="font-semibold text-sm text-slate-900 mb-3">현재 적용된 설정</h4>
                      <div className="grid grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="text-slate-600 block mb-1">제공자</span>
                          <span className="font-semibold">{appliedSettings[activeTab].provider.toUpperCase()}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 block mb-1">모델</span>
                          <span className="font-semibold">{appliedSettings[activeTab].model || '미선택'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 block mb-1">API 키</span>
                          <div className={`flex items-center gap-1 font-semibold ${appliedSettings[activeTab].apiKey ? 'text-green-600' : 'text-red-500'}`}>
                            {appliedSettings[activeTab].apiKey ? <>🔑 설정됨</> : <>🔒 미설정</>}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-600 block mb-1">연결 상태</span>
                          <div className={`flex items-center gap-1 font-semibold ${
                            testingStatus[activeTab]?.success 
                              ? 'text-green-600' 
                              : testingStatus[activeTab]?.message && !testingStatus[activeTab]?.success
                              ? 'text-red-500'
                              : 'text-slate-500'
                          }`}>
                            {testingStatus[activeTab]?.testing 
                              ? <>🔄 테스트 중...</>
                              : testingStatus[activeTab]?.success 
                              ? <>✅ 연결됨</>
                              : testingStatus[activeTab]?.message && !testingStatus[activeTab]?.success
                              ? <>❌ 연결 실패</>
                              : <>⚪ 미확인</>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* API 키 발급 가이드 */}
                  {settings[activeTab].provider && (
                    <div className={`p-4 rounded-lg mt-4 ${
                      settings[activeTab].provider === 'claude' ? 'bg-orange-50' :
                      settings[activeTab].provider === 'openai' ? 'bg-blue-50' :
                      settings[activeTab].provider === 'gemini' ? 'bg-green-50' : 'bg-gray-50'
                    }`}>
                      <h4 className={`font-semibold mb-2 ${
                        settings[activeTab].provider === 'claude' ? 'text-orange-800' :
                        settings[activeTab].provider === 'openai' ? 'text-blue-800' :
                        settings[activeTab].provider === 'gemini' ? 'text-green-800' : 'text-gray-800'
                      }`}>📝 {
                        settings[activeTab].provider === 'claude' ? 'Claude' :
                        settings[activeTab].provider === 'openai' ? 'OpenAI' :
                        settings[activeTab].provider === 'gemini' ? 'Gemini' : ''
                      } API 키 발급 방법</h4>
                      <ol className={`text-sm space-y-1 ${
                        settings[activeTab].provider === 'claude' ? 'text-orange-700' :
                        settings[activeTab].provider === 'openai' ? 'text-blue-700' :
                        settings[activeTab].provider === 'gemini' ? 'text-green-700' : 'text-gray-700'
                      }`}>
                        {settings[activeTab].provider === 'claude' && (
                          <>
                            <li>1. <a href="#" onClick={(e) => { e.preventDefault(); (window as any).electronAPI?.openExternal('https://console.anthropic.com'); }} className="underline cursor-pointer">Claude Console</a> 접속</li>
                            <li>2. 계정 생성 또는 로그인</li>
                            <li>3. "Get API Keys" 또는 "API Keys" 메뉴 선택</li>
                            <li>4. "Create Key" 버튼 클릭하여 새 API 키 생성</li>
                            <li>5. API 키를 복사해서 위에 입력</li>
                            <li>6. "테스트 및 적용" 버튼 클릭</li>
                          </>
                        )}
                        {settings[activeTab].provider === 'openai' && (
                          <>
                            <li>1. <a href="#" onClick={(e) => { e.preventDefault(); (window as any).electronAPI?.openExternal('https://platform.openai.com'); }} className="underline cursor-pointer">OpenAI Platform</a> 접속</li>
                            <li>2. 계정 생성 또는 로그인</li>
                            <li>3. 우상단 프로필 → "View API keys" 선택</li>
                            <li>4. "Create new secret key" 버튼 클릭</li>
                            <li>5. API 키를 복사해서 위에 입력</li>
                            <li>6. "테스트 및 적용" 버튼 클릭</li>
                          </>
                        )}
                        {settings[activeTab].provider === 'gemini' && (
                          <>
                            <li>1. <a href="#" onClick={(e) => { e.preventDefault(); (window as any).electronAPI?.openExternal('https://aistudio.google.com/app/apikey'); }} className="underline cursor-pointer">Google AI Studio</a> 접속</li>
                            <li>2. 구글 계정으로 로그인</li>
                            <li>3. "Create API key" 버튼 클릭</li>
                            <li>4. 프로젝트 선택 또는 새 프로젝트 생성</li>
                            <li>5. API 키를 복사해서 위에 입력</li>
                            <li>6. "테스트 및 적용" 버튼 클릭</li>
                          </>
                        )}
                        {settings[activeTab].provider === 'runware' && (
                          <>
                            <li>1. <a href="#" onClick={(e) => { e.preventDefault(); (window as any).electronAPI?.openExternal('https://my.runware.ai/signup'); }} className="underline cursor-pointer">Runware</a> 회원가입</li>
                            <li>2. 이메일 인증 완료 후 로그인</li>
                            <li>3. 대시보드에서 "API Keys" 메뉴 선택</li>
                            <li>4. "Generate New API Key" 버튼 클릭</li>
                            <li>5. API 키를 복사해서 위에 입력</li>
                            <li>6. "테스트 및 적용" 버튼 클릭</li>
                            <li className="text-purple-600 font-medium">💡 신규 가입 시 무료 크레딧 제공!</li>
                          </>
                        )}
                      </ol>
                    </div>
                  )}

                  {/* 이미지 생성 모델 가격 정보 */}
                  {activeTab === 'image' && settings[activeTab].provider && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        💰 이미지 생성 모델 가격 정보 (2025년 9월 기준)
                      </h4>
                      
                      {settings[activeTab].provider === 'openai' && (
                        <div className="space-y-3">
                          <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                            <h5 className="font-medium text-blue-800 mb-2">🤖 OpenAI GPT-Image-1</h5>
                            <div className="text-sm text-blue-700 space-y-2">
                              <div className="bg-blue-100 p-2 rounded text-xs">
                                <strong>지원 해상도:</strong> 1024x1024 (정사각형), 1024x1536 (세로), 1536x1024 (가로)
                              </div>
                              <div className="grid grid-cols-1 gap-2">
                                <div>
                                  <span className="font-medium">저품질 (Low):</span> $0.01/이미지 - 빠른 생성
                                </div>
                                <div>
                                  <span className="font-medium">중품질 (Medium):</span> $0.04/이미지 - 균형잡힌 품질
                                </div>
                                <div>
                                  <span className="font-medium">고품질 (High):</span> $0.17/이미지 - 최고 품질 (기본값)
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-blue-600 bg-blue-100 p-2 rounded">
                              ✨ <strong>특징:</strong> GPT-4o 기반, 정확한 텍스트 렌더링, 이미지 편집 지원<br/>
                              🎛️ <strong>품질 선택:</strong> API 호출 시 저품질/중품질/고품질 선택 가능
                            </div>
                          </div>
                        </div>
                      )}

                      {settings[activeTab].provider === 'gemini' && (
                        <div className="space-y-3">
                          <div className="bg-green-50 p-3 rounded border-l-4 border-green-400">
                            <h5 className="font-medium text-green-800 mb-2">🎨 Gemini 2.5 Flash Image (Nano-Banana)</h5>
                            <div className="text-sm text-green-700 space-y-1">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="font-medium">가격:</span> $0.039/이미지 (약 ₩52)
                                </div>
                                <div>
                                  <span className="font-medium">해상도:</span> 1024x1024px
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 mt-1">
                                <div>
                                  <span className="font-medium">토큰:</span> 1290 토큰/이미지
                                </div>
                                <div>
                                  <span className="font-medium">OpenAI 대비:</span> <span className="text-green-600 font-bold">95% 저렴</span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-green-600 bg-green-100 p-2 rounded">
                              ✨ <strong>특징:</strong> 캐릭터 일관성, 다중 이미지 블렌딩, 자연어 편집, 초저지연<br/>
                              📏 <strong>해상도:</strong> 1024x1024 고정 (품질 설정 미지원)
                            </div>
                          </div>
                        </div>
                      )}

                      {settings[activeTab].provider === 'runware' && (
                        <div className="space-y-3">
                          <div className="bg-purple-50 p-3 rounded border-l-4 border-purple-400">
                            <h5 className="font-medium text-purple-800 mb-2">⚡ Runware API (초저가!)</h5>
                            <div className="text-sm text-purple-700 space-y-1">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="font-medium">가격:</span> $0.0006~$0.002/이미지
                                </div>
                                <div>
                                  <span className="font-medium">속도:</span> 초고속 생성
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 mt-1">
                                <div>
                                  <span className="font-medium">모델:</span> SDXL, FLUX, CivitAI
                                </div>
                                <div>
                                  <span className="font-medium">OpenAI 대비:</span> <span className="text-purple-600 font-bold">99% 저렴!</span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-purple-600 bg-purple-100 p-2 rounded">
                              ⚡ <strong>특징:</strong> 업계 최저가, 초고속 Sonic Inference Engine, 다양한 모델 지원<br/>
                              🎛️ <strong>품질 선택:</strong> Steps로 품질 조절 (10~25 steps)
                            </div>
                          </div>
                        </div>
                      )}

                      {settings[activeTab].provider === 'claude' && (
                        <div className="bg-orange-50 p-3 rounded border-l-4 border-orange-400">
                          <h5 className="font-medium text-orange-800 mb-2">⚠️ Claude</h5>
                          <div className="text-sm text-orange-700">
                            Claude는 현재 이미지 생성을 지원하지 않습니다.<br />
                            이미지 생성이 필요한 경우 OpenAI, Gemini 또는 Runware를 선택해주세요.
                          </div>
                        </div>
                      )}

                      <div className="mt-3 text-xs text-gray-500 italic">
                        💡 가격은 2025년 9월 기준이며, 실제 요금은 각 제공업체의 최신 요금표를 확인해주세요.
                      </div>
                    </div>
                  )}
                </div>
              </div>

            {/* 버튼들 */}
            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={onClose}
                className="ultra-btn px-4 py-2 text-sm"
                style={{
                  background: '#64748b',
                  borderColor: '#64748b'
                }}
              >
                <span>닫기</span>
                <span className="text-sm">✕</span>
              </button>
              <button
                onClick={saveSettings}
                className="ultra-btn px-4 py-2 text-sm"
                style={{
                  background: '#10b981',
                  borderColor: '#10b981'
                }}
              >
                <span>저장</span>
                <span className="text-sm">✓</span>
              </button>
            </div>
          </div>
        )}

        {/* API 설정 탭 */}
        {activeMainTab === 'api' && (
          <div>
            {/* API 서브 탭 네비게이션 */}
            <div className="flex gap-3 mb-8">
              <button
                onClick={() => setActiveApiTab('naver')}
                className={`flex-1 section-card cursor-pointer transition-all duration-200 ${
                  activeApiTab === 'naver'
                    ? 'ring-2 ring-green-500 ring-offset-2 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                    : 'hover:shadow-lg hover:-translate-y-0.5'
                }`}
                style={{
                  padding: '16px 20px',
                  marginBottom: '0',
                  background: activeApiTab === 'naver' 
                    ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)' 
                    : 'white'
                }}
              >
                <div className="flex items-center justify-center gap-3">
                  <div className="text-2xl">🔍</div>
                  <div className="text-center">
                    <div className={`font-semibold text-sm ${
                      activeApiTab === 'naver' ? 'text-green-900' : 'text-slate-900'
                    }`}>
                      네이버 API
                    </div>
                    <div className={`text-xs mt-1 ${
                      activeApiTab === 'naver' ? 'text-green-600' : 'text-slate-500'
                    }`}>
                      검색 API
                    </div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setActiveApiTab('youtube')}
                className={`flex-1 section-card cursor-pointer transition-all duration-200 ${
                  activeApiTab === 'youtube'
                    ? 'ring-2 ring-red-500 ring-offset-2 bg-gradient-to-br from-red-50 to-pink-50 border-red-200'
                    : 'hover:shadow-lg hover:-translate-y-0.5'
                }`}
                style={{
                  padding: '16px 20px',
                  marginBottom: '0',
                  background: activeApiTab === 'youtube' 
                    ? 'linear-gradient(135deg, #fef2f2 0%, #fdf2f8 100%)' 
                    : 'white'
                }}
              >
                <div className="flex items-center justify-center gap-3">
                  <div className="text-2xl">📺</div>
                  <div className="text-center">
                    <div className={`font-semibold text-sm ${
                      activeApiTab === 'youtube' ? 'text-red-900' : 'text-slate-900'
                    }`}>
                      유튜브 API
                    </div>
                    <div className={`text-xs mt-1 ${
                      activeApiTab === 'youtube' ? 'text-red-600' : 'text-slate-500'
                    }`}>
                      Data API v3
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* 네이버 API 설정 */}
            {activeApiTab === 'naver' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-2">🔍 네이버 검색 API</h3>
                  <p className="text-slate-600 text-sm">네이버 개발자센터에서 발급받은 API 키를 입력해주세요.</p>
                </div>

            <div className="section-card" style={{padding: '20px', marginBottom: '24px'}}>
              <div>
                {/* Client ID */}
                <div className="mb-4">
                  <label className="ultra-label" style={{fontSize: '13px', marginBottom: '8px'}}>
                    Client ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={naverApiKeys.clientId}
                    onChange={(e) => {
                      setNaverApiKeys(prev => ({ ...prev, clientId: e.target.value }));
                      // 변경시 테스트 상태 초기화
                      setNaverTestingStatus({ testing: false, success: false, message: '' });
                    }}
                    placeholder="네이버 개발자센터에서 발급받은 Client ID를 입력하세요"
                    className="ultra-input w-full" style={{padding: '12px 16px', fontSize: '14px'}}
                  />
                </div>

                {/* Client Secret */}
                <div className="mb-4">
                  <label className="ultra-label" style={{fontSize: '13px', marginBottom: '8px'}}>
                    Client Secret <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={naverApiKeys.clientSecret}
                    onChange={(e) => {
                      setNaverApiKeys(prev => ({ ...prev, clientSecret: e.target.value }));
                      // 변경시 테스트 상태 초기화
                      setNaverTestingStatus({ testing: false, success: false, message: '' });
                    }}
                    placeholder="네이버 개발자센터에서 발급받은 Client Secret을 입력하세요"
                    className="ultra-input w-full" style={{padding: '12px 16px', fontSize: '14px'}}
                  />
                </div>

                {/* 테스트 및 적용, 삭제 버튼 */}
                <div className="flex justify-end !gap-2 !mt-4 !mb-4">
                  <button
                    onClick={deleteNaverApi}
                    disabled={naverTestingStatus.testing}
                    className="ultra-btn px-4 py-2 text-xs"
                    style={{
                      background: '#64748b',
                      borderColor: '#64748b',
                      color: 'white'
                    }}
                  >
                    <span className="text-sm">🗑️</span>
                    <span>삭제</span>
                  </button>
                  
                  <button
                    onClick={testAndApplyNaverApi}
                    disabled={naverTestingStatus.testing || !naverApiKeys.clientId.trim() || !naverApiKeys.clientSecret.trim()}
                    className="ultra-btn px-4 py-2 text-xs"
                    style={{
                      background: '#10b981',
                      borderColor: '#10b981',
                      color: 'white'
                    }}
                  >
                    <span className="text-sm">{naverTestingStatus.testing ? '🔄' : '🧪'}</span>
                    <span>{naverTestingStatus.testing ? '테스트 중...' : '테스트 및 적용'}</span>
                  </button>
                </div>

                {/* 테스트 결과 */}
                {naverTestingStatus.message && (
                  <div className={`p-4 rounded-lg ${
                    naverTestingStatus.success 
                      ? 'bg-green-50 border border-green-200' 
                      : naverTestingStatus.testing
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className={`text-sm font-medium ${
                      naverTestingStatus.success 
                        ? 'text-green-800' 
                        : naverTestingStatus.testing
                        ? 'text-blue-800'
                        : 'text-red-800'
                    }`}>
                      {naverTestingStatus.message}
                    </p>
                  </div>
                )}

                {/* 현재 설정 상태 */}
                {naverTestingStatus.success && (
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <h4 className="font-semibold text-sm text-slate-900 mb-3">현재 적용된 네이버 API 설정</h4>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-slate-600 block mb-1">Client ID</span>
                        <span className="font-semibold">{naverApiKeys.clientId ? '설정됨' : '미설정'}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 block mb-1">Client Secret</span>
                        <span className="font-semibold">{naverApiKeys.clientSecret ? '설정됨' : '미설정'}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 block mb-1">연결 상태</span>
                        <div className="flex items-center gap-1 font-semibold text-green-600">
                          ✅ 연결됨
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* API 키 발급 가이드 */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">📝 API 키 발급 방법</h4>
                  <ol className="text-sm text-green-700 space-y-1">
                    <li>1. <a href="#" onClick={(e) => { e.preventDefault(); (window as any).electronAPI?.openExternal('https://developers.naver.com'); }} className="underline cursor-pointer">네이버 개발자센터</a> 접속</li>
                    <li>2. 애플리케이션 등록 → 검색 API 선택</li>
                    <li>3. Client ID와 Client Secret을 복사해서 위에 입력</li>
                    <li>4. "테스트 및 적용" 버튼 클릭</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* 버튼들 */}
            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={onClose}
                className="ultra-btn px-4 py-2 text-sm"
                style={{
                  background: '#64748b',
                  borderColor: '#64748b'
                }}
              >
                <span>닫기</span>
                <span className="text-sm">✕</span>
              </button>
              <button
                onClick={async () => {
                  // 네이버 API 설정 저장 (별도 로직 필요시)
                  setDialog({
                    isOpen: true,
                    type: 'success',
                    title: '저장 완료',
                    message: '네이버 API 설정이 저장되었습니다.',
                    onConfirm: () => onClose()
                  });
                }}
                className="ultra-btn px-4 py-2 text-sm"
                style={{
                  background: '#10b981',
                  borderColor: '#10b981'
                }}
              >
                <span>저장</span>
                <span className="text-sm">✓</span>
              </button>
            </div>
          </div>
        )}

            {/* 유튜브 API 설정 */}
            {activeApiTab === 'youtube' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-2">📺 유튜브 Data API v3</h3>
                  <p className="text-slate-600 text-sm">구글 클라우드 콘솔에서 발급받은 YouTube Data API v3 키를 입력해주세요.</p>
                </div>

                <div className="section-card" style={{padding: '20px', marginBottom: '24px'}}>
                  <div>
                    {/* API Key */}
                    <div className="mb-4">
                      <label className="ultra-label" style={{fontSize: '13px', marginBottom: '8px'}}>
                        YouTube Data API Key <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={youtubeApiKeys.apiKey}
                        onChange={(e) => {
                          setYoutubeApiKeys(prev => ({ ...prev, apiKey: e.target.value }));
                          // 변경시 테스트 상태 초기화
                          setYoutubeTestingStatus({ testing: false, success: false, message: '' });
                        }}
                        placeholder="구글 클라우드 콘솔에서 발급받은 YouTube Data API v3 키를 입력하세요"
                        className="ultra-input w-full" style={{padding: '12px 16px', fontSize: '14px'}}
                      />
                    </div>

                    {/* 테스트 및 적용, 삭제 버튼 */}
                    <div className="flex justify-end !gap-2 !mt-4 !mb-4">
                      <button
                        onClick={deleteYoutubeApi}
                        disabled={youtubeTestingStatus.testing}
                        className="ultra-btn px-4 py-2 text-xs"
                        style={{
                          background: '#64748b',
                          borderColor: '#64748b',
                          color: 'white'
                        }}
                      >
                        <span className="text-sm">🗑️</span>
                        <span>삭제</span>
                      </button>
                      
                      <button
                        onClick={testAndApplyYoutubeApi}
                        disabled={youtubeTestingStatus.testing || !youtubeApiKeys.apiKey.trim()}
                        className="ultra-btn px-4 py-2 text-xs"
                        style={{
                          background: '#10b981',
                          borderColor: '#10b981',
                          color: 'white'
                        }}
                      >
                        <span className="text-sm">{youtubeTestingStatus.testing ? '🔄' : '🧪'}</span>
                        <span>{youtubeTestingStatus.testing ? '테스트 중...' : '테스트 및 적용'}</span>
                      </button>
                    </div>

                    {/* 테스트 결과 */}
                    {youtubeTestingStatus.message && (
                      <div className={`p-4 rounded-lg ${
                        youtubeTestingStatus.success 
                          ? 'bg-green-50 border border-green-200' 
                          : youtubeTestingStatus.testing
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-red-50 border border-red-200'
                      }`}>
                        <p className={`text-sm font-medium ${
                          youtubeTestingStatus.success 
                            ? 'text-green-800' 
                            : youtubeTestingStatus.testing
                            ? 'text-blue-800'
                            : 'text-red-800'
                        }`}>
                          {youtubeTestingStatus.message}
                        </p>
                      </div>
                    )}

                    {/* 현재 설정 상태 */}
                    {youtubeTestingStatus.success && (
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <h4 className="font-semibold text-sm text-slate-900 mb-3">현재 적용된 YouTube API 설정</h4>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-slate-600 block mb-1">API Key</span>
                            <span className="font-semibold">{youtubeApiKeys.apiKey ? '설정됨' : '미설정'}</span>
                          </div>
                          <div>
                            <span className="text-slate-600 block mb-1">연결 상태</span>
                            <div className="flex items-center gap-1 font-semibold text-green-600">
                              ✅ 연결됨
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* API 키 발급 가이드 */}
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-red-800 mb-2">📝 API 키 발급 방법</h4>
                      <ol className="text-sm text-red-700 space-y-1">
                        <li>1. <a href="#" onClick={(e) => { e.preventDefault(); (window as any).electronAPI?.openExternal('https://console.cloud.google.com'); }} className="underline cursor-pointer">구글 클라우드 콘솔</a> 접속</li>
                        <li>2. 프로젝트 생성 → YouTube Data API v3 활성화</li>
                        <li>3. 사용자 인증 정보 생성 → API 키 생성</li>
                        <li>4. API 키를 복사해서 위에 입력</li>
                        <li>5. "테스트 및 적용" 버튼 클릭</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* 버튼들 */}
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    onClick={onClose}
                    className="ultra-btn px-4 py-2 text-sm"
                    style={{
                      background: '#64748b',
                      borderColor: '#64748b'
                    }}
                  >
                    <span>닫기</span>
                    <span className="text-sm">✕</span>
                  </button>
                  <button
                    onClick={async () => {
                      setDialog({
                        isOpen: true,
                        type: 'success',
                        title: '저장 완료',
                        message: '유튜브 API 설정이 저장되었습니다.',
                        onConfirm: () => onClose()
                      });
                    }}
                    className="ultra-btn px-4 py-2 text-sm"
                    style={{
                      background: '#10b981',
                      borderColor: '#10b981'
                    }}
                  >
                    <span>저장</span>
                    <span className="text-sm">✓</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 다이얼로그 */}
      <SimpleDialog
        isOpen={dialog.isOpen}
        onClose={() => setDialog(prev => ({ ...prev, isOpen: false }))}
        title={dialog.title}
        message={dialog.message}
        onConfirm={dialog.onConfirm}
        confirmText={dialog.type === 'confirm' ? '삭제' : '확인'}
        cancelText="취소"
      />
    </div>
  );
};

export default LLMSettings;