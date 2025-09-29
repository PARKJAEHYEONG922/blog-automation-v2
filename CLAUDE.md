# 블로그 자동화 V3 - 프로젝트 구조 가이드

## 📋 프로젝트 개요
AI 기반 블로그 자동화 도구 V3 - Feature-based Architecture 적용

## 🏗️ 목표 아키텍처 구조

```
blog-automation-v3/src/
├── app/                           # 앱 진입점 및 라우팅
│   ├── App.tsx                   # 메인 앱 컴포넌트
│   ├── AppProvider.tsx           # 전역 상태 및 컨텍스트
│   └── hooks/                    # 앱 수준 커스텀 훅
│       ├── useAppState.ts
│       └── useUpdateCheck.ts
│
├── features/                      # 기능별 모듈 (Feature-based Architecture)
│   ├── setup/                    # Step1 설정 기능
│   │   ├── components/
│   │   │   ├── SetupContainer.tsx
│   │   │   ├── KeywordInput.tsx
│   │   │   ├── DocumentUpload.tsx
│   │   │   ├── TitleRecommendation.tsx
│   │   │   └── ManualUpload.tsx
│   │   ├── services/
│   │   │   └── setup-service.ts
│   │   ├── hooks/
│   │   │   └── useSetup.ts
│   │   └── types/
│   │       └── setup.types.ts
│   │
│   ├── generation/               # Step2 생성 기능
│   │   ├── components/
│   │   │   ├── GenerationContainer.tsx
│   │   │   ├── ContentEditor.tsx
│   │   │   ├── ImageGenerator.tsx
│   │   │   └── WorkSummary.tsx
│   │   ├── services/
│   │   │   ├── content-service.ts
│   │   │   └── content-processor.ts
│   │   ├── hooks/
│   │   │   ├── useContentGeneration.ts
│   │   │   └── useImageGeneration.ts
│   │   └── types/
│   │       └── generation.types.ts
│   │
│   ├── publishing/               # 발행 기능
│   │   ├── components/
│   │   │   ├── PublishContainer.tsx
│   │   │   ├── NaverPublishForm.tsx
│   │   │   └── TistoryPublishForm.tsx
│   │   ├── services/
│   │   │   ├── publishers/
│   │   │   │   ├── naver-publisher.ts
│   │   │   │   ├── tistory-publisher.ts
│   │   │   │   └── base-publisher.ts
│   │   │   └── publish-manager.ts
│   │   ├── hooks/
│   │   │   └── usePublishing.ts
│   │   └── types/
│   │       └── publishing.types.ts
│   │
│   └── settings/                 # 설정 관리
│       ├── components/
│       │   ├── LLMSettings.tsx
│       │   └── UpdateModal.tsx
│       ├── services/
│       │   └── settings-service.ts
│       └── hooks/
│           └── useSettings.ts
│
├── shared/                       # 공통 모듈
│   ├── components/              # 재사용 가능한 UI 컴포넌트
│   │   ├── ui/                  # 기본 UI 컴포넌트
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── index.ts
│   │   ├── layout/              # 레이아웃 컴포넌트
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── LogPanel.tsx
│   │   └── feedback/            # 피드백 컴포넌트
│   │       ├── LoadingSpinner.tsx
│   │       └── ErrorMessage.tsx
│   │
│   ├── services/               # 공통 서비스
│   │   ├── llm/                # LLM 관련 서비스
│   │   │   ├── llm-factory.ts
│   │   │   ├── clients/
│   │   │   │   ├── openai-client.ts
│   │   │   │   ├── claude-client.ts
│   │   │   │   ├── gemini-client.ts
│   │   │   │   ├── runware-client.ts
│   │   │   │   └── base-client.ts
│   │   │   └── types/
│   │   │       └── llm.types.ts
│   │   │
│   │   ├── automation/         # 브라우저 자동화
│   │   │   ├── playwright-service.ts
│   │   │   ├── claude-web-service.ts
│   │   │   └── base-automation.ts
│   │   │
│   │   ├── content/            # 콘텐츠 처리
│   │   │   ├── blog-crawler.ts
│   │   │   ├── blog-prompt-service.ts
│   │   │   ├── blog-writing-service.ts
│   │   │   └── image-service.ts
│   │   │
│   │   └── storage/            # 데이터 저장
│   │       └── storage-service.ts
│   │
│   ├── hooks/                  # 공통 훅
│   │   ├── useApi.ts
│   │   ├── useAsync.ts
│   │   └── useDebounce.ts
│   │
│   ├── utils/                  # 유틸리티 함수
│   │   ├── content-processor.ts
│   │   ├── markdown-utils.ts
│   │   ├── validation.ts
│   │   └── constants.ts
│   │
│   └── types/                  # 공통 타입
│       ├── index.ts            # 타입 재내보내기
│       ├── common.types.ts
│       ├── api.types.ts
│       └── electron.types.ts
│
├── assets/                     # 정적 자원
│   ├── images/
│   ├── icons/
│   └── styles/
│       ├── globals.css
│       └── tailwind.css
│
└── main/                      # Electron 메인 프로세스
    ├── index.ts              # 메인 엔트리포인트
    ├── preload.ts           # Preload 스크립트
    └── services/            # 백엔드 서비스들
        ├── file-service.ts
        ├── browser-service.ts
        └── update-service.ts
```

