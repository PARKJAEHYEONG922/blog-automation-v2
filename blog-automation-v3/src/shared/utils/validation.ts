// 공통 검증 함수들

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isValidApiKey = (apiKey: string): boolean => {
  return apiKey.length > 10 && !apiKey.includes(' ');
};

export const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value || value.trim().length === 0) {
    return `${fieldName}은(는) 필수 입력 항목입니다.`;
  }
  return null;
};

export const validateMinLength = (value: string, minLength: number, fieldName: string): string | null => {
  if (value.length < minLength) {
    return `${fieldName}은(는) 최소 ${minLength}자 이상이어야 합니다.`;
  }
  return null;
};