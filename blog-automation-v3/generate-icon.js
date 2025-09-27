const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const svgPath = path.join(__dirname, 'assets', 'icon.svg');
  const assetsDir = path.join(__dirname, 'assets');

  console.log('🎨 아이콘 생성 시작...');

  try {
    // SVG에서 다양한 크기의 PNG 생성
    const sizes = [16, 32, 48, 64, 128, 256];
    const pngBuffers = [];

    for (const size of sizes) {
      console.log(`📐 ${size}x${size} PNG 생성 중...`);
      const pngBuffer = await sharp(svgPath)
        .resize(size, size)
        .png()
        .toBuffer();

      pngBuffers.push(pngBuffer);

      // 개별 PNG 파일도 저장
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(path.join(assetsDir, `icon-${size}.png`));
    }

    // ICO 파일 생성
    console.log('🔄 ICO 파일 생성 중...');
    const icoBuffer = await toIco(pngBuffers);
    fs.writeFileSync(path.join(assetsDir, 'icon.ico'), icoBuffer);

    // 512x512 PNG 파일도 생성 (macOS용)
    console.log('📱 512x512 PNG 생성 중...');
    await sharp(svgPath)
      .resize(512, 512)
      .png()
      .toFile(path.join(assetsDir, 'icon-512.png'));

    console.log('✅ 아이콘 생성 완료!');
    console.log('📁 생성된 파일들:');
    console.log('   - icon.ico (Windows)');
    console.log('   - icon-16.png ~ icon-256.png');
    console.log('   - icon-512.png (macOS)');

  } catch (error) {
    console.error('❌ 아이콘 생성 실패:', error);
  }
}

generateIcons();