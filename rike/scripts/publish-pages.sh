#!/bin/zsh
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="daoke"
CANON="https://daoke.pages.dev/"

echo "Building 日课 for Cloudflare Pages..."
npm run build
touch dist/.nojekyll

echo "Deploying $PROJECT to Cloudflare Pages..."
npx --yes wrangler@4 pages deploy dist --project-name="$PROJECT" --branch=main --commit-dirty=true

WORKDIR="$(mktemp -d)"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

echo "Pointing GitHub Pages $PROJECT/ at $CANON ..."
git clone --depth 1 --branch gh-pages https://github.com/starfish85/personal-projects.git "$WORKDIR/pages"
rm -rf "$WORKDIR/pages/$PROJECT"
mkdir -p "$WORKDIR/pages/$PROJECT"
cp -R pages-redirect/. "$WORKDIR/pages/$PROJECT/"
touch "$WORKDIR/pages/$PROJECT/.nojekyll"

cd "$WORKDIR/pages"
git add "$PROJECT"
if git diff --cached --quiet; then
  echo "No GitHub Pages redirect changes."
else
  git config user.name "starfish85"
  git config user.email "234732187+starfish85@users.noreply.github.com"
  git commit -m "Redirect 日课 GitHub Pages to Cloudflare"
  git push origin gh-pages
fi

echo "Canonical $CANON"
echo "Old URL still jumps: https://starfish85.github.io/personal-projects/rike/"
