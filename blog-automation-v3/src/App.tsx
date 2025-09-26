import React, { useState } from 'react';
import Step1Setup from './components/Step1Setup';
import Step3Process from './components/Step3Process';
import './App.css';

type Step = 1 | 3;

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [setupData, setSetupData] = useState({
    writingStylePaths: [] as string[],
    seoGuidePath: '',
    topic: '',
    generatedContent: undefined as string | undefined
  });
  const [generatedContent, setGeneratedContent] = useState<string>('');

  const handleSetupComplete = (data: typeof setupData) => {
    setSetupData(data);
    
    // Set generated content and move to Step 3
    if (data.generatedContent) {
      setGeneratedContent(data.generatedContent);
    }
    setCurrentStep(3);
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSetupData({ writingStylePaths: [], seoGuidePath: '', topic: '', generatedContent: undefined });
    setGeneratedContent('');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚀 블로그 자동화 v3</h1>
        <div className="step-indicator">
          <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>1. 설정 & 생성</div>
          <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>2. 완성</div>
        </div>
      </header>

      <main className="app-main">
        {currentStep === 1 && (
          <Step1Setup onComplete={handleSetupComplete} />
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