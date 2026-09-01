; Custom NSIS hook for Mossy NVIDIA installer
; Included by electron-builder via the package:win:nvidia script.
; Identical to installer-include.nsh except it writes 'fresh-install-nvidia'
; so the app can distinguish the NVIDIA edition on first launch if needed.

!macro customInstall
  FileOpen $0 "$INSTDIR\fresh-install.marker" w
  FileWrite $0 "fresh-install"
  FileClose $0
!macroend

!macro customUnInstall
  ; Nothing extra needed on uninstall
!macroend
