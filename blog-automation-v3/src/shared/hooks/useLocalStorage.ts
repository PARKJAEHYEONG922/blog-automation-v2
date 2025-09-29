import { useState, useEffect, useCallback } from 'react';

export interface UseLocalStorageReturn<T> {
  value: T;
  setValue: (value: T | ((prev: T) => T)) => void;
  removeValue: () => void;
  loading: boolean;
  error: string | null;
}

/**
 * localStorage와 동기화되는 상태를 관리하는 훅
 */
function useLocalStorage<T>(
  key: string,
  initialValue: T
): UseLocalStorageReturn<T> {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // localStorage에서 값 읽기
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      return initialValue;
    }
  }, [initialValue, key]);

  // 컴포넌트 마운트 시 localStorage에서 값 읽기
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    try {
      const value = readValue();
      setStoredValue(value);
    } finally {
      setLoading(false);
    }
  }, [readValue]);

  // 값 설정 함수
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        setError(null);
        
        // 함수형 업데이트 지원
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        
        setStoredValue(valueToStore);
        
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      }
    },
    [key, storedValue]
  );

  // 값 제거 함수
  const removeValue = useCallback(() => {
    try {
      setError(null);
      setStoredValue(initialValue);
      
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [initialValue, key]);

  return {
    value: storedValue,
    setValue,
    removeValue,
    loading,
    error
  };
}

export default useLocalStorage;