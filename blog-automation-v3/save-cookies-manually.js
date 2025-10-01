// 수동으로 네이버 쿠키 저장하기
const fs = require('fs');
const path = require('path');
const os = require('os');

const COOKIE = 'NAC=nUOjBwQwH8EM; NNB=T7XRTADJ3HKWQ; NACT=1; SRT30=1759221518; SRT5=1759221518; _naver_usersession_=cvH40sLpuG+BzaaKsujuCBPQ; page_uid=jLXiQspzLi0ssgiQjZZsssssswR-071489; nid_inf=1829793267; NID_AUT=Bf9sknQVVPoek70CFZGtfQu6mEeB1QiXmS3eWkn0Ev0T28MrIHQTZJU7G+xTGtn9; NID_SES=AAABtLGu/3eQBy8mxp9awl986MxSlbqYinvYJDfGf5s6+Rxyb8zp6s+ogVJEeC0QGQ4ap08SAjvPulKV2x3SKVvvYRoj0guxOmFu8BGxGpFS3neR6e7tnrTnD+ACCSoS4webZTLJ9aVb4oBsVBkwbdwKHsZtzWUnQfxRyvTtzRyUT8lwVym6HFHmeSXpeJO5uOnmySrXkJgahT9pCsPY5vR4tlQe6dqUUkaB1PcvGP/4K8WQDft9HcOKwS4RGVq2V/Db/6a5R5aelHdeBZwtGwpkCVc78tgUKQBbk3+KVzHklUfSmutRPZ+W7LFOG6xWnuZz15jMc1KQsZgTod5ieuBkUvdsTjbPcOzIMB2Ty4aGHCM3fYS7FTMDnJv7C3W+lYUWK54WgPFMaXzN5l1Z76Zh+2eIh/mR8YmlA01R/Ho+t3D1UP7DSJz0By7Pxh3p+AVPFgMgxDYq7HNyrUEKrvYPPyNCIyIWfL+LDZu6rt96ArJaO9tLC0xVJUZxTkTZJq/9aJzV0msGBQSaREpLFDlPAKF/UW7ZvfnDW7HPmGSTtdTcQY5KSvC3ieHJ4RVvJYg4AolYoN31OZTmLOSaD7++UkY=; BUC=fI9O6c7qFe0nOykJoqm2UjOePKwYqOQ8vqz4tAkOff8=';

// AppData 경로
const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'blog-automation-v3');

// 폴더가 없으면 생성
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
  console.log('✅ AppData 폴더 생성:', userDataPath);
}

// 쿠키 저장
const cookiePath = path.join(userDataPath, 'naver_cookies.txt');
fs.writeFileSync(cookiePath, COOKIE, 'utf-8');

console.log('✅ 네이버 쿠키 저장 완료!');
console.log('📂 저장 위치:', cookiePath);
console.log('\n이제 앱에서 "🔥 실시간 추천" 버튼을 누르면');
console.log('로그인 없이 바로 트렌드를 볼 수 있습니다! 🎉');