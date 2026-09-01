# Normalize visual-guide image filenames and update references
# - Converts names to lowercase, replaces spaces/dots/commas with hyphens
# - Skips when target already exists
# - Updates references across tracked text files, commits and pushes to master

$dirs = @(
  'visual-guide-images',
  'public/visual-guide-images',
  'src/renderer/public/visual-guide-images'
)

function Normalize-Name($name){
  $base = [System.IO.Path]::GetFileNameWithoutExtension($name)
  $ext  = [System.IO.Path]::GetExtension($name).ToLower()
  $s = $base.ToLower()
  # collapse repeated dots, remove disallowed characters, convert spaces/dots/underscores/commas to hyphen
  $s = $s -replace '\.+$',''                 # trailing dots
  $s = $s -replace '[^a-z0-9\s\._-]',''     # keep letters/numbers, spaces, dot, underscore, hyphen
  $s = $s -replace '[\s\._,]+','-'          # spaces/dots/underscores/commas -> -
  $s = $s -replace '-{2,}','-'                # collapse runs of -
  $s = $s.Trim('-')
  if([string]::IsNullOrWhiteSpace($s)) { $s = 'image' }
  return "$s$ext"
}

$map = @{}
foreach($dir in $dirs){
  if(-not (Test-Path $dir)) { continue }
  Get-ChildItem -Path $dir -File | ForEach-Object {
    $oldName = $_.Name
    $newName = Normalize-Name $oldName
    if($newName -ne $oldName){
      $oldPath = Join-Path $dir $oldName
      $newPath = Join-Path $dir $newName
      if(Test-Path $newPath){
        Write-Host "Target already exists, skipping rename: $oldPath -> $newPath"
        $map[$oldPath] = $newPath
      } else {
        Write-Host "git mv -- '$oldPath' -> '$newPath'"
        git mv -- "$oldPath" "$newPath"
        $map[$oldPath] = $newPath
      }
    }
  }
}

# Update textual references (use both full relative path and filename)
foreach($oldPath in $map.Keys){
  $newPath = $map[$oldPath]
  $oldRel = $oldPath -replace "\\","/"
  $newRel = $newPath -replace "\\","/"
  $oldName = [System.IO.Path]::GetFileName($oldPath)
  $newName = [System.IO.Path]::GetFileName($newPath)

  $files = @()
  try{ $files += (& git grep -I -l -- "$oldRel" 2>$null) } catch {}
  try{ $files += (& git grep -I -l -- "$oldName" 2>$null) } catch {}
  $files = $files | Sort-Object -Unique

  foreach($f in $files){
    if(-not (Test-Path $f)) { continue }
    $text = Get-Content $f -Raw
    $newText = $text -replace [regex]::Escape($oldRel), $newRel
    $newText = $newText -replace [regex]::Escape($oldName), $newName
    if($newText -ne $text){
      Set-Content -Path $f -Value $newText
      git add -- $f
      Write-Host "Updated references in $f"
    }
  }
}

# Commit & push if there are staged changes
& git add -A
$staged = & git diff --cached --name-only
if($staged){
  & git commit -m "Normalize visual-guide image filenames and update references"
  & git push origin master
  Write-Host "Committed and pushed changes to master."
} else {
  Write-Host "No changes to commit."
}
