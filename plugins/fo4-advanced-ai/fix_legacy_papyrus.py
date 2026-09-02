#!/usr/bin/env python3
"""
fix_legacy_papyrus.py — Auto-fix Papyrus-incompatible syntax in
mod/Data/Scripts/Source/ scripts.

Run:  python fix_legacy_papyrus.py [--dry-run]
Backs up each file as <name>.psc.bak before modifying.
"""

import os, re, sys, shutil

SCRIPT_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "mod", "Data", "Scripts", "Source"
)
DRY_RUN = "--dry-run" in sys.argv

# ── Shared helpers ─────────────────────────────────────────────────────────────

def is_comment(stripped): return stripped.startswith(";")

def strip_inline_comment(text):
    in_str = False
    for i, c in enumerate(text):
        if c == '"': in_str = not in_str
        elif c == ';' and not in_str: return text[:i].rstrip(), text[i:]
    return text.rstrip(), ""

def leading_indent(raw): return len(raw) - len(raw.lstrip())

def find_char_outside_parens(text, char, start=0):
    depth, in_str, i = 0, False, start
    while i < len(text):
        c = text[i]
        if c == '"' and (i == 0 or text[i-1] != '\\'): in_str = not in_str
        elif not in_str:
            if c == '(': depth += 1
            elif c == ')': depth -= 1
            elif c == char and depth == 0:
                if char == ':':
                    if i > 0 and text[i-1] == ':': i += 1; continue
                    if i < len(text)-1 and text[i+1] == ':': i += 1; continue
                return i
        i += 1
    return None

def split_ternary(expr):
    q = find_char_outside_parens(expr, '?')
    if q is None: return None
    rest = expr[q+1:].strip()
    c = find_char_outside_parens(rest, ':')
    if c is None: return None
    return expr[:q].strip(), rest[:c].strip(), rest[c+1:].strip()

def ternary_to_ifelse(lhs, expr, ind):
    parts = split_ternary(expr)
    if parts is None:
        return [ind + (lhs + " = " if lhs else "Return ") + expr]
    cond, tv, fv = parts
    lines = [ind + "If (" + cond + ")",
             ind + "    " + (lhs + " = " if lhs else "Return ") + tv]
    nested = split_ternary(fv)
    if nested:
        lines += _elseif_chain(lhs, nested, ind)
    else:
        lines += [ind + "Else", ind + "    " + (lhs + " = " if lhs else "Return ") + fv]
    lines.append(ind + "EndIf")
    return lines

def _elseif_chain(lhs, parts, ind):
    cond, tv, fv = parts
    r = [ind + "ElseIf (" + cond + ")",
         ind + "    " + (lhs + " = " if lhs else "Return ") + tv]
    nested = split_ternary(fv)
    r += _elseif_chain(lhs, nested, ind) if nested else [ind + "Else", ind + "    " + (lhs + " = " if lhs else "Return ") + fv]
    return r

# ── Pass 1: join backslash-continuation lines ──────────────────────────────────

def fix_backslash_continuation(lines):
    out, i = [], 0
    while i < len(lines):
        raw = lines[i].rstrip('\n\r')
        while raw.rstrip().endswith('\\') and i + 1 < len(lines):
            raw = raw.rstrip().rstrip('\\').rstrip() + ' ' + lines[i+1].rstrip('\n\r').strip()
            i += 1
        out.append(raw + '\n'); i += 1
    return out

# ── Pass 2: join trailing-comma multi-line calls ───────────────────────────────

def fix_multiline_calls(lines):
    out, i = [], 0
    while i < len(lines):
        line = lines[i]
        if is_comment(line.strip()) or not line.strip():
            out.append(line); i += 1; continue
        code, comment = strip_inline_comment(line.rstrip('\n\r'))
        while (code.rstrip().endswith(',') and i + 1 < len(lines)
               and lines[i+1].strip() and not is_comment(lines[i+1].strip())):
            nc, ncmt = strip_inline_comment(lines[i+1].rstrip('\n\r'))
            code = code.rstrip() + ' ' + nc.strip()
            if ncmt: comment = (comment + ' ' if comment else '') + ncmt
            i += 1
        out.append(code + (comment or '') + '\n'); i += 1
    return out


