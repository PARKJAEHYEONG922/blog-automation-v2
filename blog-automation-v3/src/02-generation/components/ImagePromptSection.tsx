import React from 'react';
import Button from '@/shared/components/ui/Button';

interface ImagePromptSectionProps {
  imagePromptError: string | null;
  isRegeneratingPrompts: boolean;
  onRegeneratePrompts: () => Promise<void>;
}

const ImagePromptSection: React.FC<ImagePromptSectionProps> = ({
  imagePromptError,
  isRegeneratingPrompts,
  onRegeneratePrompts
}) => {
  if (!imagePromptError) return null;

  return (
    <div className="section-card" style={{ padding: '20px', marginBottom: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
      <div className="section-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="section-icon" style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%'
          }}>⚠️</div>
          <h2 className="section-title" style={{ fontSize: '16px', margin: '0', lineHeight: '1', color: '#dc2626' }}>
            이미지 프롬프트 생성 오류
          </h2>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{
          fontSize: '14px',
          color: '#7f1d1d',
          marginBottom: '8px',
          backgroundColor: '#fef7f7',
          padding: '12px',
          borderRadius: '6px',
          border: '1px solid #fecaca'
        }}>
          {imagePromptError}
        </div>

        <div style={{ fontSize: '13px', color: '#991b1b', marginBottom: '16px' }}>
          💡 <strong>해결 방법:</strong>
          <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
            <li>API 설정에서 다른 AI 제공자로 변경 후 재생성 시도</li>
            <li>현재 설정 그대로 재생성 시도 (일시적 오류일 경우)</li>
            <li>수동으로 이미지 업로드하여 사용</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Button
            onClick={onRegeneratePrompts}
            disabled={isRegeneratingPrompts}
            loading={isRegeneratingPrompts}
            variant="danger"
            className="flex items-center gap-2"
          >
            🔄 이미지 프롬프트 재생성
          </Button>

          <span style={{ fontSize: '12px', color: '#7f1d1d' }}>
            {isRegeneratingPrompts ? '프롬프트 재생성 중...' : 'API 설정을 변경한 후 재생성하면 더 성공 가능성이 높습니다'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ImagePromptSection;
