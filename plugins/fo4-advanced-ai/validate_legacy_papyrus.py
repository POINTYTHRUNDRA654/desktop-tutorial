#!/usr/bin/env python3
"""
validate_legacy_papyrus.py — Pre-compile sanity check for
mod/Data/Scripts/Source/ scripts.

Run BEFORE compile_papyrus.bat to catch Papyrus-incompatible syntax.

Usage:  python validate_legacy_papyrus.py [--summary]
        --summary  prints only pass/fail per file, no line detail

Checks:
  1. Ternary operator '?' in non-comment, non-string context
  2. '_self' usage (not valid in Papyrus; use 'Self')
  3. ' Mod ' as an operator keyword (use '%' instead)
  4. 'Continue' keyword (not supported in FO4 Papyrus)
  5. 'state' used as a variable or parameter name (reserved keyword)
  6. Multi-line function calls — trailing ',' without backslash continuation
  7. Lowercase type names in function/event parameter lists
     (e.g. 'Function Foo(int x)' → should be 'Int')
  8. Balanced If/While/Function/Event blocks
"""

import os
import re
import sys

SCRIPT_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "mod", "Data", "Scripts", "Source"
)

SUMMARY_ONLY = "--summary" in sys.argv

# ── Shared helpers ─────────────────────────────────────────────────────────────

def is_comment(stripped):
    return stripped.startswith(";")

def strip_inline_comment(text):
    """Return code portion of a line (drop trailing ; comment)."""
    in_str = False
    for i, c in enumerate(text):
        if c == '"':
            in_str = not in_str
        elif c == ';' and not in_str:
            return text[:i].rstrip()
    return text.rstrip()

def has_question_mark_outside_string(code):
    """True if '?' appears in code outside a quoted string."""
    in_str = False
    for c in code:
        if c == '"':
            in_str = not in_str
        elif c == '?' and not in_str:
            return True
    return False

# ── Checks ─────────────────────────────────────────────────────────────────────

def check_ternary(lines, _filename):
    errors = []
    for lineno, raw in enumerate(lines, 1):
        stripped = raw.strip()
        if is_comment(stripped) or not stripped:
            continue
        code = strip_inline_comment(stripped)
        if has_question_mark_outside_string(code):
            errors.append((lineno, "ternary operator '?' not supported; convert to If/Else/EndIf"))
    return errors


def check_self(lines, _filename):
    errors = []
    for lineno, raw in enumerate(lines, 1):
        stripped = raw.strip()
        if is_comment(stripped):
            continue
        if re.search(r'\b_self\b', raw):
            errors.append((lineno, "_self is not valid Papyrus; use 'Self'"))
    return errors


def check_mod_operator(lines, _filename):
    errors = []
    for lineno, raw in enumerate(lines, 1):
        stripped = raw.strip()
        if is_comment(stripped):
            continue
        code = strip_inline_comment(stripped)
        if re.search(r'\bMod\b', code):
            errors.append((lineno, "'Mod' is not a Papyrus operator; use '%'"))
    return errors


def check_continue(lines, _filename):
    errors = []
    for lineno, raw in enumerate(lines, 1):
        stripped = raw.strip()
        if is_comment(stripped):
            continue
        if re.search(r'\bContinue\b', raw, re.IGNORECASE):
            errors.append((lineno, "'Continue' keyword not supported in FO4 Papyrus; restructure loop"))
    return errors


def check_state_as_identifier(lines, _filename):
    """
    'state' is a reserved Papyrus keyword (used for state machines).
    Flag it when used as a variable name or function parameter name.
    """
    errors = []
    for lineno, raw in enumerate(lines, 1):
        stripped = raw.strip()
        if is_comment(stripped):
            continue
        code = strip_inline_comment(stripped)
        # Function parameter: "Function Foo(... int state ..."
        # Variable declaration: "int state = ..."
        # Assignment: "state = ..."
        if re.search(r'\bstate\s*[,)=]', code, re.IGNORECASE):
            # Exclude "GetState()" and ".state" property accesses
            if not re.search(r'[.\w]state\b|\bGetState\b|\bGoToState\b', code, re.IGNORECASE):
                errors.append((lineno, "'state' is a reserved Papyrus keyword; rename the variable"))
    return errors


def check_multiline_calls(lines, _filename):
    """
    Detect lines ending with ',' (continuation) that lack a '\' at the end.
    Papyrus requires '\' to split expressions across lines.
    """
    errors = []
    for lineno, raw in enumerate(lines, 1):
        stripped = raw.strip()
        if is_comment(stripped) or not stripped:
            continue
        code = strip_inline_comment(raw.rstrip('\n\r'))
        code_stripped = code.rstrip()
        if code_stripped.endswith(',') and not code_stripped.endswith('\\'):
            errors.append((lineno, "line ends with ',' — Papyrus needs '\\' to continue expression on next line"))
    return errors


