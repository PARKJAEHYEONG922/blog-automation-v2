// 현재 breakLongText 함수 로직을 테스트
function breakLongText(text) {
    // 마크다운 제거하여 실제 텍스트 길이 계산
    const plainText = text.replace(/\*\*([^*]+)\*\*/g, '$1');
    
    console.log('Original text:', text);
    console.log('Plain text:', plainText);
    console.log('Plain text length:', plainText.length);
    
    if (plainText.length <= 28) {
        return [text];
    }
    
    // 15-28자 구간에서 자를 위치 찾기
    let cutPosition = -1;
    
    // 1순위: 마침표
    for (let i = 15; i <= Math.min(28, plainText.length - 3); i++) {
        if (plainText[i] === '.') {
            cutPosition = i + 1;
            break;
        }
    }
    
    // 2순위: 쉼표
    if (cutPosition === -1) {
        for (let i = 15; i <= Math.min(28, plainText.length - 3); i++) {
            if (plainText[i] === ',') {
                cutPosition = i + 1;
                break;
            }
        }
    }
    
    // 3순위: 접속사
    if (cutPosition === -1) {
        const conjunctions = ['그리고', '하지만', '또한', '따라서', '그런데', '그러나', '그래서', '또는', '그러면', '그럼', '이제', '이때'];
        for (let i = 15; i <= Math.min(28, plainText.length - 3); i++) {
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
    
    console.log('Cut position found:', cutPosition);
    
    if (cutPosition !== -1) {
        // 원본 텍스트에서 실제 자를 위치 찾기
        let realCutPosition = 0;
        let plainCount = 0;
        let i = 0;
        
        while (i < text.length && plainCount < cutPosition) {
            if (text.substring(i, i + 2) === '**') {
                realCutPosition = i + 2;
                i += 2;
            } else {
                plainCount++;
                realCutPosition = i + 1;
                i++;
            }
        }
        
        const firstPart = text.substring(0, realCutPosition).trim();
        const secondPart = text.substring(realCutPosition).trim();
        
        console.log('First part:', firstPart);
        console.log('Second part:', secondPart);
        
        // 재귀적으로 두 번째 부분도 처리
        const restParts = breakLongText(secondPart);
        
        return [firstPart, ...restParts];
    } else {
        console.log('No cut position found, returning original text');
        return [text];
    }
}

// 사용자 예제 테스트
const testText = '투자자들 사이에서 테슬라 주가 상승에 대한 관심이 뜨겁습니다. 최근 분석에 따르면 테슬라의 혁신적인 기술력과 지속가능한 에너지 솔루션에 대한 시장의 기대감이 주가 상승의 주요 동력으로 작용하고 있습니다.';

console.log('=== Testing breakLongText ===');
const result = breakLongText(testText);
console.log('Result array length:', result.length);
result.forEach((part, index) => {
    console.log(`Part ${index + 1}: ${part}`);
});