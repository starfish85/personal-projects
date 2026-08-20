#!/bin/zsh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Building site for GitHub Pages..."
GITHUB_PAGES=true npm run build
touch dist/.nojekyll

WORKDIR="$(mktemp -d)"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

mkdir -p "$WORKDIR/dafushan-guide"
cp -R dist/. "$WORKDIR/dafushan-guide/"
cat > "$WORKDIR/index.html" << 'EOF'
<!doctype html>
<meta charset="utf-8">
<title>personal-projects</title>
<meta http-equiv="refresh" content="0; url=./dafushan-guide/">
<p><a href="./dafushan-guide/">大夫山智能导览</a></p>
EOF
touch "$WORKDIR/.nojekyll"

cd "$WORKDIR"
git init -b gh-pages
git checkout -B gh-pages
git config user.name "starfish85"
git config user.email "234732187+starfish85@users.noreply.github.com"
git add -A
git commit -m "发布 GitHub Pages 站点"
git remote add origin https://github.com/starfish85/personal-projects.git
git push -f origin gh-pages

echo "Published https://starfish85.github.io/personal-projects/dafushan-guide/"
