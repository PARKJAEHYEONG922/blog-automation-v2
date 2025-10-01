// 저장된 쿠키로 API 테스트
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 저장된 쿠키 읽기
const cookiePath = path.join(os.homedir(), 'AppData', 'Roaming', 'Electron', 'naver_cookies.txt');

if (!fs.existsSync(cookiePath)) {
  console.error('❌ 쿠키 파일이 없습니다:', cookiePath);
  process.exit(1);
}

const cookies = fs.readFileSync(cookiePath, 'utf-8');
console.log('📂 쿠키 로드:', cookies.substring(0, 100) + '...\n');

// 어제 날짜
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const dateStr = yesterday.toISOString().split('T')[0];

const categories = encodeURIComponent('IT·컴퓨터');
const url = `https://creator-advisor.naver.com/api/v6/trend/category?categories=${categories}&contentType=text&date=${dateStr}&hasRankChange=true&interval=day&limit=20&service=naver_blog`;

console.log('🔥 API 호출 테스트');
console.log('URL:', url);
console.log('');

const options = {
  headers: {
    'accept': 'application/json',
    'accept-language': 'ko-KR,ko;q=0.9',
    'cookie': cookies,
    'referer': 'https://creator-advisor.naver.com/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
};

https.get(url, options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('📥 응답 상태:', res.statusCode);

    if (res.statusCode === 200) {
      const json = JSON.parse(data);
      console.log('✅ 성공!\n');

      if (json.data) {
        json.data.forEach((category) => {
          console.log(`📂 카테고리: ${category.category}`);

          if (category.queryList && category.queryList.length > 0) {
            category.queryList.slice(0, 10).forEach((item, idx) => {
              console.log(`  ${idx + 1}. ${item.query || item.keyword || item.title}`);
            });
          } else {
            console.log('  (데이터 없음)');
          }
          console.log('');
        });
      }
    } else if (res.statusCode === 401) {
      console.error('❌ 인증 실패 (401) - 쿠키가 만료되었거나 유효하지 않습니다');
    } else {
      console.error('❌ 실패:', data);
    }
  });
}).on('error', (e) => console.error('오류:', e.message));