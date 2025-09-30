; NSIS 설치 스크립트 - Playwright 및 브라우저 체크
!include "WinVer.nsh"
!include "x64.nsh"

; 브라우저 설치 확인 함수
Function CheckBrowsers
  ; Chrome 확인
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" ""
  ${If} $0 != ""
    DetailPrint "✅ Google Chrome 감지됨: $0"
    Goto BrowserFound
  ${EndIf}
  
  ReadRegStr $0 HKCU "SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" ""
  ${If} $0 != ""
    DetailPrint "✅ Google Chrome 감지됨 (사용자): $0"
    Goto BrowserFound
  ${EndIf}
  
  ; Edge 확인
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe" ""
  ${If} $0 != ""
    DetailPrint "✅ Microsoft Edge 감지됨: $0"
    Goto BrowserFound
  ${EndIf}
  
  ; Whale 확인
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\whale.exe" ""
  ${If} $0 != ""
    DetailPrint "✅ Naver Whale 감지됨: $0"
    Goto BrowserFound
  ${EndIf}
  
  ; 브라우저가 없는 경우
  MessageBox MB_YESNO|MB_ICONQUESTION "⚠️ 지원하는 브라우저를 찾을 수 없습니다.$\r$\n$\r$\n블로그 자동화 기능을 사용하려면 다음 중 하나를 설치해주세요:$\r$\n• Google Chrome (권장)$\r$\n• Microsoft Edge$\r$\n• Naver Whale$\r$\n$\r$\n설치를 계속하시겠습니까?" IDYES BrowserFound
  Abort "설치가 취소되었습니다."
  
  BrowserFound:
  DetailPrint "✅ 브라우저 확인 완료"
FunctionEnd

; 설치 후 실행 함수
Function .onInstSuccess
  Call CheckBrowsers
  DetailPrint "✅ 블로그 자동화 v3 설치 완료"
  DetailPrint "📋 지원 브라우저: Chrome > Edge > Whale 순서로 자동 선택"
FunctionEnd