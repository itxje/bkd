#!/usr/bin/env bash
# Rebase the checked-out patch branch onto the latest upstream release and decide whether a
# patched release is due. Prints key=value lines (also to $GITHUB_OUTPUT when set):
#   before    the branch head before the rebase
#   rebased   true when the rebase moved the branch
#   version   the upstream release version, e.g. 0.3.24
#   tag       the patched release tag to publish, e.g. v0.3.24-p.1
#   release   true when the tree differs from the last patched release of that version
#             outside docs/ and .github/
#   patches   the number of patch commits on top of the upstream release
#
# Environment:
#   UPSTREAM_REPO   upstream GitHub repository   (default bkhq/bkd)
#   PATCH_REMOTE    remote holding the patched release tags (default origin)
set -euo pipefail

upstream_repo="${UPSTREAM_REPO:-bkhq/bkd}"
patch_remote="${PATCH_REMOTE:-origin}"

git fetch --quiet "$patch_remote" --tags
git fetch --quiet --no-tags "https://github.com/$upstream_repo.git" \
  "+refs/heads/main:refs/remotes/upstream/main" "+refs/tags/v*:refs/tags/v*"

tag="$(gh api "repos/$upstream_repo/releases/latest" --jq .tag_name)"
version="${tag#v}"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "patched-release: latest upstream release $tag is not vX.Y.Z" >&2; exit 1; }

# The release must contain the upstream commit the patches sit on; an older release would
# carry newer upstream commits along as if they were patches.
base="$(git merge-base HEAD upstream/main)"
git merge-base --is-ancestor "$base" "$tag" || {
  echo "patched-release: $tag is older than the patches' upstream base $(git rev-parse --short "$base")" >&2; exit 1; }

# Upstream and the patches both append to these logs, so every release would conflict at
# their tail; a union merge keeps both sides' lines. Set for this checkout only.
attributes="$(git rev-parse --git-path info/attributes)"
mkdir -p "$(dirname "$attributes")"
for log in docs/task/index.md docs/plan/index.md docs/changelog.md; do
  grep -qxF "$log merge=union" "$attributes" 2>/dev/null || echo "$log merge=union" >> "$attributes"
done

before="$(git rev-parse HEAD)"
if ! git rebase --quiet "$tag"; then
  git rebase --abort
  echo "patched-release: the patches conflict with $tag; rebase onto it by hand and push the result" >&2
  exit 1
fi
rebased=false
[[ "$(git rev-parse HEAD)" == "$before" ]] || rebased=true

# Patched releases are v<version>-p.<n>: a numeric prerelease identifier, so p.10 sorts after
# p.9. A version first released as v<version>-p<n> keeps that form, because semver sorts every
# p.<n> before p<n> and lode would never offer the switch.
last="$(git tag -l "v$version-p[0-9]*" | sort -V | tail -1)"
sep=-p
if [[ -z "$last" ]]; then
  last="$(git tag -l "v$version-p.[0-9]*" | sort -V | tail -1)"
  sep=-p.
fi
n=1
release=true
if [[ -n "$last" ]]; then
  n=$(( ${last##*"$sep"} + 1 ))
  if git diff --quiet "$last" HEAD -- . ':(exclude)docs' ':(exclude).github'; then
    release=false
  fi
fi

{
  echo "before=$before"
  echo "rebased=$rebased"
  echo "version=$version"
  echo "tag=v$version$sep$n"
  echo "release=$release"
  echo "patches=$(git rev-list --count "$tag..HEAD")"
} | tee -a "${GITHUB_OUTPUT:-/dev/null}"
