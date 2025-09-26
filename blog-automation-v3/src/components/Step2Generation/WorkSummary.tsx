import React from 'react';

interface WorkSummaryProps {
  setupData: {
    selectedTitle: string;
    mainKeyword: string;
    subKeywords: string;
    blogContent: string;
    isAIGenerated: boolean;
  };
  charCount: number;
  charCountWithSpaces: number;
  imageCount: number;
  imageAIInfo: string;
  onRefreshContent?: () => void;
  isRefreshingContent?: boolean;
}

const WorkSummary: React.FC<WorkSummaryProps> = ({ 
  setupData, 
  charCount,
  charCountWithSpaces,
  imageCount, 
  imageAIInfo,
  onRefreshContent,
  isRefreshingContent = false
}) => {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '16px',
      padding: '1px',
      marginBottom: '24px',
      boxShadow: '0 8px 32px rgba(102, 126, 234, 0.15)'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '15px',
        padding: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: '700', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            📋 작업 요약
          </h3>
          
          {/* AI 생성된 글인 경우에만 수정된 글 가져오기 버튼 표시 */}
          {setupData.isAIGenerated && onRefreshContent && (
            <button
              onClick={onRefreshContent}
              disabled={isRefreshingContent}
              style={{
                backgroundColor: isRefreshingContent ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: isRefreshingContent ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
              }}
              onMouseEnter={(e) => {
                if (!isRefreshingContent) {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isRefreshingContent) {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
                }
              }}
              title="Claude Web에서 수정한 글을 다시 가져옵니다"
            >
              {isRefreshingContent ? (
                <>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid #fff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  가져오는 중...
                </>
              ) : (
                <>
                  🔄 수정된 글 가져오기
                </>
              )}
            </button>
          )}
        </div>
        
        {/* 제목 섹션 - 특별히 강조 */}
        <div style={{ 
          backgroundColor: '#f8fafc',
          border: '2px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ 
              fontSize: '16px', 
              color: '#6366f1',
              fontWeight: '600'
            }}>📝 글제목</span>
            <span style={{ 
              fontSize: '16px', 
              fontWeight: '700', 
              color: '#1e293b',
              flex: 1
            }}>
              {setupData.selectedTitle || '제목 정보 없음'}
            </span>
          </div>
        </div>

        {/* 정보 카드들 */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '16px'
        }}>
          {/* 메인 키워드 카드 */}
          <div style={{
            backgroundColor: '#fef3f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: '600', marginBottom: '4px' }}>🎯 메인 키워드</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>
              {setupData.mainKeyword || '입력되지 않음'}
            </div>
          </div>

          {/* 보조 키워드 카드 */}
          <div style={{
            backgroundColor: '#fefbf2',
            border: '1px solid #fed7aa',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <div style={{ fontSize: '12px', color: '#ea580c', fontWeight: '600', marginBottom: '4px' }}>📌 보조 키워드</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#c2410c' }}>
              {setupData.subKeywords || '입력되지 않음'}
            </div>
          </div>

          {/* 글자 수 카드 */}
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: '600', marginBottom: '4px' }}>📊 글자 수</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#0369a1' }}>
              {charCount.toLocaleString()}자 / 공백포함 {charCountWithSpaces.toLocaleString()}자
            </div>
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px'
        }}>
          {/* 글 방향 카드 */}
          <div style={{
            backgroundColor: '#f7fee7',
            border: '1px solid #bef264',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <div style={{ fontSize: '12px', color: '#65a30d', fontWeight: '600', marginBottom: '4px' }}>📋 글 방향</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#4d7c0f' }}>
              {setupData.blogContent ? 
                setupData.blogContent.slice(0, 25) + (setupData.blogContent.length > 25 ? '...' : '') : 
                '입력되지 않음'}
            </div>
          </div>

          {/* 이미지 개수 카드 */}
          <div style={{
            backgroundColor: '#fdf4ff',
            border: '1px solid #e9d5ff',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <div style={{ fontSize: '12px', color: '#9333ea', fontWeight: '600', marginBottom: '4px' }}>🖼️ 이미지 개수</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#7c3aed' }}>
              {imageCount}개
            </div>
          </div>

          {/* 생성된 콘텐츠 카드 */}
          <div style={{
            backgroundColor: setupData.isAIGenerated ? '#eff6ff' : '#fef7ff',
            border: `1px solid ${setupData.isAIGenerated ? '#bfdbfe' : '#f3e8ff'}`,
            borderRadius: '8px',
            padding: '12px'
          }}>
            <div style={{ fontSize: '12px', color: setupData.isAIGenerated ? '#2563eb' : '#9333ea', fontWeight: '600', marginBottom: '4px' }}>📝 생성 방식</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: setupData.isAIGenerated ? '#1d4ed8' : '#7c3aed' }}>
              {setupData.isAIGenerated ? '🤖 AI로 생성됨' : '✏️ 수동으로 입력됨'}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default WorkSummary;