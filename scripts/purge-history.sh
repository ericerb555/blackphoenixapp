#!/bin/sh
#
# Purge the leaked GitHub tokens from every commit, then force push.
#
# Eric: "use git filter repo or bfg repo cleaner to purge secrets from your
# entire git history and force push cleaned the entire repository."
#
# WHAT WAS LEAKED
#
# Two GitHub Personal Access Tokens, written as TOKEN="ghp_…" in
# push_to_github.sh, push_changes.sh, PUSH_TO_GITHUB.md and sync.bat, committed
# 2026-07-06 across six commits. The files were deleted from the tree later,
# which is why a working-tree scan came back clean and the first history pass
# missed them — that pass checked Stripe, AWS, Google, Anthropic, SendGrid and
# JWT shapes, and did not check GitHub tokens. `scripts/scanSecrets.mjs` does.
#
# The repository is PUBLIC, so they were readable by anyone for four months.
#
# ROTATION IS THE FIX. THIS IS HYGIENE.
#
# Say it plainly, because the order matters and running this first would be a
# false sense of having dealt with it: a rewrite removes the tokens from THIS
# copy. It cannot un-serve what a public repository has been serving since
# July, and it does not reach forks, existing clones, or GitHub's own cached
# unreachable objects — those stay fetchable by SHA for a long time. Revoking
# the tokens at github.com/settings/tokens is the only act that revokes them.
#
# WHY --replace-text AND NOT --invert-paths
#
# Path removal deletes the four files wholesale, which is tempting since none
# are tracked today. But it is a guess about WHERE the secret is. Replacing the
# token TEXT is content-addressed: it catches every occurrence in every blob,
# including any file nobody thought to list. The patterns are regenerated from
# the repository itself below, so this script never stores a credential.
#
# WHY IT REFUSES TO RUN WITH OTHER WORKTREES PRESENT
#
# Rewriting changes every commit SHA. Other sessions work in
# .claude/worktrees/* against this same object store (CLAUDE.md §11), and a
# rewrite under a live worktree leaves its branch sharing no history with main
# and its uncommitted work stranded. On 2026-11-14 that class of mistake
# already cost one session its work. So this stops rather than guesses.
#
# RUN IT LIKE THIS
#
#   1. Revoke both tokens at https://github.com/settings/tokens
#   2. Every other session finishes and removes its worktree
#   3. sh scripts/purge-history.sh
#   4. Everyone else deletes their clone and re-clones. Their old branches
#      cannot be rebased onto the new history by `git pull` — the SHAs share
#      no ancestry.
set -e

REPO=$(git rev-parse --show-toplevel)
cd "$REPO"

#
# Find a python that can actually load git_filter_repo.
#
# `command -v python` is not enough on Windows: it finds the Microsoft Store
# alias in WindowsApps, a stub that exists to offer you an install and cannot
# import anything. Each candidate is therefore tested by the thing it is needed
# for, rather than by existing.
#
PY=""
for candidate in \
  "$HOME/AppData/Local/Programs/Python/Python312/python.exe" \
  "/c/Program Files/Python312/python.exe" \
  "$(command -v python3 2>/dev/null)" \
  "$(command -v python 2>/dev/null)" \
  "$(command -v py 2>/dev/null)"
do
  [ -n "$candidate" ] || continue
  if "$candidate" -m git_filter_repo --version >/dev/null 2>&1; then
    PY="$candidate"
    break
  fi
done
if [ -z "$PY" ]; then
  echo "No python that can run git-filter-repo. Install both:"
  echo "  winget install Python.Python.3.12"
  echo "  python -m pip install git-filter-repo"
  exit 1
fi
echo "using $PY"

# ── Refuse to rewrite under a live worktree ────────────────────────────────
others=$(git worktree list | grep -v "^$REPO " | grep -c . || true)
if [ "$others" -gt 0 ]; then
  echo "REFUSING: $others other worktree(s) are attached to this repository."
  git worktree list | grep -v "^$REPO "
  echo ""
  echo "Rewriting now would strand their branches on history that no longer"
  echo "exists. Let those sessions finish, then: git worktree remove <path>"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "REFUSING: uncommitted changes. Commit or move them first."
  git status --short
  exit 1
fi

# ── Back up before touching anything ───────────────────────────────────────
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP="../blackphoenix-prepurge-$STAMP.bundle"
echo "Backing up every ref to $BACKUP"
git bundle create "$BACKUP" --all
git tag -f "pre-purge-$STAMP" HEAD
echo "Tagged pre-purge-$STAMP at $(git rev-parse --short HEAD)"

# ── Build the patterns from the repository, so none are stored here ────────
PATTERNS=$(mktemp)
trap 'rm -f "$PATTERNS"' EXIT INT TERM
git log --all -p -G'\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}' 2>/dev/null \
  | grep -oE '\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}' \
  | sort -u \
  | sed 's/$/==>***REMOVED***/' > "$PATTERNS"
# The shape as well as the literals, so a token in a blob the pickaxe did not
# surface is still replaced.
echo 'regex:\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}==>***REMOVED***' >> "$PATTERNS"
echo "patterns: $(wc -l < "$PATTERNS") (values not printed)"

ORIGIN=$(git remote get-url origin)

# ── Rewrite ────────────────────────────────────────────────────────────────
# --force because this is not a fresh clone; the bundle above is the safety net.
"$PY" -m git_filter_repo --replace-text "$PATTERNS" --force

# filter-repo drops the remote on purpose, so that a rewrite cannot be pushed
# by reflex. Putting it back is deliberate, which is the point.
git remote add origin "$ORIGIN" 2>/dev/null || git remote set-url origin "$ORIGIN"

# ── Prove it worked BEFORE pushing ─────────────────────────────────────────
echo ""
echo "Verifying the rewritten history…"
left=$(git log --all -p -G'\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}' 2>/dev/null \
  | grep -cE '\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}' || true)
if [ "$left" != "0" ]; then
  echo "STOPPING: $left token occurrence(s) survive the rewrite. Nothing pushed."
  echo "Restore with: git fetch $BACKUP '+refs/*:refs/*'"
  exit 1
fi
node scripts/scanSecrets.mjs --history

echo ""
echo "History is clean. Not pushed yet — this is the irreversible step."
echo "When you are ready:"
echo "  git push --force --all origin"
echo "  git push --force --tags origin"
echo ""
echo "Then tell everyone to delete their clone and clone again. A pull will"
echo "not work: the new commits share no ancestry with the ones they hold."