## 🔄 마이그레이션 계획

### 1단계: 공통 컴포넌트 생성
- [ ] `shared/components/ui/Button.tsx` - 공통 버튼 컴포넌트 생성
- [ ] `shared/components/ui/Modal.tsx` - 모달 컴포넌트 생성
- [ ] `shared/components/ui/Input.tsx` - 입력 컴포넌트 생성
- [ ] `shared/components/ui/LoadingSpinner.tsx` - 로딩 스피너 생성
- [ ] `shared/components/layout/Header.tsx` - 헤더 컴포넌트 분리
- [ ] `shared/components/layout/LogPanel.tsx` - 로그 패널 이동

### 2단계: LLM 서비스 분리
- [ ] `shared/services/llm/llm-factory.ts` - 현재 `llm-client-factory.ts`에서 이동
- [ ] `shared/services/llm/clients/openai-client.ts` - OpenAI 클라이언트 분리
- [ ] `shared/services/llm/clients/claude-client.ts` - Claude 클라이언트 분리
- [ ] `shared/services/llm/clients/gemini-client.ts` - Gemini 클라이언트 분리
- [ ] `shared/services/llm/clients/runware-client.ts` - Runware 클라이언트 분리
- [ ] `shared/services/llm/clients/base-client.ts` - 추상 클래스 분리
- [ ] `shared/services/llm/types/llm.types.ts` - LLM 관련 타입 정의

### 3단계: 서비스 레이어 정리
- [ ] `shared/services/automation/` - 자동화 서비스들 이동
- [ ] `shared/services/content/` - 콘텐츠 관련 서비스들 이동
- [ ] `shared/services/storage/storage-service.ts` - 데이터 저장 서비스 생성

### 4단계: 기능별 모듈 생성
- [ ] `features/setup/` - Step1 관련 모든 코드 이동
  - [ ] `SetupContainer.tsx` - 현재 `Step1Setup/index.tsx` 리팩토링
  - [ ] 개별 컴포넌트들 분리 및 이동
  - [ ] 설정 관련 서비스 및 훅 생성
- [ ] `features/generation/` - Step2 관련 모든 코드 이동
  - [ ] `GenerationContainer.tsx` - 현재 `Step2Generation/index.tsx` 리팩토링
  - [ ] 콘텐츠 생성 관련 서비스 및 훅 생성
- [ ] `features/publishing/` - 발행 관련 코드 이동 및 확장
  - [ ] 현재 `publishers/` 코드들 이동
  - [ ] Tistory 발행 기능 추가 준비
- [ ] `features/settings/` - 설정 관련 코드 이동
  - [ ] `LLMSettings.tsx`, `UpdateModal.tsx` 이동

### 5단계: 타입 시스템 정리
- [ ] `shared/types/` - 공통 타입들 정리
- [ ] 각 기능별 타입 정의 파일 생성
- [ ] 기존 `types/` 폴더의 코드들 적절히 분산