# ── Pass 2b: join operator-continuation lines (|| / && at end of line) ────────

_OP_CONT = re.compile(r'(\|\||&&)\s*$')

def fix_operator_continuation(lines):
    """
    Join lines ending with || or && (no backslash) with the next line.
    Papyrus requires \ for multi-line expressions; this pattern was invalid but
    common in hand-authored scripts.
    """
    out = []
    i = 0
    while i < len(lines):
        line = lines[i]
        raw = line.rstrip('\n\r')
        stripped = raw.lstrip()
        if is_comment(stripped) or not stripped:
            out.append(line); i += 1; continue
        code, cmt = strip_inline_comment(stripped)
        while _OP_CONT.search(code.rstrip()) and i + 1 < len(lines):
            ns = lines[i+1].strip()
            if not ns or is_comment(ns): break
            nc, _ = strip_inline_comment(lines[i+1].rstrip('\n\r').lstrip())
            ind = raw[:len(raw) - len(raw.lstrip())]
            raw = ind + code.rstrip() + ' ' + nc.strip()
            code = raw.lstrip()
            i += 1
        out.append(raw + (cmt or '') + '\n')
        i += 1
    return out

# ── Pass 2c: join open-paren multi-line function calls ─────────────────────────

def fix_open_paren_continuation(lines):
    """
    Join cases where ( ends the line and args are on the next line(s).
    e.g.:  Func(
               arg1, arg2
           )
    → Func(arg1, arg2)
    """
    out = []
    i = 0
    while i < len(lines):
        line = lines[i]
        raw = line.rstrip('\n\r')
        stripped = raw.lstrip()
        if is_comment(stripped) or not stripped:
            out.append(line); i += 1; continue
        code, cmt = strip_inline_comment(stripped)
        if code.rstrip().endswith('(') and i + 1 < len(lines):
            depth = code.count('(') - code.count(')')
            while depth > 0 and i + 1 < len(lines):
                i += 1
                nraw = lines[i].rstrip('\n\r')
                nc, ncmt = strip_inline_comment(nraw.lstrip())
                ind = raw[:len(raw) - len(raw.lstrip())]
                raw = ind + code.rstrip() + ' ' + nc.strip()
                code = raw.lstrip()
                depth += nc.count('(') - nc.count(')')
                if ncmt and not cmt: cmt = ncmt
        out.append(raw + (cmt or '') + '\n')
        i += 1
    return out

# ── Pass 4b: fix method chaining (.GetVelocity().Length()) ────────────────────

def fix_method_chain(lines):
    """
    GetVelocity() returns Float in FO4, not a vector. Remove spurious .Length().
    """
    out = []
    for line in lines:
        if 'GetVelocity().Length()' in line:
            line = line.replace('GetVelocity().Length()', 'GetVelocity()')
        out.append(line)
    return out

# ── Pass 9b: expand single-line functions ─────────────────────────────────────

def fix_single_line_functions(lines):
    """
    Expand:  Type Function Name() Return val EndFunction
    To:      Type Function Name()
                 Return val
             EndFunction
    The CK Papyrus compiler does not support inline function bodies.
    """
    out = []
    for line in lines:
        raw = line.rstrip('\n\r')
        stripped = raw.lstrip()
        if is_comment(stripped) or not stripped:
            out.append(line); continue
        # Must contain both Function and EndFunction
        tok = stripped.lower()
        if 'function' not in tok or 'endfunction' not in tok:
            out.append(line); continue
        # Match: [RetType] Function Name(params) BODY EndFunction
        m = re.match(
            r'^(.*?\bFunction\s+\w+\s*\([^)]*\))\s+(.+?)\s+EndFunction\s*(?:;.*)?$',
            stripped, re.IGNORECASE)
        if m:
            ind = ' ' * leading_indent(raw)
            sig = m.group(1).strip()
            body = m.group(2).strip()
            out.extend([
                ind + sig + '\n',
                ind + '    ' + body + '\n',
                ind + 'EndFunction\n',
            ])
        else:
            out.append(line)
    return out

