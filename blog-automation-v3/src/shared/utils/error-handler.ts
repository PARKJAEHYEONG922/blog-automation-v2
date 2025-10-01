/**
 * 에러 처리 유틸리티
 * 일관된 에러 메시지 및 로깅 제공
 */

export enum ErrorType {
  NETWORK = 'NETWORK',
  API = 'API',
  FILE_SYSTEM = 'FILE_SYSTEM',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN'
}

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  context?: Record<string, any>;
}

/**
 * 에러 타입에 따른 사용자 친화적 메시지 생성
 */
export const getErrorMessage = (error: unknown, fallbackMessage: string = '알 수 없는 오류가 발생했습니다'): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    if ('error' in error && typeof error.error === 'string') {
      return error.error;
    }
  }

  return fallbackMessage;
};

/**
 * 에러를 AppError 형식으로 변환
 */
export const createAppError = (
  type: ErrorType,
  message: string,
  originalError?: Error,
  context?: Record<string, any>
): AppError => {
  return {
    type,
    message,
    originalError,
    context
  };
};

/**
 * 에러 로깅
 */
export const logError = (error: AppError | Error | unknown, context?: string) => {
  const timestamp = new Date().toISOString();

  console.group(`🔴 Error Log [${timestamp}]`);

  if (context) {
    console.log('Context:', context);
  }

  if (isAppError(error)) {
    console.error('Type:', error.type);
    console.error('Message:', error.message);
    if (error.originalError) {
      console.error('Original Error:', error.originalError);
    }
    if (error.context) {
      console.error('Error Context:', error.context);
    }
  } else if (error instanceof Error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } else {
    console.error('Unknown Error:', error);
  }

  console.groupEnd();
};

/**
 * AppError 타입 가드
 */
export const isAppError = (error: any): error is AppError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'message' in error
  );
};

/**
 * 네트워크 에러 처리
 */
export const handleNetworkError = (error: unknown, context?: string): AppError => {
  const message = getErrorMessage(error, '네트워크 연결에 실패했습니다');
  const appError = createAppError(
    ErrorType.NETWORK,
    message,
    error instanceof Error ? error : undefined,
    context ? { context } : undefined
  );
  logError(appError);
  return appError;
};

/**
 * API 에러 처리
 */
export const handleAPIError = (error: unknown, apiName: string): AppError => {
  const message = getErrorMessage(error, `${apiName} API 호출에 실패했습니다`);
  const appError = createAppError(
    ErrorType.API,
    message,
    error instanceof Error ? error : undefined,
    { apiName }
  );
  logError(appError);
  return appError;
};

/**
 * 파일 시스템 에러 처리
 */
export const handleFileSystemError = (error: unknown, operation: string): AppError => {
  const message = getErrorMessage(error, `파일 ${operation} 작업에 실패했습니다`);
  const appError = createAppError(
    ErrorType.FILE_SYSTEM,
    message,
    error instanceof Error ? error : undefined,
    { operation }
  );
  logError(appError);
  return appError;
};

/**
 * 유효성 검사 에러 처리
 */
export const handleValidationError = (message: string, field?: string): AppError => {
  const appError = createAppError(
    ErrorType.VALIDATION,
    message,
    undefined,
    field ? { field } : undefined
  );
  logError(appError);
  return appError;
};

/**
 * 사용자에게 표시할 에러 메시지 alert
 */
export const showErrorAlert = (error: unknown, fallbackMessage?: string) => {
  const message = getErrorMessage(error, fallbackMessage);
  alert(message);
};

/**
 * Promise catch 핸들러
 */
export const catchHandler = (context: string) => (error: unknown) => {
  logError(error, context);
  showErrorAlert(error);
};
