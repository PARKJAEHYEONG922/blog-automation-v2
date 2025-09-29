import React, { useState } from 'react';

interface SavedDocument {
  id: string;
  name: string;
  content: string;
  filePath: string;
  createdAt: string;
}

interface ManualUploadSectionProps {
  selectedTitle: string;
  selectedWritingStyles: SavedDocument[];
  selectedSeoGuide: SavedDocument | null;
  blogContent: string;
  mainKeyword: string;
  subKeywords: string;
  onFileUploaded: (content: string) => void;
}

const ManualUploadSection: React.FC<ManualUploadSectionProps> = ({
  selectedTitle,
  selectedWritingStyles,
  selectedSeoGuide,
  blogContent,
  mainKeyword,
  subKeywords,
  onFileUploaded,
}) => {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="text-center mt-5">
      <div className="mb-3 text-xs text-gray-500 italic">
        또는
      </div>
      
      <label className="inline-flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-blue-500/25">
        <span>📄</span>
        <span>직접 글 업로드</span>
        <input
          type="file"
          accept=".md,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const content = event.target?.result as string;
                onFileUploaded(content);
              };
              reader.readAsText(file);
            }
          }}
        />
      </label>
      
      {/* 접이식 업로드 주의사항 */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="inline-flex items-center space-x-2 bg-transparent border border-gray-300 hover:bg-gray-50 hover:border-gray-400 rounded-lg px-3 py-2 text-xs text-gray-600 cursor-pointer transition-all duration-200"
        >
          <span>📋</span>
          <span>업로드 주의사항</span>
          <span>{showGuide ? '▲' : '▼'}</span>
        </button>
        
        {showGuide && (
          <div className="mt-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800 text-left max-w-lg mx-auto">
            <div className="font-semibold mb-3 text-yellow-900 flex items-center space-x-2">
              <span>⚠️</span>
              <span>직접 업로드 시 반드시 확인하세요!</span>
            </div>
            
            <div className="space-y-3 leading-relaxed">
              <div>
                <span className="font-semibold text-yellow-900">1️⃣ 파일 형식:</span> 
                <code className="bg-yellow-100 px-1 rounded text-xs">.md</code> 파일만 업로드 가능합니다.
              </div>
              
              <div>
                <span className="font-semibold text-yellow-900">2️⃣ Claude 아티팩트 사용:</span>
                <div className="ml-4 mt-1 text-xs">
                  • Claude에서 글 작성 후 아티팩트 우측 상단의 다운로드 버튼 클릭<br />
                  • <strong>"Markdown(으)로 다운로드"</strong> 선택해서 .md 파일 저장
                </div>
              </div>
              
              <div>
                <span className="font-semibold text-yellow-900">3️⃣ 이미지 태그 필수:</span>
                <div className="ml-4 mt-1 text-xs">
                  • 글 작성 시 Claude에게 <strong>"이미지가 들어갈 위치에 (이미지) 태그를 넣어달라"</strong>고 요청<br />
                  • 예시: "설명 텍스트... (이미지) ...다음 내용..."
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
                <div className="flex items-start space-x-2">
                  <span>💡</span>
                  <div>
                    <span className="font-semibold">팁:</span> Claude에게 "블로그 글을 작성하되, 이미지가 필요한 부분에 (이미지) 태그를 넣어주세요"라고 요청하면 자동으로 적절한 위치에 태그를 넣어줍니다.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualUploadSection;