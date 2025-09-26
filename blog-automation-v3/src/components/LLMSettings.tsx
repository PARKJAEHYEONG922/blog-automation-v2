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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '800px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        color: '#374151',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#374151' }}>🤖 AI 모델 설정</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#6b7280',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>

        {/* 탭 메뉴 */}
        <div style={{ display: 'flex', marginBottom: '32px', borderBottom: '1px solid #e5e7eb' }}>
          <button
            onClick={() => setActiveTab('writing')}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: 'none',
              color: activeTab === 'writing' ? '#374151' : '#6b7280',
              borderBottom: activeTab === 'writing' ? '2px solid #374151' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === 'writing' ? 'bold' : 'normal',
              transition: 'all 0.2s'
            }}
          >
            ✍️ 글쓰기 AI
          </button>
          <button
            onClick={() => setActiveTab('image')}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: 'none',
              color: activeTab === 'image' ? '#374151' : '#6b7280',
              borderBottom: activeTab === 'image' ? '2px solid #374151' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === 'image' ? 'bold' : 'normal',
              transition: 'all 0.2s'
            }}
          >
            🎨 이미지 AI
          </button>
        </div>

        {/* 글쓰기 AI 탭 */}
        {activeTab === 'writing' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
                제공업체
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {getWritingProviders().map(provider => (
                  <button
                    key={provider.id}
                    onClick={() => handleProviderChange('writing', provider.id)}
                    style={{
                      padding: '12px 16px',
                      border: settings.writing.provider === provider.id ? '2px solid #374151' : '2px solid #e5e7eb',
                      backgroundColor: settings.writing.provider === provider.id ? '#f3f4f6' : 'white',
                      borderRadius: '8px',
                      color: settings.writing.provider === provider.id ? '#374151' : '#6b7280',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>{provider.icon}</span>
                    <span>{provider.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {settings.writing.provider && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
                    모델
                  </label>
                  <select
                    value={settings.writing.model}
                    onChange={(e) => handleModelChange('writing', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: 'white',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      color: '#374151'
                    }}
                  >
                    <option value="">모델을 선택하세요</option>
                    {getAvailableModels('writing', settings.writing.provider).map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name} - {model.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
                    API 키
                  </label>
                  <input
                    type="password"
                    value={providerApiKeys[settings.writing.provider as keyof ProviderApiKeys] || ''}
                    onChange={(e) => handleApiKeyChange(settings.writing.provider, e.target.value)}
                    placeholder={`${settings.writing.provider} API 키를 입력하세요`}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: 'white',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      color: '#374151'
                    }}
                  />
                </div>

                {/* 테스트 및 적용, 삭제 버튼 */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', marginBottom: '16px' }}>
                  <button
                    onClick={() => deleteApiKey('writing')}
                    disabled={testingStatus.writing?.testing || !settings.writing.apiKey}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#64748b',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: testingStatus.writing?.testing || !settings.writing.apiKey ? 0.5 : 1
                    }}
                  >
                    <span>🗑️</span>
                    <span>삭제</span>
                  </button>
                  
                  <button
                    onClick={() => testApiKey('writing')}
                    disabled={!settings.writing.apiKey || testingStatus.writing?.testing}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: testingStatus.writing?.success ? '#10b981' : '#10b981',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: !settings.writing.apiKey || testingStatus.writing?.testing ? 0.5 : 1
                    }}
                  >
                    <span>{testingStatus.writing?.testing ? '🔄' : testingStatus.writing?.success ? '✅' : '🧪'}</span>
                    <span>{testingStatus.writing?.testing ? '테스트 중...' : testingStatus.writing?.success ? '적용 완료' : '테스트 및 적용'}</span>
                  </button>
                </div>
                
                {/* 테스트 결과 메시지 */}
                {testingStatus.writing?.message && (
                  <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    marginTop: '12px',
                    backgroundColor: testingStatus.writing.success ? '#f0fdf4' : testingStatus.writing.testing ? '#eff6ff' : '#fef2f2',
                    border: testingStatus.writing.success ? '1px solid #bbf7d0' : testingStatus.writing.testing ? '1px solid #bfdbfe' : '1px solid #fecaca'
                  }}>
                    <p style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      margin: 0,
                      color: testingStatus.writing.success ? '#166534' : testingStatus.writing.testing ? '#1e40af' : '#dc2626'
                    }}>
                      {testingStatus.writing.message}
                    </p>
                  </div>
                )}

                {/* 현재 적용된 설정 */}
                {appliedSettings.writing.provider && (
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    marginTop: '16px'
                  }}>
                    <h4 style={{
                      fontWeight: '600',
                      fontSize: '14px',
                      color: '#1e293b',
                      marginBottom: '12px',
                      margin: 0
                    }}>현재 적용된 설정</h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '16px',
                      fontSize: '12px'
                    }}>
                      <div>
                        <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>제공자</span>
                        <span style={{ fontWeight: '600' }}>{appliedSettings.writing.provider.toUpperCase()}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>모델</span>
                        <span style={{ fontWeight: '600' }}>{appliedSettings.writing.model || '미선택'}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>API 키</span>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: '600',
                          color: appliedSettings.writing.apiKey ? '#059669' : '#ef4444'
                        }}>
                          {appliedSettings.writing.apiKey ? '🔑 설정됨' : '🔒 미설정'}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>연결 상태</span>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: '600',
                          color: testingStatus.writing?.success || (appliedSettings.writing.provider && appliedSettings.writing.apiKey) ? '#059669' : testingStatus.writing?.message && !testingStatus.writing?.success ? '#ef4444' : '#64748b'
                        }}>
                          {testingStatus.writing?.testing 
                            ? '🔄 테스트 중...'
                            : testingStatus.writing?.success 
                            ? '✅ 연결됨'
                            : (appliedSettings.writing.provider && appliedSettings.writing.apiKey)
                            ? '✅ 연결됨'
                            : testingStatus.writing?.message && !testingStatus.writing?.success
                            ? '❌ 연결 실패'
                            : '⚪ 미확인'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* API 키 발급 가이드 */}
                {settings.writing.provider && (
                  <div style={{
                    padding: '16px',
                    borderRadius: '8px',
                    marginTop: '16px',
                    backgroundColor: settings.writing.provider === 'claude' ? '#fff7ed' : settings.writing.provider === 'openai' ? '#eff6ff' : settings.writing.provider === 'gemini' ? '#f0fdf4' : '#f8fafc'
                  }}>
                    <h4 style={{
                      fontWeight: '600',
                      marginBottom: '8px',
                      color: settings.writing.provider === 'claude' ? '#ea580c' : settings.writing.provider === 'openai' ? '#1d4ed8' : settings.writing.provider === 'gemini' ? '#166534' : '#374151'
                    }}>📝 {
                      settings.writing.provider === 'claude' ? 'Claude' :
                      settings.writing.provider === 'openai' ? 'OpenAI' :
                      settings.writing.provider === 'gemini' ? 'Gemini' : ''
                    } API 키 발급 방법</h4>
                    <ol style={{
                      fontSize: '14px',
                      lineHeight: '1.5',
                      margin: 0,
                      paddingLeft: '20px',
                      color: settings.writing.provider === 'claude' ? '#c2410c' : settings.writing.provider === 'openai' ? '#1e40af' : settings.writing.provider === 'gemini' ? '#15803d' : '#374151'
                    }}>
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
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
                제공업체 (Gemini만 지원)
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {getImageProviders().map(provider => (
                  <button
                    key={provider.id}
                    onClick={() => handleProviderChange('image', provider.id)}
                    style={{
                      padding: '12px 16px',
                      border: settings.image.provider === provider.id ? '2px solid #374151' : '2px solid #e5e7eb',
                      backgroundColor: settings.image.provider === provider.id ? '#f3f4f6' : 'white',
                      borderRadius: '8px',
                      color: settings.image.provider === provider.id ? '#374151' : '#6b7280',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>{provider.icon}</span>
                    <span>{provider.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {settings.image.provider && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
                    모델
                  </label>
                  <select
                    value={settings.image.model}
                    onChange={(e) => handleModelChange('image', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: 'white',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      color: '#374151'
                    }}
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
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
                      이미지 스타일
                    </label>
                    <select
                      value={settings.image.style || 'realistic'}
                      onChange={(e) => handleStyleChange('image', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        color: '#374151'
                      }}
                    >
                      <option value="realistic">사실적</option>
                      <option value="photographic">사진 같은</option>
                      <option value="anime">애니메이션</option>
                      <option value="illustration">일러스트</option>
                      <option value="dreamy">몽환적</option>
                    </select>
                  </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
                    API 키
                  </label>
                  <input
                    type="password"
                    value={providerApiKeys[settings.image.provider as keyof ProviderApiKeys] || ''}
                    onChange={(e) => handleApiKeyChange(settings.image.provider, e.target.value)}
                    placeholder={`${settings.image.provider} API 키를 입력하세요`}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: 'white',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      color: '#374151'
                    }}
                  />
                </div>

                {/* 테스트 및 적용, 삭제 버튼 */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', marginBottom: '16px' }}>
                  <button
                    onClick={() => deleteApiKey('image')}
                    disabled={testingStatus.image?.testing || !settings.image.apiKey}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#64748b',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: testingStatus.image?.testing || !settings.image.apiKey ? 0.5 : 1
                    }}
                  >
                    <span>🗑️</span>
                    <span>삭제</span>
                  </button>
                  
                  <button
                    onClick={() => testApiKey('image')}
                    disabled={!settings.image.apiKey || testingStatus.image?.testing}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: testingStatus.image?.success ? '#10b981' : '#10b981',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: !settings.image.apiKey || testingStatus.image?.testing ? 0.5 : 1
                    }}
                  >
                    <span>{testingStatus.image?.testing ? '🔄' : testingStatus.image?.success ? '✅' : '🧪'}</span>
                    <span>{testingStatus.image?.testing ? '테스트 중...' : testingStatus.image?.success ? '적용 완료' : '테스트 및 적용'}</span>
                  </button>
                </div>
                
                {/* 테스트 결과 메시지 */}
                {testingStatus.image?.message && (
                  <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    marginTop: '12px',
                    backgroundColor: testingStatus.image.success ? '#f0fdf4' : testingStatus.image.testing ? '#eff6ff' : '#fef2f2',
                    border: testingStatus.image.success ? '1px solid #bbf7d0' : testingStatus.image.testing ? '1px solid #bfdbfe' : '1px solid #fecaca'
                  }}>
                    <p style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      margin: 0,
                      color: testingStatus.image.success ? '#166534' : testingStatus.image.testing ? '#1e40af' : '#dc2626'
                    }}>
                      {testingStatus.image.message}
                    </p>
                  </div>
                )}

                {/* 현재 적용된 설정 */}
                {appliedSettings.image.provider && (
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    marginTop: '16px'
                  }}>
                    <h4 style={{
                      fontWeight: '600',
                      fontSize: '14px',
                      color: '#1e293b',
                      marginBottom: '12px',
                      margin: 0
                    }}>현재 적용된 설정</h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '16px',
                      fontSize: '12px'
                    }}>
                      <div>
                        <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>제공자</span>
                        <span style={{ fontWeight: '600' }}>{appliedSettings.image.provider.toUpperCase()}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>모델</span>
                        <span style={{ fontWeight: '600' }}>{appliedSettings.image.model || '미선택'}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>API 키</span>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: '600',
                          color: appliedSettings.image.apiKey ? '#059669' : '#ef4444'
                        }}>
                          {appliedSettings.image.apiKey ? '🔑 설정됨' : '🔒 미설정'}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>연결 상태</span>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: '600',
                          color: testingStatus.image?.success || (appliedSettings.image.provider && appliedSettings.image.apiKey) ? '#059669' : testingStatus.image?.message && !testingStatus.image?.success ? '#ef4444' : '#64748b'
                        }}>
                          {testingStatus.image?.testing 
                            ? '🔄 테스트 중...'
                            : testingStatus.image?.success 
                            ? '✅ 연결됨'
                            : (appliedSettings.image.provider && appliedSettings.image.apiKey)
                            ? '✅ 연결됨'
                            : testingStatus.image?.message && !testingStatus.image?.success
                            ? '❌ 연결 실패'
                            : '⚪ 미확인'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* API 키 발급 가이드 */}
                {settings.image.provider && (
                  <div style={{
                    padding: '16px',
                    borderRadius: '8px',
                    marginTop: '16px',
                    backgroundColor: settings.image.provider === 'gemini' ? '#f0fdf4' : '#f8fafc'
                  }}>
                    <h4 style={{
                      fontWeight: '600',
                      marginBottom: '8px',
                      color: settings.image.provider === 'gemini' ? '#166534' : '#374151'
                    }}>📝 {settings.image.provider === 'gemini' ? 'Gemini' : ''} API 키 발급 방법</h4>
                    <ol style={{
                      fontSize: '14px',
                      lineHeight: '1.5',
                      margin: 0,
                      paddingLeft: '20px',
                      color: settings.image.provider === 'gemini' ? '#15803d' : '#374151'
                    }}>
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6b7280',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            취소
          </button>
          <button
            onClick={saveSettings}
            style={{
              padding: '12px 24px',
              backgroundColor: '#10b981',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default LLMSettings;