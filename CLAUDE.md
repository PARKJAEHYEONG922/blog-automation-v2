# 블로그 자동화 V3 - 프로젝트 구조 가이드

## 📋 프로젝트 개요
AI 기반 블로그 자동화 도구 V3 - Feature-based Architecture 적용

## ✅ 현재 구조 (2025년 1월 기준)

```
blog-automation-v3/src/
├── app/                              # ✅ 앱 진입점
│   ├── app.tsx                      # 메인 앱 컴포넌트
│   └── index.ts                     # 앱 엔트리
│
├── features/                         # ✅ 기능별 모듈 (Feature-based Architecture)
│   ├── setup/                       # ✅ Step1 설정 기능
│   │   ├── components/
│   │   │   ├── SetupContainer.tsx           # 메인 컨테이너
│   │   │   ├── KeywordInputSection.tsx      # 키워드 입력
│   │   │   ├── DocumentUploadSection.tsx    # 문서 업로드
│   │   │   ├── TitleRecommendationSection.tsx
│   │   │   ├── ManualUploadSection.tsx
│   │   │   ├── GenerationProgressSection.tsx
│   │   │   ├── TrendContentModal.tsx        # 트렌드 분석 모달
│   │   │   ├── TrendModal.tsx
│   │   │   ├── CategorySettingsModal.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   └── SuccessModal.tsx
│   │   ├── hooks/
│   │   │   └── useSetup.ts
│   │   ├── types/
│   │   │   └── setup.types.ts
│   │   └── index.ts
│   │
│   ├── generation/                  # ✅ Step2 생성 기능
│   │   ├── components/
│   │   │   ├── GenerationContainer.tsx
│   │   │   ├── ContentEditor.tsx
│   │   │   ├── ImageGenerator.tsx
│   │   │   └── WorkSummary.tsx
│   │   ├── services/
│   │   │   └── content-processor.ts
│   │   ├── hooks/
│   │   │   ├── useContentGeneration.ts
│   │   │   └── useImageGeneration.ts
│   │   ├── types/
│   │   │   └── generation.types.ts
│   │   └── index.ts
│   │
│   ├── publishing/                  # ✅ 발행 기능 (네이버 블로그)
│   │   ├── components/
│   │   │   ├── NaverPublishUI.tsx
│   │   │   └── PublishInterface.ts
│   │   ├── services/
│   │   │   ├── naver-publisher.ts
│   │   │   └── publish-manager.ts
│   │   ├── hooks/
│   │   │   └── usePublishing.ts
│   │   ├── types/
│   │   │   └── publishing.types.ts
│   │   └── index.ts
│   │
│   └── settings/                    # ✅ 설정 관리
│       ├── components/
│       │   ├── LLMSettings.tsx      # LLM 설정
│       │   └── UpdateModal.tsx      # 자동 업데이트
│       ├── hooks/
│       │   └── useSettings.ts
│       └── index.ts
│
├── shared/                          # ✅ 공통 모듈
│   ├── components/                  # 재사용 가능한 UI 컴포넌트
│   │   ├── ui/                     # ✅ 기본 UI 컴포넌트
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── AlertDialog.tsx      # 알림 다이얼로그 (신규)
│   │   │   └── index.ts
│   │   ├── layout/                 # ✅ 레이아웃 컴포넌트
│   │   │   ├── Header.tsx
│   │   │   └── LogPanel.tsx
│   │   ├── feedback/               # ✅ 피드백 컴포넌트
│   │   │   └── ErrorMessage.tsx
│   │   └── index.ts
│   │
│   ├── services/                   # ✅ 공통 서비스
│   │   ├── llm/                    # ✅ LLM 관련 서비스
│   │   │   ├── llm-factory.ts
│   │   │   ├── clients/
│   │   │   │   ├── base-client.ts
│   │   │   │   ├── openai-client.ts
│   │   │   │   ├── claude-client.ts
│   │   │   │   ├── gemini-client.ts
│   │   │   │   ├── runware-client.ts   # 이미지 생성
│   │   │   │   └── index.ts
│   │   │   ├── types/
│   │   │   │   └── llm.types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── automation/             # ✅ 브라우저 자동화
│   │   │   ├── playwright-service.ts    # 싱글톤 서비스
│   │   │   ├── base-automation.ts       # 기본 추상 클래스
│   │   │   ├── naver-automation.ts      # 네이버 자동화
│   │   │   └── claude-web-service.ts
│   │   │
│   │   └── content/                # ✅ 콘텐츠 처리
│   │       ├── blog-crawler.ts          # 블로그 크롤링
│   │       ├── blog-prompt-service.ts   # 프롬프트 생성
│   │       ├── blog-writing-service.ts  # 글쓰기 서비스
│   │       ├── blog-trend-analyzer.ts   # 트렌드 분석
│   │       ├── naver-trend-service.ts   # 네이버 트렌드
│   │       └── image-service.ts         # 이미지 처리
│   │
│   ├── hooks/                      # ✅ 공통 훅
│   │   ├── useApi.ts
│   │   ├── useAsync.ts
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useToggle.ts
│   │   └── index.ts
│   │
│   ├── utils/                      # ✅ 유틸리티 함수
│   │   ├── content-processor.ts
│   │   ├── markdown-utils.ts
│   │   ├── validation.ts
│   │   ├── constants.ts
│   │   └── index.ts
│   │
│   ├── types/                      # ✅ 공통 타입
│   │   ├── common.types.ts
│   │   ├── api.types.ts
│   │   ├── automation.types.ts
│   │   ├── electron.types.ts
│   │   └── index.ts
│   │
│   └── index.ts
│
├── main/                           # ✅ Electron 메인 프로세스
│   ├── index.ts                   # 메인 엔트리포인트
│   ├── preload.ts                # Preload 스크립트
│   └── services/                 # 백엔드 서비스
│       ├── file-service.ts
│       ├── browser-service.ts
│       ├── update-service.ts
│       └── index.ts
│
├── assets/                        # 정적 자원
│   └── styles/
│       └── index.css             # Tailwind CSS
│
└── renderer.tsx                  # React 렌더러 진입점
```

