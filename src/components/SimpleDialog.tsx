import React from 'react';

interface SimpleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  targetElement?: HTMLElement;
}

const SimpleDialog: React.FC<SimpleDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  onConfirm,
  confirmText = '확인',
  cancelText = '취소',
  targetElement
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    console.log('SimpleDialog confirm clicked');
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  // 타겟 요소 위치 계산
  const getPosition = () => {
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      return {
        top: rect.bottom + 8, // 버튼 아래쪽에 8px 간격
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 350 - 8)) // 화면을 벗어나지 않도록 조정
      };
    }
    // 타겟이 없으면 화면 중앙
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)'
    };
  };

  const position = getPosition();

  return (
    <div 
      style={{
        position: 'fixed',
        ...position,
        backgroundColor: 'white',
        padding: '16px',
        borderRadius: '4px',
        minWidth: '250px',
        maxWidth: '350px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        border: '1px solid #ccc',
        zIndex: 10000,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <div style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: '#333' }}>
        {title}
      </div>
      
      <div style={{ marginBottom: '16px', fontSize: '13px', lineHeight: '1.4', color: '#666', whiteSpace: 'pre-line' }}>
        {message}
      </div>
      
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        {onConfirm && (
          <button
            onClick={onClose}
            style={{
              padding: '4px 12px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              backgroundColor: '#f8f9fa',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#333'
            }}
          >
            {cancelText}
          </button>
        )}
        
        <button
          onClick={handleConfirm}
          style={{
            padding: '4px 12px',
            border: '1px solid #0066cc',
            borderRadius: '3px',
            backgroundColor: '#0066cc',
            color: 'white',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          {confirmText}
        </button>
      </div>
    </div>
  );
};

export default SimpleDialog;