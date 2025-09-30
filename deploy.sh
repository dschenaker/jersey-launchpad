set -e
msg="${1:-chore: push latest}"
git add -A
git commit -m "$msg" || true
git push
echo "Pushed. Netlify will rebuild automatically."
