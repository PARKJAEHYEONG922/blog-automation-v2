import React from 'react';

interface KeywordInputSectionProps {
  mainKeyword: string;
  subKeywords: string;
  blogContent: string;
  onMainKeywordChange: (value: string) => void;
  onSubKeywordsChange: (value: string) => void;
  onBlogContentChange: (value: string) => void;
}

const KeywordInputSection: React.FC<KeywordInputSectionProps> = ({
  mainKeyword,
  subKeywords,
  blogContent,
  onMainKeywordChange,
  onSubKeywordsChange,
  onBlogContentChange,
}) => {
  return (
    <div style={{
      backgroundColor: '#fff',
      border: '2px solid #e9ecef',
      borderRadius: '16px',
      padding: '25px',
      marginBottom: '20px'
    }}>
      <h3 style={{ color: '#495057', marginBottom: '8px', fontSize: '20px' }}>🔍 키워드 입력 및 제목 추천</h3>
      <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '20px' }}>
        메인키워드, SEO 보조키워드, 글 내용을 입력하면 AI가 독자 관심을 끌 매력적인 제목 10개를 추천합니다
      </p>
      
      {/* 통합 입력 섹션 - 3개 필드 */}
      <div style={{ display: 'grid', gap: '20px', marginBottom: '25px' }}>
        {/* 메인키워드 */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>
            메인키워드 *
          </label>
          <input
            type="text"
            value={mainKeyword}
            onChange={(e) => onMainKeywordChange(e.target.value)}
            placeholder="예: 홈트레이닝"
            style={{
              width: '100%',
              border: '2px solid #dee2e6',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '14px',
              backgroundColor: '#fafafa'
            }}
          />
          <small style={{ color: '#6c757d', fontSize: '12px' }}>
            블로그 글의 핵심 주제 키워드를 입력하세요
          </small>
        </div>
        
        {/* 보조키워드 */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>
            보조키워드 (선택사항)
          </label>
          <input
            type="text"
            value={subKeywords}
            onChange={(e) => onSubKeywordsChange(e.target.value)}
            placeholder="예: 홈트레이닝루틴, 홈트레이닝장비, 집에서운동 (쉼표로 구분)"
            style={{
              width: '100%',
              border: '2px solid #dee2e6',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '14px',
              backgroundColor: '#fafafa'
            }}
          />
          <small style={{ color: '#6c757d', fontSize: '12px' }}>
            관련 키워드를 쉼표(,)로 구분해서 입력하세요
          </small>
        </div>

        {/* 어떤 블로그를 쓰고 싶은지 */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>
            어떤 내용으로 쓸지 (선택사항)
          </label>
          <textarea
            value={blogContent}
            onChange={(e) => onBlogContentChange(e.target.value)}
            placeholder="예: 초보자를 위한 실전 가이드 / 단계별 따라하기 방법 / 경험담과 후기 중심 / 최신 트렌드 정리 / 비교분석 리뷰"
            rows={3}
            style={{
              width: '100%',
              border: '2px solid #dee2e6',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '14px',
              backgroundColor: '#fafafa',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
          <small style={{ color: '#6c757d', fontSize: '12px' }}>
            어떤 내용으로 블로그 글을 쓸지 자세히 적어주세요
          </small>
        </div>
      </div>
    </div>
  );
};

export default KeywordInputSection;