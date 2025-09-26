// 개선된 breakLongText 함수 테스트
function breakLongText(text) {
    // 마크다운 제거하여 실제 텍스트 길이 계산
    const plainText = text.replace(/\*\*([^*]+)\*\*/g, '$1');
    
    if (plainText.length <= 28) {
        return [text];
    }
    
    // 15-35자 구간에서 자를 위치 찾기 (범위 확장)
    let cutPosition = -1;
    
    // 1순위: 마침표 (15-35자 구간)
    for (let i = 15; i <= Math.min(35, plainText.length - 1); i++) {
        if (plainText[i] === '.') {
            cutPosition = i + 1;
            break;
        }
    }
    
    // 2순위: 쉼표 (15-35자 구간)
    if (cutPosition === -1) {
        for (let i = 15; i <= Math.min(35, plainText.length - 1); i++) {
            if (plainText[i] === ',') {
                cutPosition = i + 1;
                break;
            }
        }
    }
    
    // 3순위: 접속사 (15-32자 구간)
    if (cutPosition === -1) {
        const conjunctions = ['그리고', '하지만', '또한', '따라서', '그런데', '그러나', '그래서', '또는', '그러면', '그럼', '이제', '이때'];
        for (let i = 15; i <= Math.min(32, plainText.length - 3); i++) {
            const remaining = plainText.substring(i);
            for (const conj of conjunctions) {
                if (remaining.startsWith(conj)) {
                    cutPosition = i;
                    break;
                }
            }
            if (cutPosition !== -1) break;
        }
    }
    
    // 4순위: 공백 (20-30자 구간에서 뒤에서부터 찾기)
    if (cutPosition === -1) {
        for (let i = Math.min(30, plainText.length - 1); i >= 20; i--) {
            if (plainText[i] === ' ') {
                cutPosition = i;
                break;
            }
        }
    }
    
    // 5순위: 강제로 28자에서 자르기
    if (cutPosition === -1) {
        cutPosition = 28;
    }
    
    if (cutPosition !== -1) {
        // 원본 텍스트에서 실제 자를 위치 찾기 (마크다운 고려)
        let realCutPosition = 0;
        let plainCount = 0;
        let i = 0;
        
        while (i < text.length && plainCount < cutPosition) {
            if (text.substring(i, i + 2) === '**') {
                // ** 태그는 건너뛰기
                realCutPosition = i + 2;
                i += 2;
            } else {
                // 일반 문자는 카운트
                plainCount++;
                realCutPosition = i + 1;
                i++;
            }
        }
        
        const firstPart = text.substring(0, realCutPosition).trim();
        const secondPart = text.substring(realCutPosition).trim();
        
        console.log(`Breaking at position ${cutPosition}: "${firstPart}" | "${secondPart}"`);
        
        // 재귀적으로 두 번째 부분도 처리
        const restParts = breakLongText(secondPart);
        
        return [firstPart, ...restParts];
    } else {
        return [text];
    }
}

// 사용자 예제 테스트
const testText = '투자자들 사이에서 테슬라 주가 상승에 대한 관심이 뜨겁습니다. 최근 분석에 따르면 테슬라의 혁신적인 기술력과 지속가능한 에너지 솔루션에 대한 시장의 기대감이 주가 상승의 주요 동력으로 작용하고 있습니다.';

console.log('=== 개선된 breakLongText 테스트 ===');
console.log('원본 텍스트 길이:', testText.length);
console.log();

const result = breakLongText(testText);
console.log('\n=== 최종 결과 ===');
console.log('분할된 부분 수:', result.length);
result.forEach((part, index) => {
    console.log(`Part ${index + 1} (${part.length}자): ${part}`);
});