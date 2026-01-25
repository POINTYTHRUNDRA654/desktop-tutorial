# xEdit Scripting Guide for Fallout 4
## Advanced Automation with Pascal Scripts

**Based on the official xEdit Scripting Documentation**

---

## Table of Contents

### Part 1: Getting Started
- [1. Overview](#1-overview)
- [2. Script Development Setup](#2-script-development-setup)
- [3. Basic Script Structure](#3-basic-script-structure)
- [4. Your First Script](#4-your-first-script)

### Part 2: Core Concepts
- [5. Global Variables](#5-global-variables)
- [6. Base Script Functions](#6-base-script-functions)
- [7. Script References and Code Reuse](#7-script-references-and-code-reuse)
- [8. Hotkeys](#8-hotkeys)

### Part 3: API Reference
- [9. Type Hierarchy](#9-type-hierarchy)
- [10. IwbElement Functions](#10-iwbelement-functions)
- [11. IwbContainer Functions](#11-iwbcontainer-functions)
- [12. IwbFile Functions](#12-iwbfile-functions)
- [13. IwbMainRecord Functions](#13-iwbmainrecord-functions)
- [14. IwbGroupRecord Functions](#14-iwbgrouprecord-functions)
- [15. IwbResource Functions](#15-iwbresource-functions)

### Part 4: Advanced Topics
- [16. User Interface Components](#16-user-interface-components)
- [17. NIF and DDS Functions](#17-nif-and-dds-functions)
- [18. Pascal Implementation Details](#18-pascal-implementation-details)
- [19. Limitations and Workarounds](#19-limitations-and-workarounds)

### Part 5: Resources
- [20. Script Collections](#20-script-collections)
- [21. Tutorial Resources](#21-tutorial-resources)

---

## Part 1: Getting Started

### 1. Overview

xEdit (FO4Edit for Fallout 4) includes a powerful Pascal-based scripting engine that allows you to automate complex tasks:

**Common Script Uses:**
- Batch editing records
- Finding specific patterns across mods
- Exporting data to external formats
- Importing data from spreadsheets
- Automating conflict resolution
- Generating reports
- Creating compatibility patches

**What You Can Script:**
- Record manipulation
- FormID operations
- File management
- Asset operations
- Report generation
- Custom UI dialogs

**Script Location:**
```
FO4Edit\Edit Scripts\
```

All `.pas` files in this directory appear in FO4Edit's "Apply Script" menu.

### 2. Script Development Setup

#### 2.1 Basic Setup (No IDE)

**Creating a Script:**

1. Navigate to `FO4Edit\Edit Scripts\`
2. Create new file: `MyScript.pas`
3. Edit with text editor (Notepad++, VS Code, etc.)
4. Save
5. Run from FO4Edit: Right-click → Apply Script

**Minimal Script Template:**
```pascal
unit MyScript;

interface
implementation

// Your code here

end.
```

#### 2.2 Advanced Setup (With Delphi IDE)

**Why Use Delphi?**
- Syntax checking before running
- IntelliSense/code completion
- Error detection
- Debugging support

**Download Delphi:**
- Get free [RAD Studio Community Edition](https://www.embarcadero.com/products/delphi/starter)
- Current version: 11.x (as of 2026)

**Setup Steps:**

1. **Install Delphi**

2. **Create Console Application:**
   - File → New → Console Application
   - Name: `MyScriptApp`

3. **Add xEdit API:**
   - Copy `xEditAPI.pas` from FO4Edit's Edit Scripts folder
   - Project → Add to Project → Select `xEditAPI.pas`

4. **Create Your Script:**
   - Add new unit to project
   - Name it exactly as your script file: `MyScript.pas`

5. **Script Structure:**
```pascal
unit MyScript;

interface
implementation
uses xEditAPI, Classes, SysUtils, StrUtils, Windows;

// Your script code here

end.
```

6. **Configure Main App (Optional):**
```pascal
program MyScriptApp;

{$APPTYPE CONSOLE}
{$R *.res}

uses
  Windows,
  Winapi.ShellApi,
  System.SysUtils,
  xEditAPI in 'C:\Games\FO4Edit\Edit Scripts\xEditAPI.pas',
  MyScript in 'C:\Games\FO4Edit\Edit Scripts\MyScript.pas';

begin
  try
    ShellExecute(0, Nil, 
      'C:\Games\FO4Edit\FO4Edit.exe', 
      '-script:"MyScript.pas" -nobuildrefs', 
      'C:\Games\FO4Edit', 
      SW_SHOWNORMAL);
  except
    on E: Exception do
      Writeln(E.ClassName, ': ', E.Message);
  end;
end.
```

7. **Workflow:**
   - Edit script in Delphi
   - Press Ctrl+F9 to check syntax
   - Run in FO4Edit when ready

**Common Delphi Units:**
```pascal
uses 
  xEditAPI,      // xEdit functions (always needed)
  Classes,       // TStringList, TList, etc.
  SysUtils,      // String functions
  StrUtils,      // More string functions
  Windows,       // Windows API
  IniFiles,      // INI file support
  Math;          // Mathematical functions
```

### 3. Basic Script Structure

#### 3.1 The Three Core Functions

xEdit calls three special functions when running a script:

**1. Initialize - Setup Phase**
```pascal
function Initialize: integer;
begin
  Result := 0;
  // Called ONCE when script starts
  // Use for:
  // - Creating lists/variables
  // - Setting up UI
  // - User prompts
  // - Validation
end;
```

**2. Process - Per-Record Phase**
```pascal
function Process(e: IInterface): integer;
begin
  Result := 0;
  // Called for EACH selected record
  // e = current record being processed
  // Use for:
  // - Examining records
  // - Making changes
  // - Collecting data
end;
```

**3. Finalize - Cleanup Phase**
```pascal
function Finalize: integer;
begin
  Result := 0;
  // Called ONCE when script finishes
  // Use for:
  // - Saving files
  // - Generating reports
  // - Freeing memory
  // - Final messages
end;
```

**All three functions are optional.** If you don't need one, omit it.

#### 3.2 Function Behavior

**What Gets Processed:**

When you run a script, `Process` is called on:
- Each selected record (if records selected)
- All records in a plugin (if plugin selected)
- All records of a type (if record type selected)

**Example:**
```
Selected: Fallout4.esm → WEAP
Process called for: Every weapon in Fallout4.esm
```

#### 3.3 Return Values

Functions return integers:
- `0` = Success, continue
- `1` = Terminate script immediately

**Example - Early Exit:**
```pascal
function Initialize: integer;
begin
  if not InputQuery('Script Name', 'Enter value:', myValue) then begin
    AddMessage('User cancelled');
    Result := 1; // Exit script
    Exit;
  end;
  Result := 0;
end;
```

### 4. Your First Script

#### 4.1 Simple Example - List Weapons

**Goal:** Export all weapon names and FormIDs to a text file.

**Complete Script:**
```pascal
unit ListWeapons;

interface
implementation

uses xEditAPI, Classes, SysUtils;

var
  weaponList: TStringList;
  
function Initialize: integer;
begin
  weaponList := TStringList.Create;
  weaponList.Add('FormID,EditorID,Name');
  AddMessage('Starting weapon export...');
  Result := 0;
end;

function Process(e: IInterface): integer;
var
  formID: string;
  editorID: string;
  displayName: string;
begin
  // Only process weapons
  if Signature(e) <> 'WEAP' then begin
    Result := 0;
    Exit;
  end;
  
  // Get weapon data
  formID := IntToHex(FixedFormID(e), 8);
  editorID := GetElementEditValues(e, 'EDID');
  displayName := GetElementEditValues(e, 'FULL');
  
  // Add to list
  weaponList.Add(formID + ',' + editorID + ',' + displayName);
  
  Result := 0;
end;

function Finalize: integer;
var
  filename: string;
begin
  filename := ProgramPath + 'Edit Scripts\WeaponList.txt';
  AddMessage('Saving to: ' + filename);
  weaponList.SaveToFile(filename);
  weaponList.Free;
  AddMessage('Export complete! Found ' + IntToStr(weaponList.Count - 1) + ' weapons.');
  Result := 0;
end;

end.
```

**How to Use:**

1. Save as `ListWeapons.pas` in Edit Scripts folder
2. Launch FO4Edit
3. Load Fallout4.esm
4. Expand Fallout4.esm → WEAP - Weapon
5. Select any weapon (or the WEAP group)
6. Right-click → Apply Script → ListWeapons
7. Check Edit Scripts folder for `WeaponList.txt`

#### 4.2 Example Breakdown

**Global Variables:**
```pascal
var
  weaponList: TStringList;  // Accessible in all functions
```

**Initialize Setup:**
```pascal
weaponList := TStringList.Create;  // Create list
weaponList.Add('FormID,EditorID,Name');  // CSV header
```

**Process Logic:**
```pascal
if Signature(e) <> 'WEAP' then Exit;  // Skip non-weapons
```

**Getting Data:**
```pascal
formID := IntToHex(FixedFormID(e), 8);  // FormID as hex
editorID := GetElementEditValues(e, 'EDID');  // Editor ID
displayName := GetElementEditValues(e, 'FULL');  // Display name
```

**Finalize Cleanup:**
```pascal
weaponList.SaveToFile(filename);  // Write to disk
weaponList.Free;  // Free memory
```

#### 4.3 Enhanced Example - With User Input

**Add search filter:**

```pascal
unit ListWeaponsFiltered;

interface
implementation

uses xEditAPI, Classes, SysUtils, StrUtils;

var
  weaponList: TStringList;
  searchTerm: string;
  
function Initialize: integer;
begin
  weaponList := TStringList.Create;
  weaponList.Add('FormID,EditorID,Name');
  
  // Ask user for filter
  if not InputQuery('Filter Weapons', 
                    'Enter text to filter by (leave empty for all):', 
                    searchTerm) then begin
    AddMessage('User cancelled');
    Result := 1;
    Exit;
  end;
  
  searchTerm := LowerCase(searchTerm);
  AddMessage('Starting weapon export... Filter: "' + searchTerm + '"');
  Result := 0;
end;

function Process(e: IInterface): integer;
var
  formID: string;
  editorID: string;
  displayName: string;
begin
  if Signature(e) <> 'WEAP' then Exit;
  
  formID := IntToHex(FixedFormID(e), 8);
  editorID := GetElementEditValues(e, 'EDID');
  displayName := GetElementEditValues(e, 'FULL');
  
  // Apply filter if specified
  if searchTerm <> '' then begin
    if not ContainsText(editorID, searchTerm) and 
       not ContainsText(displayName, searchTerm) then Exit;
  end;
  
  weaponList.Add(formID + ',' + editorID + ',' + displayName);
  Result := 0;
end;

function Finalize: integer;
var
  filename: string;
begin
  filename := ProgramPath + 'Edit Scripts\WeaponList_Filtered.txt';
  AddMessage('Saving to: ' + filename);
  weaponList.SaveToFile(filename);
  weaponList.Free;
  AddMessage('Export complete! Found ' + IntToStr(weaponList.Count - 1) + ' weapons.');
  Result := 0;
end;

end.
```

---

## Part 2: Core Concepts

### 5. Global Variables

xEdit provides read-only global variables accessible anywhere in your script:

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `DataPath` | String | Path to game's Data folder | `C:\Games\Fallout 4\Data\` |
| `ProgramPath` | String | Path to FO4Edit installation | `C:\Games\FO4Edit\` |
| `ScriptsPath` | String | Path to Edit Scripts folder | `C:\Games\FO4Edit\Edit Scripts\` |
| `FileCount` | Integer | Number of loaded files | `25` (includes Fallout4.esm, DLCs, mods) |
| `wbAppName` | String | Game identifier | `'FO4'` for Fallout 4 |
| `wbVersionNumber` | Integer | xEdit version | `4004` for v4.0.4 |

**Usage Examples:**

```pascal
// Save file to Scripts folder
procedure SaveReport;
var
  filename: string;
begin
  filename := ScriptsPath + 'MyReport.txt';
  myList.SaveToFile(filename);
end;

// Check xEdit version
procedure CheckVersion;
begin
  if wbVersionNumber < 4000 then begin
    AddMessage('Please update xEdit to 4.0+');
    Exit;
  end;
end;

// Process all loaded files
procedure ProcessAllFiles;
var
  i: integer;
  f: IwbFile;
begin
  for i := 0 to FileCount - 1 do begin
    f := FileByIndex(i);
    AddMessage('Processing: ' + GetFileName(f));
  end;
end;
```

### 6. Base Script Functions

#### 6.1 Core Functions Reference

**Initialize** - Called once at start
```pascal
function Initialize: integer;
begin
  Result := 0;
  // Setup code
end;
```

**Process** - Called for each selected element
```pascal
function Process(e: IInterface): integer;
begin
  Result := 0;
  // Processing code
end;
```

**Finalize** - Called once at end
```pascal
function Finalize: integer;
begin
  Result := 0;
  // Cleanup code
end;
```

#### 6.2 Script Without Process

Some scripts don't need to process records:

```pascal
unit BatchLoadOrder;

// Script to display load order

interface
implementation

uses xEditAPI, Classes, SysUtils;

function Initialize: integer;
var
  i: integer;
  f: IwbFile;
begin
  AddMessage('=== Load Order ===');
  for i := 0 to FileCount - 1 do begin
    f := FileByIndex(i);
    AddMessage('[' + IntToStr(i) + '] ' + GetFileName(f));
  end;
  AddMessage('=== Total: ' + IntToStr(FileCount) + ' files ===');
  Result := 0;
end;

// No Process function needed!
// No Finalize function needed!

end.
```

#### 6.3 Script With Only Process

Simple processing without setup/cleanup:

```pascal
unit QuickDamageBoost;

// Doubles damage of all selected weapons

interface
implementation

uses xEditAPI;

function Process(e: IInterface): integer;
var
  damage: integer;
begin
  if Signature(e) <> 'WEAP' then Exit;
  
  damage := GetElementNativeValues(e, 'DATA\Damage');
  SetElementNativeValues(e, 'DATA\Damage', damage * 2);
  AddMessage('Boosted: ' + DisplayName(e));
  
  Result := 0;
end;

end.
```

### 7. Script References and Code Reuse

You can split code into reusable libraries.

#### 7.1 Creating a Library

**File: `MyToolkit.pas`**
```pascal
unit MyToolkit;

interface
implementation

uses xEditAPI, SysUtils;

// Check if record is a weapon
function IsWeapon(e: IInterface): boolean;
begin
  Result := Signature(e) = 'WEAP';
end;

// Check if record is armor
function IsArmor(e: IInterface): boolean;
begin
  Result := Signature(e) = 'ARMO';
end;

// Get record's display name safely
function SafeGetName(e: IInterface): string;
begin
  Result := GetElementEditValues(e, 'FULL');
  if Result = '' then
    Result := GetElementEditValues(e, 'EDID');
  if Result = '' then
    Result := Name(e);
end;

// Log message with timestamp
procedure LogMsg(msg: string);
begin
  AddMessage('[' + TimeToStr(Now) + '] ' + msg);
end;

end.
```

#### 7.2 Using a Library

**File: `MyScript.pas`**
```pascal
unit MyScript;

interface
implementation

uses 
  xEditAPI, 
  Classes, 
  SysUtils,
  MyToolkit;  // <-- Import our library

function Process(e: IInterface): integer;
begin
  // Use toolkit functions
  if IsWeapon(e) then begin
    LogMsg('Found weapon: ' + SafeGetName(e));
  end;
  
  if IsArmor(e) then begin
    LogMsg('Found armor: ' + SafeGetName(e));
  end;
  
  Result := 0;
end;

end.
```

**Important:** Both files must be in the Edit Scripts folder.

#### 7.3 Avoiding Name Conflicts

If two libraries have functions with the same name:

```pascal
uses MyToolkit, OtherLibrary;

// Use unit name prefix
MyToolkit.IsWeapon(e);
OtherLibrary.IsWeapon(e);
```

### 8. Hotkeys

Assign keyboard shortcuts to scripts.

#### 8.1 Defining a Hotkey

Add to script's header comment:

```pascal
{
  Quick weapon damage boost
  
  Doubles damage of selected weapons
  ------------------------
  Hotkey: Ctrl+D
}
unit QuickDamageBoost;
```

**Valid Hotkey Formats:**
- `Ctrl+D`
- `Shift+F5`
- `Alt+W`
- `Ctrl+Shift+E`
- `Ctrl+Alt+Shift+Q`

#### 8.2 Hotkey Best Practices

**Good Hotkeys:**
- Use with modifiers: `Ctrl+`, `Shift+`, `Alt+`
- Memorable mnemonics: `Ctrl+D` for Damage
- Document in script description

**Avoid:**
- Single keys (conflicts with normal typing)
- F1-F12 alone (xEdit uses these)
- Ctrl+S, Ctrl+C, etc. (standard shortcuts)

**Example - Well-Documented Script:**
```pascal
{
  Armor Value Editor
  
  Quick edit armor rating for selected armor records
  
  Usage:
    1. Select armor records
    2. Press Ctrl+Alt+A
    3. Enter new armor value
  
  Hotkey: Ctrl+Alt+A
}
unit ArmorValueEditor;

interface
implementation

uses xEditAPI, SysUtils;

function Process(e: IInterface): integer;
var
  newValue: string;
begin
  if Signature(e) <> 'ARMO' then Exit;
  
  if InputQuery('Armor Rating', 
                'Enter new armor value:', 
                newValue) then begin
    SetElementEditValues(e, 'DNAM', newValue);
    AddMessage('Updated: ' + DisplayName(e));
  end;
  
  Result := 0;
end;

end.
```

---

## Part 3: API Reference

### 9. Type Hierarchy

xEdit uses an internal type system. Scripts only see `IInterface`, but understanding the hierarchy helps:

```
IwbElement (base type for all elements)
├─ IwbContainerBase
│  ├─ IwbContainer
│  │  ├─ IwbDataContainer
│  │  │  ├─ IwbFileHeader
│  │  │  ├─ IwbRecord
│  │  │  ├─ IwbGroupRecord
│  │  │  ├─ IwbMainRecord
│  │  │  └─ IwbSubRecord
│  │  └─ IwbFile
│  └─ IwbContainerElementRef

IwbResource (for BSA/BA2 files)
├─ IwbResourceContainer
   ├─ IwbBA2File
   ├─ IwbBSAFile
   └─ IwbFolder
```

**What This Means:**

- **IwbFile** = Plugin file (.esp, .esm, .esl)
- **IwbMainRecord** = Game record (WEAP, ARMO, NPC_, etc.)
- **IwbGroupRecord** = Group of records (GRUP)
- **IwbSubRecord** = Field within a record
- **IwbContainer** = Anything that contains other elements

**All types can be treated as IInterface in scripts.**

### 10. IwbElement Functions

These work on ANY element.

#### 10.1 Basic Information

**Name** - Get element's name
```pascal
function Name(e: IInterface): string;

// Example:
name := Name(myRecord);
// Returns: "[WEAP:000D1D14] LaserPistol 'Laser Pistol'"
```

**BaseName** - Get name without decoration
```pascal
function BaseName(e: IInterface): string;

// Example:
name := BaseName(myRecord);
// Returns: "LaserPistol 'Laser Pistol'"
```

**ShortName** - Get minimal name
```pascal
function ShortName(e: IInterface): string;

// Example:
name := ShortName(myRecord);
// Returns: "[WEAP:000D1D14]"
```

**DisplayName** - Get display name
```pascal
function DisplayName(e: IInterface): string;

// Usually same as Name, but better for UI display
```

**Path** - Get element's path component
```pascal
function Path(e: IInterface): string;

// Returns one segment of the path
// Use with ElementByPath to construct paths
```

**FullPath** - Get complete path
```pascal
function FullPath(e: IInterface): string;

// Example:
path := FullPath(myElement);
// Returns: "\[02] MyMod.esp\WEAP\[WEAP:00012345]\DATA\Damage"
```

**PathName** - Get indexed path
```pascal
function PathName(e: IInterface): string;

// Like FullPath but includes array indices
// Returns: "\[02] MyMod.esp\[7] Worldspace\[1] World Children..."
```

#### 10.2 Type Checking

**Signature** - Get record type
```pascal
function Signature(e: IInterface): string;

// Example:
if Signature(e) = 'WEAP' then begin
  // It's a weapon
end;
```

**DefType** - Get definition type
```pascal
function DefType(e: IInterface): TwbDefType;

// Advanced: Returns internal definition type
// Rarely needed in scripts
```

**ElementType** - Get element type
```pascal
function ElementType(e: IInterface): TwbElementType;

// Returns one of:
// etFile, etMainRecord, etGroupRecord, etSubRecord,
// etSubRecordStruct, etSubRecordArray, etSubRecordUnion,
// etArray, etStruct, etValue, etFlag, etStringListTerminator,
// etUnion, etStructChapter
```

#### 10.3 Value Access

**GetEditValue** - Get value as string
```pascal
function GetEditValue(e: IInterface): string;

// Example:
damage := GetEditValue(damageElement);
// Returns: "24"
```

**SetEditValue** - Set value from string
```pascal
procedure SetEditValue(e: IInterface; value: string);

// Example:
SetEditValue(damageElement, '50');
```

**GetNativeValue** - Get value in native type
```pascal
function GetNativeValue(e: IInterface): variant;

// Example:
damage := GetNativeValue(damageElement);
// Returns: 24 (as integer)
```

**SetNativeValue** - Set native value
```pascal
procedure SetNativeValue(e: IInterface; value: variant);

// Example:
SetNativeValue(damageElement, 50);
```

#### 10.4 Hierarchical Navigation

**ContainingMainRecord** - Get parent record
```pascal
function ContainingMainRecord(e: IInterface): IwbMainRecord;

// Example:
record := ContainingMainRecord(mySubRecord);
// Returns the WEAP, ARMO, etc. that contains this element
```

**GetContainer** - Get immediate parent
```pascal
function GetContainer(e: IInterface): IwbContainer;

// Returns the direct parent container
```

**GetFile** - Get containing file
```pascal
function GetFile(e: IInterface): IwbFile;

// Example:
pluginFile := GetFile(myRecord);
filename := GetFileName(pluginFile);
```

#### 10.5 Editing Operations

**Remove** - Delete element
```pascal
procedure Remove(e: IInterface);

// Example:
Remove(unwantedElement);
// Removes from parent and marks file as modified
```

**SetToDefault** - Reset to default
```pascal
procedure SetToDefault(e: IInterface);

// Resets element's value and adds any missing required fields
```

**MarkModifiedRecursive** - Force serialization
```pascal
procedure MarkModifiedRecursive(e: IInterface);

// Marks element and all descendants as modified
// Forces xEdit to save them even if unchanged
```

#### 10.6 Array Operations

**CanMoveUp** - Check if moveable up
```pascal
function CanMoveUp(e: IInterface): boolean;

// Returns True if element is in an array and not first
```

**CanMoveDown** - Check if moveable down
```pascal
function CanMoveDown(e: IInterface): boolean;

// Returns True if element is in an array and not last
```

**MoveUp** - Move element up
```pascal
procedure MoveUp(e: IInterface);

// Moves element one position up in its array
```

**MoveDown** - Move element down
```pascal
procedure MoveDown(e: IInterface);

// Moves element one position down in its array
```

#### 10.7 Special Value Functions

**EnumValues** - Get enum flags as string
```pascal
function EnumValues(e: IInterface): string;

// For enum flags, returns set values separated by spaces
// Example: "IronSights Automatic Repeater"
```

**FlagValues** - Get flag names
```pascal
function FlagValues(e: IInterface): string;

// For flag fields, returns set flag names
// Example: "ESM Localized"
```

**LinksTo** - Get referenced element
```pascal
function LinksTo(e: IInterface): IwbElement;

// For FormID fields, returns the record they reference
// Example:
baseRecord := LinksTo(baseFormIDElement);
```

#### 10.8 State Management

**GetElementState** - Check element state
```pascal
function GetElementState(e: IInterface; state: TwbElementState): TwbElementState;

// Check internal element flags
```

**SetElementState** - Set element state
```pascal
function SetElementState(e: IInterface; state: TwbElementState): TwbElementState;

// Modify internal element flags
// Returns previous state
```

**ClearElementState** - Clear element state
```pascal
procedure ClearElementState(e: IInterface; state: TwbElementState);

// Clear specific internal flags
```

#### 10.9 Validation

**Check** - Check for errors
```pascal
function Check(e: IInterface): string;

// Returns error message or empty string if valid
// Example:
error := Check(myRecord);
if error <> '' then
  AddMessage('Error: ' + error);
```

**IsEditable** - Check if editable
```pascal
function IsEditable(e: IInterface): boolean;

// Returns False for master files (when not in edit mode)
```

**IsInjected** - Check if injected
```pascal
function IsInjected(e: IInterface): boolean;

// Returns True for injected records
```

#### 10.10 References

**BuildRef** - Build reference info
```pascal
procedure BuildRef(e: IInterface);

// Builds reference information for element and descendants
// Needed before using ReferencedBy functions
```

**CanContainFormIDs** - Check for FormIDs
```pascal
function CanContainFormIDs(e: IInterface): boolean;

// Returns True if element can contain FormIDs
// May return False even if it does contain some
```

**ReportRequiredMasters** - Get master dependencies
```pascal
procedure ReportRequiredMasters(
  e: IInterface;
  list: TStrings;
  recursive: boolean;
  initial: boolean
);

// Adds required master filenames to list
// recursive: process child elements
// initial: internal flag, use False
```

#### 10.11 Advanced Operations

**BeginUpdate/EndUpdate** - Batch operations
```pascal
procedure BeginUpdate(e: IInterface);
try
  // Make multiple changes
  Add(e, 'SubRecord1');
  Add(e, 'SubRecord2');
  Remove(ElementByIndex(e, 5));
finally
  EndUpdate(e);
end;

// Improves performance for bulk operations
```

**Equals** - Compare elements
```pascal
function Equals(e1, e2: IInterface): boolean;

// Compares by ElementID
// Use when = operator doesn't work correctly
if Equals(element1, element2) then
  AddMessage('Same element');
```

**SortKey** - Get sort key
```pascal
function SortKey(e: IInterface): string;

// Returns unique string for sorting/comparing
// Example:
key1 := SortKey(elem1);
key2 := SortKey(elem2);
if key1 <> key2 then
  AddMessage('Elements differ');
```

**wbCopyElementToFile** - Copy to another file
```pascal
function wbCopyElementToFile(
  e: IInterface;
  targetFile: IwbFile;
  asNew: boolean;
  deepCopy: boolean
): IwbElement;

// Copy element to another plugin
// asNew: True = new record, False = override
// deepCopy: True = copy all descendants
// Returns: copied element
```

### 11. IwbContainer Functions

These work on containers (elements that can hold other elements).

#### 11.1 Child Element Access

**ElementCount** - Get number of children
```pascal
function ElementCount(container: IwbContainer): integer;

// Example:
count := ElementCount(myRecord);
AddMessage('Record has ' + IntToStr(count) + ' fields');
```

**ElementByIndex** - Get child by index
```pascal
function ElementByIndex(container: IwbContainer; index: integer): IwbElement;

// Example:
for i := 0 to ElementCount(record) - 1 do begin
  element := ElementByIndex(record, i);
  AddMessage(Name(element));
end;
```

**ElementByName** - Get child by name
```pascal
function ElementByName(container: IwbContainer; name: string): IwbElement;

// Example:
edidElement := ElementByName(record, 'EDID - Editor ID');
if Assigned(edidElement) then
  editorID := GetEditValue(edidElement);
```

**ElementBySignature** - Get child by signature
```pascal
function ElementBySignature(container: IwbContainer; sig: string): IwbElement;

// Example:
fullElement := ElementBySignature(record, 'FULL');
displayName := GetEditValue(fullElement);
```

**ElementByPath** - Get descendant by path
```pascal
function ElementByPath(container: IwbContainer; path: string): IwbElement;

// Example:
damage := ElementByPath(weapon, 'DATA\Damage');
SetEditValue(damage, '50');

// Path uses backslashes to separate levels
// Example paths:
// 'EDID'
// 'DATA\Value'
// 'KWDA\[0]'  // First keyword
```

**LastElement** - Get last child
```pascal
function LastElement(container: IwbContainer): IwbElement;

// Returns last child element or Nil if empty
```

#### 11.2 Child Element Queries

**ElementExists** - Check if child exists
```pascal
function ElementExists(container: IwbContainer; name: string): boolean;

// Example:
if ElementExists(record, 'FULL') then
  AddMessage('Record has a name');
```

**IndexOf** - Get child's index
```pascal
function IndexOf(container: IwbContainer; element: IwbElement): integer;

// Returns index of element in container, or -1 if not found
// Example:
index := IndexOf(parent, child);
if index >= 0 then
  AddMessage('Found at index: ' + IntToStr(index));
```

**IsSorted** - Check if auto-sorted
```pascal
function IsSorted(container: IwbContainer): boolean;

// Returns True if container is always kept sorted
// If True, CanMoveUp/CanMoveDown will always return False for children
```

#### 11.3 Element Creation and Modification

**Add** - Add or get child element
```pascal
function Add(container: IwbContainer; name: string; silent: boolean): IwbElement;

// Creates child element if it doesn't exist
// Otherwise returns existing element
// silent: suppress error messages if True

// Example:
keywords := Add(record, 'KWDA', True);
```

**AddElement** - Add element directly
```pascal
procedure AddElement(container: IwbContainer; element: IwbElement);

// Adds element as child
// Element must not already have a parent
// Example usage is rare - usually use Add or wbCopyElementToRecord
```

**InsertElement** - Insert at position
```pascal
procedure InsertElement(container: IwbContainer; position: integer; element: IwbElement);

// Inserts element at specific position
// Example:
InsertElement(myArray, 0, newElement); // Insert at beginning
```

**RemoveElement** - Remove child
```pascal
function RemoveElement(container: IwbContainer; element: variant): IwbElement;

// Remove child and return it
// element can be:
// - Integer (index)
// - String (name or signature)
// - IwbElement (the element itself)

// Examples:
RemoveElement(record, 0);  // Remove first child
RemoveElement(record, 'FULL');  // Remove by name
RemoveElement(record, myElement);  // Remove specific element
```

**RemoveByIndex** - Remove by index
```pascal
function RemoveByIndex(container: IwbContainer; index: integer; markModified: boolean): IwbElement;

// Remove child at index and return it
// markModified: whether to mark container as modified
```

**ReverseElements** - Reverse order
```pascal
procedure ReverseElements(container: IwbContainer);

// Reverses the order of all child elements
// Useful for certain array manipulations
```

#### 11.4 Batch Value Access

**GetElementEditValues** - Get descendant value as string
```pascal
function GetElementEditValues(container: IwbContainer; path: string): string;

// Shortcut for: GetEditValue(ElementByPath(container, path))
// Example:
editorID := GetElementEditValues(record, 'EDID');
damage := GetElementEditValues(weapon, 'DATA\Damage');
```

**SetElementEditValues** - Set descendant value from string
```pascal
procedure SetElementEditValues(container: IwbContainer; path: string; value: string);

// Shortcut for: SetEditValue(ElementByPath(container, path), value)
// Creates element if it doesn't exist
// Example:
SetElementEditValues(weapon, 'EDID', 'MyNewWeapon');
SetElementEditValues(weapon, 'DATA\Damage', '75');
```

**GetElementNativeValues** - Get descendant native value
```pascal
function GetElementNativeValues(container: IwbContainer; path: string): variant;

// Like GetElementEditValues but returns native type
// Example:
damage := GetElementNativeValues(weapon, 'DATA\Damage'); // Returns integer
```

**SetElementNativeValues** - Set descendant native value
```pascal
procedure SetElementNativeValues(container: IwbContainer; path: string; value: variant);

// Like SetElementEditValues but accepts native type
// Example:
SetElementNativeValues(weapon, 'DATA\Damage', 100); // Pass integer
```

#### 11.5 Container State

**AdditionalElementCount** - Get additional count
```pascal
function AdditionalElementCount(container: IwbContainer): integer;

// Internal function for counting "fake" elements
// Returns 1-2 for main records, 0 for sub-records
// Rarely needed in scripts
```

**ContainerStates** - Get container flags
```pascal
function ContainerStates(container: IwbContainer): byte;

// Returns internal flags as bitmask
// Used in advanced scripts for state checking
```

#### 11.6 Batch Operations

**BeginUpdate/EndUpdate Pattern:**
```pascal
BeginUpdate(container);
try
  // Multiple operations
  Add(container, 'Field1', False);
  Add(container, 'Field2', False);
  Add(container, 'Field3', False);
  RemoveElement(container, 'OldField');
finally
  EndUpdate(container);
end;

// Improves performance and reduces UI updates
```

#### 11.7 Practical Examples

**Example 1: Iterate All Children**
```pascal
procedure ListAllFields(record: IInterface);
var
  i: integer;
  element: IInterface;
begin
  for i := 0 to ElementCount(record) - 1 do begin
    element := ElementByIndex(record, i);
    AddMessage('[' + IntToStr(i) + '] ' + Name(element));
  end;
end;
```

**Example 2: Safe Value Access**
```pascal
function GetValueSafe(container: IInterface; path: string; default: string): string;
var
  element: IInterface;
begin
  element := ElementByPath(container, path);
  if Assigned(element) then
    Result := GetEditValue(element)
  else
    Result := default;
end;

// Usage:
damage := GetValueSafe(weapon, 'DATA\Damage', '0');
```

**Example 3: Add Multiple Keywords**
```pascal
procedure AddKeywords(record: IInterface; keywords: TStringList);
var
  kwda: IInterface;
  i: integer;
begin
  kwda := Add(record, 'KWDA', True);
  BeginUpdate(kwda);
  try
    for i := 0 to keywords.Count - 1 do begin
      SetElementEditValues(kwda, '[' + IntToStr(i) + ']', keywords[i]);
    end;
  finally
    EndUpdate(kwda);
  end;
end;
```

---

### 12. IwbFile Functions

These work on plugin files (.esp, .esm, .esl).

#### 12.1 File Information

**GetFileName** - Get filename
```pascal
function GetFileName(f: IwbFile): string;

// Example:
filename := GetFileName(myFile);
AddMessage('Working with: ' + filename);
// Returns: "MyMod.esp"
```

**GetLoadOrder** - Get load order position
```pascal
function GetLoadOrder(f: IwbFile): integer;

// Returns index in load order, or -1 if not a file
// Example:
loadOrder := GetLoadOrder(myFile);
AddMessage('Load order: ' + IntToStr(loadOrder));
```

**GetIsESM** - Check if flagged as master
```pascal
function GetIsESM(f: IwbFile): boolean;

// Returns True if ESM flag is set
// Example:
if GetIsESM(myFile) then
  AddMessage('This is a master file');
```

**SetIsESM** - Set master flag
```pascal
procedure SetIsESM(f: IwbFile; flag: boolean);

// Modify ESM flag
// Example:
SetIsESM(myFile, True); // Flag as master
```

#### 12.2 Master File Management

**MasterCount** - Get number of masters
```pascal
function MasterCount(f: IwbFile): cardinal;

// Returns number of master files
// Example:
count := MasterCount(myFile);
AddMessage('Has ' + IntToStr(count) + ' masters');
```

**MasterByIndex** - Get master by index
```pascal
function MasterByIndex(f: IwbFile; index: integer): IwbFile;

// Returns the index-th master file
// Example:
for i := 0 to MasterCount(myFile) - 1 do begin
  master := MasterByIndex(myFile, i);
  AddMessage('Master: ' + GetFileName(master));
end;
```

**HasMaster** - Check if has specific master
```pascal
function HasMaster(f: IwbFile; masterName: string): boolean;

// Example:
if HasMaster(myFile, 'DLCCoast.esm') then
  AddMessage('Requires Far Harbor');
```

**AddMasterIfMissing** - Add master if needed
```pascal
procedure AddMasterIfMissing(f: IwbFile; masterName: string);

// Adds master to file if not already present
// Example:
AddMasterIfMissing(myFile, 'DLCCoast.esm');
```

**SortMasters** - Sort master list
```pascal
procedure SortMasters(f: IwbFile);

// Sorts masters by their load order
// Recommended after adding/removing masters
```

**CleanMasters** - Remove unused masters
```pascal
procedure CleanMasters(f: IwbFile);

// Removes master files that aren't actually used
// Updates FormIDs accordingly
```

#### 12.3 Record Access

**RecordCount** - Get number of records
```pascal
function RecordCount(f: IwbFile): cardinal;

// Returns total number of records in file
// Example:
count := RecordCount(myFile);
AddMessage('File has ' + IntToStr(count) + ' records');
```

**RecordByIndex** - Get record by index
```pascal
function RecordByIndex(f: IwbFile; index: integer): IwbMainRecord;

// Returns the index-th record
// Example:
for i := 0 to RecordCount(myFile) - 1 do begin
  record := RecordByIndex(myFile, i);
  AddMessage(ShortName(record));
end;
```

**RecordByFormID** - Get record by FormID
```pascal
function RecordByFormID(f: IwbFile; formID: integer; allowInjected: boolean): IwbMainRecord;

// Finds record with specified FormID
// FormID must be local to file (no load order prefix)
// allowInjected: True to include injected records

// Example:
record := RecordByFormID(myFile, $00012345, False);
if Assigned(record) then
  AddMessage('Found: ' + DisplayName(record));
```

**RecordByEditorID** - Get record by EditorID
```pascal
function RecordByEditorID(f: IwbFile; editorID: string): IwbMainRecord;

// Only works for MGEF and GMST records
// For other types, use MainRecordByEditorID on a group

// Example:
setting := RecordByEditorID(Fallout4ESM, 'fJumpHeightMin');
```

#### 12.4 Group Access

**GroupBySignature** - Get top-level group
```pascal
function GroupBySignature(f: IwbFile; sig: string): IwbGroupRecord;

// Returns top-level group with specified signature
// Example:
weaponGroup := GroupBySignature(myFile, 'WEAP');
if Assigned(weaponGroup) then begin
  for i := 0 to ElementCount(weaponGroup) - 1 do begin
    weapon := ElementByIndex(weaponGroup, i);
    // Process weapon
  end;
end;
```

**HasGroup** - Check if group exists
```pascal
function HasGroup(f: IwbFile; sig: string): boolean;

// Example:
if HasGroup(myFile, 'QUST') then
  AddMessage('File contains quests');
```

#### 12.5 FormID Management

**GetNewFormID** - Get unused FormID
```pascal
function GetNewFormID(f: IwbFile): cardinal;

// Returns a new, unused FormID for creating records
// Same behavior as Add(..., ..., True)

// Example:
newID := GetNewFormID(myFile);
AddMessage('New FormID: ' + IntToHex(newID, 8));
```

**FileFormIDtoLoadOrderFormID** - Convert FormID
```pascal
function FileFormIDtoLoadOrderFormID(f: IwbFile; formID: cardinal): cardinal;

// Converts file-relative FormID to load order FormID
// Example:
fileID := $00012345;  // Relative to file's masters
loadOrderID := FileFormIDtoLoadOrderFormID(myFile, fileID);
// loadOrderID now has correct load order prefix
```

**LoadOrderFormIDtoFileFormID** - Convert FormID
```pascal
function LoadOrderFormIDtoFileFormID(f: IwbFile; formID: cardinal): cardinal;

// Converts load order FormID to file-relative FormID
// Opposite of FileFormIDtoLoadOrderFormID
```

#### 12.6 File Operations

**FileWriteToStream** - Write to stream
```pascal
procedure FileWriteToStream(f: IwbFile; stream: TStream);

// Writes file contents to stream
// Used in "SaveAs.pas" to save under new name

// Example:
var
  fileStream: TFileStream;
begin
  fileStream := TFileStream.Create('C:\Output\MyMod.esp', fmCreate);
  try
    FileWriteToStream(myFile, fileStream);
  finally
    fileStream.Free;
  end;
end;
```

#### 12.7 Creating New Files

**AddNewFile** - Create plugin with dialog
```pascal
function AddNewFile: IwbFile;

// Opens dialog asking for filename
// Creates new plugin in Data folder
// Example:
newFile := AddNewFile;
if Assigned(newFile) then
  AddMessage('Created: ' + GetFileName(newFile));
```

**AddNewFileName** - Create plugin with name
```pascal
function AddNewFileName(name: string): IwbFile;
function AddNewFileName(name: string; eslFlag: boolean): IwbFile;

// Creates new plugin with specified name
// Optional: set ESL flag during creation

// Example:
newFile := AddNewFileName('MyPatch.esp', False);
AddMasterIfMissing(newFile, 'Fallout4.esm');
```

#### 12.8 Practical Examples

**Example 1: List All Masters**
```pascal
procedure ListMasters(f: IwbFile);
var
  i: integer;
  master: IwbFile;
begin
  AddMessage('Masters for ' + GetFileName(f) + ':');
  for i := 0 to MasterCount(f) - 1 do begin
    master := MasterByIndex(f, i);
    AddMessage('  [' + IntToStr(i) + '] ' + GetFileName(master));
  end;
end;
```

**Example 2: Find All Weapons**
```pascal
procedure ListAllWeapons(f: IwbFile);
var
  group: IwbGroupRecord;
  i: integer;
  weapon: IwbMainRecord;
begin
  if not HasGroup(f, 'WEAP') then begin
    AddMessage('No weapons in ' + GetFileName(f));
    Exit;
  end;
  
  group := GroupBySignature(f, 'WEAP');
  AddMessage('Weapons in ' + GetFileName(f) + ':');
  
  for i := 0 to ElementCount(group) - 1 do begin
    weapon := ElementByIndex(group, i);
    AddMessage('  ' + GetElementEditValues(weapon, 'FULL'));
  end;
end;
```

**Example 3: Create Patch Plugin**
```pascal
function CreatePatch(name: string; masters: TStringList): IwbFile;
var
  i: integer;
begin
  Result := AddNewFileName(name, False);
  if not Assigned(Result) then Exit;
  
  // Add all required masters
  for i := 0 to masters.Count - 1 do begin
    AddMasterIfMissing(Result, masters[i]);
  end;
  
  SortMasters(Result);
  AddMessage('Created patch: ' + GetFileName(Result));
end;
```

---

### 13. IwbMainRecord Functions

These work on game records (WEAP, ARMO, NPC_, etc.).

#### 13.1 Basic Record Information

**FormID** - Get load order FormID
```pascal
function FormID(rec: IwbMainRecord): cardinal;

// Returns FormID with load order prefix
// Example:
id := FormID(myRecord);
AddMessage('FormID: ' + IntToHex(id, 8));
```

**FixedFormID** - Get file-local FormID
```pascal
function FixedFormID(rec: IwbMainRecord): cardinal;

// Returns FormID relative to record's file
// Example:
id := FixedFormID(myRecord);
AddMessage('Local FormID: ' + IntToHex(id, 8));
```

**GetLoadOrderFormID** - Get load order FormID (alternative)
```pascal
function GetLoadOrderFormID(rec: IwbMainRecord): cardinal;

// Same as FormID
```

**SetLoadOrderFormID** - Set FormID
```pascal
procedure SetLoadOrderFormID(rec: IwbMainRecord; formID: cardinal);

// Changes record's FormID
// ⚠️ Dangerous - can break references
// formID should be load order relative

// Example:
SetLoadOrderFormID(myRecord, $FF001234);
```

**CompareExchangeFormID** - Atomic FormID change
```pascal
function CompareExchangeFormID(rec: IwbMainRecord; oldID, newID: cardinal): boolean;

// Changes FormID only if it currently equals oldID
// Returns True if successful
// Safer than SetLoadOrderFormID

// Example:
if CompareExchangeFormID(rec, $FF000123, $FF000456) then
  AddMessage('FormID changed successfully');
```

**Signature** - Get record type
```pascal
function Signature(rec: IwbMainRecord): string;

// Returns 4-character signature
// Example:
if Signature(myRecord) = 'WEAP' then
  AddMessage('It''s a weapon');
```

**EditorID** - Get EditorID
```pascal
function EditorID(rec: IwbMainRecord): string;

// Returns editor ID
// Example:
id := EditorID(myRecord);
AddMessage('EditorID: ' + id);
```

**SetEditorID** - Set EditorID
```pascal
function SetEditorID(rec: IwbMainRecord; id: string): string;

// Sets EditorID and returns it
// Example:
SetEditorID(myRecord, 'MyNewWeapon');
```

#### 13.2 Record Flags

**GetIsDeleted** - Check deleted flag
```pascal
function GetIsDeleted(rec: IwbMainRecord): boolean;

// Returns True if record is marked deleted
```

**SetIsDeleted** - Set deleted flag
```pascal
procedure SetIsDeleted(rec: IwbMainRecord; flag: boolean);

// Mark record as deleted or undeleted
// ⚠️ Prefer Undelete and Disable References for proper deletion
```

**GetIsPersistent** - Check persistent flag
```pascal
function GetIsPersistent(rec: IwbMainRecord): boolean;

// Returns True if record is persistent reference
```

**SetIsPersistent** - Set persistent flag
```pascal
procedure SetIsPersistent(rec: IwbMainRecord; flag: boolean);

// Mark reference as persistent
```

**GetIsInitiallyDisabled** - Check disabled flag
```pascal
function GetIsInitiallyDisabled(rec: IwbMainRecord): boolean;

// Returns True if reference starts disabled
```

**SetIsInitiallyDisabled** - Set disabled flag
```pascal
procedure SetIsInitiallyDisabled(rec: IwbMainRecord; flag: boolean);

// Mark reference as initially disabled
```

**GetIsVisibleWhenDistant** - Check VWD flag
```pascal
function GetIsVisibleWhenDistant(rec: IwbMainRecord): boolean;

// Returns True if has visible when distant flag
```

**SetIsVisibleWhenDistant** - Set VWD flag
```pascal
procedure SetIsVisibleWhenDistant(rec: IwbMainRecord; flag: boolean);

// Mark as visible when distant
```

#### 13.3 Record Version Fields

**GetFormVersion** - Get form version
```pascal
function GetFormVersion(rec: IwbMainRecord): cardinal;

// Returns Form Version field from header
```

**SetFormVersion** - Set form version
```pascal
procedure SetFormVersion(rec: IwbMainRecord; version: cardinal);

// Set Form Version field
```

**GetFormVCS1** - Get VCS1
```pascal
function GetFormVCS1(rec: IwbMainRecord): cardinal;

// Returns Version Control Info 1
```

**SetFormVCS1** - Set VCS1
```pascal
procedure SetFormVCS1(rec: IwbMainRecord; value: cardinal);

// Set Version Control Info 1
```

**GetFormVCS2** - Get VCS2
```pascal
function GetFormVCS2(rec: IwbMainRecord): cardinal;

// Returns Version Control Info 2
```

**SetFormVCS2** - Set VCS2
```pascal
procedure SetFormVCS2(rec: IwbMainRecord; value: cardinal);

// Set Version Control Info 2
```

#### 13.4 Master and Override Records

**IsMaster** - Check if master
```pascal
function IsMaster(rec: IwbMainRecord): boolean;

// Returns True if this is the master record (not an override)
```

**Master** - Get master record
```pascal
function Master(rec: IwbMainRecord): IwbMainRecord;

// Returns the master record
// If this IS the master, returns self
```

**MasterOrSelf** - Get master or self
```pascal
function MasterOrSelf(rec: IwbMainRecord): IwbMainRecord;

// Returns master if override, otherwise returns self
// Useful for getting the "definitive" record
```

**IsWinningOverride** - Check if winning
```pascal
function IsWinningOverride(rec: IwbMainRecord): boolean;

// Returns True if this is the last loaded override
```

**WinningOverride** - Get winning override
```pascal
function WinningOverride(rec: IwbMainRecord): IwbMainRecord;

// Returns the last loaded override
// This is what the game actually uses
```

**HighestOverrideOrSelf** - Get highest override
```pascal
function HighestOverrideOrSelf(rec: IwbMainRecord; maxIndex: integer): IwbMainRecord;

// Returns highest override up to maxIndex
// If no overrides, returns self
```

**OverrideCount** - Get number of overrides
```pascal
function OverrideCount(rec: IwbMainRecord): cardinal;

// Returns how many records override this one
```

**OverrideByIndex** - Get override by index
```pascal
function OverrideByIndex(rec: IwbMainRecord; index: integer): IwbMainRecord;

// Returns the index-th override
// Example:
for i := 0 to OverrideCount(master) - 1 do begin
  override := OverrideByIndex(master, i);
  AddMessage('Override in: ' + GetFileName(GetFile(override)));
end;
```

#### 13.5 References

**ReferencedByCount** - Get reference count
```pascal
function ReferencedByCount(rec: IwbMainRecord): cardinal;

// Returns number of records that reference this one
// Requires BuildRef to be called first
```

**ReferencedByIndex** - Get referencing record
```pascal
function ReferencedByIndex(rec: IwbMainRecord; index: integer): IwbMainRecord;

// Returns the index-th record that references this one
// Requires BuildRef

// Example:
BuildRef(myRecord);
count := ReferencedByCount(myRecord);
AddMessage('Referenced by ' + IntToStr(count) + ' records:');
for i := 0 to count - 1 do begin
  ref := ReferencedByIndex(myRecord, i);
  AddMessage('  ' + ShortName(ref));
end;
```

**UpdateRefs** - Update reference info
```pascal
procedure UpdateRefs(rec: IwbMainRecord);

// Like BuildRef but aborts if already building
```

#### 13.6 Child Groups

**ChildGroup** - Get child group
```pascal
function ChildGroup(rec: IwbMainRecord): IwbGroupRecord;

// Returns the group contained by this record
// Example: DIAL contains a group of INFO records
// Example: WRLD contains a group of CELL records
```

#### 13.7 Reference-Specific Functions

**BaseRecord** - Get base record
```pascal
function BaseRecord(rec: IwbMainRecord): IwbMainRecord;

// If rec is a reference (REFR, ACHR, etc.), returns its base record
// Otherwise returns Nil
```

**BaseRecordID** - Get base FormID
```pascal
function BaseRecordID(rec: IwbMainRecord): cardinal;

// Returns load order FormID of base record
```

**GetPosition** - Get reference position
```pascal
function GetPosition(rec: IwbMainRecord): TwbVector;

// Returns position for references
// Access as: pos.x, pos.y, pos.z
```

**GetRotation** - Get reference rotation
```pascal
function GetRotation(rec: IwbMainRecord): TwbVector;

// Returns rotation for references
// Access as: rot.x, rot.y, rot.z
```

**GetGridCell** - Get cell coordinates
```pascal
function GetGridCell(rec: IwbMainRecord): TwbGridCell;

// If rec is exterior CELL, returns grid coordinates
// Access as: cell.x, cell.y
```

#### 13.8 Fallout 4 Specific

**HasPrecombinedMesh** - Check for precombine
```pascal
function HasPrecombinedMesh(rec: IwbMainRecord): boolean;

// Returns True if FO4 reference has precombined mesh data
```

**PrecombinedMesh** - Get precombine path
```pascal
function PrecombinedMesh(rec: IwbMainRecord): string;

// Returns path to precombined mesh file
```

#### 13.9 Record Modification

**ChangeFormSignature** - Change signature
```pascal
procedure ChangeFormSignature(rec: IwbMainRecord; newSig: string);

// Changes record type (signature)
// ⚠️ Very dangerous - only use if you know what you're doing
// No other data is modified

// Example (generally bad idea):
ChangeFormSignature(myRecord, 'MISC');
```

#### 13.10 Practical Examples

**Example 1: Find Winning Override**
```pascal
function GetEffectiveRecord(rec: IwbMainRecord): IwbMainRecord;
begin
  Result := WinningOverride(MasterOrSelf(rec));
end;

// Use this to always get the record the game uses
```

**Example 2: Copy Record to New Plugin**
```pascal
function CopyToNewPlugin(rec: IwbMainRecord; targetFile: IwbFile): IwbMainRecord;
begin
  Result := wbCopyElementToFile(rec, targetFile, False, True);
  AddMessage('Copied ' + ShortName(rec) + ' to ' + GetFileName(targetFile));
end;
```

**Example 3: List All Overrides**
```pascal
procedure ListOverrides(rec: IwbMainRecord);
var
  i: integer;
  override: IwbMainRecord;
  master: IwbMainRecord;
begin
  master := MasterOrSelf(rec);
  AddMessage('Overrides for ' + ShortName(master) + ':');
  AddMessage('  Master: ' + GetFileName(GetFile(master)));
  
  for i := 0 to OverrideCount(master) - 1 do begin
    override := OverrideByIndex(master, i);
    AddMessage('  Override: ' + GetFileName(GetFile(override)));
  end;
end;
```

**Example 4: Check If Weapon**
```pascal
function IsWeapon(rec: IInterface): boolean;
begin
  Result := Signature(rec) = 'WEAP';
end;

function IsArmor(rec: IInterface): boolean;
begin
  Result := Signature(rec) = 'ARMO';
end;
```

---

### 14. IwbGroupRecord Functions

Groups contain related records.

#### 14.1 Group Information

**GroupType** - Get group type
```pascal
function GroupType(group: IwbGroupRecord): integer;

// Returns raw group type from file format:
// 0 = Top-level group (WEAP, ARMO, etc.)
// 1 = World children
// 2 = Interior cell block
// 3 = Interior cell sub-block
// 4 = Exterior cell block
// 5 = Exterior cell sub-block
// 6 = Cell children
// 7 = Topic children
// 8 = Cell persistent children
// 9 = Cell temporary children
// 10 = Cell visible distant children
```

**GroupLabel** - Get group label
```pascal
function GroupLabel(group: IwbGroupRecord): cardinal;

// Returns raw group label from file format
// Interpretation depends on group type
```

#### 14.2 Parent Record

**ChildrenOf** - Get parent record
```pascal
function ChildrenOf(group: IwbGroupRecord): IwbMainRecord;

// Returns the record this group belongs to
// Example:
// - DIAL group contains INFO records → returns DIAL
// - CELL group contains references → returns CELL
// - WRLD group contains cells → returns WRLD
```

#### 14.3 Finding Child Groups

**FindChildGroup** - Find nested group
```pascal
function FindChildGroup(
  parentGroup: IwbGroupRecord;
  groupType: integer;
  mainRecord: IwbMainRecord
): IwbGroupRecord;

// Finds child group within parent group
// Used in "Worldspace browser.pas" script

// Example:
tempGroup := FindChildGroup(ChildGroup(cell), 9, cell);
// Gets "Temporary" group (type 9) within cell
```

#### 14.4 Record Search

**MainRecordByEditorID** - Find record by EditorID
```pascal
function MainRecordByEditorID(group: IwbGroupRecord; editorID: string): IwbMainRecord;

// Searches group for record with specified EditorID
// Not performant - use sparingly

// Example:
weaponGroup := GroupBySignature(myFile, 'WEAP');
pistol := MainRecordByEditorID(weaponGroup, 'LaserPistol');
```

#### 14.5 Practical Examples

**Example 1: List Cell References**
```pascal
procedure ListCellReferences(cell: IwbMainRecord);
var
  childGroup: IwbGroupRecord;
  i: integer;
  ref: IwbMainRecord;
begin
  childGroup := ChildGroup(cell);
  if not Assigned(childGroup) then begin
    AddMessage('Cell has no references');
    Exit;
  end;
  
  AddMessage('References in ' + GetElementEditValues(cell, 'EDID') + ':');
  for i := 0 to ElementCount(childGroup) - 1 do begin
    ref := ElementByIndex(childGroup, i);
    if Signature(ref) = 'REFR' then
      AddMessage('  ' + ShortName(ref));
  end;
end;
```

**Example 2: Process All Weapons**
```pascal
procedure ProcessAllWeapons(f: IwbFile);
var
  weaponGroup: IwbGroupRecord;
  i: integer;
  weapon: IwbMainRecord;
begin
  if not HasGroup(f, 'WEAP') then Exit;
  
  weaponGroup := GroupBySignature(f, 'WEAP');
  for i := 0 to ElementCount(weaponGroup) - 1 do begin
    weapon := ElementByIndex(weaponGroup, i);
    // Process weapon
    AddMessage(GetElementEditValues(weapon, 'FULL'));
  end;
end;
```

---

### 15. IwbResource Functions

Work with BSA/BA2 archive files.

#### 15.1 Resource Listing

**ResourceContainerList** - List all containers
```pascal
procedure ResourceContainerList(list: TStrings);

// Fills list with full paths of all loaded BSAs, BA2s, and Data folder
// Example:
var
  containers: TStringList;
begin
  containers := TStringList.Create;
  try
    ResourceContainerList(containers);
    AddMessage('Loaded containers:');
    for i := 0 to containers.Count - 1 do
      AddMessage('  ' + containers[i]);
  finally
    containers.Free;
  end;
end;
```

**ResourceList** - List files in container
```pascal
procedure ResourceList(containerName: string; list: TStrings);

// Lists all files in specified container
// containerName should be from ResourceContainerList

// Example:
var
  files: TStringList;
begin
  files := TStringList.Create;
  try
    ResourceList('C:\Games\Fallout 4\Data\Fallout4 - Textures1.ba2', files);
    AddMessage('Found ' + IntToStr(files.Count) + ' files');
  finally
    files.Free;
  end;
end;
```

#### 15.2 Resource Queries

**ResourceExists** - Check if file exists
```pascal
function ResourceExists(filename: string): boolean;

// Checks if any loaded container has the specified file
// Example:
if ResourceExists('textures\test.dds') then
  AddMessage('Texture found');
```

**ResourceCount** - Count file instances
```pascal
function ResourceCount(filename: string; containers: TStrings): cardinal;

// Fills containers with list of containers that have filename
// Returns number of instances found

// Example:
var
  containers: TStringList;
  count: integer;
begin
  containers := TStringList.Create;
  try
    count := ResourceCount('textures\myTexture.dds', containers);
    AddMessage('Found in ' + IntToStr(count) + ' containers');
    for i := 0 to containers.Count - 1 do
      AddMessage('  ' + containers[i]);
  finally
    containers.Free;
  end;
end;
```

#### 15.3 Resource Extraction

**ResourceCopy** - Extract file
```pascal
procedure ResourceCopy(
  containerName: string;
  filename: string;
  outputPath: string
);

// Extracts file from container to specified path
// Example:
ResourceCopy(
  'C:\Games\Fallout 4\Data\Fallout4 - Textures1.ba2',
  'textures\test.dds',
  'C:\Extracted\test.dds'
);
```

**ResourceOpenData** - Load resource to stream
```pascal
function ResourceOpenData(
  containerName: string;
  filename: string
): TBytesStream;

// Loads resource into memory as byte stream
// Use with NIF/DDS functions
// Don't forget to Free the result!

// Example:
var
  data: TBytesStream;
  textures: TStringList;
begin
  data := ResourceOpenData(container, 'meshes\test.nif');
  try
    textures := TStringList.Create;
    try
      NifTextureList(data.Bytes, textures);
      // Process texture list
    finally
      textures.Free;
    end;
  finally
    data.Free;
  end;
end;
```

#### 15.4 Practical Example - Extract All Meshes

```pascal
unit ExtractMeshes;

interface
implementation

uses xEditAPI, Classes, SysUtils;

function Initialize: integer;
var
  containers: TStringList;
  files: TStringList;
  i, j: integer;
  container: string;
  outputDir: string;
begin
  outputDir := ProgramPath + 'ExtractedMeshes\';
  ForceDirectories(outputDir);
  
  containers := TStringList.Create;
  files := TStringList.Create;
  try
    ResourceContainerList(containers);
    
    for i := 0 to containers.Count - 1 do begin
      container := containers[i];
      if not (Pos('.ba2', LowerCase(container)) > 0) and
         not (Pos('.bsa', LowerCase(container)) > 0) then
        Continue;
      
      AddMessage('Processing: ' + ExtractFileName(container));
      ResourceList(container, files);
      
      for j := 0 to files.Count - 1 do begin
        if Pos('meshes\', LowerCase(files[j])) = 1 then begin
          try
            ResourceCopy(container, files[j], outputDir + files[j]);
          except
            on E: Exception do
              AddMessage('Failed to extract: ' + files[j]);
          end;
        end;
      end;
      
      files.Clear;
    end;
    
    AddMessage('Extraction complete!');
  finally
    files.Free;
    containers.Free;
  end;
  
  Result := 0;
end;

end.
```

---

### 16. User Interface Components

xEdit scripts can create dialogs and UI elements.

#### 16.1 Simple Dialogs

**InputQuery** - Simple text input
```pascal
function InputQuery(
  caption: string;
  prompt: string;
  var value: string
): boolean;

// Shows dialog with text input
// Returns True if OK clicked, False if cancelled
// value is updated with user's input

// Example:
var
  userInput: string;
begin
  if InputQuery('Script Name', 'Enter value:', userInput) then
    AddMessage('User entered: ' + userInput)
  else
    AddMessage('User cancelled');
end;
```

**SelectDirectory** - Folder picker
```pascal
function SelectDirectory(
  prompt: string;
  initialDir: string;
  rootDir: string;
  unused: pointer
): string;

// Shows folder selection dialog
// Returns selected path or empty string if cancelled

// Example:
var
  folder: string;
begin
  folder := SelectDirectory('Select output folder', 'C:\', '', nil);
  if folder <> '' then
    AddMessage('Selected: ' + folder);
end;
```

#### 16.2 Advanced UI - Forms

**TForm** - Dialog window
```pascal
var
  frm: TForm;
begin
  frm := TForm.Create(nil);
  try
    frm.Caption := 'My Dialog';
    frm.Width := 400;
    frm.Height := 300;
    frm.Position := poScreenCenter;
    
    // Add controls (see below)
    
    frm.ShowModal;
  finally
    frm.Free;
  end;
end;
```

**Common Form Properties:**
- `Caption` - Window title
- `Width`, `Height` - Size in pixels
- `Position` - `poScreenCenter`, `poMainFormCenter`, `poDesigned`
- `BorderStyle` - `bsDialog`, `bsSizeable`, etc.

#### 16.3 UI Controls

**TButton** - Button
```pascal
var
  btn: TButton;
begin
  btn := TButton.Create(frm);
  btn.Parent := frm;
  btn.Caption := 'Click Me';
  btn.Left := 10;
  btn.Top := 10;
  btn.Width := 100;
  btn.Height := 25;
  btn.OnClick := @ButtonClickHandler;  // Event handler
end;

procedure ButtonClickHandler(Sender: TObject);
begin
  AddMessage('Button clicked!');
end;
```

**TLabel** - Text label
```pascal
var
  lbl: TLabel;
begin
  lbl := TLabel.Create(frm);
  lbl.Parent := frm;
  lbl.Caption := 'Enter name:';
  lbl.Left := 10;
  lbl.Top := 10;
end;
```

**TEdit** - Text input
```pascal
var
  edit: TEdit;
begin
  edit := TEdit.Create(frm);
  edit.Parent := frm;
  edit.Left := 10;
  edit.Top := 30;
  edit.Width := 200;
  edit.Text := 'Default value';
end;
```

**TMemo** - Multi-line text
```pascal
var
  memo: TMemo;
begin
  memo := TMemo.Create(frm);
  memo.Parent := frm;
  memo.Left := 10;
  memo.Top := 10;
  memo.Width := 300;
  memo.Height := 200;
  memo.ScrollBars := ssVertical;
  memo.Lines.Add('Line 1');
  memo.Lines.Add('Line 2');
end;
```

**TCheckBox** - Checkbox
```pascal
var
  cb: TCheckBox;
begin
  cb := TCheckBox.Create(frm);
  cb.Parent := frm;
  cb.Caption := 'Enable option';
  cb.Left := 10;
  cb.Top := 40;
  cb.Checked := True;
  cb.OnClick := @CheckBoxClickHandler;
end;
```

**TComboBox** - Dropdown
```pascal
var
  combo: TComboBox;
begin
  combo := TComboBox.Create(frm);
  combo.Parent := frm;
  combo.Left := 10;
  combo.Top := 60;
  combo.Width := 200;
  combo.Style := csDropDownList;  // Disallow custom text
  combo.Items.Add('Option 1');
  combo.Items.Add('Option 2');
  combo.Items.Add('Option 3');
  combo.ItemIndex := 0;  // Select first item
end;
```

**TListBox** - List selection
```pascal
var
  listBox: TListBox;
begin
  listBox := TListBox.Create(frm);
  listBox.Parent := frm;
  listBox.Left := 10;
  listBox.Top := 90;
  listBox.Width := 200;
  listBox.Height := 150;
  listBox.Items.Add('Item 1');
  listBox.Items.Add('Item 2');
  listBox.MultiSelect := True;
end;
```

**TCheckListBox** - Checkbox list
```pascal
var
  checkList: TCheckListBox;
begin
  checkList := TCheckListBox.Create(frm);
  checkList.Parent := frm;
  checkList.Left := 10;
  checkList.Top := 120;
  checkList.Width := 200;
  checkList.Height := 150;
  checkList.Items.Add('Item 1');
  checkList.Items.Add('Item 2');
  checkList.Checked[0] := True;  // Check first item
end;
```

#### 16.4 Layout Controls

**TPanel** - Container panel
```pascal
var
  panel: TPanel;
begin
  panel := TPanel.Create(frm);
  panel.Parent := frm;
  panel.Left := 10;
  panel.Top := 10;
  panel.Width := 300;
  panel.Height := 200;
  panel.Caption := '';  // Usually empty
  panel.BevelOuter := bvNone;  // Flat appearance
  
  // Add other controls with panel as parent
end;
```

**TScrollBox** - Scrollable container
```pascal
var
  scrollBox: TScrollBox;
begin
  scrollBox := TScrollBox.Create(frm);
  scrollBox.Parent := frm;
  scrollBox.Align := alClient;  // Fill form
  
  // Add controls inside scroll box
end;
```

#### 16.5 Complete Example - Settings Dialog

```pascal
unit SettingsDialog;

interface
implementation

uses xEditAPI, Classes, SysUtils, StdCtrls, ExtCtrls, Forms, Controls;

var
  selectedOption: integer;
  valueEntered: string;
  optionChecked: boolean;

function Initialize: integer;
var
  frm: TForm;
  lblPrompt: TLabel;
  edtValue: TEdit;
  cbOption: TCheckBox;
  comboChoice: TComboBox;
  btnOK, btnCancel: TButton;
begin
  frm := TForm.Create(nil);
  try
    frm.Caption := 'Script Settings';
    frm.Width := 400;
    frm.Height := 250;
    frm.Position := poScreenCenter;
    frm.BorderStyle := bsDialog;
    
    // Label
    lblPrompt := TLabel.Create(frm);
    lblPrompt.Parent := frm;
    lblPrompt.Caption := 'Enter a value:';
    lblPrompt.Left := 10;
    lblPrompt.Top := 10;
    
    // Text input
    edtValue := TEdit.Create(frm);
    edtValue.Parent := frm;
    edtValue.Left := 10;
    edtValue.Top := 30;
    edtValue.Width := 360;
    edtValue.Text := 'Default';
    
    // Checkbox
    cbOption := TCheckBox.Create(frm);
    cbOption.Parent := frm;
    cbOption.Caption := 'Enable advanced mode';
    cbOption.Left := 10;
    cbOption.Top := 60;
    cbOption.Checked := False;
    
    // Dropdown
    comboChoice := TComboBox.Create(frm);
    comboChoice.Parent := frm;
    comboChoice.Left := 10;
    comboChoice.Top := 90;
    comboChoice.Width := 360;
    comboChoice.Style := csDropDownList;
    comboChoice.Items.Add('Option 1');
    comboChoice.Items.Add('Option 2');
    comboChoice.Items.Add('Option 3');
    comboChoice.ItemIndex := 0;
    
    // OK button
    btnOK := TButton.Create(frm);
    btnOK.Parent := frm;
    btnOK.Caption := 'OK';
    btnOK.Left := 210;
    btnOK.Top := 170;
    btnOK.Width := 75;
    btnOK.ModalResult := mrOk;
    
    // Cancel button
    btnCancel := TButton.Create(frm);
    btnCancel.Parent := frm;
    btnCancel.Caption := 'Cancel';
    btnCancel.Left := 295;
    btnCancel.Top := 170;
    btnCancel.Width := 75;
    btnCancel.ModalResult := mrCancel;
    
    // Show dialog
    if frm.ShowModal = mrOk then begin
      valueEntered := edtValue.Text;
      optionChecked := cbOption.Checked;
      selectedOption := comboChoice.ItemIndex;
      
      AddMessage('Value: ' + valueEntered);
      AddMessage('Advanced: ' + BoolToStr(optionChecked, True));
      AddMessage('Option: ' + IntToStr(selectedOption));
      
      Result := 0;
    end else begin
      AddMessage('User cancelled');
      Result := 1;
    end;
  finally
    frm.Free;
  end;
end;

end.
```

---

### 17. NIF and DDS Functions

Work with mesh and texture files.

#### 17.1 NIF Functions

**NifBlockList** - List NIF blocks
```pascal
function NifBlockList(data: TBytes; list: TStrings): boolean;

// Extracts block information from NIF data
// Each list entry: "BlockName=BlockType" with block index as object
// Returns True if successful

// Example:
var
  nifData: TBytesStream;
  blocks: TStringList;
begin
  nifData := ResourceOpenData(container, 'meshes\test.nif');
  blocks := TStringList.Create;
  try
    if NifBlockList(nifData.Bytes, blocks) then begin
      AddMessage('NIF has ' + IntToStr(blocks.Count) + ' blocks');
      for i := 0 to blocks.Count - 1 do
        AddMessage('  ' + blocks[i]);
    end;
  finally
    blocks.Free;
    nifData.Free;
  end;
end;
```

**NifTextureList** - List NIF textures
```pascal
function NifTextureList(data: TBytes; list: TStrings): boolean;

// Extracts all texture paths from NIF
// Returns True if successful

// Example:
var
  nifData: TBytesStream;
  textures: TStringList;
begin
  nifData := ResourceOpenData(container, 'meshes\armor.nif');
  textures := TStringList.Create;
  try
    if NifTextureList(nifData.Bytes, textures) then begin
      AddMessage('Textures used:');
      for i := 0 to textures.Count - 1 do
        AddMessage('  ' + textures[i]);
    end;
  finally
    textures.Free;
    nifData.Free;
  end;
end;
```

**NifTextureListResource** - List textures from resource
```pascal
function NifTextureListResource(data: variant; list: TStrings): boolean;

// Like NifTextureList but accepts variant data
```

**NifTextureListUVRange** - List textures with UV check
```pascal
function NifTextureListUVRange(
  data: TBytes;
  uvRange: Single;
  list: TStrings
): boolean;

// Only adds textures if UVs are within range
// Used to filter out problematic textures
```

#### 17.2 DDS Functions

**wbDDSDataToBitmap** - Convert DDS to bitmap
```pascal
function wbDDSDataToBitmap(data: TBytes; bitmap: TBitmap): boolean;

// Converts DDS data to TBitmap
// Returns True if successful

// Example:
var
  ddsData: TBytesStream;
  bmp: TBitmap;
begin
  ddsData := ResourceOpenData(container, 'textures\test.dds');
  bmp := TBitmap.Create;
  try
    if wbDDSDataToBitmap(ddsData.Bytes, bmp) then begin
      AddMessage('Size: ' + IntToStr(bmp.Width) + 'x' + IntToStr(bmp.Height));
      bmp.SaveToFile('output.bmp');
    end;
  finally
    bmp.Free;
    ddsData.Free;
  end;
end;
```

**wbDDSStreamToBitmap** - Convert DDS stream
```pascal
function wbDDSStreamToBitmap(stream: TStream; bitmap: TBitmap): boolean;

// Like wbDDSDataToBitmap but accepts stream
```

**wbDDSResourceToBitmap** - Convert from resource
```pascal
function wbDDSResourceToBitmap(resource: variant; bitmap: TBitmap): boolean;

// Loads DDS from resource and converts to bitmap
```

#### 17.3 Image Manipulation

**wbFlipBitmap** - Flip bitmap
```pascal
procedure wbFlipBitmap(bitmap: TBitmap; axes: integer);

// Flips bitmap on specified axes:
// 0 = both axes
// 1 = horizontal
// 2 = vertical

// Example:
wbFlipBitmap(myBitmap, 2);  // Flip vertically
```

**wbAlphaBlend** - Alpha blend
```pascal
function wbAlphaBlend(
  destDC: HDC;
  destX, destY, destWidth, destHeight: integer;
  srcDC: HDC;
  srcX, srcY, srcWidth, srcHeight: integer;
  alpha: integer
): boolean;

// Wrapper for Windows.AlphaBlend
// Used for advanced image compositing
```

#### 17.4 Complete Example - Extract NIF Textures

```pascal
unit ExtractNifTextures;

interface
implementation

uses xEditAPI, Classes, SysUtils;

var
  allTextures: TStringList;

function Initialize: integer;
begin
  allTextures := TStringList.Create;
  allTextures.Duplicates := dupIgnore;
  allTextures.Sorted := True;
  Result := 0;
end;

function ProcessNif(containerName, nifPath: string): boolean;
var
  nifData: TBytesStream;
  textures: TStringList;
  i: integer;
begin
  Result := False;
  
  try
    nifData := ResourceOpenData(containerName, nifPath);
    try
      textures := TStringList.Create;
      try
        if NifTextureList(nifData.Bytes, textures) then begin
          for i := 0 to textures.Count - 1 do begin
            allTextures.Add(textures[i]);
          end;
          Result := True;
        end;
      finally
        textures.Free;
      end;
    finally
      nifData.Free;
    end;
  except
    on E: Exception do
      AddMessage('Error processing ' + nifPath + ': ' + E.Message);
  end;
end;

procedure ScanContainer(containerName: string);
var
  files: TStringList;
  i: integer;
begin
  files := TStringList.Create;
  try
    ResourceList(containerName, files);
    
    for i := 0 to files.Count - 1 do begin
      if Pos('meshes\', LowerCase(files[i])) = 1 then begin
        if LowerCase(ExtractFileExt(files[i])) = '.nif' then begin
          ProcessNif(containerName, files[i]);
        end;
      end;
    end;
  finally
    files.Free;
  end;
end;

function Finalize: integer;
var
  containers: TStringList;
  i: integer;
  outputFile: string;
begin
  containers := TStringList.Create;
  try
    ResourceContainerList(containers);
    
    for i := 0 to containers.Count - 1 do begin
      if (Pos('.ba2', LowerCase(containers[i])) > 0) or
         (Pos('.bsa', LowerCase(containers[i])) > 0) then begin
        AddMessage('Scanning: ' + ExtractFileName(containers[i]));
        ScanContainer(containers[i]);
      end;
    end;
  finally
    containers.Free;
  end;
  
  outputFile := ScriptsPath + 'NifTextures.txt';
  allTextures.SaveToFile(outputFile);
  AddMessage('Found ' + IntToStr(allTextures.Count) + ' unique textures');
  AddMessage('Saved to: ' + outputFile);
  allTextures.Free;
  
  Result := 0;
end;

end.
```

---

### 18. Pascal Implementation Details

Understanding xEdit's Pascal environment helps avoid issues.

#### 18.1 JvInterpreter Basis

xEdit uses **JvInterpreter** from JVCL to run Pascal scripts. This provides:

**Automatically Included Units:**
```pascal
// These are ALWAYS available, even without 'uses':
Buttons
Classes
Comctrls
Contnrs
Controls
Dialogs
ExtCtrls
Forms
Graphics
Menus
StdCtrls
System
SysUtils
Windows
```

**Return Values:**
```pascal
// In xEdit Pascal, return via Result, not function name:
function MyFunction: integer;
begin
  Result := 42;  // Correct
  MyFunction := 42;  // Wrong!
end;
```

#### 18.2 Extended Functions

xEdit adds these to standard units:

**Controls:**
- `akLeft`, `akRight`, `akTop`, `akBottom` (alignment constants)

**Forms:**
- `pmAuto`, `pmExplicit`, `pmNone` (popup modes)
- `poMainFormCenter` (position constant)

**Math Functions:**
```pascal
Ceil(x)          // Round up
Floor(x)         // Round down
IntPower(x, y)   // x^y (integer)
Max(a, b)        // Maximum (casts to integer!)
Min(a, b)        // Minimum (casts to integer!)
Power(x, y)      // x^y (float)
```

**System:**
```pascal
StringOfChar(ch, count)  // Repeat character
MaxInt                   // Maximum integer
MinInt                   // Minimum integer
```

**SysUtils:**
```pascal
Dec(x)                           // Decrement
Inc(x)                           // Increment
DirectoryExists(path)            // Check directory
FileExists(path)                 // Check file
ForceDirectories(path)           // Create directories
Frac(x)                          // Fractional part
Int(x)                           // Integer part
IntToHex64(value, digits)        // 64-bit hex conversion
Pred(x)                          // Predecessor
Succ(x)                          // Successor
SameText(s1, s2)                 // Case-insensitive compare
StringReplace(s, old, new, flags) // Replace text
StrToInt64(s)                    // String to int64
StrToInt64Def(s, default)        // With default
StrToFloatDef(s, default)        // With default

// Constants:
LowInteger, HighInteger
cbChecked, cbGrayed, cbUnchecked
fmCreate
lpAbove, lpBelow, lpLeft, lpRight
rfReplaceAll, rfIgnoreCase
```

**Windows:**
```pascal
CopyFile(src, dest, failIfExists)
CreateProcessWait(cmdLine, showWindow)
Sleep(milliseconds)

// Show window constants:
SW_HIDE, SW_MAXIMIZE, SW_MINIMIZE, SW_RESTORE, SW_SHOW,
SW_SHOWDEFAULT, SW_SHOWMAXIMIZED, SW_SHOWMINIMIZED,
SW_SHOWMINNOACTIVE, SW_SHOWNA, SW_SHOWNOACTIVATE, SW_SHOWNORMAL
```

**ShellApi:**
```pascal
ShellExecute(handle, verb, filename, params, directory, showCmd)
ShellExecuteWait(...)  // Waits for completion
```

#### 18.3 Short-Circuit Evaluation

**⚠️ Important:** JvInterpreter does NOT short-circuit conditions!

**Problem:**
```pascal
// This will crash with divide-by-zero:
if (x <> 0) and (10 mod x = 0) then begin
  // Even if x=0, the second condition is evaluated!
end;
```

**Solution - Nest Conditions:**
```pascal
// Correct:
if x <> 0 then begin
  if 10 mod x = 0 then begin
    // Safe!
  end;
end;
```

**Another Problem:**
```pascal
// This will crash with nil reference:
if Assigned(myList) and (myList.Count > 0) then begin
  // myList.Count is checked even if myList is nil!
end;
```

**Solution:**
```pascal
// Correct:
if Assigned(myList) then begin
  if myList.Count > 0 then begin
    // Safe!
  end;
end;
```

#### 18.4 Variable Behavior

**Const in Functions:**
```pascal
// In real Delphi, this would be static:
function Counter: integer;
const
  count: integer = 0;
begin
  Inc(count);
  Result := count;
end;

// In JvInterpreter, count is reset every call!
// count will never exceed 1
```

**Workaround - Use Global:**
```pascal
var
  count: integer = 0;

function Counter: integer;
begin
  Inc(count);
  Result := count;
end;
// Now count persists between calls
```

#### 18.5 Variant Gotcha

**Problem:**
```pascal
var
  damage: float;
begin
  damage := GetElementNativeValues(weapon, 'DATA\Damage');
  // If field doesn't exist, damage = nil
  // This will crash:
  damage := damage * 2;
end;
```

**Solution:**
```pascal
var
  damage: variant;  // Use variant, not float
begin
  damage := GetElementNativeValues(weapon, 'DATA\Damage');
  if VarIsNull(damage) or VarIsEmpty(damage) then
    damage := 0;
  damage := damage * 2;
end;
```

#### 18.6 Global Variable Conflicts

**Problem:**
```pascal
// File1.pas
var
  myVar: integer;

// File2.pas (uses File1)
var
  myVar: integer;  // ERROR! Redeclaration

// JvInterpreter doesn't allow shadowing globals
```

**Solution - Use Different Names:**
```pascal
// File1.pas
var
  file1_myVar: integer;

// File2.pas
var
  file2_myVar: integer;  // OK
```

**Or Use Implementation Section:**
```pascal
unit MyScript;

interface
// Public declarations

implementation
var
  myVar: integer;  // Private to this unit
// But still causes issues if multiple files do this!

end.
```

#### 18.7 Try-Except Limitations

**Not All Errors Caught:**
```pascal
try
  // Some runtime errors won't be caught
  SomeRiskyOperation;
except
  on E: Exception do
    AddMessage('Error: ' + E.Message);
end;

// Some errors will still crash xEdit
```

**Best Practice - Validate First:**
```pascal
if Assigned(element) and Assigned(GetContainer(element)) then begin
  // Safe to proceed
end else begin
  AddMessage('Invalid element');
  Exit;
end;
```

---

### 19. Limitations and Workarounds

#### 19.1 Unsupported Features

**Cannot Use:**
- Anonymous methods
- Array arguments: `function Test(arr: array of integer)`
- Function overloading
- Object types (the `object` keyword)
- Out parameters (always get default values - use `var` instead)
- Procedural types
- Structured types
- Subclasses (no `constructor` keyword)
- Complete Try-except coverage

**Unsupported Operators:**
- `&` - Variable name escape
- `@` - Address operator
- `^` - Pointer dereference  
- `<<` - Bit shift (broken, use `Shl`)
- `>>` - Bit shift (broken, use `Shr`)

**Unsupported Keywords:**
- `absolute` - Memory aliasing
- `as` - Type casting (for TObject descendants, use `ClassName`)
- `constructor` - Subclass constructors
- `in` - Set membership (broken)
- `is` - Type checking (use `ClassName` instead)
- `object` - Object types
- `type` - Type aliases (partially works)
- `with` - Statements

#### 19.2 Common Workarounds

**Problem: No Function Overloading**
```pascal
// Can't do this:
function Process(s: string): string;
function Process(i: integer): integer;

// Solution - Different names:
function ProcessString(s: string): string;
function ProcessInteger(i: integer): integer;
```

**Problem: No Type Checking**
```pascal
// Can't do this:
if myObj is TMyClass then

// Solution - Check ClassName:
if myObj.ClassName = 'TMyClass' then
```

**Problem: No Array Parameters**
```pascal
// Can't do this:
procedure ProcessArray(arr: array of integer);

// Solution - Use TList:
procedure ProcessArray(list: TList);
var
  i: integer;
  value: integer;
begin
  for i := 0 to list.Count - 1 do begin
    value := Integer(list[i]);
    // Process value
  end;
end;
```

**Problem: Storing IInterface in TList**
```pascal
// Must use ObjectToElement when retrieving:
var
  list: TList;
  elem: IInterface;
begin
  list := TList.Create;
  list.Add(myElement);  // Store
  
  // Retrieve:
  elem := ObjectToElement(list[0]);  // Must use ObjectToElement!
end;
```

#### 19.3 Performance Considerations

**Slow Operations:**
- `ElementByPath` with deep paths
- `MainRecordByEditorID` (linear search)
- Processing thousands of records without BeginUpdate/EndUpdate
- Repeated file I/O

**Optimization Tips:**
```pascal
// Bad - Repeated lookups:
for i := 0 to 1000 do begin
  value := GetElementEditValues(record, 'DATA\Value');
  // Looks up path 1000 times!
end;

// Good - Cache element:
valueElement := ElementByPath(record, 'DATA\Value');
for i := 0 to 1000 do begin
  value := GetEditValue(valueElement);
  // Direct access, much faster!
end;

// Bad - No batching:
for i := 0 to 1000 do begin
  Add(container, 'Field' + IntToStr(i), False);
end;

// Good - Use BeginUpdate:
BeginUpdate(container);
try
  for i := 0 to 1000 do begin
    Add(container, 'Field' + IntToStr(i), False);
  end;
finally
  EndUpdate(container);
end;
```

---

### 20. Script Collections

Community script repositories.

#### 20.1 Mator's Scripts (Deprecated)

**Note:** Most of Mator's scripts are deprecated. Use **zMerge** for plugin merging instead.

**zMerge Download:**
- [GitHub - z-edit/zedit](https://github.com/z-edit/zedit)

**Legacy Resources (Unsupported):**
- Automation Tools (TES5/FNV only)
- Merge Plugins Script (deprecated)

#### 20.2 Community Scripts

**Included with xEdit:**
- Assets browser
- Assets manager
- Copy as override
- Export/Import texts
- Worldspace browser
- And many more in Edit Scripts folder

**Finding Scripts:**
- Nexus Mods - Search "xEdit script"
- xEdit Discord - #scripts channel
- GitHub - Search "xEdit scripts"

#### 20.3 Writing Shareable Scripts

**Best Practices:**

1. **Clear Header:**
```pascal
{
  Script Name: Weapon Damage Multiplier
  Version: 1.0
  Author: YourName
  
  Description:
  Multiplies damage of all selected weapons by user-specified value.
  
  Usage:
  1. Select weapons in tree
  2. Run script
  3. Enter multiplier
  
  Hotkey: Ctrl+Shift+D
}
```

2. **User-Friendly:**
```pascal
// Ask for input with clear prompts
if not InputQuery('Damage Multiplier', 
                  'Enter multiplier (e.g., 1.5 for +50%):', 
                  multiplierStr) then begin
  AddMessage('User cancelled');
  Result := 1;
  Exit;
end;

// Validate input
try
  multiplier := StrToFloat(multiplierStr);
except
  AddMessage('Invalid number entered');
  Result := 1;
  Exit;
end;
```

3. **Progress Messages:**
```pascal
AddMessage('Processing ' + IntToStr(count) + ' weapons...');
// Process
AddMessage('Complete! Modified ' + IntToStr(modified) + ' weapons.');
```

4. **Error Handling:**
```pascal
try
  // Risky operation
except
  on E: Exception do begin
    AddMessage('Error: ' + E.Message);
    Result := 1;
    Exit;
  end;
end;
```

---

### 21. Tutorial Resources

Learning resources for xEdit scripting.

#### 21.1 Official Documentation

- **This Guide** - Comprehensive API reference
- **xEditAPI.pas** - API declarations with comments
- **Included Scripts** - Examples in Edit Scripts folder

#### 21.2 Community Resources

**xEdit Discord:**
- Active community
- #help channel for questions
- #scripts channel for sharing

**Nexus Forums:**
- Modding discussions
- Script requests
- Troubleshooting

**Creation Kit Wiki:**
- Record format documentation
- Field descriptions
- Understanding game data

#### 21.3 Learning Path

**Beginner:**
1. Start with simple scripts (list records)
2. Use Initialize only (no Process)
3. Learn to iterate files and groups
4. Practice with AddMessage logging

**Intermediate:**
1. Add Process function
2. Modify record values
3. Use ElementByPath
4. Create simple patches

**Advanced:**
1. Build complex UIs
2. Process references
3. Handle BSA/BA2 files
4. Work with NIFs/DDS
5. Write reusable libraries

#### 21.4 Example Learning Scripts

**Level 1 - Hello World:**
```pascal
unit HelloWorld;

function Initialize: integer;
begin
  AddMessage('Hello from xEdit script!');
  Result := 0;
end;

end.
```

**Level 2 - List Files:**
```pascal
unit ListFiles;

function Initialize: integer;
var
  i: integer;
  f: IwbFile;
begin
  AddMessage('=== Load Order ===');
  for i := 0 to FileCount - 1 do begin
    f := FileByIndex(i);
    AddMessage('[' + IntToStr(i) + '] ' + GetFileName(f));
  end;
  Result := 0;
end;

end.
```

**Level 3 - Process Selection:**
```pascal
unit CountRecords;

var
  count: integer;

function Initialize: integer;
begin
  count := 0;
  Result := 0;
end;

function Process(e: IInterface): integer;
begin
  Inc(count);
  Result := 0;
end;

function Finalize: integer;
begin
  AddMessage('Processed ' + IntToStr(count) + ' records');
  Result := 0;
end;

end.
```

**Level 4 - Modify Records:**
```pascal
unit BoostDamage;

function Process(e: IInterface): integer;
var
  damage: integer;
begin
  if Signature(e) <> 'WEAP' then Exit;
  
  damage := GetElementNativeValues(e, 'DATA\Damage');
  SetElementNativeValues(e, 'DATA\Damage', damage * 2);
  AddMessage('Boosted: ' + DisplayName(e));
  
  Result := 0;
end;

end.
```

**Level 5 - With UI:**
```pascal
unit InteractiveDamage;

var
  multiplier: float;

function Initialize: integer;
var
  input: string;
begin
  if not InputQuery('Damage Multiplier', 
                    'Enter multiplier:', 
                    input) then begin
    Result := 1;
    Exit;
  end;
  
  try
    multiplier := StrToFloat(input);
  except
    AddMessage('Invalid number');
    Result := 1;
    Exit;
  end;
  
  Result := 0;
end;

function Process(e: IInterface): integer;
var
  damage: float;
begin
  if Signature(e) <> 'WEAP' then Exit;
  
  damage := GetElementNativeValues(e, 'DATA\Damage');
  SetElementNativeValues(e, 'DATA\Damage', Round(damage * multiplier));
  
  Result := 0;
end;

function Finalize: integer;
begin
  AddMessage('Damage adjustment complete!');
  Result := 0;
end;

end.
```

---

## Conclusion

This guide covers the complete xEdit scripting API for Fallout 4. Key takeaways:

**Remember:**
- Scripts use Initialize, Process, and Finalize
- IInterface is universal type
- Use xEditAPI.pas for IDE support
- Short-circuit conditions manually
- Validate before operations
- Use BeginUpdate/EndUpdate for batches

**Resources:**
- xEdit Discord for help
- Included scripts for examples
- This guide for API reference

**Happy Scripting!**

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Compatible with:** FO4Edit 4.0.4+