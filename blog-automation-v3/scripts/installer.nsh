; 시작프로그램 등록
!macro customInstall
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "BlogAutomation" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
!macroend

; 제거 시 시작프로그램에서도 제거
!macro customUnInstall
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "BlogAutomation"
!macroend