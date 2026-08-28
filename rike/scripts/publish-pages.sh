#!/bin/zsh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Building site for GitHub Pages..."
GITHUB_PAGES=true npm run build
touch dist/.nojekyll

WORKDIR="$(mktemp -d)"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

git clone --depth 1 --branch gh-pages https://github.com/starfish85/personal-projects.git "$WORKDIR/pages"
rm -rf "$WORKDIR/pages/rike"
mkdir -p "$WORKDIR/pages/rike"
cp -R dist/. "$WORKDIR/pages/rike/"
touch "$WORKDIR/pages/rike/.nojekyll"

cd "$WORKDIR/pages"
git add rike
if git diff --cached --quiet; then
  echo "No changes to publish."
  exit 0
fi
git config user.name "starfish85"
git config user.email "234732187+starfish85@users.noreply.github.com"
git commit -m "发布日课 GitHub Pages 站点"
git push origin gh-pages

echo "Published https://starfish85.github.io/personal-projects/rike/"
