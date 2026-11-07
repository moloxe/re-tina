echo "Deploying to gh-pages"

echo "Building project"
bun run build

echo "Preparing gh-pages branch"
rm -rf .temp-deploy
mkdir .temp-deploy
cd .temp-deploy

echo "Cloning repository"
if git clone --depth 1 --branch gh-pages https://github.com/moloxe/re-tina.git . 2>/dev/null; then
  echo "Found existing gh-pages branch"
else
  echo "gh-pages branch not found, creating orphan gh-pages branch"
  git clone https://github.com/moloxe/re-tina.git .
  git checkout --orphan gh-pages
  git rm -rf .
fi

echo "Copying files to gh-pages branch"
rm -rf *
cp -r ../dist/* .

# Jekyll ignores files and folders that start with an underscore or a dot
touch .nojekyll

echo "Adding new files to gh-pages branch"
git add .
if git diff --staged --quiet; then
  echo "No changes to commit"
else
  git commit -m "Deploying to gh-pages"
  git push origin gh-pages
fi

echo "Cleaning up"
cd ../
rm -rf .temp-deploy

echo "Deployment complete"
