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
}

const WorkSummary: React.FC<WorkSummaryProps> = ({ 
  setupData, 
  charCount,
  charCountWithSpaces,
  imageCount, 
  imageAIInfo 
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
        <h3 style={{ 
          fontSize: '20px', 
          fontWeight: '700', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          📋 작업 요약
        </h3>
        
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