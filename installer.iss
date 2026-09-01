; Inno Setup Installer Script for Mossy Desktop
; Generated for Mossy v3.0 - Fallout 4 Modding Assistant

#define MyAppName "Mossy Desktop"
#define MyAppVersion "3.0.0"
#define MyAppPublisher "POINTYTHRUNDRA654"
#define MyAppExeName "mossy-desktop.exe"

[Setup]
; NOTE: The value of AppId uniquely identifies this application.
AppId={{YOUR-GUID-HERE}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
OutputDir=installer-output
OutputBaseFilename=mossy-desktop-setup-{#MyAppVersion}
Compression=lzma
SolidCompression=yes
SetupIconFile=public\icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "dist-electron\*"; DestDir: "{app}\dist-electron"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "src\*"; DestDir: "{app}\src"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "\__pycache__,*.pyc,*.psd,.git,.venv"
Source: "public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    { Write a marker so the app knows this is a fresh install and should
      reset onboarding flags on first launch, even if the user previously
      had Mossy installed and the userData folder was left behind. }
    SaveStringToFile(ExpandConstant('{app}\fresh-install.marker'), 'fresh-install', False);
  end;
end;
