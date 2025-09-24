; 블로그 자동화 설치 프로그램
; NSIS 스크립트

!define APPNAME "블로그 자동화"
!define VERSION "1.0.0"
!define PUBLISHER "PARKJAEHYEONG922"
!define EXENAME "blog-automation-v2.exe"
!define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}"

Name "${APPNAME}"
OutFile "블로그자동화-설치프로그램-v${VERSION}.exe"
InstallDir "$PROGRAMFILES64\${APPNAME}"
RequestExecutionLevel admin

; 버전 정보
VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "${APPNAME}"
VIAddVersionKey "CompanyName" "${PUBLISHER}"
VIAddVersionKey "FileDescription" "유튜브 영상을 분석하여 블로그 글을 자동으로 생성하고 발행하는 애플리케이션"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "© 2024 ${PUBLISHER}"

; 압축 방식
SetCompressor /SOLID lzma

; 페이지 설정
Page directory
Page instfiles

; 언설치 프로그램 페이지
UninstPage uninstConfirm
UninstPage instfiles

Section "설치"
    SetOutPath $INSTDIR
    
    ; 파일 복사
    File /r "out\blog-automation-v2-win32-x64\*"
    
    ; 바탕화면 바로가기 생성
    CreateShortcut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\${EXENAME}"
    
    ; 시작 메뉴 바로가기 생성
    CreateDirectory "$SMPROGRAMS\${APPNAME}"
    CreateShortcut "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk" "$INSTDIR\${EXENAME}"
    CreateShortcut "$SMPROGRAMS\${APPNAME}\제거.lnk" "$INSTDIR\uninstall.exe"
    
    ; 언설치 프로그램 생성
    WriteUninstaller "$INSTDIR\uninstall.exe"
    
    ; 레지스트리에 프로그램 정보 등록
    WriteRegStr HKLM "${UNINSTALL_KEY}" "DisplayName" "${APPNAME}"
    WriteRegStr HKLM "${UNINSTALL_KEY}" "UninstallString" "$INSTDIR\uninstall.exe"
    WriteRegStr HKLM "${UNINSTALL_KEY}" "QuietUninstallString" "$INSTDIR\uninstall.exe /S"
    WriteRegStr HKLM "${UNINSTALL_KEY}" "Publisher" "${PUBLISHER}"
    WriteRegStr HKLM "${UNINSTALL_KEY}" "DisplayVersion" "${VERSION}"
    WriteRegStr HKLM "${UNINSTALL_KEY}" "DisplayIcon" "$INSTDIR\${EXENAME}"
    WriteRegStr HKLM "${UNINSTALL_KEY}" "InstallLocation" "$INSTDIR"
    WriteRegDWORD HKLM "${UNINSTALL_KEY}" "NoModify" 1
    WriteRegDWORD HKLM "${UNINSTALL_KEY}" "NoRepair" 1
    
SectionEnd

Section "Uninstall"
    ; 파일 삭제
    RMDir /r $INSTDIR
    
    ; 바로가기 삭제
    Delete "$DESKTOP\${APPNAME}.lnk"
    RMDir /r "$SMPROGRAMS\${APPNAME}"
    
    ; 레지스트리 삭제
    DeleteRegKey HKLM "${UNINSTALL_KEY}"
    
SectionEnd