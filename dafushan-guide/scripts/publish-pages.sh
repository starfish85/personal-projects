#!/bin/zsh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Building site for GitHub Pages..."
GITHUB_PAGES=true npm run build
touch dist/.nojekyll

WORKDIR="$(mktemp -d)"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

cp -R dist/. "$WORKDIR/"
cd "$WORKDIR"
git init -b gh-pages
git checkout -B gh-pages
git config user.name "starfish85"
git config user.email "234732187+starfish85@users.noreply.github.com"
git add -A
git commit -m "发布 GitHub Pages 站点"
git remote add origin https://github.com/starfish85/dafushan-guide.git
git push -f origin gh-pages

echo "Published https://starfish85.github.io/dafushan-guide/"