### 6단계: 앱 레벨 리팩토링
- [ ] `app/App.tsx` - 메인 앱 컴포넌트 간소화
- [ ] `app/AppProvider.tsx` - 전역 상태 관리 분리
- [ ] 앱 수준 커스텀 훅들 생성

## 🎯 현재 파일 매핑

### 기존 → 새 구조 매핑
```
현재 구조                                → 목표 구조
─────────────────────────────────────────────────────────────────
src/App.tsx                             → app/App.tsx
src/components/Step1Setup/              → features/setup/components/
src/components/Step2Generation/         → features/generation/components/
src/components/publishers/              → features/publishing/components/
src/components/LLMSettings.tsx          → features/settings/components/
src/components/UpdateModal.tsx          → features/settings/components/
src/components/LogPanel.tsx             → shared/components/layout/
src/services/llm-client-factory.ts      → shared/services/llm/llm-factory.ts
src/services/automation/                → shared/services/automation/
src/services/publishers/                → features/publishing/services/
src/services/blog-*.ts                  → shared/services/content/
src/services/playwright-service.ts      → shared/services/automation/
src/services/claude-web-service.ts      → shared/services/automation/
src/services/image-service.ts           → shared/services/content/
src/types/                              → shared/types/ + 각 feature별 types/
```

## 🛠️ 개발 가이드라인

### 컴포넌트 작성 규칙
1. **기능별 컴포넌트**: 각 feature 내에서만 사용되는 컴포넌트
2. **공통 컴포넌트**: 여러 feature에서 재사용되는 컴포넌트는 `shared/components/`에 배치
3. **Props 인터페이스**: 각 컴포넌트별 Props 타입을 동일 파일 내에 정의
4. **스타일링**: Tailwind CSS 사용, 공통 버튼은 `Button` 컴포넌트 활용

### 서비스 레이어 규칙
1. **단일 책임 원칙**: 각 서비스는 하나의 명확한 책임을 가짐
2. **의존성 주입**: 서비스 간 의존성은 인터페이스를 통해 주입
3. **에러 핸들링**: 모든 서비스는 일관된 에러 핸들링 구조 사용
4. **타입 안전성**: TypeScript 타입을 적극 활용

### 훅 작성 규칙
1. **비즈니스 로직 캡슐화**: UI 로직과 비즈니스 로직 분리
2. **재사용성**: 공통으로 사용되는 로직은 `shared/hooks/`에 배치
3. **상태 관리**: 각 feature별 상태는 해당 feature의 hooks에서 관리

### 타입 정의 규칙
1. **네이밍**: PascalCase 사용 (예: `SetupData`, `GenerationOptions`)
2. **구조화**: 관련된 타입들은 동일한 네임스페이스에 그룹화
3. **내보내기**: `index.ts`를 통한 barrel export 패턴 사용

## 📝 마이그레이션 체크리스트

### 우선순위 1 (핵심 인프라)
- [ ] Button 컴포넌트 생성 및 기존 버튼들 대체
- [ ] LLM 클라이언트 분리 및 팩토리 패턴 개선
- [ ] 공통 타입 정의 및 barrel export 설정

### 우선순위 2 (기능 분리)
- [ ] Step1Setup → features/setup 이동
- [ ] Step2Generation → features/generation 이동
- [ ] Publishing → features/publishing 이동

### 우선순위 3 (최적화)
- [ ] 앱 레벨 상태 관리 개선
- [ ] 공통 훅 및 유틸리티 정리
- [ ] 성능 최적화 및 코드 정리

## 🔍 테스트 전략
1. **컴포넌트별 단위 테스트**
2. **서비스 레이어 통합 테스트**
3. **E2E 테스트 시나리오 정의**

## 📚 참고사항
- **Tailwind CSS**: 스타일링 시스템
- **TypeScript**: 타입 안전성 보장
- **React Hooks**: 상태 관리 및 사이드 이펙트 처리
- **Electron**: 데스크톱 앱 플랫폼