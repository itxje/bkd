# 20261022-1348-patched-releases Publish patched releases automatically

- **status**: implementing
- **createdAt**: 2026-10-22 13:48
- **approvedAt**: 2026-10-22 13:48
- **relatedTask**: 20261022-1348-patched-releases

## Context

- **Local patches.** The patches live on `dev`. Until now they were built by hand with an external script: rebase onto a release tag, `bun run check`, `bun run package`, then install the package with `lode-cli seed`.
- **The update button.** lode updates from the upstream GitHub Releases (`[update] github = "bkhq/bkd"`, policy `check`). The web UI's update button therefore installs the unpatched release.
- **lode's GitHub source.** lode can read the Releases of a private repository:
  - `[http] headers` carries a token.
  - The release tag, without its leading `v`, is the version.
  - The asset is selected by its exact name, `bkd-server.tar.gz`.
- **The upstream release workflow cannot be reused.** `release.yml` only accepts `vX.Y.Z` tags and runs on tag pushes, so it is disabled in the patch repository.
- **The token cannot push the rebased branch.** A workflow's `GITHUB_TOKEN` cannot push commits that change workflow files. A rebase onto a new release usually carries upstream workflow changes, so the push uses a write deploy key. The key is stored as the `PATCH_DEPLOY_KEY` secret of the `patched-release` environment, which admits only the `dev` branch.

## Proposal

- **The prepare step.** `.github/scripts/patched-release.sh` is the testable core and runs both locally and in CI.
  1. Fetch the upstream tags and `main`.
  2. Resolve the latest upstream release tag.
  3. Refuse a tag that is older than the patches' upstream base.
  4. Rebase. A conflict fails the run.
  5. Decide whether a release is needed: no, when the tree outside `docs/` and `.github/` matches the last `v<version>-p<n>` tag.
  6. Print `version`, `tag`, `release` and `rebased`.
- **The workflow.** `.github/workflows/patched-release.yml` runs on a schedule (hourly), on a push to `dev`, and on `workflow_dispatch` with a `dry_run` input. In order, it:
  1. runs the prepare step;
  2. runs `bun run check` and `bun run package --version <upstream>`;
  3. force-pushes `dev` with a lease, through the deploy key;
  4. creates a draft release with `bkd-server.tar.gz` and `checksums.txt`, then publishes it as latest.

  Runs are serialised by a concurrency group.
- **lode.**
  - `[update] github = "itxje/bkd"`, policy `check`.
  - A read-only token goes in `[http] headers`, and the file is mode 600.
  - Switching the source needs a lode restart, which restarts BKD.

## Risks

- **Version ordering.** Versions are semver prereleases (`0.3.24-p1`). They order correctly against each other while `n` stays below 10, because `p10` sorts lexically before `p9`.
- **Rewritten history.** The rebased `dev` is force-pushed. A local `dev` checkout must be reset to `itxje/dev` before new patches are committed.
- **Failure notice.** A failed run is reported only through GitHub's workflow failure notification.

## Scope

- New: `.github/workflows/patched-release.yml`, `.github/scripts/patched-release.sh`.
- In the patch repository: the deploy key, the `patched-release` environment (`dev` only) with the `PATCH_DEPLOY_KEY` secret, and `release.yml` disabled.
- On the host: `lode.toml`.

## Alternatives

- **A local timer running the external build script.** Rejected, because it depends on this container staying up.
- **Following upstream `main` instead of releases.** Rejected: unreleased commits would ship, and versions would have no upstream release number.

## Annotations

(none)
