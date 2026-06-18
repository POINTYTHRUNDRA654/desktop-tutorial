{
  MOSSY_ExportDialogue.pas
  xEdit/FO4Edit script — exports NPC dialogue from Fallout4.esm to JSON files
  grouped by archetype, suitable for import into the MOSSY NPC Director catalogue.

  Usage:
    1. Open xEdit (FO4Edit) and load Fallout4.esm (plus optionally any DLCs/mods)
    2. Scripts > Apply Script > select this file
    3. Choose output directory when prompted
    4. JSON files are written to <output_dir>\xedit_dump\<archetype>\<topic_id>.json

  Output format per file:
    {
      "topic_id": "000XXXXX",
      "topic_edid": "DialogueSanctuaryMurphy001",
      "speaker_ref": "000XXXXX",
      "speaker_name": "Mama Murphy",
      "archetype_hint": "settler_female",
      "responses": [
        { "response_num": 1, "text": "...", "emotion": "Happy", "emotion_value": 50 }
      ]
    }
}

unit MOSSY_ExportDialogue;

interface

uses xEditAPI, SysUtils, Classes;

function Initialize: Integer;
function Process(e: IInterface): Integer;
function Finalize: Integer;

implementation

var
  OutputDir: string;
  FileMap: TStringList;
  RecordCount: Integer;
  ExportCount: Integer;

// Map NPC editor IDs to archetype hints for the catalogue grouper
function GuessArchetype(edid: string): string;
var
  lc: string;
begin
  lc := LowerCase(edid);
  Result := 'generic';
  if Pos('settler', lc) > 0 then Result := 'settler_male'
  else if Pos('minuteman', lc) > 0 then Result := 'minuteman'
  else if Pos('raider', lc) > 0 then Result := 'raider'
  else if Pos('supermutant', lc) > 0 then Result := 'super_mutant'
  else if Pos('ghoul', lc) > 0 then Result := 'ghoul_nonferal'
  else if Pos('synth', lc) > 0 then Result := 'synth'
  else if Pos('robot', lc) > 0 then Result := 'robot'
  else if Pos('preston', lc) > 0 then Result := 'named_npcs'
  else if Pos('codsworth', lc) > 0 then Result := 'named_npcs'
  else if Pos('mama_murphy', lc) > 0 then Result := 'named_npcs'
  else if Pos('marcy', lc) > 0 then Result := 'named_npcs'
  else if Pos('sturges', lc) > 0 then Result := 'named_npcs';
end;

function EscapeJson(s: string): string;
var
  i: Integer;
  c: Char;
  r: string;
begin
  r := '';
  for i := 1 to Length(s) do begin
    c := s[i];
    case c of
      '"':  r := r + '\"';
      '\':  r := r + '\\';
      #10:  r := r + '\n';
      #13:  r := r + '\r';
      #9:   r := r + '\t';
      else  r := r + c;
    end;
  end;
  Result := r;
end;

