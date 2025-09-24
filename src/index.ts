import { app, BrowserWindow, ipcMain, shell, clipboard, nativeImage, Menu, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
const YTDlpWrap = require('yt-dlp-wrap').default;
import { registerPlaywrightHandlers } from './main/playwright-handler';

// 설정 파일 경로
const getConfigPath = (filename: string) => {
  const userDataPath = app.getPath('userData');
  const configPath = path.join(userDataPath, filename);
  console.log(`📁 설정 파일 경로: ${configPath}`);
  return configPath;
};


// 로그 전송을 위한 전역 변수
let mainWindow: BrowserWindow | null = null;

// 사용자에게 보여줄 필요가 없는 로그 패턴들
const logFilters = [
  /🔍 \[파싱\]/, // 파싱 관련 세부 로그
  /🔍.*텍스트:/, // 텍스트 파싱 로그
  /📥 Step2 props 업데이트 감지/, // Step2 props 업데이트
  /🔄 collectedData 복원/, // 데이터 복원 로그
  /🔄 writingResult 복원/, // 글쓰기 결과 복원
  /🔙 이후 단계에서 돌아옴/, // 단계 이동 세부 로그
  /🔍 변경사항 분석/, // 변경사항 분석 세부
  /📤 App으로.*전송/, // 데이터 전송 세부
  /🔄.*불러옴/, // 더미 데이터 불러오기
  /^📁 설정 파일 경로:/, // 설정 파일 경로
  /^🔧.*시도:/, // 설정 저장 시도
  /^📄 저장할 데이터:/, // 저장할 데이터 상세
  /^🔍.*로드 시도:/, // 로드 시도
  /^제목과 검색어:/, // 제목-검색어 매핑 상세 데이터
  /^\[{\"title\":/, // JSON 형태의 제목 데이터
  /^{\"title\":.*searchQuery/, // 제목-검색어 JSON 객체
  /^🔍 updateWorkflowData 호출:/, // updateWorkflowData 세부 데이터
  /^{\"updates\":.*collectedData/, // collectedData 업데이트 세부사항
  /^✅ 데이터 수집 완료: \{\"blogs\":/, // 데이터 수집 완료 세부 결과
  /^{\"blogs\":\[{\"rank\":/, // 블로그 수집 결과 JSON
  /data:image\/\w+;base64,/, // 이미지 base64 데이터
];

// 로그 필터링 함수
const shouldFilterLog = (message: string): boolean => {
  return logFilters.some(pattern => pattern.test(message));
};

// 로그를 렌더러로 전송하는 함수
const sendLogToRenderer = (level: string, message: string, timestamp?: Date) => {
  // 불필요한 로그 필터링
  if (shouldFilterLog(message)) {
    return;
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log-message', {
      level,
      message,
      timestamp: timestamp || new Date()
    });
  }
};

// console.log 오버라이드
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = (...args: any[]) => {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  originalConsoleLog(...args);
  sendLogToRenderer('info', message);
};

console.error = (...args: any[]) => {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  originalConsoleError(...args);
  sendLogToRenderer('error', message);
};

console.warn = (...args: any[]) => {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  originalConsoleWarn(...args);
  sendLogToRenderer('warning', message);
};

// IPC 핸들러 설정
const setupIpcHandlers = () => {
  // 기본 설정 저장
  ipcMain.handle('defaults:save', async (event, defaultSettings) => {
    try {
      const configPath = getConfigPath('defaults.json');
      await fs.promises.writeFile(configPath, JSON.stringify(defaultSettings, null, 2));
      console.log('기본 설정 저장 완료:', configPath);
      return { success: true };
    } catch (error) {
      console.error('기본 설정 저장 실패:', error);
      return { success: false, message: error.message };
    }
  });

  // 기본 설정 로드
  ipcMain.handle('defaults:load', async () => {
    try {
      const configPath = getConfigPath('defaults.json');
      const data = await fs.promises.readFile(configPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.log('기본 설정 파일이 없거나 읽기 실패:', error.message);
      return null;
    }
  });

  // LLM 설정 저장
  ipcMain.handle('settings:save', async (event, settings) => {
    try {
      const configPath = getConfigPath('llm-settings.json');
      await fs.promises.writeFile(configPath, JSON.stringify(settings, null, 2));
      console.log('LLM 설정 저장 완료:', configPath);
      return { success: true };
    } catch (error) {
      console.error('LLM 설정 저장 실패:', error);
      return { success: false, message: error.message };
    }
  });

  // LLM 설정 로드
  ipcMain.handle('settings:load', async () => {
    try {
      const configPath = getConfigPath('llm-settings.json');
      const data = await fs.promises.readFile(configPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.log('LLM 설정 파일이 없거나 읽기 실패:', error.message);
      return null;
    }
  });

  // 네이버 API 설정 저장
  ipcMain.handle('naverApi:save', async (event, naverApiSettings) => {
    try {
      const configPath = getConfigPath('naver-api.json');
      console.log('🔧 네이버 API 설정 저장 시도:', configPath);
      console.log('📄 저장할 데이터:', naverApiSettings);
      await fs.promises.writeFile(configPath, JSON.stringify(naverApiSettings, null, 2));
      console.log('✅ 네이버 API 설정 저장 완료:', configPath);
      return { success: true };
    } catch (error) {
      console.error('❌ 네이버 API 설정 저장 실패:', error);
      return { success: false, message: error.message };
    }
  });

  // 네이버 API 설정 로드
  ipcMain.handle('naverApi:load', async () => {
    try {
      const configPath = getConfigPath('naver-api.json');
      console.log('🔍 네이버 API 설정 로드 시도:', configPath);
      const data = await fs.promises.readFile(configPath, 'utf-8');
      const parsedData = JSON.parse(data);
      console.log('✅ 네이버 API 설정 로드 성공:', parsedData);
      return { success: true, data: parsedData };
    } catch (error) {
      console.log('❌ 네이버 API 설정 파일이 없거나 읽기 실패:', error.message);
      return { success: false, data: null };
    }
  });

  // 네이버 API 설정 삭제
  ipcMain.handle('naverApi:delete', async () => {
    try {
      const configPath = getConfigPath('naver-api.json');
      await fs.promises.unlink(configPath);
      console.log('네이버 API 설정 삭제 완료:', configPath);
      return { success: true };
    } catch (error) {
      console.error('네이버 API 설정 삭제 실패:', error);
      return { success: false, message: error.message };
    }
  });

  // YouTube API 설정 저장
  ipcMain.handle('youtubeApi:save', async (event, youtubeApiSettings) => {
    try {
      const configPath = getConfigPath('youtube-api.json');
      console.log('🔧 YouTube API 설정 저장 시도:', configPath);
      console.log('📄 저장할 데이터:', youtubeApiSettings);
      await fs.promises.writeFile(configPath, JSON.stringify(youtubeApiSettings, null, 2));
      console.log('✅ YouTube API 설정 저장 완료:', configPath);
      return { success: true };
    } catch (error) {
      console.error('❌ YouTube API 설정 저장 실패:', error);
      return { success: false, message: error.message };
    }
  });

  // YouTube API 설정 로드
  ipcMain.handle('youtubeApi:load', async () => {
    try {
      const configPath = getConfigPath('youtube-api.json');
      console.log('🔍 YouTube API 설정 로드 시도:', configPath);
      const data = await fs.promises.readFile(configPath, 'utf-8');
      const parsedData = JSON.parse(data);
      console.log('✅ YouTube API 설정 로드 성공:', parsedData);
      return { success: true, data: parsedData };
    } catch (error) {
      console.log('❌ YouTube API 설정 파일이 없거나 읽기 실패:', error.message);
      return { success: false, data: null };
    }
  });

  // YouTube API 설정 삭제
  ipcMain.handle('youtubeApi:delete', async () => {
    try {
      const configPath = getConfigPath('youtube-api.json');
      await fs.promises.unlink(configPath);
      console.log('YouTube API 설정 삭제 완료:', configPath);
      return { success: true };
    } catch (error) {
      console.error('YouTube API 설정 삭제 실패:', error);
      return { success: false, message: error.message };
    }
  });

  // API 테스트 핸들러
  ipcMain.handle('api:test', async (event, provider: string, apiKey: string) => {
    try {
      console.log(`API 테스트 시작: ${provider}`);
      
      // 간단한 API 테스트 구현
      if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          return { success: true, message: 'OpenAI API 연결 성공' };
        } else {
          return { success: false, message: `OpenAI API 오류: ${response.status}` };
        }
      } else if (provider === 'anthropic' || provider === 'claude') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'test' }]
          })
        });
        
        if (response.ok) {
          return { success: true, message: 'Claude API 연결 성공' };
        } else {
          return { success: false, message: `Claude API 오류: ${response.status}` };
        }
      } else if (provider === 'gemini') {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        
        if (response.ok) {
          return { success: true, message: 'Gemini API 연결 성공' };
        } else {
          return { success: false, message: `Gemini API 오류: ${response.status}` };
        }
      } else if (provider === 'runware') {
        // Runware API 테스트 - 간단한 인증 확인
        try {
          const response = await fetch('https://api.runware.ai/v1', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify([{
              taskType: 'imageInference',
              taskUUID: 'test-connection-uuid',
              positivePrompt: 'test image connection',
              width: 512,
              height: 512,
              model: 'civitai:102438@133677',
              numberResults: 1,
              steps: 1,
              CFGScale: 7,
              seed: 12345
            }])
          });
          
          if (response.ok || response.status === 400) {
            // 200 (성공) 또는 400 (잘못된 요청이지만 인증은 성공)
            return { success: true, message: 'Runware API 연결 성공' };
          } else if (response.status === 401 || response.status === 403) {
            return { success: false, message: 'Runware API 키가 유효하지 않습니다' };
          } else {
            return { success: false, message: `Runware API 오류: ${response.status}` };
          }
        } catch (error) {
          return { success: false, message: `Runware API 연결 실패: ${error.message}` };
        }
      } else {
        return { success: false, message: '지원하지 않는 API 제공자입니다' };
      }
    } catch (error) {
      console.error(`API 테스트 실패 (${provider}):`, error);
      return { success: false, message: error.message };
    }
  });

  // 외부 링크 열기
  ipcMain.handle('shell:openExternal', async (event, url: string) => {
    try {
      await shell.openExternal(url);
      console.log(`외부 링크 열기: ${url}`);
    } catch (error) {
      console.error('외부 링크 열기 실패:', error);
    }
  });

  // 임시 파일 저장
  ipcMain.handle('file:saveTempFile', async (event, { fileName, data }: { fileName: string; data: number[] }) => {
    try {
      console.log(`💾 임시 파일 저장 시작: ${fileName}`);
      
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, fileName);
      
      // Uint8Array로 변환하여 파일 저장
      const buffer = Buffer.from(data);
      await fs.promises.writeFile(tempFilePath, buffer);
      
      console.log(`✅ 임시 파일 저장 완료: ${tempFilePath}`);
      return { success: true, filePath: tempFilePath };
    } catch (error) {
      console.error('임시 파일 저장 실패:', error);
      return { success: false, error: error.message };
    }
  });

  // 임시 파일 삭제
  ipcMain.handle('file:deleteTempFile', async (event, filePath: string) => {
    try {
      console.log(`🗑️ 임시 파일 삭제: ${filePath}`);
      await fs.promises.unlink(filePath);
      console.log(`✅ 임시 파일 삭제 완료: ${filePath}`);
      return { success: true };
    } catch (error) {
      console.error('임시 파일 삭제 실패:', error);
      return { success: false, error: error.message };
    }
  });

  // 파일 저장 다이얼로그
  ipcMain.handle('file:saveFile', async (event, { defaultPath, filters, data }: { 
    defaultPath: string; 
    filters: Array<{ name: string; extensions: string[] }>;
    data: number[];
  }) => {
    try {
      const { dialog } = require('electron');
      const result = await dialog.showSaveDialog({
        defaultPath,
        filters
      });
      
      if (!result.canceled && result.filePath) {
        const buffer = Buffer.from(data);
        await fs.promises.writeFile(result.filePath, buffer);
        console.log(`✅ 파일 저장 완료: ${result.filePath}`);
        return { success: true, filePath: result.filePath };
      } else {
        return { success: false, error: '저장이 취소되었습니다.' };
      }
    } catch (error) {
      console.error('파일 저장 실패:', error);
      return { success: false, error: error.message };
    }
  });

  // 이미지를 클립보드에 복사
  ipcMain.handle('clipboard:copyImage', async (event, filePath: string) => {
    try {
      console.log(`📋 클립보드에 이미지 복사: ${filePath}`);
      
      // 파일이 존재하는지 확인
      if (!fs.existsSync(filePath)) {
        throw new Error(`파일이 존재하지 않습니다: ${filePath}`);
      }
      
      // 이미지 파일을 nativeImage로 생성
      const image = nativeImage.createFromPath(filePath);
      
      if (image.isEmpty()) {
        throw new Error('이미지를 로드할 수 없습니다');
      }
      
      // 클립보드에 이미지 복사
      clipboard.writeImage(image);
      
      console.log(`✅ 클립보드에 이미지 복사 완료: ${filePath}`);
      return { success: true };
      
    } catch (error) {
      console.error('클립보드 이미지 복사 실패:', error);
      return { success: false, error: error.message };
    }
  });

  // YouTube 자막 추출 (yt-dlp 사용)
  // Google 차단 감지 함수
  function isGoogleBlocked(text: string): boolean {
    const blockedKeywords = [
      'automated queries',
      'Sorry...',
      'We\'re sorry',
      'protect our users',
      "can't process your request",
      'network may be sending',
      'verdana, arial, sans-serif',
      'GoogleSorry',
      'Google Help for more information',
      'Google Home'
    ];
    
    return blockedKeywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  // 유튜브 원시 자막 데이터 파싱 함수
  function parseYouTubeRawSubtitles(rawText: string): string {
    try {
      console.log(`🔍 [파싱] 원시 데이터 분석 시작 (${rawText.length}자)`);
      console.log(`🔍 [파싱] 데이터 샘플: ${rawText.substring(0, 300)}...`);
      
      const subtitleTexts: string[] = [];
      
      // 방법 1: 간단한 split 방식으로 segs utf8 찾기
      const segments = rawText.split('segs utf8');
      console.log(`🔍 [파싱] segs utf8로 분할: ${segments.length}개 세그먼트`);
      
      for (let i = 1; i < segments.length; i++) { // 첫 번째는 메타데이터이므로 제외
        let segment = segments[i].trim();
        
        // 다음 tStartMs까지만 자르기
        const nextTimestamp = segment.indexOf('tStartMs');
        if (nextTimestamp > 0) {
          segment = segment.substring(0, nextTimestamp);
        }
        
        // 앞뒤 공백, 쉼표 제거
        segment = segment.replace(/^[\s,]+|[\s,]+$/g, '');
        
        if (segment && segment.length > 1) {
          subtitleTexts.push(segment);
          console.log(`🔍 [파싱] 세그먼트 ${i}: "${segment}"`);
        }
      }
      
      // 방법 2: 세그먼트가 없으면 한국어 텍스트 직접 추출
      if (subtitleTexts.length === 0) {
        console.log(`🔍 [파싱] 대체 방법: 한국어 텍스트 직접 추출`);
        
        // 한국어 문장 패턴 추출 (더 넓은 범위)
        const koreanPattern = /[가-힣][가-힣\s\d?!.,()~]+[가-힣?!.]/g;
        const matches = rawText.match(koreanPattern);
        
        if (matches) {
          console.log(`🔍 [파싱] 한국어 패턴 ${matches.length}개 발견`);
          for (const match of matches) {
            const cleaned = match.trim();
            // 메타데이터 키워드가 포함되지 않은 것만
            if (cleaned.length > 3 && 
                !cleaned.includes('wireMagic') && 
                !cleaned.includes('tStartMs') &&
                !cleaned.includes('dDurationMs') &&
                !cleaned.includes('pb3')) {
              subtitleTexts.push(cleaned);
              console.log(`🔍 [파싱] 한국어 텍스트: "${cleaned}"`);
            }
          }
        }
      }
      
      // 결과 조합
      const result = subtitleTexts.join(' ').replace(/\s+/g, ' ').trim();
      
      console.log(`📝 [파싱] 최종 결과: ${subtitleTexts.length}개 세그먼트, ${result.length}자`);
      console.log(`📝 [파싱] 최종 텍스트: ${result.substring(0, 150)}...`);
      
      return result;
      
    } catch (error) {
      console.error('❌ [파싱] 원시 자막 데이터 파싱 실패:', error);
      return rawText; // 실패 시 원본 반환
    }
  }

  ipcMain.handle('youtube:extractSubtitles', async (event, videoId: string, language = 'ko') => {
    console.log(`🔍 [메인 프로세스] yt-dlp로 자막 추출 시도: ${videoId} (우선 언어: ${language})`);
    
    try {
      const { spawn } = require('child_process');
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      console.log(`📹 [메인 프로세스] 최신 yt-dlp로 메타데이터 추출: ${videoId}`);
      
      // 시스템 yt-dlp 사용 (2025.09.23 버전)
      const metadata = await new Promise((resolve, reject) => {
        const ytdlp = spawn('yt-dlp', [
          videoUrl,
          '--dump-json',
          '--no-download'
        ]);
        
        let stdout = '';
        let stderr = '';
        
        ytdlp.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        ytdlp.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        ytdlp.on('close', (code) => {
          if (code === 0 && stdout.trim()) {
            try {
              const parsed = JSON.parse(stdout.trim());
              resolve(parsed);
            } catch (e) {
              reject(new Error('JSON 파싱 실패: ' + e.message));
            }
          } else {
            reject(new Error('yt-dlp 실행 실패: ' + stderr));
          }
        });
        
        ytdlp.on('error', (error) => {
          reject(new Error('yt-dlp 실행 오류: ' + error.message));
        });
      });
      
      // 한국어 자막 먼저 시도 (수동 업로드)
      if (metadata.subtitles && metadata.subtitles.ko) {
        console.log(`✅ [메인 프로세스] 한국어 수동 자막 발견`);
        const koSubUrl = metadata.subtitles.ko[0].url;
        const response = await fetch(koSubUrl);
        let subtitleText = await response.text();
        
        // Google 차단 감지
        if (isGoogleBlocked(subtitleText)) {
          console.error(`❌ [메인 프로세스] Google 차단 감지 - 수동 자막`);
          throw new Error('Google에서 자동화 요청을 차단했습니다. 잠시 후 다시 시도해주세요.');
        }
        
        // 원시 데이터 형식인지 확인하고 파싱
        console.log(`🔍 [메인 프로세스] 자막 데이터 형식 검사: ${subtitleText.substring(0, 100)}...`);
        console.log(`🔍 [메인 프로세스] wireMagic 포함: ${subtitleText.includes('wireMagic')}`);
        console.log(`🔍 [메인 프로세스] tStartMs 포함: ${subtitleText.includes('tStartMs')}`);
        console.log(`🔍 [메인 프로세스] segs utf8 포함: ${subtitleText.includes('segs utf8')}`);
        
        if (subtitleText.includes('wireMagic') || subtitleText.includes('tStartMs') || subtitleText.includes('segs utf8')) {
          console.log(`🔄 [메인 프로세스] 원시 자막 데이터 감지! 파싱 시작...`);
          const originalLength = subtitleText.length;
          subtitleText = parseYouTubeRawSubtitles(subtitleText);
          console.log(`🔄 [메인 프로세스] 파싱 완료: ${originalLength}자 → ${subtitleText.length}자`);
        } else {
          console.log(`✅ [메인 프로세스] 일반 자막 형식 (파싱 불필요)`);
        }
        
        if (subtitleText.length >= 300) {
          console.log(`✅ [메인 프로세스] 한국어 수동 자막 추출 성공: ${subtitleText.length}자`);
          return {
            success: true,
            data: {
              language: 'ko',
              text: subtitleText,
              isAutoGenerated: false,
              length: subtitleText.length
            }
          };
        }
      }
      
      // 한국어 자동 생성 자막 시도 (여러 포맷 순서대로)
      if (metadata.automatic_captions && metadata.automatic_captions.ko) {
        console.log(`✅ [메인 프로세스] 한국어 자동 자막 발견`);
        
        // 포맷 우선순위: srt → vtt (깔끔한 포맷만 사용)
        const formatPriority = ['srt', 'vtt'];
        
        for (const format of formatPriority) {
          const subtitleFile = metadata.automatic_captions.ko.find((sub: any) => sub.ext === format);
          if (subtitleFile) {
            try {
              console.log(`🔄 [메인 프로세스] 한국어 ${format} 포맷 시도`);
              const response = await fetch(subtitleFile.url);
              let subtitleText = await response.text();
              
              // Google 차단 감지
              if (isGoogleBlocked(subtitleText)) {
                console.error(`❌ [메인 프로세스] Google 차단 감지 - ${format} 자막`);
                throw new Error('Google에서 자동화 요청을 차단했습니다. 잠시 후 다시 시도해주세요.');
              }
              
              // 원시 데이터 형식인지 확인하고 파싱
              console.log(`🔍 [메인 프로세스] ${format} 자막 데이터 형식 검사: ${subtitleText.substring(0, 100)}...`);
              console.log(`🔍 [메인 프로세스] ${format} wireMagic 포함: ${subtitleText.includes('wireMagic')}`);
              console.log(`🔍 [메인 프로세스] ${format} tStartMs 포함: ${subtitleText.includes('tStartMs')}`);
              console.log(`🔍 [메인 프로세스] ${format} segs utf8 포함: ${subtitleText.includes('segs utf8')}`);
              
              if (subtitleText.includes('wireMagic') || subtitleText.includes('tStartMs') || subtitleText.includes('segs utf8')) {
                console.log(`🔄 [메인 프로세스] ${format} 원시 자막 데이터 감지! 파싱 시작...`);
                const originalLength = subtitleText.length;
                const parsedText = parseYouTubeRawSubtitles(subtitleText);
                console.log(`🔄 [메인 프로세스] ${format} 파싱 완료: ${originalLength}자 → ${parsedText.length}자`);
                
                if (parsedText.length >= 300) {
                  return {
                    success: true,
                    data: {
                      language: 'ko',
                      text: parsedText,
                      isAutoGenerated: true,
                      length: parsedText.length
                    }
                  };
                }
                continue; // 원시 데이터는 일반 파싱을 건너뛰고 다음 포맷 시도
              } else {
                console.log(`✅ [메인 프로세스] ${format} 일반 자막 형식 (파싱 불필요)`);
              }
              
              let textOnly = '';
              
              if (format === 'srt') {
                // SRT 포맷 파싱
                const lines = subtitleText
                  .split('\n')
                  .filter(line => !line.includes('-->') && 
                                 !line.match(/^\d+$/) && 
                                 line.trim() !== '')
                  .map(line => line.replace(/<[^>]*>/g, '').trim())
                  .filter(line => line.length > 0);
                
                const uniqueLines = [...new Set(lines)];
                textOnly = uniqueLines.join(' ').replace(/\s+/g, ' ').trim();
                
              } else if (format === 'vtt') {
                // VTT 포맷 파싱
                const lines = subtitleText
                  .split('\n')
                  .filter(line => !line.startsWith('WEBVTT') && 
                                 !line.startsWith('Kind:') && 
                                 !line.startsWith('Language:') && 
                                 !line.includes('-->') && 
                                 !line.match(/^\d+$/) && 
                                 line.trim() !== '')
                  .map(line => line.replace(/<[^>]*>/g, '').trim())
                  .filter(line => line.length > 0);
                
                const uniqueLines = [...new Set(lines)];
                textOnly = uniqueLines.join(' ').replace(/\s+/g, ' ').trim();
                
              }
              
              if (textOnly.length >= 300) {
                console.log(`✅ [메인 프로세스] 한국어 ${format} 자막 추출 성공: ${textOnly.length}자`);
                return {
                  success: true,
                  data: {
                    language: 'ko',
                    text: textOnly,
                    isAutoGenerated: true,
                    length: textOnly.length
                  }
                };
              } else {
                console.warn(`⚠️ [메인 프로세스] 한국어 ${format} 자막이 너무 짧음: ${textOnly.length}자`);
              }
              
            } catch (error) {
              console.warn(`⚠️ [메인 프로세스] 한국어 ${format} 처리 실패:`, error.message);
              continue;
            }
          }
        }
      }
      
      
      // 모든 시도 실패 (한국어 자막만 시도)
      console.error(`❌ [메인 프로세스] 한국어 자막 추출 실패: ${videoId} - 사용 가능한 한국어 자막이 없거나 너무 짧음`);
      return {
        success: false,
        message: '한국어 자막이 없거나 300자 미만입니다.',
        data: null
      };
      
    } catch (error) {
      console.error(`❌ [메인 프로세스] yt-dlp 자막 추출 오류 (${videoId}):`, error);
      return {
        success: false,
        message: `자막 추출 중 오류: ${error.message}`,
        data: null
      };
    }
  });

  // 렌더러 프로세스에서 로그 전송 받기
  ipcMain.handle('log:send', async (event, { level, message, timestamp }) => {
    try {
      // 렌더러에서 온 로그를 다시 로그 패널로 전송
      sendLogToRenderer(level, message, new Date(timestamp));
    } catch (error) {
      console.error('렌더러 로그 전송 실패:', error);
    }
  });


};


