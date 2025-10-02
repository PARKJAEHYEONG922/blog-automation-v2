# 블로그 자동화 V3 - 프로젝트 구조 가이드

## 📋 프로젝트 개요
AI 기반 블로그 자동화 도구 V3 - Step별 Feature 아키텍처

## 🏗️ 현재 프로젝트 구조

```
blog-automation-v3/src/
├── 01-setup/              # Step 1: 설정 및 콘텐츠 생성
│   ├── components/        # UI 컴포넌트들
│   ├── hooks/             # 커스텀 훅
│   │   └── useSetup.ts
│   ├── services/          # 비즈니스 로직
│   └── index.tsx
│
├── 02-generation/         # Step 2: 콘텐츠 편집 및 이미지 생성
│   ├── components/
│   ├── hooks/
│   │   └── useGeneration.ts
│   ├── services/
│   ├── types/
│   └── index.ts
│
├── 03-publish/            # Step 3: 발행
│   ├── platforms/         # 플랫폼별 UI
│   ├── services/
│   └── index.tsx
│
├── shared/                # 공통 모듈
│   ├── components/ui/
│   ├── services/
│   └── utils/
│
├── app/                   # 앱 전역
│   ├── App.tsx
│   └── WorkflowContext.tsx
│
└── main/                  # Electron
```

## 🎯 핵심 설계 원칙

1. **Step별 독립성**: 각 Step은 독립된 폴더
2. **UI와 로직 분리**: Components는 UI만, Services는 로직만
3. **Custom Hook 패턴**: 상태 관리 + 서비스 호출 통합

## 📁 Import 경로

```typescript
import { SetupContainer } from '@/01-setup';
import { GenerationContainer } from '@/02-generation';
import { PublishPlatformSection } from '@/03-publish';
import { Button } from '@/shared/components/ui';
```

## 🛠️ 새 기능 추가 시

1. Service 레이어에 비즈니스 로직 추가
2. Hook에서 서비스 사용
3. Component에서 Hook 사용
4. Container에서 조립

