import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'generate' | 'generateImages' | 'publish';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  // 기존 App.css 클래스들과 완전히 호환되도록 매핑
  const getButtonClasses = () => {
    const baseClasses = 'font-semibold cursor-pointer transition-all duration-300 border-none';
    
    // 기존 CSS 클래스 그대로 사용
    switch (variant) {
      case 'primary':
      case 'next':
        return `next-button ${baseClasses}`;
      case 'success':
      case 'generate':
        return `generate-button ${baseClasses}`;
      case 'danger':
      case 'generateImages':
        return `generate-images-button ${baseClasses}`;
      case 'publish':
        return `publish-button ${baseClasses}`;
      case 'ghost':
      case 'secondary':
        return `${baseClasses} bg-white text-gray-600 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 px-4 py-2.5 rounded-xl`;
      default:
        return `next-button ${baseClasses}`;
    }
  };

  return (
    <button
      className={`${getButtonClasses()} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="loading-spinner mr-2" style={{ width: '16px', height: '16px' }} />
      )}
      {children}
    </button>
  );
};

export default Button;