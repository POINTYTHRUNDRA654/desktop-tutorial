#!/bin/bash
# Script to clean up old merged branches
# Run this after PR is merged to master

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║                  🧹 BRANCH CLEANUP SCRIPT                        ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Function to delete branch safely
delete_branch() {
  local branch=$1
  local location=$2
  
  echo "🗑️  Deleting $location branch: $branch"
  
  if [ "$location" = "local" ]; then
    git branch -d "$branch" 2>/dev/null && echo "   ✅ Deleted" || echo "   ℹ️  Already deleted or doesn't exist"
  elif [ "$location" = "remote" ]; then
    git push origin --delete "$branch" 2>/dev/null && echo "   ✅ Deleted" || echo "   ℹ️  Already deleted or doesn't exist"
  fi
}

echo "Current branches:"
git branch -a
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# List of branches to clean up (add any old branches here)
BRANCHES_TO_DELETE=(
  "copilot/check-branch-merge-possibility"
)

echo "Branches to delete:"
for branch in "${BRANCHES_TO_DELETE[@]}"; do
  echo "  • $branch"
done
echo ""

read -p "Delete these branches? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo "Deleting branches..."
  echo ""
  
  for branch in "${BRANCHES_TO_DELETE[@]}"; do
    # Delete local branch
    delete_branch "$branch" "local"
    
    # Delete remote branch
    delete_branch "$branch" "remote"
    
    echo ""
  done
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ Cleanup complete!"
  echo ""
  echo "Remaining branches:"
  git branch -a
else
  echo "Cleanup cancelled."
fi

echo ""
echo "Note: This script should be run AFTER the PR is merged to master."
echo "      GitHub will automatically delete the PR branch on merge if configured."