# ── Pass 3-6: simple substitutions ────────────────────────────────────────────

def fix_self(lines):
    return [l if is_comment(l.strip()) else re.sub(r'\b_self\b', 'Self', l) for l in lines]

def fix_mod_operator(lines):
    return [l if is_comment(l.strip()) else re.sub(r'\bMod\b', '%', l) for l in lines]

def fix_continue(lines):
    out = []
    for line in lines:
        if is_comment(line.strip()): out.append(line); continue
        m = re.match(r'^(\s*)(.*?)\s*\bContinue\b\s*(;.*)?$', line.rstrip('\n\r'), re.IGNORECASE)
        if m:
            ind, pre, cmt = m.group(1), m.group(2).strip(), m.group(3) or ""
            if pre: out.append(ind + pre + '\n')
            out.append(ind + '; TODO: "Continue" removed — restructure loop to skip body\n')
            if cmt: out.append(ind + cmt + '\n')
        else: out.append(line)
    return out

def fix_null_conditional(lines):
    return [l if is_comment(l.strip()) else l.replace('?.', '.') for l in lines]

# ── Pass 7: rename 'state' identifier -> 'stateVal' ───────────────────────────

def fix_state_identifier(lines):
    _state_re = re.compile(r'(?<![.\w])state(?![.\w(])', re.IGNORECASE)

    def _replace_outside_strings(line):
        # Split on double-quoted string literals, apply regex only to non-string segments
        result = []
        # Alternate: even indices = code, odd indices = string contents (with quotes)
        parts = re.split(r'("(?:[^"\\]|\\.)*")', line)
        for idx, part in enumerate(parts):
            if idx % 2 == 1:  # inside a quoted string — preserve verbatim
                result.append(part)
            else:
                result.append(_state_re.sub('stateVal', part))
        return ''.join(result)

    out = []
    for line in lines:
        stripped = line.strip()
        if is_comment(stripped): out.append(line); continue
        # Skip state machine block openers: ^State "Name"
        if re.match(r'^State\s+', stripped, re.IGNORECASE) and 'Property' not in stripped:
            out.append(line); continue
        out.append(_replace_outside_strings(line))
    return out

# ── Pass 8: capitalize lowercase type names in function/event param lists ───────

_TYPE_MAP = {'int':'Int','float':'Float','bool':'Bool','string':'String',
             'actor':'Actor','objectreference':'ObjectReference','keyword':'Keyword',
             'faction':'Faction','race':'Race','location':'Location',
             'spell':'Spell','weapon':'Weapon','armor':'Armor','perk':'Perk','form':'Form'}
_TYPE_PAT = re.compile(r'\b(' + '|'.join(re.escape(k) for k in _TYPE_MAP) + r')\b', re.IGNORECASE)

def fix_lowercase_param_types(lines):
    def _rt(m): return _TYPE_MAP.get(m.group(0).lower(), m.group(0))
    def _rp(m): return '(' + _TYPE_PAT.sub(_rt, m.group(1)) + ')'
    out = []
    for line in lines:
        s = line.strip()
        if is_comment(s) or not re.search(r'\b(Function|Event)\b.*\(', s, re.IGNORECASE):
            out.append(line)
        else:
            out.append(re.sub(r'\(([^)]*)\)', _rp, line))
    return out

# ── Pass 9: expand single-line If/ElseIf to block form ────────────────────────

