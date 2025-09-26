import React from 'react';

interface GenerationProgressSectionProps {
  isGenerating: boolean;
  generationStep: string;
}

const GenerationProgressSection: React.FC<GenerationProgressSectionProps> = ({
  isGenerating,
  generationStep,
}) => {
  if (!isGenerating) return null;

  return (
    <div className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-2xl p-0.5 shadow-xl shadow-blue-500/20">
      <div className="bg-white rounded-2xl p-6 text-center">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-semibold">
            ⚡
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            AI 생성 진행 중
          </h3>
        </div>
        
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4 animate-spin"></div>
        
        <p className="text-blue-600 text-base font-semibold mb-4">
          {generationStep}
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          <div className="flex items-center justify-center space-x-2">
            <span>💡</span>
            <span>선택된 제목과 키워드로 AI가 최적화된 블로그 글을 생성하고 있습니다</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerationProgressSection;