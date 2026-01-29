!macro customInstall
  ; Local Whisper (whisper.cpp) can fail to launch on some systems without the MSVC runtime.
  ; Running the official VC++ Redistributable installers is idempotent and fixes 0xC0000135.

  DetailPrint "Installing Microsoft Visual C++ Redistributable (x64)..."
  IfFileExists "$INSTDIR\\resources\\vcredist\\vc_redist.x64.exe" 0 +2
  ExecWait '"$INSTDIR\\resources\\vcredist\\vc_redist.x64.exe" /install /quiet /norestart' $0

  DetailPrint "Installing Microsoft Visual C++ Redistributable (x86)..."
  IfFileExists "$INSTDIR\\resources\\vcredist\\vc_redist.x86.exe" 0 +2
  ExecWait '"$INSTDIR\\resources\\vcredist\\vc_redist.x86.exe" /install /quiet /norestart' $1
!macroend
