import React from 'react';
import SuccessModal from './SuccessModal';

interface SavedDocument {
  id: string;
  name: string;
  content: string;
  filePath: string;
  createdAt: string;
}

interface DocumentUploadSectionProps {
  savedWritingStyles: SavedDocument[];
  savedSeoGuides: SavedDocument[];
  selectedWritingStyles: SavedDocument[];
  selectedSeoGuide: SavedDocument | null;
  onToggleWritingStyle: (doc: SavedDocument) => void;
  onToggleSeoGuide: (doc: SavedDocument) => void;
  onFileUpload: (type: 'writingStyle' | 'seoGuide', file: File) => void;
  onOpenDeleteDialog: (type: 'writingStyle' | 'seoGuide', docId: string, docName: string) => void;
  onUrlCrawl: (url: string) => Promise<{ title: string; contentLength: number } | null>;
}

const DocumentUploadSection: React.FC<DocumentUploadSectionProps> = ({
  savedWritingStyles,
  savedSeoGuides,
  selectedWritingStyles,
  selectedSeoGuide,
  onToggleWritingStyle,
  onToggleSeoGuide,
  onFileUpload,
  onOpenDeleteDialog,
  onUrlCrawl,
}) => {
  const [urlInput, setUrlInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [successModal, setSuccessModal] = React.useState<{
    isOpen: boolean;
    title: string;
    contentLength: number;
  }>({
    isOpen: false,
    title: '',
    contentLength: 0,
  });

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;

    setIsLoading(true);
    try {
      const result = await onUrlCrawl(urlInput.trim());
      setUrlInput('');

      // 성공 모달 표시
      if (result) {
        setSuccessModal({
          isOpen: true,
          title: result.title,
          contentLength: result.contentLength,
        });
      }
    } catch (error) {
      console.error('URL 크롤링 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 mb-5 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center space-x-3 mb-2">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white text-sm font-semibold">
            📚
          </div>
          <h3 className="text-xl font-bold text-gray-800">문서 업로드</h3>
        </div>
        <p className="text-gray-600 text-sm leading-relaxed bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          💡 블로그 글 생성에 사용할 참고 문서들을 업로드하세요
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 말투 문서 */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-5">
          <div className="flex items-center space-x-2 mb-3">
            <span className="text-lg">✍️</span>
            <h4 className="text-base font-semibold text-gray-800">나만의 말투 문서</h4>
            <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">최대 2개</span>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            평소 블로그 글 스타일 참고용
          </p>
        
          <input
            type="file"
            accept=".txt,.md"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileUpload('writingStyle', file);
            }}
            className="w-full p-3 border-2 border-dashed border-purple-300 rounded-lg bg-white/70 cursor-pointer text-sm transition-all duration-200 hover:border-purple-400 hover:bg-white focus:outline-none focus:border-purple-500"
          />

          <div className="mt-4 pt-4 border-t border-purple-200">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm">🔗</span>
              <span className="text-sm font-medium text-gray-700">또는 블로그 URL로 가져오기</span>
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="네이버 블로그 또는 티스토리 URL을 입력하세요"
                className="flex-1 p-2 border border-purple-300 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
                disabled={isLoading}
              />
              <button
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim() || isLoading}
                className="px-4 py-2 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isLoading ? '📥' : '가져오기'}
              </button>
            </div>
          </div>

          {savedWritingStyles.length > 0 && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                {savedWritingStyles.map(doc => {
                  const isSelected = selectedWritingStyles.some(selected => selected.id === doc.id);
                  return (
                    <div key={doc.id} className={`
                      flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 
                      ${isSelected 
                        ? 'bg-purple-100 border-2 border-purple-400 text-purple-800 shadow-sm' 
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-purple-300'
                      }
                    `}>
                      <span
                        onClick={() => onToggleWritingStyle(doc)}
                        className="cursor-pointer flex items-center space-x-1"
                      >
                        <span>{isSelected ? '✅' : '📄'}</span>
                        <span>{doc.name}</span>
                      </span>
                      <button
                        onClick={() => onOpenDeleteDialog('writingStyle', doc.id, doc.name)}
                        className="ml-2 text-red-500 hover:text-red-700 transition-colors duration-200 text-sm font-bold"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
              {selectedWritingStyles.length > 0 && (
                <div className="mt-2 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-md inline-block">
                  선택: {selectedWritingStyles.length}/2
                </div>
              )}
            </div>
          )}
        </div>

        {/* SEO 가이드 */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-center space-x-2 mb-3">
            <span className="text-lg">📊</span>
            <h4 className="text-base font-semibold text-gray-800">네이버 SEO 가이드</h4>
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">1개 선택</span>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            SEO 최적화 가이드
          </p>
        
          <input
            type="file"
            accept=".txt,.md"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileUpload('seoGuide', file);
            }}
            className="w-full p-3 border-2 border-dashed border-blue-300 rounded-lg bg-white/70 cursor-pointer text-sm transition-all duration-200 hover:border-blue-400 hover:bg-white focus:outline-none focus:border-blue-500"
          />

          {savedSeoGuides.length > 0 && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                {savedSeoGuides.map(doc => {
                  const isSelected = selectedSeoGuide?.id === doc.id;
                  return (
                    <div key={doc.id} className={`
                      flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 
                      ${isSelected 
                        ? 'bg-blue-100 border-2 border-blue-400 text-blue-800 shadow-sm' 
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-300'
                      }
                    `}>
                      <span
                        onClick={() => onToggleSeoGuide(doc)}
                        className="cursor-pointer flex items-center space-x-1"
                      >
                        <span>{isSelected ? '📘' : '📄'}</span>
                        <span>{doc.name}</span>
                      </span>
                      <button
                        onClick={() => onOpenDeleteDialog('seoGuide', doc.id, doc.name)}
                        className="ml-2 text-red-500 hover:text-red-700 transition-colors duration-200 text-sm font-bold"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
              {selectedSeoGuide && (
                <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md inline-block">
                  선택: {selectedSeoGuide.name}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 성공 모달 */}
      <SuccessModal
        isOpen={successModal.isOpen}
        title={successModal.title}
        contentLength={successModal.contentLength}
        onClose={() => setSuccessModal({ isOpen: false, title: '', contentLength: 0 })}
      />
    </div>
  );
};

export default DocumentUploadSection;