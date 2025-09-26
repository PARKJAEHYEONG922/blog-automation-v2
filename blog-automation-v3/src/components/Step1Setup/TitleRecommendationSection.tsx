import React, { useState } from 'react';

interface TitleRecommendationSectionProps {
  generatedTitles: string[];
  selectedTitle: string;
  isGeneratingTitles: boolean;
  isGenerating: boolean;
  mainKeyword: string;
  onGenerateTitles: () => void;
  onSelectTitle: (title: string) => void;
  onStartGeneration: () => void;
  onLoadDummyTitles?: (titles: string[]) => void;
}

const TitleRecommendationSection: React.FC<TitleRecommendationSectionProps> = ({
  generatedTitles,
  selectedTitle,
  isGeneratingTitles,
  isGenerating,
  mainKeyword,
  onGenerateTitles,
  onSelectTitle,
  onStartGeneration,
  onLoadDummyTitles,
}) => {
  const [customTitle, setCustomTitle] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  
  // 더미 제목 데이터
  const dummyTitles = [
    "테슬라 주가 상승 이유 5가지! 미래 전망까지 완벽 분석",
    "2025년 테슬라 투자 전략 - 전문가가 알려주는 핵심 포인트",
    "테슬라 vs 경쟁사 비교분석! 왜 테슬라가 유리한가?",
    "테슬라 신기술 발표 후 주가 전망과 투자 기회",
    "테슬라 주식 투자 전 반드시 알아야 할 10가지",
    "일론 머스크의 테슬라 비전 - 2030년까지의 로드맵",
    "테슬라 자율주행 기술의 현재와 미래 전망",
    "테슬라 배터리 기술 혁신이 주가에 미치는 영향",
    "테슬라 중국 시장 전략과 글로벌 확장 계획",
    "테슬라 주가 분석: 언제 사고 언제 팔아야 할까?"
  ];

  const handleLoadDummy = () => {
    if (onLoadDummyTitles) {
      onLoadDummyTitles(dummyTitles);
    }
  };
  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '10px',
      padding: '20px',
      marginBottom: '20px'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '15px'
      }}>
        <h4 style={{ color: '#495057', margin: 0, fontSize: '16px' }}>
          🎯 AI 추천 제목 
          {generatedTitles.length > 0 && <span style={{ color: '#28a745', fontWeight: 'normal' }}>({generatedTitles.length}개 생성됨)</span>}
        </h4>
        
        {/* 제목 생성 버튼들 - 오른쪽 배치 */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* 더미 데이터 버튼 */}
          <button
            onClick={handleLoadDummy}
            disabled={isGeneratingTitles}
            style={{
              backgroundColor: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: isGeneratingTitles ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.3s ease',
              minWidth: '110px',
              justifyContent: 'center'
            }}
            title="테스트용 더미 제목 10개를 불러옵니다"
          >
            🧪 더미 데이터
          </button>
          
          {/* 제목 생성 버튼 */}
          <button
            onClick={onGenerateTitles}
            disabled={isGeneratingTitles || !mainKeyword.trim()}
            style={{
              backgroundColor: isGeneratingTitles ? '#6c757d' : (generatedTitles.length > 0 ? '#28a745' : '#007bff'),
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: isGeneratingTitles ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: !mainKeyword.trim() ? 0.5 : 1,
              transition: 'all 0.3s ease',
              minWidth: '140px',
              justifyContent: 'center'
            }}
          >
            {isGeneratingTitles ? (
              <>
                <div style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid #fff',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                생성 중...
              </>
            ) : generatedTitles.length > 0 ? (
              <>
                🔄 재생성
              </>
            ) : (
              <>
                ✨ 제목 생성
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* 제목이 생성되기 전 안내 메시지 및 직접 입력 */}
      {generatedTitles.length === 0 && !isGeneratingTitles && (
        <div>
          <div style={{
            textAlign: 'center',
            padding: '20px',
            color: '#6c757d',
            fontSize: '14px',
            backgroundColor: '#fff',
            border: '2px dashed #dee2e6',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            📝 메인키워드를 입력하고 "제목 생성" 버튼을 클릭해주세요
          </div>
          
          <div style={{ 
            textAlign: 'center', 
            fontSize: '12px', 
            color: '#6c757d',
            marginBottom: '16px'
          }}>
            또는
          </div>
          
          {/* 직접 제목 입력 (항상 표시) */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>
              ✍️ 직접 제목 입력
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="사용하고 싶은 제목을 입력해주세요..."
              style={{
                width: '100%',
                border: '2px solid #dee2e6',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px',
                backgroundColor: '#fff',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#007bff'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#dee2e6'}
            />
            {customTitle.trim() && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: '#e8f5e8',
                border: '1px solid #c3e6cb',
                borderRadius: '6px'
              }}>
                <div style={{ fontSize: '12px', color: '#155724', fontWeight: 'bold', marginBottom: '4px' }}>
                  ✅ 입력된 제목
                </div>
                <div style={{ fontSize: '14px', color: '#155724', fontWeight: 'bold' }}>
                  {customTitle}
                </div>
              </div>
            )}
          </div>
          
          {/* 직접 입력 제목으로 글 생성 버튼 */}
          {customTitle.trim() && (
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={onStartGeneration}
                disabled={isGenerating}
                style={{
                  backgroundColor: isGenerating ? '#6c757d' : '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '14px 28px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '0 auto',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isGenerating) {
                    e.currentTarget.style.backgroundColor = '#218838';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isGenerating) {
                    e.currentTarget.style.backgroundColor = '#28a745';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                🚀 입력한 제목으로 글 생성하기
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* 제목 생성 중 표시 */}
      {isGeneratingTitles && (
        <div style={{
          textAlign: 'center',
          padding: '30px',
          color: '#007bff',
          fontSize: '14px',
          backgroundColor: '#fff',
          border: '2px solid #007bff',
          borderRadius: '8px'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '3px solid #007bff',
            borderTop: '3px solid transparent',
            borderRadius: '50%',
            margin: '0 auto 12px auto',
            animation: 'spin 1s linear infinite'
          }}></div>
          AI가 매력적인 제목 10개를 생성하고 있습니다...
        </div>
      )}
      
      {/* 제목 선택 드롭다운 */}
      {generatedTitles.length > 0 && !isGeneratingTitles && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>
              사용할 제목 선택 *
            </label>
            <select
              value={selectedTitle}
              onChange={(e) => onSelectTitle(e.target.value)}
              style={{
                width: '100%',
                border: '2px solid #dee2e6',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px',
                backgroundColor: '#fff',
                cursor: 'pointer'
              }}
            >
              <option value="">제목을 선택해주세요...</option>
              {generatedTitles.map((title, index) => (
                <option key={index} value={title}>
                  {index + 1}. {title}
                </option>
              ))}
              <option value="__CUSTOM__">✍️ 직접 입력하기</option>
            </select>
          </div>
          
          {/* 커스텀 제목 입력 */}
          {selectedTitle === '__CUSTOM__' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>
                ✍️ 직접 제목 입력
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="사용하고 싶은 제목을 입력해주세요..."
                style={{
                  width: '100%',
                  border: '2px solid #dee2e6',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#007bff'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#dee2e6'}
              />
              {customTitle.trim() && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: '#e8f5e8',
                  border: '1px solid #c3e6cb',
                  borderRadius: '6px'
                }}>
                  <div style={{ fontSize: '12px', color: '#155724', fontWeight: 'bold', marginBottom: '4px' }}>
                    ✅ 입력된 제목
                  </div>
                  <div style={{ fontSize: '14px', color: '#155724', fontWeight: 'bold' }}>
                    {customTitle}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* 선택된 제목 표시 (AI 추천 제목인 경우) */}
          {selectedTitle && selectedTitle !== '__CUSTOM__' && (
            <div style={{
              marginBottom: '20px',
              padding: '12px',
              backgroundColor: '#e8f5e8',
              border: '1px solid #c3e6cb',
              borderRadius: '6px'
            }}>
              <div style={{ fontSize: '12px', color: '#155724', fontWeight: 'bold', marginBottom: '4px' }}>
                ✅ 선택된 제목
              </div>
              <div style={{ fontSize: '14px', color: '#155724', fontWeight: 'bold' }}>
                {selectedTitle}
              </div>
            </div>
          )}
          
          {/* 글 생성 버튼 */}
          {((selectedTitle && selectedTitle !== '__CUSTOM__') || (selectedTitle === '__CUSTOM__' && customTitle.trim())) && (
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => {
                  onStartGeneration();
                }}
                disabled={isGenerating}
                style={{
                  backgroundColor: isGenerating ? '#6c757d' : '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '14px 28px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '0 auto',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isGenerating) {
                    e.currentTarget.style.backgroundColor = '#218838';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isGenerating) {
                    e.currentTarget.style.backgroundColor = '#28a745';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {isGenerating ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #fff',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    글 생성 중...
                  </>
                ) : (
                  <>
                    🚀 {selectedTitle === '__CUSTOM__' ? '입력한' : '선택한'} 제목으로 글 생성하기
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TitleRecommendationSection;