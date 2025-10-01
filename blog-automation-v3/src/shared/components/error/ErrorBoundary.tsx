import React, { Component, ErrorInfo, ReactNode } from 'react';
import Button from '../ui/Button';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 에러 경계 컴포넌트
 * React 컴포넌트 트리에서 발생하는 에러를 포착하고 처리
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo
    });

    // 에러 로깅 (추후 원격 로깅 서비스로 전송 가능)
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // TODO: 원격 로깅 서비스로 전송
    console.group('🔴 Error Log');
    console.error('Error:', error.toString());
    console.error('Error Info:', errorInfo.componentStack);
    console.groupEnd();
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError && this.state.error && this.state.errorInfo) {
      // 커스텀 fallback이 제공된 경우
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo, this.resetError);
      }

      // 기본 에러 UI
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-gray-800 rounded-lg shadow-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-4xl">⚠️</div>
              <h1 className="text-2xl font-bold text-white">앱에서 오류가 발생했습니다</h1>
            </div>

            <div className="mb-6">
              <p className="text-gray-300 mb-4">
                예상치 못한 오류가 발생했습니다. 아래 정보를 개발자에게 전달해주세요.
              </p>

              <div className="bg-gray-900 rounded p-4 mb-4">
                <p className="text-red-400 font-mono text-sm mb-2">
                  <strong>오류 메시지:</strong>
                </p>
                <p className="text-red-300 font-mono text-sm">
                  {this.state.error.toString()}
                </p>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <details className="bg-gray-900 rounded p-4">
                  <summary className="text-yellow-400 font-mono text-sm cursor-pointer mb-2">
                    🔍 상세 정보 보기 (개발 모드)
                  </summary>
                  <pre className="text-gray-400 font-mono text-xs overflow-auto max-h-64 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex gap-3">
              <Button onClick={this.resetError} variant="primary">
                다시 시도
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="secondary"
              >
                앱 새로고침
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
