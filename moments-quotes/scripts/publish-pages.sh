#!/bin/zsh
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="pianyu"
CANON="https://pianyu.pages.dev/"

echo "Building 片语 for Cloudflare Pages..."
npm --prefix web run build
touch web/dist/.nojekyll

echo "Deploying $PROJECT to Cloudflare Pages..."
npx --yes wrangler@4 pages deploy web/dist --project-name="$PROJECT" --branch=main --commit-dirty=true

WORKDIR="$(mktemp -d)"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

echo "Pointing GitHub Pages pianyu/ at $CANON ..."
git clone --depth 1 --branch gh-pages https://github.com/starfish85/personal-projects.git "$WORKDIR/pages"
rm -rf "$WORKDIR/pages/pianyu"
mkdir -p "$WORKDIR/pages/pianyu"
cp -R pages-redirect/. "$WORKDIR/pages/pianyu/"
touch "$WORKDIR/pages/pianyu/.nojekyll"

cd "$WORKDIR/pages"
git add pianyu
if git diff --cached --quiet; then
  echo "No GitHub Pages redirect changes."
else
  git config user.name "starfish85"
  git config user.email "234732187+starfish85@users.noreply.github.com"
  git commit -m "Redirect 片语 GitHub Pages to Cloudflare"
  git push origin gh-pages
fi

echo "Canonical $CANON"
echo "Old URL still jumps: https://starfish85.github.io/personal-projects/pianyu/"
