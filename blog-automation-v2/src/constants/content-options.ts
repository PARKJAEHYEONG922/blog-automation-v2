export interface DropdownOption {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  guidelines?: {
    approach: string;
    structure: string;
    keywords: string[];
    focus_areas: string[];
  };
  toneGuidelines?: {
    style: string;
    examples: string[];
    ending: string;
    sentence_style: string;
    key_features: string[];
  };
  reviewGuidelines?: {
    key_points: string[];
    transparency: string;
  };
}

export const contentTypes: DropdownOption[] = [
  { 
    id: 'info', 
    name: '정보/가이드형', 
    icon: '📚', 
    description: '정확한 정보를 체계적으로 제공하여 궁금증 해결',
    guidelines: {
      approach: "정확하고 풍부한 정보를 체계적으로 제공하여 검색자의 궁금증 완전 해결",
      structure: "문제 정의 → 해결책 제시 → 단계별 가이드 → 주의사항 → 마무리",
      keywords: ["완벽 정리", "총정리", "핵심 포인트", "단계별 가이드", "정확한 정보"],
      focus_areas: ["체계적 구조와 소제목", "실용적 가이드 제공", "구체적 실행 방법"]
    }
  },
  { 
    id: 'review', 
    name: '후기/리뷰형', 
    icon: '⭐', 
    description: '개인 경험과 솔직한 후기로 유일무이한 콘텐츠 작성',
    guidelines: {
      approach: "개인 경험과 솔직한 후기를 중심으로 '유일무이한 콘텐츠' 작성",
      structure: "사용 전 고민 → 직접 사용 경험 → 장단점 솔직 후기 → 최종 평가 및 추천",
      keywords: ["직접 써봤어요", "솔직 후기", "개인적으로", "실제로 사용해보니", "추천하는 이유"],
      focus_areas: ["개인 경험과 솔직한 후기", "장단점 균형 제시", "구체적 사용 데이터"]
    }
  },
  { 
    id: 'compare', 
    name: '비교/추천형', 
    icon: '⚖️', 
    description: '체계적 비교분석으로 독자의 선택 고민 해결',
    guidelines: {
      approach: "체계적 비교분석으로 독자의 선택 고민을 완전히 해결",
      structure: "비교 기준 제시 → 각 옵션 분석 → 장단점 비교 → 상황별 추천 → 최종 결론",
      keywords: ["VS 비교", "Best 5", "장단점", "상황별 추천", "가성비"],
      focus_areas: ["객관적 비교 기준", "상황별 맞춤 추천", "명확한 선택 가이드"]
    }
  },
  { 
    id: 'howto', 
    name: '노하우형', 
    icon: '🛠️', 
    description: '실용적 방법론과 단계별 가이드 제공',
    guidelines: {
      approach: "실용적 방법론과 단계별 가이드 제공으로 실행 가능한 솔루션 제시",
      structure: "목표 설정 → 준비사항 → 단계별 실행 → 팁과 주의사항 → 결과 확인",
      keywords: ["노하우", "방법", "단계별", "팁", "실전 가이드"],
      focus_areas: ["실행 가능한 구체적 방법", "단계별 상세 설명", "실무 팁과 주의사항"]
    }
  }
];

export const reviewTypes: DropdownOption[] = [
  { 
    id: 'self-purchase', 
    name: '내돈내산 후기', 
    icon: '💳', 
    description: '직접 구매해서 써본 솔직한 개인 후기',
    reviewGuidelines: {
      key_points: [
        "💰 '직접 구매해서 써본 후기'임을 자연스럽게 언급",
        "구매하게 된 이유와 고민했던 점들을 솔직하게 표현",
        "실제 사용해보면서 느낀 장점과 아쉬운 점 균형있게 서술",
        "가성비에 대한 개인적 평가와 추천 여부",
        "비슷한 제품과 비교했을 때의 차이점",
        "재구매 의향이나 지인 추천 의향 포함"
      ],
      transparency: "개인 구매로 편견 없는 솔직한 후기임을 강조"
    }
  },
  { 
    id: 'sponsored', 
    name: '협찬 후기', 
    icon: '🤝', 
    description: '브랜드에서 제공받은 제품의 정직한 리뷰',
    reviewGuidelines: {
      key_points: [
        "🤝 '브랜드로부터 제품을 제공받아 작성한 후기'임을 자연스럽게 언급",
        "협찬이지만 솔직하고 공정한 평가를 하겠다는 의지 표현",
        "제품의 장점과 아쉬운 점을 균형있게 서술하는 구조",
        "독자 입장에서 객관적으로 평가하는 관점",
        "실제 사용 시나리오와 느낀 점들을 상세히 표현",
        "협찬 관계를 떠나 솔직한 의견 제시하는 톤"
      ],
      transparency: "협찬 제품이지만 공정하고 솔직한 리뷰 제공"
    }
  },
  { 
    id: 'experience', 
    name: '체험단 후기', 
    icon: '🎁', 
    description: '체험단 참여를 통한 제품 사용 후기',
    reviewGuidelines: {
      key_points: [
        "👥 '체험단에 참여하여 작성한 후기'임을 자연스럽게 언급",
        "체험 기회를 얻게 된 것에 대한 감사함 표현",
        "제품을 꼼꼼히 테스트해본 과정과 느낀 점 서술",
        "체험단으로서 객관적이고 공정한 평가 의지 표현",
        "일반 구매 고객 입장에서의 솔직한 의견 제시",
        "체험단 후기지만 편견 없는 균형잡힌 리뷰 작성"
      ],
      transparency: "체험단 참여 후기의 특성과 한계를 투명하게 공개"
    }
  },
  { 
    id: 'rental', 
    name: '대여/렌탈 후기', 
    icon: '📅', 
    description: '렌탈 서비스를 이용한 제품 사용 후기',
    reviewGuidelines: {
      key_points: [
        "🔄 '렌탈 서비스로 이용해본 후기'임을 자연스럽게 언급",
        "렌탈을 선택한 이유와 고민했던 점들 표현",
        "렌탈 서비스의 장점과 아쉬웠던 점 균형있게 서술",
        "렌탈과 구매의 차이점에 대한 개인적 의견",
        "경제성과 편의성 측면에서의 평가",
        "어떤 상황에 렌탈이 적합할지에 대한 의견 제시"
      ],
      transparency: "렌탈 서비스 특성상 제한적 사용 후기임을 명확히 안내"
    }
  }
];

