; NSIS Installer for Mossy - Optional Nemotron AI
; Users can choose: Core-only or with Nemotron AI integration

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "WinVer.nsh"
!include "Sections.nsh"

; Configuration
!define PRODUCT_NAME "Mossy AI"
!define PRODUCT_VERSION "5.4.24"
!define PRODUCT_PUBLISHER "Mossy Development"
!define PRODUCT_WEB_SITE "https://github.com/POINTYTHRUNDRA654/desktop-tutorial"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\mossy.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"

; Installer filename
OutFile "Mossy Setup ${PRODUCT_VERSION}.exe"
InstallDir "$PROGRAMFILES\${PRODUCT_NAME}"

; MUI Settings
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_LANGUAGE "English"

; ===== SECTION 1: CORE APPLICATION (REQUIRED) =====
Section "!Mossy Core Application" SEC_CORE
    SectionIn RO  ; Read-only, always installed
    
    SetOutPath "$INSTDIR"
    
    ; Copy all Electron app files
    File /r "dist\*.*"
    File /r "dist-electron\*.*"
    File ".env.encrypted"
    File "nemotron_api.py"
    File "nemotron_service.py"
    File "requirements-docker.txt"
    
    ; Create start menu shortcuts
    CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
    CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\mossy.exe"
    CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\Uninstall.lnk" "$INSTDIR\uninstall.exe"
    
    ; Create desktop shortcut
    CreateShortcut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\mossy.exe"
    
    ; Write "Nemotron not installed" flag (will be overwritten if section 2 runs)
    WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "NemotronInstalled" "0"
    
    ; Write fresh-install marker so the app runs the first-run wizard on launch,
    ; even if a previous installation left stale userData/localStorage behind.
    FileOpen $R0 "$INSTDIR\fresh-install.marker" w
    FileWrite $R0 "fresh-install"
    FileClose $R0

    ; Basic registry entries
    WriteRegStr HKLM "${PRODUCT_DIR_REGKEY}" "" "$INSTDIR\mossy.exe"
    WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayName" "${PRODUCT_NAME} v${PRODUCT_VERSION}"
    WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
    WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
    WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\uninstall.exe"
    WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\mossy.exe"
SectionEnd

; ===== SECTION 2: NEMOTRON AI (OPTIONAL) =====
Section "Nemotron AI Integration (adds ~500MB)" SEC_NEMOTRON
    SetOutPath "$INSTDIR\nemotron-service"
    
    ; Copy Nemotron service executable (from PyInstaller dist)
    File /r "dist\nemotron-service\*.*"
    
    ; Mark Nemotron as installed
    WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "NemotronInstalled" "1"
SectionEnd

; ===== SECTION 3: UNINSTALLER (REQUIRED) =====
Section "-Create Uninstaller"
    CreateDirectory "$INSTDIR"
    
    ; Create uninstaller
    WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

; ===== POST-INSTALLATION MESSAGE =====
Section "-Post-Install"
    ; Determine which components were installed and show appropriate message
    ${If} $0 == 1  ; Check if Nemotron section was installed
        MessageBox MB_OK "${PRODUCT_NAME} v${PRODUCT_VERSION}$\n$\n✓ Core Application installed$\n✓ Nemotron AI integration installed$\n$\nFull AI capabilities ready!$\n$\nModel will download on first launch (~10-15 GB).$\nNo additional setup required."
    ${Else}
        MessageBox MB_OK "${PRODUCT_NAME} v${PRODUCT_VERSION}$\n$\n✓ Core Application installed$\n$\nNemotron AI not installed (can be added later).$\n$\nCore modding features ready to use!"
    ${EndIf}
SectionEnd

Section "Uninstall"
    ; Remove shortcuts
    RMDir /r "$SMPROGRAMS\${PRODUCT_NAME}"
    Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
    
    ; Remove installation directory
    RMDir /r "$INSTDIR"
    
    ; Remove registry entries
    DeleteRegKey HKLM "${PRODUCT_DIR_REGKEY}"
    DeleteRegKey HKLM "${PRODUCT_UNINST_KEY}"
    
    MessageBox MB_OK "Uninstall complete!"
    
SectionEnd

; Function to validate installer requirements
Function .onInit
    ; Check Windows version (Windows 10+)
    ${If} ${WinVer_AtLeast} 10 0
        ; OK
    ${Else}
        MessageBox MB_ICONEXCLAMATION|MB_OK "This application requires Windows 10 or later."
        Quit
    ${EndIf}
    
    ; Check available disk space (need ~500 MB for app + model)
    ${GetSize} "$INSTDIR" "/S=0K" $0
    IntOp $0 $0 + 512000  ; Add ~500 MB
    
    ${If} $0 > 1024000
        ; More than 1 GB available - OK
    ${Else}
        MessageBox MB_ICONEXCLAMATION|MB_YESNO "Mossy requires at least 500 MB of free disk space.$\n$\nDo you want to continue?" IDYES continueInstall IDNO abortInstall
        abortInstall:
        Quit
        continueInstall:
    ${EndIf}
    
FunctionEnd

; Function to handle uninstall
Function un.onInit
    MessageBox MB_ICONQUESTION|MB_YESNO "Do you want to remove ${PRODUCT_NAME}?" IDYES +2
    Abort
FunctionEnd
