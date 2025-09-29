/**
 * 앱 업데이트 관련 Electron 메인 프로세스 서비스
 */
import { BrowserWindow, shell } from 'electron';
import * as https from 'https';

export interface UpdateInfo {
  version: string;
  releaseDate: string;
  downloadUrl: string;
  releaseNotes: string;
  hasUpdate: boolean;
}

export interface UpdateCheckResult {
  success: boolean;
  updateInfo?: UpdateInfo;
  error?: string;
}

/**
 * GitHub API를 통한 업데이트 확인
 */
export async function checkForUpdates(
  currentVersion: string,
  repoOwner: string,
  repoName: string
): Promise<UpdateCheckResult> {
  try {
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`;
    
    const releaseData = await fetchGitHubRelease(apiUrl);
    
    if (!releaseData) {
      return {
        success: false,
        error: 'Failed to fetch release information'
      };
    }

    const latestVersion = releaseData.tag_name.replace(/^v/, '');
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;
    
    // Windows 실행 파일 찾기
    const asset = releaseData.assets.find((asset: any) => 
      asset.name.endsWith('.exe') || asset.name.includes('Setup')
    );

    if (!asset && hasUpdate) {
      return {
        success: false,
        error: 'No Windows installer found in latest release'
      };
    }

    const updateInfo: UpdateInfo = {
      version: latestVersion,
      releaseDate: releaseData.published_at,
      downloadUrl: asset ? asset.browser_download_url : '',
      releaseNotes: releaseData.body || '',
      hasUpdate
    };

    return {
      success: true,
      updateInfo
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * V3 태그만 필터링하는 업데이트 확인
 */
export async function checkForV3Updates(
  currentVersion: string,
  repoOwner: string,
  repoName: string
): Promise<UpdateCheckResult> {
  try {
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases`;
    
    const releasesData = await fetchGitHubReleases(apiUrl);
    
    if (!releasesData || !Array.isArray(releasesData)) {
      return {
        success: false,
        error: 'Failed to fetch releases information'
      };
    }

    // V3 태그만 필터링
    const v3Releases = releasesData.filter((release: any) => 
      release.tag_name.toLowerCase().includes('v3') || 
      release.tag_name.startsWith('3.')
    );

    if (v3Releases.length === 0) {
      return {
        success: true,
        updateInfo: {
          version: currentVersion,
          releaseDate: new Date().toISOString(),
          downloadUrl: '',
          releaseNotes: '',
          hasUpdate: false
        }
      };
    }

    // 최신 V3 릴리스 선택
    const latestV3Release = v3Releases[0];
    const latestVersion = latestV3Release.tag_name.replace(/^v/, '');
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;
    
    // Windows 실행 파일 찾기
    const asset = latestV3Release.assets.find((asset: any) => 
      asset.name.endsWith('.exe') || asset.name.includes('Setup')
    );

    const updateInfo: UpdateInfo = {
      version: latestVersion,
      releaseDate: latestV3Release.published_at,
      downloadUrl: asset ? asset.browser_download_url : '',
      releaseNotes: latestV3Release.body || '',
      hasUpdate
    };

    return {
      success: true,
      updateInfo
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * GitHub API로부터 최신 릴리스 정보 가져오기
 */
function fetchGitHubRelease(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Electron-App'
      }
    };

    https.get(url, options, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * GitHub API로부터 릴리스 목록 가져오기
 */
function fetchGitHubReleases(url: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Electron-App'
      }
    };

    https.get(url, options, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 버전 비교 (semantic versioning)
 */
function compareVersions(version1: string, version2: string): number {
  const v1parts = version1.split('.').map(Number);
  const v2parts = version2.split('.').map(Number);
  
  const maxLength = Math.max(v1parts.length, v2parts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const v1part = v1parts[i] || 0;
    const v2part = v2parts[i] || 0;
    
    if (v1part > v2part) return 1;
    if (v1part < v2part) return -1;
  }
  
  return 0;
}

/**
 * 업데이트 다운로드 시작
 */
export async function startUpdateDownload(downloadUrl: string): Promise<boolean> {
  try {
    await shell.openExternal(downloadUrl);
    return true;
  } catch (error) {
    console.error('Error starting update download:', error);
    return false;
  }
}

/**
 * 릴리스 노트를 마크다운에서 HTML로 간단 변환
 */
export function formatReleaseNotes(markdown: string): string {
  return markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>')
    .replace(/\n/gim, '<br>');
}