export const tones: DropdownOption[] = [
  { 
    id: 'formal', 
    name: '정중한 존댓말', 
    icon: '🎩', 
    description: '사용해보았습니다, 추천드립니다 (신뢰감 조성)',
    toneGuidelines: {
      style: "정중하고 예의 바른 존댓말로 신뢰감 조성",
      examples: ["사용해보았습니다", "추천드립니다", "도움이 되시길 바랍니다", "참고하시기 바랍니다"],
      ending: "도움이 되셨으면 좋겠습니다.",
      sentence_style: "완성도 높은 정중한 문장",
      key_features: ["전문성과 신뢰감", "체계적 정보 전달", "예의 바른 표현"]
    }
  },
  { 
    id: 'casual', 
    name: '친근한 반말', 
    icon: '😊', 
    description: '써봤는데 진짜 좋더라, 완전 강추! (편안하고 친근한)',
    toneGuidelines: {
      style: "친구와 대화하듯 편안하고 친근한 말투",
      examples: ["써봤는데 진짜 좋더라~", "완전 강추!", "솔직히 말하면", "이거 진짜 대박이야"],
      ending: "댓글로 궁금한 거 물어봐!",
      sentence_style: "짧고 리드미컬한 문장",
      key_features: ["감탄사와 줄임말 활용", "개인적 경험 많이 포함", "유머와 재미 요소"]
    }
  },
  { 
    id: 'friendly', 
    name: '친근한 존댓말', 
    icon: '🤝', 
    description: '써봤는데 좋더라구요, 도움이 될 것 같아요 (따뜻한 느낌)',
    toneGuidelines: {
      style: "친근하고 부드러운 존댓말로 따뜻한 느낌",
      examples: ["궁금해서 찾아봤어요", "써봤는데 좋더라구요", "이런 게 있더라구요", "도움이 될 것 같아요"],
      ending: "도움이 되셨으면 좋겠어요~",
      sentence_style: "부드럽고 따뜻한 존댓말 문장",
      key_features: ["부드러운 존댓말", "따뜻하고 친근한 어조", "자연스러운 개인 경험"]
    }
  }
];

export const platforms: DropdownOption[] = [
  { id: 'naver', name: '네이버 블로그', icon: '🟢' },
  { id: 'tistory', name: '티스토리', icon: '📝' },
  { id: 'blogspot', name: '블로그스팟', icon: '🌐' },
  { id: 'wordpress', name: '워드프레스', icon: '📰' }
];

// 유틸리티 함수들
export const getContentTypeName = (id: string) => contentTypes.find(c => c.id === id)?.name || id;
export const getContentTypeDescription = (id: string) => contentTypes.find(c => c.id === id)?.description || '';
export const getContentTypeGuidelines = (id: string) => contentTypes.find(c => c.id === id)?.guidelines;
export const getReviewTypeName = (id: string) => reviewTypes.find(r => r.id === id)?.name || id;
export const getReviewTypeDescription = (id: string) => reviewTypes.find(r => r.id === id)?.description || '';
export const getReviewTypeGuidelines = (id: string) => reviewTypes.find(r => r.id === id)?.reviewGuidelines;
export const getToneName = (id: string) => tones.find(t => t.id === id)?.name || id;
export const getToneDescription = (id: string) => tones.find(t => t.id === id)?.description || '';
export const getToneGuidelines = (id: string) => tones.find(t => t.id === id)?.toneGuidelines;
export const getPlatformName = (id: string) => platforms.find(p => p.id === id)?.name || id;