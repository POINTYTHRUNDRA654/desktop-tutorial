; Custom NSIS hook for Mossy installer
; Included by electron-builder via package.json nsis.include

; After all files are installed, write a fresh-install.marker file so the
; Mossy app knows it should reset onboarding flags and run the first-run
; wizard even if a previous userData folder was left behind.
!macro customInstall
  FileOpen $0 "$INSTDIR\fresh-install.marker" w
  FileWrite $0 "fresh-install"
  FileClose $0
!macroend

!macro customUnInstall
  ; Nothing extra needed on uninstall
!macroend
