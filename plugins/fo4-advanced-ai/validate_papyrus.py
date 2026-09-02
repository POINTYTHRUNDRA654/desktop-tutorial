"""
validate_papyrus.py  —  Pre-compile sanity check for F4AI Papyrus scripts.
Run BEFORE compile_papyrus.bat to catch truncation and structural issues early.

Usage:  python validate_papyrus.py
"""

import os
import re
import sys

SCRIPT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "papyrus")


# ── Checks ────────────────────────────────────────────────────────────────────

def check_truncation(lines, filename):
    """File must end with a recognised closing keyword, not mid-statement."""
    errors = []
    last_content = ""
    last_lineno = 0
    for i in range(len(lines) - 1, -1, -1):
        s = lines[i].strip()
        if s:
            last_content = s
            last_lineno = i + 1
            break
    if not last_content:
        errors.append("  file appears empty")
        return errors
    valid_endings = ("endfunction", "endevent", "endwhile", "endif", ";")
    if not any(last_content.lower().startswith(v) for v in valid_endings):
        errors.append(
            "  line {}: file ends with unexpected content: {!r}".format(
                last_lineno, last_content
            )
        )
    return errors


def check_balanced_blocks(lines, filename):
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
                errors.append("  line {}: unexpected 'endif'{}".format(
                    lineno, " (open: {} at {})".format(*stack[-1]) if stack else " (empty stack)"))
        elif tok.startswith("endwhile"):
            if stack and stack[-1][0] == "while":
                stack.pop()
            else:
                errors.append("  line {}: unexpected 'endwhile'{}".format(
                    lineno, " (open: {} at {})".format(*stack[-1]) if stack else " (empty stack)"))
        elif tok.startswith("endfunction"):
            if stack and stack[-1][0] == "function":
                stack.pop()
            else:
                errors.append("  line {}: unexpected 'endfunction'{}".format(
                    lineno, " (open: {} at {})".format(*stack[-1]) if stack else " (empty stack)"))
        elif tok.startswith("endevent"):
            if stack and stack[-1][0] == "event":
                stack.pop()
            else:
                errors.append("  line {}: unexpected 'endevent'{}".format(
                    lineno, " (open: {} at {})".format(*stack[-1]) if stack else " (empty stack)"))
        elif re.match(r'^if\b', tok) and not tok.startswith("elseif"):
            stack.append(("if", lineno))
        elif re.match(r'^while\b', tok):
            stack.append(("while", lineno))
        elif re.search(r'\bfunction\s+\w', tok):
            stack.append(("function", lineno))
        elif re.match(r'^event\b', tok):
            stack.append(("event", lineno))
    for opener, lineno in stack:
        errors.append("  line {}: '{}' never closed (EOF reached)".format(lineno, opener))
    return errors


def check_duplicate_functions(lines, filename):
    """Duplicate function definitions in the same script cause compile errors."""
    defined = {}
    errors = []
    for lineno, raw in enumerate(lines, 1):
        m = re.match(
            r'^\s*(?:\w+\s+)?function\s+(\w+)\s*\(',
            raw, re.IGNORECASE
        )
        if m:
            fname = m.group(1).lower()
            if fname in defined:
                errors.append(
                    "  line {}: duplicate function '{}' (first at line {})".format(
                        lineno, m.group(1), defined[fname]
                    )
                )
            else:
                defined[fname] = lineno
    return errors


def check_register_for_update(lines, filename):
    """ReferenceAlias scripts cannot use RegisterForUpdate (not on Alias in FO4)."""
    is_ref_alias = any("extends referencealias" in l.lower() for l in lines[:10])
    if not is_ref_alias:
        return []
    errors = []
    for lineno, raw in enumerate(lines, 1):
        if raw.strip().startswith(";"):
            continue
        if re.search(r'\b(RegisterForUpdate|UnregisterForUpdate|Event\s+OnUpdate)\b', raw):
            errors.append(
                "  line {}: ReferenceAlias cannot use RegisterForUpdate/OnUpdate: {!r}".format(
                    lineno, raw.rstrip()
                )
            )
    return errors


# ── Runner ────────────────────────────────────────────────────────────────────

CHECKS = [
    check_truncation,
    check_balanced_blocks,
    check_duplicate_functions,
    check_register_for_update,
]


def validate_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()
    filename = os.path.basename(filepath)
    errors = []
    for check in CHECKS:
        errors += check(lines, filename)
    return errors


def main():
    if not os.path.isdir(SCRIPT_DIR):
        print("ERROR: script dir not found: " + SCRIPT_DIR)
        sys.exit(1)

    scripts = sorted(f for f in os.listdir(SCRIPT_DIR) if f.endswith(".psc"))
    if not scripts:
        print("No .psc files found in " + SCRIPT_DIR)
        sys.exit(1)

    total_errors = 0
    failed = []
    print("Validating {} scripts in {}\n".format(len(scripts), SCRIPT_DIR))

    for script in scripts:
        errs = validate_file(os.path.join(SCRIPT_DIR, script))
        if errs:
            print("FAIL  " + script)
            for e in errs:
                print(e)
            print()
            total_errors += len(errs)
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
        sys.exit(1)


if __name__ == "__main__":
    main()