def check_lowercase_params(lines, _filename):
    """
    Detect lowercase type keywords in function/event parameter lists.
    e.g. 'Function Foo(int x, string y)' → compile error for 'int', 'string'.
    Note: lowercase types in Property declarations seem to compile OK.
    """
    errors = []
    LOWERCASE_TYPES = re.compile(
        r'\b(int|float|bool|string|actor|objectreference|keyword|faction|race|location|spell|weapon|armor|perk|form)\s+\w',
        re.IGNORECASE
    )
    UPPERCASE_TYPES = re.compile(
        r'\b(Int|Float|Bool|String|Actor|ObjectReference|Keyword|Faction|Race|Location|Spell|Weapon|Armor|Perk|Form)\b'
    )

    for lineno, raw in enumerate(lines, 1):
        stripped = raw.strip()
        if is_comment(stripped) or not stripped:
            continue
        # Only inspect lines that are function/event declarations (contain a param list)
        if not re.search(r'\b(Function|Event)\b.*\(', stripped, re.IGNORECASE):
            continue
        # Extract the parameter list portion (between first ( and last ))
        m = re.search(r'\(([^)]*)\)', stripped)
        if not m:
            continue
        params = m.group(1)
        # Find lowercase type keywords
        for lm in LOWERCASE_TYPES.finditer(params):
            found = lm.group(1)
            # Skip if this is actually already matching the proper capitalised version
            if UPPERCASE_TYPES.match(found):
                continue
            errors.append((lineno,
                "lowercase type '{}' in function parameter — should be '{}{}'".format(
                    found, found[0].upper(), found[1:])))
    return errors


def check_balanced_blocks(lines, _filename):
    """Every open block keyword must have a matching close."""
    stack = []
    errors = []
    for lineno, raw in enumerate(lines, 1):
        tok = raw.strip().lower().split(";")[0].strip()
        if not tok:
            continue
        if tok.startswith("endif"):
            if stack and stack[-1][0] == "if":
                stack.pop()
            else:
                errors.append((lineno, "unexpected 'endif'{}".format(
                    " (open: {} at line {})".format(*stack[-1]) if stack else " (empty stack)")))
        elif tok.startswith("endwhile"):
            if stack and stack[-1][0] == "while":
                stack.pop()
            else:
                errors.append((lineno, "unexpected 'endwhile'{}".format(
                    " (open: {} at line {})".format(*stack[-1]) if stack else " (empty stack)")))
        elif tok.startswith("endfunction"):
            if stack and stack[-1][0] == "function":
                stack.pop()
            else:
                errors.append((lineno, "unexpected 'endfunction'{}".format(
                    " (open: {} at line {})".format(*stack[-1]) if stack else " (empty stack)")))
        elif tok.startswith("endevent"):
            if stack and stack[-1][0] == "event":
                stack.pop()
            else:
                errors.append((lineno, "unexpected 'endevent'{}".format(
                    " (open: {} at line {})".format(*stack[-1]) if stack else " (empty stack)")))
        elif re.match(r'^if\b', tok) and not tok.startswith("elseif"):
            # Skip single-line If...EndIf (both keywords on one line)
            if "endif" not in tok:
                stack.append(("if", lineno))
        elif re.match(r'^while\b', tok):
            stack.append(("while", lineno))
        elif re.search(r'\bfunction\s+\w', tok):
            # Skip single-line Function...EndFunction (getter stubs on one line)
            if "endfunction" not in tok:
                stack.append(("function", lineno))
        elif re.match(r'^event\b', tok):
            if "endevent" not in tok:
                stack.append(("event", lineno))
    for opener, lineno in stack:
        errors.append((0, "line {}: '{}' never closed (EOF reached)".format(lineno, opener)))
    return errors


# ── Runner ────────────────────────────────────────────────────────────────────

CHECKS = [
    ("ternary '?'",          check_ternary),
    ("_self",                check_self),
    ("Mod operator",         check_mod_operator),
    ("Continue keyword",     check_continue),
    ("'state' identifier",   check_state_as_identifier),
    ("multi-line calls",     check_multiline_calls),
    ("lowercase param types",check_lowercase_params),
    ("block balance",        check_balanced_blocks),
]


def validate_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()
    all_errors = []
    for check_name, fn in CHECKS:
        for lineno, msg in fn(lines, os.path.basename(filepath)):
            all_errors.append((lineno, check_name, msg))
    all_errors.sort(key=lambda e: e[0])
    return all_errors


def main():
    if not os.path.isdir(SCRIPT_DIR):
        print("ERROR: source dir not found: " + SCRIPT_DIR)
        sys.exit(1)

    scripts = sorted(f for f in os.listdir(SCRIPT_DIR) if f.endswith(".psc"))
    if not scripts:
        print("No .psc files found in " + SCRIPT_DIR)
        sys.exit(1)

    total_errors = 0
    failed = []
    print("Validating {} scripts in {}\n".format(len(scripts), SCRIPT_DIR))

    for script in scripts:
        errors = validate_file(os.path.join(SCRIPT_DIR, script))
        if errors:
            print("FAIL  " + script + "  ({} issues)".format(len(errors)))
            if not SUMMARY_ONLY:
                for lineno, check_name, msg in errors:
                    loc = "line {:>4}".format(lineno) if lineno else "      "
                    print("      {}  [{}]  {}".format(loc, check_name, msg))
            print()
            total_errors += len(errors)
            failed.append(script)
        else:
            print("OK    " + script)

    print()
    if total_errors == 0:
        print("All {} scripts passed.".format(len(scripts)))
        sys.exit(0)
    else:
        print("{}/{} scripts have issues ({} total errors).".format(
            len(failed), len(scripts), total_errors))
        print("Run fix_legacy_papyrus.py to auto-fix most of these.")
        sys.exit(1)


if __name__ == "__main__":
    main()
