const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

module.exports = async function(context) {
  console.log('🔧 AfterPack: Playwright 브라우저 설정 시작...');
  
  try {
    const appDir = context.appOutDir;
    const playwrightDir = path.join(appDir, 'resources', 'app.asar.unpacked', 'node_modules', 'playwright');
    
    console.log('📁 앱 디렉토리:', appDir);
    console.log('📁 Playwright 디렉토리:', playwrightDir);
    
    if (fs.existsSync(playwrightDir)) {
      console.log('✅ Playwright 모듈 포함됨');
      
      // Playwright 브라우저 다운로드 (chromium만)
      try {
        process.chdir(playwrightDir);
        console.log('🌐 Chromium 브라우저 다운로드 중...');
        execSync('npx playwright install chromium', { stdio: 'inherit' });
        console.log('✅ Chromium 브라우저 다운로드 완료');
      } catch (error) {
        console.warn('⚠️ Playwright 브라우저 다운로드 실패 (런타임에 시스템 브라우저 사용):', error.message);
      }
    } else {
      console.warn('⚠️ Playwright 모듈이 포함되지 않음');
    }
    
    console.log('✅ AfterPack 완료');
  } catch (error) {
    console.error('❌ AfterPack 실패:', error);
    // 빌드를 중단하지 않고 경고만 출력
  }
};