function Initialize: Integer;
begin
  Result := 0;
  RecordCount := 0;
  ExportCount := 0;
  OutputDir := InputQuery('MOSSY Export', 'Output directory (e.g. H:\F4AI\export):', 'H:\F4AI\export');
  if OutputDir = '' then begin
    ShowMessage('No output directory — export cancelled.');
    Result := 1;
    Exit;
  end;
  ForceDirectories(OutputDir + '\xedit_dump');
  FileMap := TStringList.Create;
  AddMessage('[MOSSY] Export started. Output: ' + OutputDir + '\xedit_dump\');
end;

function Process(e: IInterface): Integer;
var
  sig, topicId, topicEdid, speakerRef, speakerName, archetype: string;
  responses, response: IInterface;
  i, responseNum: Integer;
  responseText, emotion: string;
  emotionValue: Integer;
  lines: TStringList;
  fileName: string;
  isFirst: Boolean;
begin
  Result := 0;
  Inc(RecordCount);

  sig := Signature(e);

  // Only process DIAL (dialogue topics) and INFO (response records)
  if sig = 'DIAL' then begin
    // Track dialogue topics by FormID for later INFO processing
    topicEdid := EditorID(e);
    topicId := IntToHex(FormID(e), 8);
    if topicEdid <> '' then
      FileMap.Values[topicId] := topicEdid;
    Exit;
  end;

  if sig <> 'INFO' then Exit;

  // Get the parent DIAL topic
  topicEdid := '';
  topicId := IntToHex(FormID(LinksTo(ElementByPath(e, 'DIAL'))), 8);
  if topicId <> '00000000' then
    topicEdid := FileMap.Values[topicId];

  // Get speaker info from ANAM (audio marker / speaker)
  speakerRef := '';
  speakerName := '';
  try
    speakerRef := IntToHex(FormID(LinksTo(ElementByPath(e, 'ANAM'))), 8);
    speakerName := DisplayName(LinksTo(ElementByPath(e, 'ANAM')));
  except
  end;

  archetype := GuessArchetype(topicEdid + speakerName);

  // Collect responses from Responses\Response subrecords
  responses := ElementByPath(e, 'Responses');
  if not Assigned(responses) then Exit;
  if ElementCount(responses) = 0 then Exit;

  lines := TStringList.Create;
  try
    lines.Add('{');
    lines.Add('  "topic_id": "' + topicId + '",');
    lines.Add('  "topic_edid": "' + EscapeJson(topicEdid) + '",');
    lines.Add('  "speaker_ref": "' + speakerRef + '",');
    lines.Add('  "speaker_name": "' + EscapeJson(speakerName) + '",');
    lines.Add('  "archetype_hint": "' + archetype + '",');
    lines.Add('  "responses": [');

    isFirst := True;
    for i := 0 to ElementCount(responses) - 1 do begin
      response := ElementByIndex(responses, i);
      responseNum := i + 1;
      try
        responseText := EscapeJson(GetEditValue(ElementByPath(response, 'NAM1')));
      except
        responseText := '';
      end;
      try
        emotion := GetEditValue(ElementByPath(response, 'TRDA\Emotion'));
      except
        emotion := 'Neutral';
      end;
      try
        emotionValue := StrToIntDef(GetEditValue(ElementByPath(response, 'TRDA\Emotion Value')), 50);
      except
        emotionValue := 50;
      end;

      if responseText = '' then Continue;

      if not isFirst then lines.Add(',');
      isFirst := False;
      lines.Add('    {');
      lines.Add('      "response_num": ' + IntToStr(responseNum) + ',');
      lines.Add('      "text": "' + responseText + '",');
      lines.Add('      "emotion": "' + EscapeJson(emotion) + '",');
      lines.Add('      "emotion_value": ' + IntToStr(emotionValue));
      lines.Add('    }');
    end;

    lines.Add('  ]');
    lines.Add('}');

    // Write to archetype subfolder, one file per INFO record
    ForceDirectories(OutputDir + '\xedit_dump\' + archetype);
    fileName := OutputDir + '\xedit_dump\' + archetype + '\' +
                IntToHex(FormID(e), 8) + '_' + topicEdid + '.json';
    lines.SaveToFile(fileName);
    Inc(ExportCount);

    if (ExportCount mod 500) = 0 then
      AddMessage('[MOSSY] Exported ' + IntToStr(ExportCount) + ' records so far...');

  finally
    lines.Free;
  end;
end;

function Finalize: Integer;
begin
  Result := 0;
  FileMap.Free;
  AddMessage('[MOSSY] Export complete. Processed ' + IntToStr(RecordCount) +
    ' records, exported ' + IntToStr(ExportCount) + ' dialogue entries.');
  AddMessage('[MOSSY] Output directory: ' + OutputDir + '\xedit_dump\');
  AddMessage('[MOSSY] Import into MOSSY: FO4 NPC Director > Setup > xEdit Export section');
end;

end.