def _is_single_line_if(stripped):
    """
    Detect 'If COND BODY' on one line. Returns (kw_and_cond, body) or None.
    Strategy A: 2+ spaces before body, body starts with \w.
    Strategy B: 1+ spaces, body is word.method(...) or word(...).
    Strategy C: 1+ spaces, body starts with Return keyword.
    """
    if not re.match(r'^(?:Else)?If\b', stripped, re.IGNORECASE): return None
    code, _ = strip_inline_comment(stripped)
    code = code.rstrip()

    # A: 2+ spaces, word-starting body
    m = re.match(r'^((?:Else)?If\b\s+.+?\S)\s{2,}(\w.+)$', code, re.IGNORECASE)
    if m: return m.group(1).rstrip(), m.group(2).strip()

    # B: method/function call body
    m = re.match(
        r'^((?:Else)?If\b\s+.+?(?:None|True|False|\d+\.?\d*|["\w\)]))\s+'
        r'(\w[\w]*\s*[\.(].+)$', code, re.IGNORECASE)
    if m and not re.match(r'^(&&|\|\||!=|==|<=|>=|<|>)', m.group(2)):
        return m.group(1).rstrip(), m.group(2).strip()

    # C: Return statement body
    m = re.match(
        r'^((?:Else)?If\b\s+.+?(?:None|True|False|\d+\.?\d*|["\w\)]))\s+'
        r'(Return\s+.+)$', code, re.IGNORECASE)
    if m: return m.group(1).rstrip(), m.group(2).strip()

    return None

def fix_single_line_ifs(lines):
    out, i = [], 0
    while i < len(lines):
        line = lines[i]
        raw = line.rstrip('\n\r')
        stripped = raw.lstrip()
        ind = ' ' * leading_indent(raw)
        if is_comment(stripped): out.append(line); i += 1; continue
        result = _is_single_line_if(stripped)
        if result:
            kw_and_cond, body = result
            body_code, body_comment = strip_inline_comment(body)
            is_elseif = stripped.lower().startswith('elseif')
            is_plain_if = stripped.lower().startswith('if') and not is_elseif
            next_tok = ''
            for j in range(i+1, min(i+6, len(lines))):
                ns = lines[j].strip()
                if ns and not ns.startswith(';'): next_tok = ns.lower(); break
            in_chain = next_tok.startswith(('elseif','else','endif'))
            out.append(ind + kw_and_cond + '\n')
            out.append(ind + '    ' + body_code.strip() + (body_comment or '') + '\n')
            if is_plain_if and not in_chain: out.append(ind + 'EndIf\n')
        else: out.append(line)
        i += 1
    return out

# ── Pass 10: ternary -> If/Else/EndIf (assignment and return contexts) ─────────

def fix_ternary(lines):
    out = []
    for line in lines:
        raw = line.rstrip('\n\r')
        stripped = raw.lstrip()
        if is_comment(stripped) or '?' not in raw: out.append(line); continue
        ind = ' ' * leading_indent(raw)
        code, tc = strip_inline_comment(stripped)

        m = re.match(r'^(Bool|Int|Float|String|Actor|ObjectReference|Keyword|Quest|Form|'
                     r'Faction|Race|Location|Spell|MagicEffect|Weapon|Armor|Perk|Static)\s+'
                     r'(\w+)\s*=\s*(.+)$', code, re.IGNORECASE)
        if m and split_ternary(m.group(3).strip()) is not None:
            nl = [ind + m.group(1) + ' ' + m.group(2) + '\n']
            for l in ternary_to_ifelse(m.group(2), m.group(3).strip(), ind): nl.append(l + '\n')
            if tc: nl[0] = nl[0].rstrip('\n') + '  ' + tc + '\n'
            out.extend(nl); continue

        m = re.match(r'^([\w\.\[\]]+)\s*=\s*(.+)$', code)
        if m and not m.group(1).endswith('=') and '==' not in m.group(1) and split_ternary(m.group(2).strip()) is not None:
            nl = []
            for l in ternary_to_ifelse(m.group(1), m.group(2).strip(), ind): nl.append(l + '\n')
            if tc: nl[0] = nl[0].rstrip('\n') + '  ' + tc + '\n'
            out.extend(nl); continue

        m = re.match(r'^[Rr]eturn\s+(.+)$', code)
        if m and split_ternary(m.group(1).strip()) is not None:
            nl = []
            for l in ternary_to_ifelse('', m.group(1).strip(), ind): nl.append(l + '\n')
            if tc: nl[0] = nl[0].rstrip('\n') + '  ' + tc + '\n'
            out.extend(nl); continue

        out.append(line)
    return out

