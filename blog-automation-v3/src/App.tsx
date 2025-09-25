import React, { useState } from 'react';
import Step1Setup from './components/Step1Setup';
import Step2Generation from './components/Step2Generation';
import Step3Process from './components/Step3Process';
import './App.css';

type Step = 1 | 2 | 3;

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [setupData, setSetupData] = useState({
    writingStyle: '',
    seoGuide: '',
    topic: ''
  });
  const [generatedContent, setGeneratedContent] = useState<string>('');

  const handleSetupComplete = (data: typeof setupData) => {
    setSetupData(data);
    setCurrentStep(2);
  };

  const handleGenerationComplete = (content: string) => {
    setGeneratedContent(content);
    setCurrentStep(3);
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSetupData({ writingStyle: '', seoGuide: '', topic: '' });
    setGeneratedContent('');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚀 블로그 자동화 v3</h1>
        <div className="step-indicator">
          <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>1. 설정</div>
          <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>2. 생성</div>
          <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>3. 완성</div>
        </div>
      </header>

      <main className="app-main">
        {currentStep === 1 && (
          <Step1Setup onComplete={handleSetupComplete} />
        )}
        {currentStep === 2 && (
          <Step2Generation 
            setupData={setupData} 
            onComplete={handleGenerationComplete}
            onBack={() => setCurrentStep(1)}
          />
        )}
        {currentStep === 3 && (
          <Step3Process 
            content={generatedContent}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
};

export default App;