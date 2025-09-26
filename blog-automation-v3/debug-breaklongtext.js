// 디버깅용 breakLongText 함수
function debugBreakLongText(text) {
    const plainText = text.replace(/\*\*([^*]+)\*\*/g, '$1');
    
    console.log('=== 디버깅 정보 ===');
    console.log('텍스트 길이:', plainText.length);
    console.log('첫 30자:', plainText.substring(0, 30));
    
    // 15-28자 구간의 각 문자 확인
    console.log('\n=== 15-28자 구간 분석 ===');
    for (let i = 15; i <= Math.min(28, plainText.length - 3); i++) {
        const char = plainText[i];
        console.log(`위치 ${i}: "${char}" (${char.charCodeAt(0)})`);
        if (char === '.') {
            console.log(`  -> 마침표 발견! 위치: ${i}`);
        }
        if (char === ',') {
            console.log(`  -> 쉼표 발견! 위치: ${i}`);
        }
    }
    
    // 마침표 위치 찾기
    console.log('\n=== 모든 마침표 위치 ===');
    for (let i = 0; i < plainText.length; i++) {
        if (plainText[i] === '.') {
            console.log(`마침표 위치: ${i}, 앞뒤 텍스트: "${plainText.substring(Math.max(0, i-5), i+6)}"`);
        }
    }
    
    return plainText;
}

// 사용자 예제 테스트
const testText = '투자자들 사이에서 테슬라 주가 상승에 대한 관심이 뜨겁습니다. 최근 분석에 따르면 테슬라의 혁신적인 기술력과 지속가능한 에너지 솔루션에 대한 시장의 기대감이 주가 상승의 주요 동력으로 작용하고 있습니다.';

debugBreakLongText(testText);