# ── Pass 11: embedded ternary (COND ? A : B) inside expressions ───────────────

_TMP_CTR = [0]

def _infer_type(a, b):
    for v in [a.strip().rstrip(')'), b.strip().rstrip(')')]:
        if re.match(r'^-?\d+\.\d+$', v): return 'Float'
        if v.lower() in ('true', 'false'): return 'Bool'
        if v.startswith('"'): return 'String'
    return 'Int'

def fix_embedded_ternary(lines):
    out = []
    for line in lines:
        raw = line.rstrip('\n\r')
        stripped = raw.lstrip()
        if is_comment(stripped) or '?' not in raw: out.append(line); continue
        ind = ' ' * leading_indent(raw)
        code, tc = strip_inline_comment(stripped)
        q_idx = None
        in_str = False
        for i, c in enumerate(code):
            if c == '"': in_str = not in_str
            elif c == '?' and not in_str:
                if i + 1 < len(code) and code[i+1] == '.': continue
                q_idx = i; break
        if q_idx is None: out.append(line); continue
        paren_start = None
        depth = 0
        for i in range(q_idx-1, -1, -1):
            c = code[i]
            if c == ')': depth += 1
            elif c == '(':
                if depth == 0: paren_start = i; break
                depth -= 1
        if paren_start is None: out.append(line); continue
        depth, paren_end = 0, None
        for i in range(paren_start, len(code)):
            c = code[i]
            if c == '(': depth += 1
            elif c == ')':
                depth -= 1
                if depth == 0: paren_end = i; break
        if paren_end is None: out.append(line); continue
        parts = split_ternary(code[paren_start+1:paren_end])
        if parts is None: out.append(line); continue
        cond, tv, fv = parts
        tmp_type = _infer_type(tv, fv)
        _TMP_CTR[0] += 1
        tmp = '_fxTmp{}'.format(_TMP_CTR[0])
        is_func = paren_start > 0 and (code[paren_start-1].isalnum() or code[paren_start-1] == '_')
        new_code = (code[:paren_start+1] + tmp + code[paren_end:]) if is_func else (code[:paren_start] + tmp + code[paren_end+1:])
        out.extend([
            ind + tmp_type + ' ' + tmp + ' = ' + tv + '\n',
            ind + 'If !(' + cond + ')\n',
            ind + '    ' + tmp + ' = ' + fv + '\n',
            ind + 'EndIf\n',
            ind + new_code.strip() + (tc or '') + '\n',
        ])
    return out

# ── Pass 12: fix block structure (missing EndIf, wrong EndEvent/EndFunction) ───

