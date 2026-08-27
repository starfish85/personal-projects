#!/bin/zsh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Building 片语 for GitHub Pages..."
GITHUB_PAGES=true npm --prefix web run build
touch web/dist/.nojekyll

PAGES_URL="https://starfish85.github.io/personal-projects/pianyu/"
WORKDIR="$(mktemp -d)"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

git clone --branch gh-pages --single-branch --depth 1 \
  https://github.com/starfish85/personal-projects.git "$WORKDIR/repo"
cd "$WORKDIR/repo"
rm -rf pianyu
mkdir -p pianyu
cp -R "$OLDPWD/web/dist/." pianyu/
git add -A
if git diff --cached --quiet; then
  echo "No Pages changes."
else
  git config user.name "starfish85"
  git config user.email "234732187+starfish85@users.noreply.github.com"
  git commit -m "发布片语 GitHub Pages"
  git push origin gh-pages
fi

echo "Published $PAGES_URL"
