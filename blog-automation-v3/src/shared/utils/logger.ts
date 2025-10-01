/**
 * Logger 유틸리티
 * - 개발 환경에서만 로그 출력
 * - 프로덕션 빌드에서 자동 비활성화
 * - 타입별 로그 레벨 지원
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDev: boolean;

  constructor() {
    this.isDev = process.env.NODE_ENV !== 'production';
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    return data ? `${prefix} ${message}` : `${prefix} ${message}`;
  }

  debug(message: string, data?: any) {
    if (!this.isDev) return;
    console.log(this.formatMessage('debug', message, data), data || '');
  }

  info(message: string, data?: any) {
    if (!this.isDev) return;
    console.info(this.formatMessage('info', message, data), data || '');
  }

  warn(message: string, data?: any) {
    if (!this.isDev) return;
    console.warn(this.formatMessage('warn', message, data), data || '');
  }

  error(message: string, error?: any) {
    if (!this.isDev) return;
    console.error(this.formatMessage('error', message, error), error || '');
  }

  /**
   * 조건부 로그 (디버깅용)
   */
  debugIf(condition: boolean, message: string, data?: any) {
    if (condition) {
      this.debug(message, data);
    }
  }

  /**
   * 그룹 로그
   */
  group(label: string, fn: () => void) {
    if (!this.isDev) return;
    console.group(label);
    fn();
    console.groupEnd();
  }

  /**
   * 테이블 로그
   */
  table(data: any) {
    if (!this.isDev) return;
    console.table(data);
  }

  /**
   * 시간 측정
   */
  time(label: string) {
    if (!this.isDev) return;
    console.time(label);
  }

  timeEnd(label: string) {
    if (!this.isDev) return;
    console.timeEnd(label);
  }
}

// 싱글톤 인스턴스 export
export const logger = new Logger();

/**
 * 사용 예시:
 *
 * import { logger } from '@/shared/utils/logger';
 *
 * logger.debug('디버그 메시지', { data: 'value' });
 * logger.info('정보 메시지');
 * logger.warn('경고 메시지');
 * logger.error('에러 발생', error);
 *
 * logger.time('작업 시간');
 * // ... 작업 수행
 * logger.timeEnd('작업 시간');
 *
 * logger.group('그룹명', () => {
 *   logger.debug('그룹 내부 로그 1');
 *   logger.debug('그룹 내부 로그 2');
 * });
 */