## 🎯 주요 기능 및 아키텍처

### 1. Feature-based Architecture
- **setup**: 키워드 입력, 트렌드 분석, 제목 생성
- **generation**: 콘텐츠 생성, 이미지 생성, 편집
- **publishing**: 네이버 블로그 발행
- **settings**: LLM 설정, 자동 업데이트

### 2. PlaywrightService (싱글톤)
```
PlaywrightService (싱글톤)
  ↓
├─ 네이버 트렌드 로그인
├─ 네이버 블로그 발행
├─ 티스토리 발행 (예정)
├─ 구글 블로그 발행 (예정)
└─ 워드프레스 발행 (예정)
```
- Chrome → Edge → Whale 순서로 시스템 브라우저 자동 탐지
- 브라우저 하나로 모든 자동화 작업 수행

### 3. LLM 클라이언트 팩토리 패턴
```
LLMClientFactory
  ↓
├─ OpenAI (GPT-4, GPT-3.5)
├─ Claude (Claude 3.5 Sonnet)
├─ Gemini (Gemini 1.5 Pro)
└─ Runware (이미지 생성)
```

### 4. 트렌드 분석 시스템
- 네이버 블로그 크롤링 (3개 선택)
- AI 기반 제목/키워드/방향성 추천
- 크롤링 데이터 캐싱으로 제목 재생성

## 🛠️ 개발 가이드라인

### 컴포넌트 작성 규칙
1. **기능별 컴포넌트**: 각 feature 내에서만 사용
2. **공통 컴포넌트**: 여러 feature에서 재사용 → `shared/components/`
3. **Props 타입**: 동일 파일 내 정의
4. **스타일링**: Tailwind CSS + 공통 `Button` 컴포넌트

### 서비스 레이어 규칙
1. **단일 책임 원칙**: 하나의 명확한 책임
2. **타입 안전성**: TypeScript 적극 활용
3. **에러 핸들링**: 일관된 구조
4. **싱글톤 패턴**: PlaywrightService 등

### 상태 관리
1. **로컬 상태**: React useState/useReducer
2. **localStorage**: 말투 선택, 문서 저장
3. **캐싱**: 트렌드 분석 결과 (제목 재생성용)

### 프롬프트 작성 규칙 (트렌드 분석)
1. 제목 길이: 30-40자 (네이버 최적화)
2. 검색 의도 파악: 정보성/방법성/비교성
3. 구체적 숫자 활용: "5가지", "2025년" 등
4. **이모티콘 사용 금지**

## 📋 완료된 마이그레이션

### ✅ 우선순위 1 (핵심 인프라)
- [x] Button 컴포넌트 생성
- [x] AlertDialog 컴포넌트 생성
- [x] LLM 클라이언트 분리 (OpenAI, Claude, Gemini, Runware)
- [x] 공통 타입 정의 및 barrel export

### ✅ 우선순위 2 (기능 분리)
- [x] Step1Setup → features/setup
- [x] Step2Generation → features/generation
- [x] Publishing → features/publishing
- [x] Settings → features/settings

### ✅ 우선순위 3 (서비스)
- [x] PlaywrightService 싱글톤 구현
- [x] LLM Factory 패턴
- [x] 트렌드 분석 시스템
- [x] 공통 훅 및 유틸리티

## 🚀 개선 필요 사항

### 1. 아키텍처 개선
- [ ] **storage 서비스 분리**: localStorage 로직을 서비스로 추상화
- [ ] **상태 관리 개선**: Context API 또는 Zustand 도입 검토
- [ ] **에러 바운더리**: React Error Boundary 추가

### 2. 코드 품질
- [ ] **setup-service.ts 추가**: SetupContainer 로직 분리
- [ ] **settings-service.ts 추가**: 설정 관련 로직 분리
- [ ] **테스트 코드**: 단위 테스트 및 E2E 테스트

### 3. 발행 기능 확장
- [ ] **TistoryPublisher**: 티스토리 발행 (BaseBrowserAutomation 상속)
- [ ] **GoogleBlogPublisher**: 구글 블로그 발행
- [ ] **WordPressPublisher**: 워드프레스 발행

### 4. UX 개선
- [ ] **진행 상태 표시**: 더 명확한 로딩/진행 상태
- [ ] **에러 메시지 개선**: 사용자 친화적 에러 안내
- [ ] **온보딩**: 첫 사용자를 위한 가이드

### 5. 성능 최적화
- [ ] **코드 스플리팅**: React.lazy() 활용
- [ ] **메모이제이션**: useMemo, useCallback 최적화
- [ ] **번들 사이즈 분석**: Webpack Bundle Analyzer

## 📚 기술 스택
- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Desktop**: Electron 28
- **Automation**: Playwright
- **LLM**: OpenAI, Claude, Gemini
- **Image**: Runware AI

## 🔍 주요 패턴
1. **Feature-based Architecture**: 기능별 모듈화
2. **Singleton Pattern**: PlaywrightService
3. **Factory Pattern**: LLMClientFactory
4. **Abstract Class**: BaseBrowserAutomation
5. **Barrel Exports**: index.ts 활용
