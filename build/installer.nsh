; Custom NSIS installer script for Mossy
; This file enhances the installer with custom messages and descriptions

!macro customHeader
  ; Add custom welcome text
  !define MUI_TEXT_WELCOME_INFO_TITLE "Welcome to Mossy Setup"
  !define MUI_TEXT_WELCOME_INFO_TEXT "This wizard will guide you through the installation of Mossy v${VERSION}.$\r$\n$\r$\nMossy is your AI-powered Fallout 4 modding assistant with real-time tool integration, asset analysis, and over 200 built-in guides.$\r$\n$\r$\nThe installation process is fully automatic - just click Next and Mossy will take care of the rest!$\r$\n$\r$\nClick Next to continue, or Cancel to exit Setup."
  
  ; Custom directory page text
  !define MUI_TEXT_DIRECTORY_TITLE "Choose Installation Location"
  !define MUI_TEXT_DIRECTORY_SUBTITLE "Choose the folder where Mossy will be installed."
  
  ; Custom installing text
  !define MUI_TEXT_INSTALLING_TITLE "Installing Mossy"
  !define MUI_TEXT_INSTALLING_SUBTITLE "Please wait while Mossy is being installed on your computer."
  
  ; Custom finish text
  !define MUI_TEXT_FINISH_TITLE "Installation Complete!"
  !define MUI_TEXT_FINISH_SUBTITLE "Mossy has been successfully installed."
  !define MUI_TEXT_FINISH_INFO_TEXT "Mossy v${VERSION} has been installed on your computer.$\r$\n$\r$\nOn first launch, you'll see a guided setup wizard that will help you:$\r$\n  • Configure AI settings (local or cloud)$\r$\n  • Detect installed modding tools$\r$\n  • Set up Neural Link monitoring$\r$\n  • Choose privacy preferences$\r$\n$\r$\nClick Finish to close Setup."
  !define MUI_FINISHPAGE_RUN_TEXT "Launch Mossy and start the guided setup"
  !define MUI_FINISHPAGE_LINK "Visit the Installation Guide"
  !define MUI_FINISHPAGE_LINK_LOCATION "https://github.com/POINTYTHRUNDRA654/desktop-tutorial/blob/main/INSTALLATION_GUIDE.md"
!macroend

!macro customInstall
  ; Create quick start guide shortcut
  CreateShortcut "$INSTDIR\Installation Guide.lnk" "$INSTDIR\INSTALLATION_GUIDE.md"
  
  ; Add to installed files list
  WriteRegStr SHCTX "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "InstallGuide" "$INSTDIR\INSTALLATION_GUIDE.md"
  
  ; Write version info
  WriteRegStr SHCTX "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayName" "Mossy - Fallout 4 Modding Assistant"
  WriteRegStr SHCTX "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "Publisher" "POINTYTHRUNDRA654"
  WriteRegStr SHCTX "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "URLInfoAbout" "https://github.com/POINTYTHRUNDRA654/desktop-tutorial"
  WriteRegStr SHCTX "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "HelpLink" "https://github.com/POINTYTHRUNDRA654/desktop-tutorial/issues"
!macroend

!macro customUnInstall
  ; Remove quick start guide shortcut
  Delete "$INSTDIR\Installation Guide.lnk"
!macroend

!macro customInit
  ; Display welcome message
  MessageBox MB_ICONINFORMATION "Thank you for choosing Mossy!$\r$\n$\r$\nThis installer will automatically set up Mossy on your computer. After installation, Mossy will guide you through the first-time setup with an interactive tutorial.$\r$\n$\r$\nNo technical knowledge required - just follow the on-screen instructions!"
!macroend
