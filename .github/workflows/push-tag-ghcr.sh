set -e
git config --local user.email "$(git log --format='%ae' HEAD^!)"
git config --local user.name "$(git log --format='%an' HEAD^!)"  
docker tag ghcr.io/soluto/tweek-$1 soluto/tweek-$1:$2
docker push ghcr.io/soluto/tweek-$1:$2
git tag -m "Version created: $1-$2" tweek-$1-$2
git push --follow-tags
