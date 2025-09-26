import React, { useState, useEffect } from 'react';

interface LLMSettingsProps {
  onClose: () => void;
  onSettingsChange?: () => void;
}

interface LLMConfig {
  provider: string;
  model: string;
  apiKey: string;
  quality?: string;
  size?: string;
  style?: string;
}

interface LLMSettings {
  writing: LLMConfig;
  image: LLMConfig;
}

interface ProviderApiKeys {
  claude: string;
  openai: string;
  gemini: string;
}

const LLMSettings: React.FC<LLMSettingsProps> = ({ onClose, onSettingsChange }) => {
  const [activeTab, setActiveTab] = useState<'writing' | 'image'>('writing');
  const [providerApiKeys, setProviderApiKeys] = useState<ProviderApiKeys>({
    claude: '',
    openai: '',
    gemini: ''
  });

  // LLM 설정
  const [settings, setSettings] = useState<LLMSettings>({
    writing: { provider: 'claude', model: 'claude-sonnet-4-20250514', apiKey: '' },
    image: { provider: 'gemini', model: 'gemini-2.5-flash-image-preview', apiKey: '', style: 'realistic' }
  });

  // 실제 적용된 설정
  const [appliedSettings, setAppliedSettings] = useState<LLMSettings>({
    writing: { provider: '', model: '', apiKey: '' },
    image: { provider: '', model: '', apiKey: '', style: 'realistic' }
  });

  // API 키 테스트 상태
  const [testingStatus, setTestingStatus] = useState<{
    [key: string]: {
      testing: boolean;
      success: boolean;
      message: string;
    }
  }>({});

  // 설정 로드
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const cachedData = await window.electronAPI?.getLLMSettings?.();
        if (cachedData && cachedData.settings) {
          // 저장된 설정이 있으면 그대로 사용
          setSettings(cachedData.settings);
          const appliedSettingsData = cachedData.appliedSettings || { writing: { provider: '', model: '', apiKey: '' }, image: { provider: '', model: '', apiKey: '' } };
          setAppliedSettings(appliedSettingsData);
          setProviderApiKeys(cachedData.providerApiKeys || { claude: '', openai: '', gemini: '' });
          
          // appliedSettings가 있으면 현재 settings에도 반영 (UI 드롭박스 선택을 위해)
          if (appliedSettingsData.writing.provider || appliedSettingsData.image.provider) {
            const mergedSettings = { ...cachedData.settings };
            
            // writing 적용 설정이 있으면 현재 설정에 반영
            if (appliedSettingsData.writing.provider) {
              mergedSettings.writing = { ...appliedSettingsData.writing };
            }
            
            // image 적용 설정이 있으면 현재 설정에 반영
            if (appliedSettingsData.image.provider) {
              mergedSettings.image = { ...appliedSettingsData.image };
            }
            
            setSettings(mergedSettings);
          }
        }
      } catch (error) {
        // 기본값 사용
      }
    };
    loadSettings();
  }, []);

  const providers = [
    { id: 'claude', name: 'Claude', icon: '🟠', color: 'orange' },
    { id: 'openai', name: 'OpenAI', icon: '🔵', color: 'blue' },
    { id: 'gemini', name: 'Gemini', icon: '🟢', color: 'green' }
  ];

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
    }
  };

  const handleProviderChange = (tab: keyof LLMSettings, provider: string) => {
    const newSettings = { ...settings };
    newSettings[tab] = {
      ...newSettings[tab],
      provider,
      model: '', // 모델 초기화
      apiKey: providerApiKeys[provider as keyof ProviderApiKeys] || ''
    };
    setSettings(newSettings);
  };

  const handleModelChange = (tab: keyof LLMSettings, model: string) => {
    const newSettings = { ...settings };
    newSettings[tab] = {
      ...newSettings[tab],
      model
    };
    setSettings(newSettings);
  };

  const handleStyleChange = (tab: keyof LLMSettings, style: string) => {
    const newSettings = { ...settings };
    newSettings[tab] = {
      ...newSettings[tab],
      style
    };
    setSettings(newSettings);
  };

  const handleQualityChange = (tab: keyof LLMSettings, quality: string) => {
    const newSettings = { ...settings };
    newSettings[tab] = {
      ...newSettings[tab],
      quality
    };
    setSettings(newSettings);
  };

  const handleSizeChange = (tab: keyof LLMSettings, size: string) => {
    const newSettings = { ...settings };
    newSettings[tab] = {
      ...newSettings[tab],
      size
    };
    setSettings(newSettings);
  };

  const handleApiKeyChange = (provider: string, apiKey: string) => {
    const newKeys = { ...providerApiKeys };
    newKeys[provider as keyof ProviderApiKeys] = apiKey;
    setProviderApiKeys(newKeys);

    // 같은 provider를 사용하는 모든 탭에 API 키 적용
    const newSettings = { ...settings };
    Object.keys(newSettings).forEach(tab => {
      if (newSettings[tab as keyof LLMSettings].provider === provider) {
        newSettings[tab as keyof LLMSettings].apiKey = apiKey;
      }
    });
    setSettings(newSettings);
  };

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
        
        // 테스트 성공한 설정을 appliedSettings에 반영
        const newAppliedSettings = {
          ...appliedSettings,
          [category]: settings[category]
        };
        setAppliedSettings(newAppliedSettings);
        
        // 파일에도 자동 저장
        try {
          await window.electronAPI?.saveLLMSettings?.({
            settings,
            appliedSettings: newAppliedSettings,
            providerApiKeys,
            testingStatus
          });
          console.log('테스트 성공 후 자동 저장 완료');
        } catch (error) {
          console.error('자동 저장 실패:', error);
        }
        
        // 설정 변경 시 부모 컴포넌트에 알림
        if (onSettingsChange) {
          onSettingsChange();
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

  // API 키 삭제 함수
  const deleteApiKey = (category: keyof LLMSettings) => {
    // 해당 카테고리의 API 키와 관련 설정 초기화
    const newSettings = { ...settings };
    newSettings[category] = { 
      ...newSettings[category], 
      apiKey: '' 
    };
    setSettings(newSettings);

    // 적용된 설정에서도 제거
    const newAppliedSettings = { ...appliedSettings };
    newAppliedSettings[category] = { provider: '', model: '', apiKey: '', style: 'realistic' };
    setAppliedSettings(newAppliedSettings);

    // 테스트 상태 초기화
    setTestingStatus(prev => ({
      ...prev,
      [category]: { testing: false, success: false, message: '' }
    }));

    // 제공자별 API 키도 초기화
    const provider = settings[category].provider as keyof ProviderApiKeys;
    if (provider) {
      setProviderApiKeys(prev => ({
        ...prev,
        [provider]: ''
      }));
    }

    // 설정 변경 시 부모 컴포넌트에 알림
    if (onSettingsChange) {
      onSettingsChange();
    }
  };

  // 실제 API 연결 테스트 (Electron IPC 사용)
  const testAPIConnection = async (provider: string, apiKey: string): Promise<{success: boolean, message: string}> => {
    console.log(`🔍 Testing ${provider} API with key: ${apiKey.substring(0, 10)}...`);
    
    try {
      // Electron IPC를 통해 Main process에서 API 테스트 실행
      const result = await window.electronAPI?.testLLMConfig?.({ provider, apiKey });
      
      console.log(`📡 ${provider} API 테스트 결과:`, result);
      return result || { success: false, message: '테스트 응답을 받지 못했습니다.' };
      
    } catch (error: any) {
      console.error(`❌ ${provider} API 테스트 실패:`, error);
      
      if (error instanceof Error) {
        return { success: false, message: `연결 오류: ${error.message}` };
      }
      
      return { success: false, message: `연결 테스트 실패: ${String(error)}` };
    }
  };

  const saveSettings = async () => {
    try {
      await window.electronAPI?.saveLLMSettings?.({
        settings,
        appliedSettings,
        providerApiKeys,
        testingStatus
      });
      
      onSettingsChange?.();
      onClose();
    } catch (error) {
      console.error('설정 저장 실패:', error);
    }
  };

  const getAvailableModels = (tab: keyof LLMSettings, provider: string) => {
    const providerModels = modelsByProvider[provider as keyof typeof modelsByProvider];
    if (!providerModels) return [];
    
    if (tab === 'image') {
      return providerModels.image || [];
    }
    return providerModels.text || [];
  };

  const getWritingProviders = () => {
    return providers; // 모든 provider 지원
  };

  const getImageProviders = () => {
    return providers.filter(p => p.id === 'gemini'); // 제미나이만 지원
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 max-w-4xl w-11/12 max-h-[85vh] overflow-auto text-gray-700 shadow-2xl transform transition-all duration-300 scale-100">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-lg">
              🤖
            </div>
            <h2 className="text-2xl font-bold text-gray-800">AI 모델 설정</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-500 rounded-lg flex items-center justify-center text-lg cursor-pointer transition-all duration-200 hover:scale-110"
          >
            ✕
          </button>
        </div>

        {/* 탭 메뉴 */}
        <div className="flex mb-8 bg-gray-50 rounded-xl p-1 shadow-inner">
          <button
            onClick={() => setActiveTab('writing')}
            className={`flex-1 px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${
              activeTab === 'writing'
                ? 'bg-white text-blue-600 shadow-md border-2 border-blue-200'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <span className="flex items-center justify-center space-x-2">
              <span>✍️</span>
              <span>글쓰기 AI</span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`flex-1 px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${
              activeTab === 'image'
                ? 'bg-white text-purple-600 shadow-md border-2 border-purple-200'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <span className="flex items-center justify-center space-x-2">
              <span>🎨</span>
              <span>이미지 AI</span>
            </span>
          </button>
        </div>

        {/* 글쓰기 AI 탭 */}
        {activeTab === 'writing' && (
          <div>
            <div className="mb-6">
              <label className="block mb-3 text-sm font-semibold text-gray-700">
                제공업체
              </label>
              <div className="flex gap-3 flex-wrap">
                {getWritingProviders().map(provider => (
                  <button
                    key={provider.id}
                    onClick={() => handleProviderChange('writing', provider.id)}
                    className={`px-4 py-3 rounded-xl border-2 cursor-pointer transition-all duration-200 flex items-center space-x-2 hover:-translate-y-0.5 shadow-sm hover:shadow-md ${
                      settings.writing.provider === provider.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-blue-100'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span>{provider.icon}</span>
                    <span>{provider.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {settings.writing.provider && (
              <>
                <div className="mb-6">
                  <label className="block mb-3 text-sm font-semibold text-gray-700">
                    모델
                  </label>
                  <select
                    value={settings.writing.model}
                    onChange={(e) => handleModelChange('writing', e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200 cursor-pointer"
                  >
                    <option value="">모델을 선택하세요</option>
                    {getAvailableModels('writing', settings.writing.provider).map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name} - {model.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block mb-3 text-sm font-semibold text-gray-700">
                    API 키
                  </label>
                  <input
                    type="password"
                    value={providerApiKeys[settings.writing.provider as keyof ProviderApiKeys] || ''}
                    onChange={(e) => handleApiKeyChange(settings.writing.provider, e.target.value)}
                    placeholder={`${settings.writing.provider} API 키를 입력하세요`}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200 placeholder-gray-400"
                  />
                </div>

                {/* 테스트 및 적용, 삭제 버튼 */}
                <div className="flex justify-end space-x-3 mt-4 mb-4">
                  <button
                    onClick={() => deleteApiKey('writing')}
                    disabled={testingStatus.writing?.testing || !settings.writing.apiKey}
                    className={`inline-flex items-center space-x-2 px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition-all duration-200 hover:-translate-y-0.5 shadow-sm ${
                      testingStatus.writing?.testing || !settings.writing.apiKey ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <span>🗑️</span>
                    <span>삭제</span>
                  </button>
                  
                  <button
                    onClick={() => testApiKey('writing')}
                    disabled={!settings.writing.apiKey || testingStatus.writing?.testing}
                    className={`inline-flex items-center space-x-2 px-4 py-2 text-white text-xs font-semibold rounded-lg transition-all duration-200 hover:-translate-y-0.5 shadow-lg ${
                      testingStatus.writing?.success 
                        ? 'bg-green-500 hover:bg-green-600 shadow-green-500/25' 
                        : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25'
                    } ${
                      !settings.writing.apiKey || testingStatus.writing?.testing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <span>{testingStatus.writing?.testing ? '🔄' : testingStatus.writing?.success ? '✅' : '🧪'}</span>
                    <span>{testingStatus.writing?.testing ? '테스트 중...' : testingStatus.writing?.success ? '적용 완료' : '테스트 및 적용'}</span>
                  </button>
                </div>
                
                {/* 테스트 결과 메시지 */}
                {testingStatus.writing?.message && (
                  <div className={`p-4 rounded-xl mt-3 border-2 ${
                    testingStatus.writing.success 
                      ? 'bg-green-50 border-green-200' 
                      : testingStatus.writing.testing 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <p className={`text-sm font-medium m-0 ${
                      testingStatus.writing.success 
                        ? 'text-green-700' 
                        : testingStatus.writing.testing 
                        ? 'text-blue-700' 
                        : 'text-red-700'
                    }`}>
                      {testingStatus.writing.message}
                    </p>
                  </div>
                )}

                {/* 현재 적용된 설정 */}
                {appliedSettings.writing.provider && (
                  <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl mt-6 shadow-sm">
                    <h4 className="font-semibold text-sm text-blue-800 mb-3 m-0 flex items-center space-x-2">
                      <span>⚙️</span>
                      <span>현재 적용된 설정</span>
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-slate-600 block mb-1">제공자</span>
                        <span className="font-semibold text-blue-700">{appliedSettings.writing.provider.toUpperCase()}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 block mb-1">모델</span>
                        <span className="font-semibold text-blue-700">{appliedSettings.writing.model || '미선택'}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 block mb-1">API 키</span>
                        <div className={`flex items-center space-x-1 font-semibold ${
                          appliedSettings.writing.apiKey ? 'text-emerald-600' : 'text-red-500'
                        }`}>
                          <span>{appliedSettings.writing.apiKey ? '🔑' : '🔒'}</span>
                          <span>{appliedSettings.writing.apiKey ? '설정됨' : '미설정'}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-600 block mb-1">연결 상태</span>
                        <div className={`flex items-center space-x-1 font-semibold ${
                          testingStatus.writing?.success || (appliedSettings.writing.provider && appliedSettings.writing.apiKey) 
                            ? 'text-emerald-600' 
                            : testingStatus.writing?.message && !testingStatus.writing?.success 
                            ? 'text-red-500' 
                            : 'text-slate-500'
                        }`}>
                          <span>
                            {testingStatus.writing?.testing 
                              ? '🔄' 
                              : testingStatus.writing?.success 
                              ? '✅' 
                              : (appliedSettings.writing.provider && appliedSettings.writing.apiKey)
                              ? '✅' 
                              : testingStatus.writing?.message && !testingStatus.writing?.success
                              ? '❌' 
                              : '⚪'}
                          </span>
                          <span>
                            {testingStatus.writing?.testing 
                              ? '테스트 중...'
                              : testingStatus.writing?.success 
                              ? '연결됨'
                              : (appliedSettings.writing.provider && appliedSettings.writing.apiKey)
                              ? '연결됨'
                              : testingStatus.writing?.message && !testingStatus.writing?.success
                              ? '연결 실패'
                              : '미확인'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* API 키 발급 가이드 */}
                {settings.writing.provider && (
                  <div className={`p-5 rounded-xl mt-6 border-2 ${
                    settings.writing.provider === 'claude' 
                      ? 'bg-orange-50 border-orange-200' 
                      : settings.writing.provider === 'openai' 
                      ? 'bg-blue-50 border-blue-200' 
                      : settings.writing.provider === 'gemini' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <h4 className={`font-semibold mb-3 flex items-center space-x-2 ${
                      settings.writing.provider === 'claude' 
                        ? 'text-orange-700' 
                        : settings.writing.provider === 'openai' 
                        ? 'text-blue-700' 
                        : settings.writing.provider === 'gemini' 
                        ? 'text-green-700' 
                        : 'text-gray-700'
                    }`}>
                      <span>📝</span>
                      <span>{
                        settings.writing.provider === 'claude' ? 'Claude' :
                        settings.writing.provider === 'openai' ? 'OpenAI' :
                        settings.writing.provider === 'gemini' ? 'Gemini' : ''
                      } API 키 발급 방법</span>
                    </h4>
                    <ol className={`text-sm leading-relaxed m-0 pl-5 ${
                      settings.writing.provider === 'claude' 
                        ? 'text-orange-600' 
                        : settings.writing.provider === 'openai' 
                        ? 'text-blue-600' 
                        : settings.writing.provider === 'gemini' 
                        ? 'text-green-600' 
                        : 'text-gray-600'
                    }`}>
                      {settings.writing.provider === 'claude' && (
                        <>
                          <li><a href="#" onClick={(e) => { e.preventDefault(); window.electronAPI?.openExternal?.('https://console.anthropic.com'); }} style={{ textDecoration: 'underline', cursor: 'pointer' }}>Claude Console</a> 접속</li>
                          <li>계정 생성 또는 로그인</li>
                          <li>"Get API Keys" 또는 "API Keys" 메뉴 선택</li>
                          <li>"Create Key" 버튼 클릭하여 새 API 키 생성</li>
                          <li>API 키를 복사해서 위에 입력</li>
                          <li>"테스트 및 적용" 버튼 클릭</li>
                        </>
                      )}
                      {settings.writing.provider === 'openai' && (
                        <>
                          <li><a href="#" onClick={(e) => { e.preventDefault(); window.electronAPI?.openExternal?.('https://platform.openai.com'); }} style={{ textDecoration: 'underline', cursor: 'pointer' }}>OpenAI Platform</a> 접속</li>
                          <li>계정 생성 또는 로그인</li>
                          <li>우상단 프로필 → "View API keys" 선택</li>
                          <li>"Create new secret key" 버튼 클릭</li>
                          <li>API 키를 복사해서 위에 입력</li>
                          <li>"테스트 및 적용" 버튼 클릭</li>
                        </>
                      )}
                      {settings.writing.provider === 'gemini' && (
                        <>
                          <li><a href="#" onClick={(e) => { e.preventDefault(); window.electronAPI?.openExternal?.('https://aistudio.google.com/app/apikey'); }} style={{ textDecoration: 'underline', cursor: 'pointer' }}>Google AI Studio</a> 접속</li>
                          <li>구글 계정으로 로그인</li>
                          <li>"Create API key" 버튼 클릭</li>
                          <li>프로젝트 선택 또는 새 프로젝트 생성</li>
                          <li>API 키를 복사해서 위에 입력</li>
                          <li>"테스트 및 적용" 버튼 클릭</li>
                        </>
                      )}
                    </ol>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 이미지 AI 탭 */}
        {activeTab === 'image' && (
          <div>
            <div className="mb-6">
              <label className="block mb-3 text-sm font-semibold text-gray-700">
                제공업체 (Gemini만 지원)
              </label>
              <div className="flex gap-3 flex-wrap">
                {getImageProviders().map(provider => (
                  <button
                    key={provider.id}
                    onClick={() => handleProviderChange('image', provider.id)}
                    className={`px-4 py-3 rounded-xl border-2 cursor-pointer transition-all duration-200 flex items-center space-x-2 hover:-translate-y-0.5 shadow-sm hover:shadow-md ${
                      settings.image.provider === provider.id
                        ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-purple-100'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span>{provider.icon}</span>
                    <span>{provider.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {settings.image.provider && (
              <>
                <div className="mb-6">
                  <label className="block mb-3 text-sm font-semibold text-gray-700">
                    모델
                  </label>
                  <select
                    value={settings.image.model}
                    onChange={(e) => handleModelChange('image', e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all duration-200 cursor-pointer"
                  >
                    <option value="">모델을 선택하세요</option>
                    {getAvailableModels('image', settings.image.provider).map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name} - {model.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 이미지 생성 옵션 */}
                {settings.image.provider === 'gemini' && (
                  <div className="mb-6">
                    <label className="block mb-3 text-sm font-semibold text-gray-700">
                      이미지 스타일
                    </label>
                    <select
                      value={settings.image.style || 'realistic'}
                      onChange={(e) => handleStyleChange('image', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all duration-200 cursor-pointer"
                    >
                      <option value="realistic">사실적</option>
                      <option value="photographic">사진 같은</option>
                      <option value="anime">애니메이션</option>
                      <option value="illustration">일러스트</option>
                      <option value="dreamy">몽환적</option>
                    </select>
                  </div>
                )}

                <div className="mb-6">
                  <label className="block mb-3 text-sm font-semibold text-gray-700">
                    API 키
                  </label>
                  <input
                    type="password"
                    value={providerApiKeys[settings.image.provider as keyof ProviderApiKeys] || ''}
                    onChange={(e) => handleApiKeyChange(settings.image.provider, e.target.value)}
                    placeholder={`${settings.image.provider} API 키를 입력하세요`}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all duration-200 placeholder-gray-400"
                  />
                </div>

                {/* 테스트 및 적용, 삭제 버튼 */}
                <div className="flex justify-end space-x-3 mt-4 mb-4">
                  <button
                    onClick={() => deleteApiKey('image')}
                    disabled={testingStatus.image?.testing || !settings.image.apiKey}
                    className={`inline-flex items-center space-x-2 px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition-all duration-200 hover:-translate-y-0.5 shadow-sm ${
                      testingStatus.image?.testing || !settings.image.apiKey ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <span>🗑️</span>
                    <span>삭제</span>
                  </button>
                  
                  <button
                    onClick={() => testApiKey('image')}
                    disabled={!settings.image.apiKey || testingStatus.image?.testing}
                    className={`inline-flex items-center space-x-2 px-4 py-2 text-white text-xs font-semibold rounded-lg transition-all duration-200 hover:-translate-y-0.5 shadow-lg ${
                      testingStatus.image?.success 
                        ? 'bg-purple-500 hover:bg-purple-600 shadow-purple-500/25' 
                        : 'bg-purple-500 hover:bg-purple-600 shadow-purple-500/25'
                    } ${
                      !settings.image.apiKey || testingStatus.image?.testing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <span>{testingStatus.image?.testing ? '🔄' : testingStatus.image?.success ? '✅' : '🧪'}</span>
                    <span>{testingStatus.image?.testing ? '테스트 중...' : testingStatus.image?.success ? '적용 완료' : '테스트 및 적용'}</span>
                  </button>
                </div>
                
                {/* 테스트 결과 메시지 */}
                {testingStatus.image?.message && (
                  <div className={`p-4 rounded-xl mt-3 border-2 ${
                    testingStatus.image.success 
                      ? 'bg-green-50 border-green-200' 
                      : testingStatus.image.testing 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <p className={`text-sm font-medium m-0 ${
                      testingStatus.image.success 
                        ? 'text-green-700' 
                        : testingStatus.image.testing 
                        ? 'text-blue-700' 
                        : 'text-red-700'
                    }`}>
                      {testingStatus.image.message}
                    </p>
                  </div>
                )}

                {/* 현재 적용된 설정 */}
                {appliedSettings.image.provider && (
                  <div className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl mt-6 shadow-sm">
                    <h4 className="font-semibold text-sm text-purple-800 mb-3 m-0 flex items-center space-x-2">
                      <span>⚙️</span>
                      <span>현재 적용된 설정</span>
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-slate-600 block mb-1">제공자</span>
                        <span className="font-semibold text-purple-700">{appliedSettings.image.provider.toUpperCase()}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 block mb-1">모델</span>
                        <span className="font-semibold text-purple-700">{appliedSettings.image.model || '미선택'}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 block mb-1">API 키</span>
                        <div className={`flex items-center space-x-1 font-semibold ${
                          appliedSettings.image.apiKey ? 'text-emerald-600' : 'text-red-500'
                        }`}>
                          <span>{appliedSettings.image.apiKey ? '🔑' : '🔒'}</span>
                          <span>{appliedSettings.image.apiKey ? '설정됨' : '미설정'}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-600 block mb-1">연결 상태</span>
                        <div className={`flex items-center space-x-1 font-semibold ${
                          testingStatus.image?.success || (appliedSettings.image.provider && appliedSettings.image.apiKey) 
                            ? 'text-emerald-600' 
                            : testingStatus.image?.message && !testingStatus.image?.success 
                            ? 'text-red-500' 
                            : 'text-slate-500'
                        }`}>
                          <span>
                            {testingStatus.image?.testing 
                              ? '🔄' 
                              : testingStatus.image?.success 
                              ? '✅' 
                              : (appliedSettings.image.provider && appliedSettings.image.apiKey)
                              ? '✅' 
                              : testingStatus.image?.message && !testingStatus.image?.success
                              ? '❌' 
                              : '⚪'}
                          </span>
                          <span>
                            {testingStatus.image?.testing 
                              ? '테스트 중...'
                              : testingStatus.image?.success 
                              ? '연결됨'
                              : (appliedSettings.image.provider && appliedSettings.image.apiKey)
                              ? '연결됨'
                              : testingStatus.image?.message && !testingStatus.image?.success
                              ? '연결 실패'
                              : '미확인'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* API 키 발급 가이드 */}
                {settings.image.provider && (
                  <div className={`p-5 rounded-xl mt-6 border-2 ${
                    settings.image.provider === 'gemini' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <h4 className={`font-semibold mb-3 flex items-center space-x-2 ${
                      settings.image.provider === 'gemini' 
                        ? 'text-green-700' 
                        : 'text-gray-700'
                    }`}>
                      <span>📝</span>
                      <span>{settings.image.provider === 'gemini' ? 'Gemini' : ''} API 키 발급 방법</span>
                    </h4>
                    <ol className={`text-sm leading-relaxed m-0 pl-5 ${
                      settings.image.provider === 'gemini' 
                        ? 'text-green-600' 
                        : 'text-gray-600'
                    }`}>
                      {settings.image.provider === 'gemini' && (
                        <>
                          <li><a href="#" onClick={(e) => { e.preventDefault(); window.electronAPI?.openExternal?.('https://aistudio.google.com/app/apikey'); }} style={{ textDecoration: 'underline', cursor: 'pointer' }}>Google AI Studio</a> 접속</li>
                          <li>구글 계정으로 로그인</li>
                          <li>"Create API key" 버튼 클릭</li>
                          <li>프로젝트 선택 또는 새 프로젝트 생성</li>
                          <li>API 키를 복사해서 위에 입력</li>
                          <li>"테스트 및 적용" 버튼 클릭</li>
                        </>
                      )}
                    </ol>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 하단 버튼 */}
        <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-gray-500/25"
          >
            취소
          </button>
          <button
            onClick={saveSettings}
            className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-emerald-500/25"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default LLMSettings;