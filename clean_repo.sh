#!/usr/bin/env bash
# ============================================================
# 3DSL Phase II Repository Clean Script
# (p38_repo_refactor_foundation.plan.md compliant)
# ------------------------------------------------------------
# Environment: WSL / bash
# Purpose:
#   Clean up legacy artifacts and normalize the repo layout
#   for the official "clean_slate" branch baseline.
# ============================================================

set -e

echo "=== 3DSL Phase II Repository Cleaner ==="
echo "Current branch: $(git branch --show-current)"
echo

# ------------------------------------------------------------
# 0. Branch Check
# ------------------------------------------------------------
branch=$(git branch --show-current)
if [[ "$branch" != "clean_slate" ]]; then
  echo "⚠️  You are on branch: $branch"
  echo "   Switch to 'clean_slate' before continuing."
  echo "   (run: git checkout clean_slate)"
  exit 1
fi

# ------------------------------------------------------------
# 1. Confirm repository root
# ------------------------------------------------------------
if [[ ! -d "./code" || ! -d "./schemas" ]]; then
  echo "❌ This script must be run at the root of the 3DSL repository."
  exit 1
fi

# ------------------------------------------------------------
# 2. Preview delete targets
# ------------------------------------------------------------
echo "The following directories will be deleted:"
echo "  - node_modules/"
echo "  - meta/"
echo
echo "The following files will be deleted:"
echo "  - package-lock.json"
echo "  - repo_structure.txt"
echo
read -p "Proceed with cleanup? (y/N): " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }

# ------------------------------------------------------------
# 3. Delete unwanted directories & files
# ------------------------------------------------------------
rm -rf node_modules meta
rm -f package-lock.json repo_structure.txt

# ------------------------------------------------------------
# 4. Ensure clean structure per P38
# ------------------------------------------------------------
mkdir -p code/{common,modeler,viewer,validator,vendor,devtools}
mkdir -p schemas specs plans docs/guide docs/architecture docs/release_notes

# ------------------------------------------------------------
# 5. .gitignore refresh
# ------------------------------------------------------------
cat > .gitignore <<'EOF'
node_modules/
.DS_Store
Thumbs.db
*.log
*.tmp
*.bak
*.swp
EOF

# ------------------------------------------------------------
# 6. Display resulting layout
# ------------------------------------------------------------
echo
echo "=== Final directory layout ==="
find . -maxdepth 2 -type d | sort
echo "=============================="
echo

# ------------------------------------------------------------
# 7. Git commit
# ------------------------------------------------------------
git add -A
git commit -m "chore(clean_slate): remove legacy files and normalize structure (P38)"
git push origin clean_slate

echo
echo "✅ Repository cleanup complete."
echo "Branch 'clean_slate' is now normalized."
echo