// Electron Builder 경로 설정 - 항상 파일 시스템 사용
const MAIN_WINDOW_WEBPACK_ENTRY = `file://${path.join(__dirname, 'index.html')}`;
const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY = path.join(__dirname, 'preload.js');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = (): void => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    show: false,
    center: true,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // CSP 헤더 제거
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [''],
      },
    });
  });

  // 페이지 로드 완료 후 창 표시
  mainWindow.webContents.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ 페이지 로드 완료 - 창 표시');
    
    // 개발 환경에서만 개발자 도구 활성화
    console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 개발자 도구 열기 시도');
      mainWindow.webContents.openDevTools();
    }
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
};

// 자동 업데이트 설정
function setupAutoUpdater() {
  console.log('🔄 AutoUpdater 설정 시작...');
  console.log('현재 환경:', process.env.NODE_ENV);
  console.log('현재 버전:', app.getVersion());
  
  // 개발 환경에서는 업데이트 체크하지 않음
  if (process.env.NODE_ENV === 'development') {
    console.log('⚠️ 개발 환경이므로 자동 업데이트를 건너뜁니다.');
    return;
  }

  // GitHub Releases를 업데이트 서버로 설정
  console.log('📡 GitHub Releases 설정 중...');
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'PARKJAEHYEONG922',
    repo: 'blog-automation-v2'
  });
  
  console.log('✅ 자동 업데이트 설정 완료');

  // 앱 시작 후 업데이트 체크 (자동 다운로드 비활성화)
  autoUpdater.autoDownload = false;
  console.log('🔍 업데이트 확인 시작...');
  autoUpdater.checkForUpdates();

  // 업데이트 이벤트 처리
  autoUpdater.on('checking-for-update', () => {
    console.log('업데이트 확인 중...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('🚀 업데이트 사용 가능:', info.version);
    
    // 업데이트 다이얼로그 표시
    const response = dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      title: '업데이트 알림',
      message: `새로운 버전이 있습니다!`,
      detail: `현재 버전: ${app.getVersion()}\n새 버전: ${info.version}\n\n지금 업데이트하시겠습니까?`,
      buttons: ['예, 업데이트', '나중에'],
      defaultId: 0,
      cancelId: 1,
      icon: nativeImage.createFromPath(path.join(__dirname, '../assets/icon.png'))
    });

    if (response === 0) {
      console.log('📥 사용자가 업데이트를 선택했습니다. 다운로드 시작...');
      autoUpdater.downloadUpdate();
    } else {
      console.log('⏭️ 사용자가 업데이트를 나중으로 미뤘습니다.');
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('✅ 최신 버전입니다:', info);
  });

  autoUpdater.on('error', (err) => {
    console.log('❌ 자동 업데이트 오류:', err);
    
    // 오류 다이얼로그 표시
    dialog.showMessageBoxSync(mainWindow, {
      type: 'error',
      title: '업데이트 오류',
      message: '업데이트 확인 중 오류가 발생했습니다.',
      detail: err.message,
      buttons: ['확인']
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent);
    const transferred = Math.round(progressObj.transferred / 1024 / 1024);
    const total = Math.round(progressObj.total / 1024 / 1024);
    
    console.log(`📦 업데이트 다운로드 중: ${percent}% (${transferred}MB / ${total}MB)`);
    
    // 메인 윈도우가 있다면 프로그래스 표시
    if (mainWindow) {
      mainWindow.setProgressBar(progressObj.percent / 100);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('✅ 업데이트 다운로드 완료:', info.version);
    
    // 프로그래스 바 제거
    if (mainWindow) {
      mainWindow.setProgressBar(-1);
    }
    
    // 업데이트 설치 확인 다이얼로그
    const response = dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      title: '업데이트 준비 완료',
      message: '업데이트가 다운로드되었습니다!',
      detail: `버전 ${info.version}이 설치 준비되었습니다.\n앱을 재시작하여 업데이트를 적용하시겠습니까?`,
      buttons: ['지금 재시작', '나중에 재시작'],
      defaultId: 0,
      cancelId: 1
    });

    if (response === 0) {
      console.log('🔄 즉시 재시작하여 업데이트 적용...');
      autoUpdater.quitAndInstall();
    } else {
      console.log('⏭️ 나중에 재시작하여 업데이트 적용 예정...');
    }
  });
}

// 메뉴 설정
function setupMenu() {
  const template = [
    {
      label: '파일',
      submenu: [
        {
          label: '종료',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '도움말',
      submenu: [
        {
          label: '정보',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: '앱 정보',
              message: '블로그 자동화',
              detail: `🚀 버전: ${app.getVersion()}\n` +
                     `⚡ Electron: ${process.versions.electron}\n` +
                     `🌐 Chromium: ${process.versions.chrome}\n` +
                     `📦 Node.js: ${process.versions.node}`,
              buttons: ['확인']
            });
          }
        },
        {
          label: '업데이트 확인',
          click: () => {
            console.log('수동 업데이트 확인 시작');
            autoUpdater.checkForUpdates();
            
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: '업데이트 확인',
              message: '🔍 업데이트를 확인하고 있습니다...',
              detail: `현재 버전: ${app.getVersion()}\n\n새 버전이 있으면 자동으로 알림이 표시됩니다.`,
              buttons: ['확인']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  console.log('Electron 앱이 준비되었습니다.');
  setupIpcHandlers();
  registerPlaywrightHandlers();
  setupAutoUpdater();
  setupMenu();
  createWindow();
  console.log('메인 윈도우 생성 완료.');
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
