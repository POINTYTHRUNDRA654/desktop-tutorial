#!/bin/bash
# Git Repository Diagnostic Script
# This script generates a comprehensive report of your repository state

echo "==================================================================="
echo "GIT REPOSITORY DIAGNOSTIC REPORT"
echo "Generated: $(date)"
echo "==================================================================="
echo ""

echo "1. CURRENT REPOSITORY STATUS"
echo "-------------------------------------------------------------------"
echo "Current Directory: $(pwd)"
echo "Current Branch: $(git branch --show-current)"
echo ""

echo "2. ALL BRANCHES"
echo "-------------------------------------------------------------------"
git branch -a
echo ""

echo "3. RECENT COMMITS (Last 20)"
echo "-------------------------------------------------------------------"
git log --oneline --graph --decorate -20
echo ""

echo "4. WORKING DIRECTORY STATUS"
echo "-------------------------------------------------------------------"
git status
echo ""

echo "5. RECENT CHANGES (Last 7 Days)"
echo "-------------------------------------------------------------------"
git log --since="7 days ago" --all --oneline --decorate
echo ""

echo "6. SEARCH FOR 'VISUAL' RELATED FILES"
echo "-------------------------------------------------------------------"
echo "Files currently in repository:"
find . -type f -name "*visual*" -o -name "*Visual*" 2>/dev/null | grep -v ".git"
echo ""
echo "Git history of Visual-related files:"
git log --all --name-status --oneline | grep -i visual | head -20
echo ""

echo "7. REFLOG (Recent Git Operations)"
echo "-------------------------------------------------------------------"
git reflog --date=iso -15
echo ""

echo "8. REMOTE REPOSITORY STATUS"
echo "-------------------------------------------------------------------"
echo "Remote URL:"
git remote -v
echo ""
echo "Remote branches:"
git branch -r
echo ""

echo "9. UNCOMMITTED CHANGES"
echo "-------------------------------------------------------------------"
if git diff --quiet && git diff --cached --quiet; then
    echo "No uncommitted changes"
else
    echo "You have uncommitted changes:"
    git diff --stat
    git diff --cached --stat
fi
echo ""

echo "10. RECENT FILE MODIFICATIONS"
echo "-------------------------------------------------------------------"
echo "Files modified in last commit:"
git show --name-status --oneline HEAD
echo ""

echo "==================================================================="
echo "DIAGNOSTIC REPORT COMPLETE"
echo "==================================================================="
echo ""
echo "To save this report to a file, run:"
echo "  bash diagnose_repository.sh > diagnostic_report.txt"
echo ""
echo "For more help, see GIT_HISTORY_DIAGNOSTIC.md"
echo "==================================================================="
