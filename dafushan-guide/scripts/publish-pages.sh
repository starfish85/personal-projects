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
rm -rf "$WORKDIR/pages/dafushan-guide"
mkdir -p "$WORKDIR/pages/dafushan-guide"
cp -R dist/. "$WORKDIR/pages/dafushan-guide/"
touch "$WORKDIR/pages/dafushan-guide/.nojekyll"

cat > "$WORKDIR/pages/index.html" << 'EOF'
<!doctype html>
<meta charset="utf-8">
<title>personal-projects</title>
<meta http-equiv="refresh" content="0; url=./dafushan-guide/">
<p><a href="./dafushan-guide/">大夫山智能导览</a></p>
EOF
touch "$WORKDIR/pages/.nojekyll"

cd "$WORKDIR/pages"
git add dafushan-guide index.html .nojekyll
if git diff --cached --quiet; then
  echo "No Pages changes."
  exit 0
fi
git config user.name "starfish85"
git config user.email "234732187+starfish85@users.noreply.github.com"
git commit -m "发布大夫山 GitHub Pages 站点"
git push origin gh-pages

echo "Published https://starfish85.github.io/personal-projects/dafushan-guide/"