def fix_block_structure(lines):
    """
    Using indentation context:
    - Insert missing EndIf when ElseIf/Else/EndWhile/EndFunction appears
      at an indent level shallower than an open If block.
    - Swap EndEvent<->EndFunction when the wrong close keyword is used.
    """
    out = []
    # stack: list of (keyword, indent_spaces)
    stack = []

    def _close_deeper_ifs(target_ind):
        while stack and stack[-1][0] == 'if' and stack[-1][1] > target_ind:
            out.append(' ' * stack[-1][1] + 'EndIf\n')
            stack.pop()

    def _close_inner_blocks(target_ind):
        while stack and stack[-1][0] in ('if', 'while') and stack[-1][1] > target_ind:
            kw = stack[-1][0]
            out.append(' ' * stack[-1][1] + 'End' + kw.capitalize() + '\n')
            stack.pop()

    for line in lines:
        raw = line.rstrip('\n\r')
        stripped = raw.lstrip()
        if not stripped or stripped.startswith(';'):
            out.append(line); continue
        tok = stripped.lower().split(';')[0].rstrip()
        ind = leading_indent(raw)

        if re.match(r'^endif\b', tok):
            if stack and stack[-1][0] == 'if':
                stack.pop()
                out.append(line)
            else:
                # Orphaned EndIf — no matching If open; remove to avoid compile error
                out.append(' ' * ind + '; [orphaned EndIf removed by fixer]\n')
        elif re.match(r'^endwhile\b', tok):
            _close_deeper_ifs(ind)
            if stack and stack[-1][0] == 'while': stack.pop()
            out.append(line)
        elif re.match(r'^endfunction\b', tok):
            _close_inner_blocks(ind)
            if stack and stack[-1][0] == 'function':
                stack.pop(); out.append(line)
            elif stack and stack[-1][0] == 'event':
                stack.pop()
                out.append(raw.replace('EndFunction', 'EndEvent', 1) + '\n')
            else:
                out.append(line)
        elif re.match(r'^endevent\b', tok):
            _close_inner_blocks(ind)
            if stack and stack[-1][0] == 'event':
                stack.pop(); out.append(line)
            elif stack and stack[-1][0] == 'function':
                stack.pop()
                out.append(raw.replace('EndEvent', 'EndFunction', 1) + '\n')
            else:
                out.append(line)
        elif re.match(r'^(elseif|else)\b', tok):
            _close_deeper_ifs(ind)
            out.append(line)
        elif re.match(r'^if\b', tok) and not re.match(r'^endif\b', tok):
            # Don't push single-line Ifs (already expanded or If...EndIf on same line)
            result = _is_single_line_if(stripped)
            is_complete = 'endif' in tok
            if result is None and not is_complete:
                stack.append(('if', ind))
            out.append(line)
        elif re.search(r'\bfunction\s+\w', tok):
            # Don't push single-line functions (EndFunction on same line)
            if 'endfunction' not in tok:
                stack.append(('function', ind))
            out.append(line)
        elif re.match(r'^event\b', tok):
            if 'endevent' not in tok:
                stack.append(('event', ind))
            out.append(line)
        elif re.match(r'^while\b', tok):
            stack.append(('while', ind)); out.append(line)
        else:
            out.append(line)

    return out

# ── Main ──────────────────────────────────────────────────────────────────────

PASSES = [
    ("join \\-continuation",        fix_backslash_continuation),
    ("join trailing-comma calls",   fix_multiline_calls),
    ("join ||/&& continuation",     fix_operator_continuation),
    ("join open-paren calls",       fix_open_paren_continuation),
    ("_self → Self",                fix_self),
    ("Mod → %",                     fix_mod_operator),
    ("Continue keyword",            fix_continue),
    ("?. null-conditional",         fix_null_conditional),
    ("state identifier rename",     fix_state_identifier),
    ("lowercase param types",       fix_lowercase_param_types),
    ("method chain (.Length())",    fix_method_chain),
    ("expand single-line funcs",    fix_single_line_functions),
    ("expand single-line If",       fix_single_line_ifs),
    ("ternary → if/else",           fix_ternary),
    ("embedded ternary (pass 1)",   fix_embedded_ternary),
    ("embedded ternary (pass 2)",   fix_embedded_ternary),
    ("fix block structure",         fix_block_structure),
]

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        original = f.readlines()
    lines = original[:]
    for _name, fn in PASSES:
        lines = fn(lines)
    changed = lines != original
    if changed and not DRY_RUN:
        shutil.copy2(filepath, filepath + '.bak')
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(lines)
    return changed

def main():
    if not os.path.isdir(SCRIPT_DIR):
        print("ERROR: source dir not found: " + SCRIPT_DIR); sys.exit(1)
    scripts = sorted(f for f in os.listdir(SCRIPT_DIR) if f.endswith('.psc'))
    if not scripts:
        print("No .psc files found."); sys.exit(1)
    mode = "[DRY RUN] " if DRY_RUN else ""
    print("{}Fixing {} scripts in {}\n".format(mode, len(scripts), SCRIPT_DIR))
    changed = 0
    for script in scripts:
        ok = fix_file(os.path.join(SCRIPT_DIR, script))
        print("{}  {}".format("CHANGED" if ok else "ok     ", script))
        if ok: changed += 1
    print("\n{}{}/{} scripts modified.".format(mode, changed, len(scripts)))
    if not DRY_RUN and changed: print("Backups saved as <name>.psc.bak")

if __name__ == "__main__":
    main()
