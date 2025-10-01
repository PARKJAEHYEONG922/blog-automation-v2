// 앱 전체에서 사용하는 상수들

export const APP_CONFIG = {
  name: 'AI 블로그 자동화 V3',
  version: '3.0.0',
  author: 'Your Name',
} as const;

export const LLM_PROVIDERS = {
  OPENAI: 'openai',
  CLAUDE: 'claude', 
  GEMINI: 'gemini',
  RUNWARE: 'runware',
} as const;

export const BLOG_PLATFORMS = {
  NAVER: 'naver',
  TISTORY: 'tistory',
} as const;

export const FILE_EXTENSIONS = {
  TEXT: '.txt',
  MARKDOWN: '.md',
  JSON: '.json',
} as const;

export const IMAGE_QUALITIES = {
  LOW: 'low',
  MEDIUM: 'medium', 
  HIGH: 'high',
} as const;

export const IMAGE_SIZES = {
  SQUARE: '1024x1024',
  PORTRAIT: '1024x1536',
  LANDSCAPE: '1536x1024',
  MOBILE: '512x768',
  DESKTOP: '768x512',
  WIDESCREEN: '1920x1080',
} as const;

// 유효성 검증 상수
export const VALIDATION_RULES = {
  MIN_TITLE_LENGTH: 5,
  MAX_TITLE_LENGTH: 100,
  MIN_CONTENT_LENGTH: 50,
  MAX_CONTENT_LENGTH: 10000,
  MAX_FILE_SIZE_MB: 10,
  ALLOWED_IMAGE_TYPES: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  ALLOWED_DOCUMENT_TYPES: ['txt', 'md', 'pdf', 'docx'],
} as const;

// API 관련 상수
export const API_ENDPOINTS = {
  OPENAI_BASE: 'https://api.openai.com/v1',
  CLAUDE_BASE: 'https://api.anthropic.com/v1',
  GEMINI_BASE: 'https://generativelanguage.googleapis.com/v1',
  RUNWARE_BASE: 'https://api.runware.ai/v1',
} as const;

// 에러 메시지 상수
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '네트워크 연결을 확인해주세요.',
  API_KEY_INVALID: 'API 키가 유효하지 않습니다.',
  FILE_TOO_LARGE: '파일 크기가 너무 큽니다.',
  INVALID_FILE_TYPE: '지원하지 않는 파일 형식입니다.',
  CONTENT_TOO_SHORT: '내용이 너무 짧습니다.',
  CONTENT_TOO_LONG: '내용이 너무 깁니다.',
  REQUIRED_FIELD: '필수 입력 항목입니다.',
} as const;

// UI 관련 상수
export const UI_CONSTANTS = {
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 500,
  TOAST_DURATION: 3000,
  MODAL_Z_INDEX: 1000,
  DROPDOWN_Z_INDEX: 100,
} as const;

// 로그 레벨
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
} as const;

// 이미지 생성 옵션 (provider별)
export const IMAGE_GENERATION_OPTIONS = {
  openai: {
    styles: [], // OpenAI는 스타일 없음
    qualities: [
      { value: 'low', label: '저품질 - $0.01/이미지' },
      { value: 'medium', label: '중품질 - $0.04/이미지' },
      { value: 'high', label: '고품질 - $0.17/이미지' }
    ],
    sizes: [
      { value: '1024x1024', label: '1024x1024 (정사각형)' },
      { value: '1024x1536', label: '1024x1536 (세로형)' },
      { value: '1536x1024', label: '1536x1024 (가로형)' }
    ]
  },
  runware: {
    styles: [
      { value: 'realistic', label: '사실적' },
      { value: 'illustration', label: '일러스트' },
      { value: 'anime', label: '애니메이션' },
      { value: 'dreamy', label: '몽환적' }
    ],
    qualities: [
      { value: 'low', label: '저품질 - 10 steps' },
      { value: 'medium', label: '중품질 - 15 steps' },
      { value: 'high', label: '고품질 - 25 steps' }
    ],
    sizes: [
      { value: '512x768', label: '512x768 (초저가 세로)' },
      { value: '768x512', label: '768x512 (초저가 가로)' },
      { value: '1024x1024', label: '1024x1024 (정사각형)' },
      { value: '1024x1536', label: '1024x1536 (세로형)' },
      { value: '1536x1024', label: '1536x1024 (가로형)' }
    ]
  },
  gemini: {
    styles: [
      { value: 'photographic', label: '실사/사진' },
      { value: 'illustration', label: '일러스트' },
      { value: 'minimalist', label: '미니멀' },
      { value: 'natural', label: '자연스러운' }
    ],
    qualities: [
      { value: 'high', label: '고품질 (고정)' }
    ],
    sizes: [
      { value: '1024x1024', label: '1024x1024 (정사각형만)' }
    ]
  }
} as const;