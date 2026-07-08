unit Mossy_MakePRPPatch;

var
  userName, prpName, patchName: string;
  userFile, prpFile, patchFile: IInterface;

function ReadParams: Boolean;
var
  sl: TStringList;
  fn: string;
begin
  Result := False;
  fn := ScriptsPath + 'Mossy_PRPPatch_params.txt';
  if not FileExists(fn) then begin
    AddMessage('[Mossy] Params file missing: ' + fn);
    Exit;
  end;
  sl := TStringList.Create;
  try
    sl.LoadFromFile(fn);
    userName  := Trim(sl.Values['plugin']);
    prpName   := Trim(sl.Values['prp']);
    patchName := Trim(sl.Values['patch']);
  finally
    sl.Free;
  end;
  Result := (userName <> '') and (prpName <> '') and (patchName <> '');
end;

function FindFileByName(aName: string): IInterface;
var
  i: Integer;
begin
  Result := nil;
  for i := 0 to Pred(FileCount) do
    if SameText(GetFileName(FileByIndex(i)), aName) then begin
      Result := FileByIndex(i);
      Exit;
    end;
end;

function PrpOverrideOf(rec: IInterface): IInterface;
var
  m, ov: IInterface;
  i: Integer;
begin
  Result := nil;
  m := MasterOrSelf(rec);
  for i := 0 to Pred(OverrideCount(m)) do begin
    ov := OverrideByIndex(m, i);
    if SameText(GetFileName(GetFile(ov)), prpName) then begin
      Result := ov;
      Exit;
    end;
  end;
end;

function Initialize: Integer;
var
  i, copied, seen: Integer;
  rec, prpCell, res: IInterface;
begin
  Result := 0;
  copied := 0;
  seen := 0;

  if not ReadParams then begin
    AddMessage('[Mossy] Could not read parameters. Aborting.');
    Result := 1; Exit;
  end;

  userFile := FindFileByName(userName);
  prpFile  := FindFileByName(prpName);
  if userFile = nil then begin
    AddMessage('[Mossy] Your plugin is not loaded: ' + userName + '. Activate it (and PRP) in the load order and retry.');
    Result := 1; Exit;
  end;
  if prpFile = nil then begin
    AddMessage('[Mossy] PRP is not loaded: ' + prpName + '. Activate PRP in the load order and retry.');
    Result := 1; Exit;
  end;

  patchFile := AddNewFileName(patchName);
  if patchFile = nil then begin
    AddMessage('[Mossy] Could not create patch file: ' + patchName + '. Requires xEdit 4.0.4+.');
    Result := 1; Exit;
  end;
  SetIsESL(patchFile, True);
  AddMasterIfMissing(patchFile, prpName);

  for i := 0 to Pred(RecordCount(userFile)) do begin
    rec := RecordByIndex(userFile, i);
    if Signature(rec) <> 'CELL' then Continue;
    Inc(seen);
    prpCell := PrpOverrideOf(rec);
    if prpCell = nil then Continue;
    try
      res := wbCopyElementToFile(prpCell, patchFile, False, True);
      if Assigned(res) then Inc(copied);
    except
      on E: Exception do AddMessage('[Mossy] Copy failed for a cell: ' + E.Message);
    end;
  end;

  AddMessage(Format('[Mossy] PRP patch "%s": %d of %d CELL overrides covered by PRP were copied.', [patchName, copied, seen]));
  if copied = 0 then
    AddMessage('[Mossy] Patch is empty — PRP may not cover the cells your mod edits, or the mod has no CELL overrides.');
  AddMessage('[Mossy] Done. In the load order, place "' + patchName + '" AFTER your mod AND PRP.');
end;

function Finalize: Integer;
begin
  Result := 0;
end;

end.
