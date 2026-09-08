# Build and Release Notes

This document describes the normal process for building and releasing JSOI.

## Release types

Choose the release type according to semantic versioning:

- `patch`: Bug fixes, security updates, and dependency maintenance that do not change the public API.
- `minor`: Backward-compatible features.
- `major`: Breaking public API changes.

For example, from version `1.1.0`, these produce `1.1.1`, `1.2.0`, and `2.0.0`, respectively.

## Before releasing

Release only from an up-to-date, clean `master` branch. The distribution-tag helper explicitly switches back to `master`, so running a release from another branch can produce incorrect branch or tag state.

1. Merge the release branch or pull request into `master`.
2. Switch to `master` and update it:

   ```powershell
   git switch master
   git pull --ff-only
   ```

3. Confirm that there are no uncommitted changes:

   ```powershell
   git status
   ```

4. Install exactly what is recorded in `package-lock.json`:

   ```powershell
   npm ci
   ```

5. Check for known dependency vulnerabilities:

   ```powershell
   npm audit
   ```

   Resolve unexpected findings before releasing. Avoid `npm audit fix --force` unless its major-version changes have been reviewed and tested deliberately.

6. Run the complete build:

   ```powershell
   npm run build
   ```

   This cleans `dist`, runs lint and tests, builds all module formats, and copies the distribution metadata and supporting files.

7. Check the working tree again. Generated output should be understood and committed before starting the release:

   ```powershell
   git status
   ```

## Run the release

For the usual bug-fix, security, or maintenance release:

```powershell
npm run deploy:patch
```

For a backward-compatible feature release:

```powershell
npm run deploy:minor
```

For a breaking release:

```powershell
npm run deploy:major
```

These commands are not dry runs. They create a version commit and tags, push to GitHub, update GitHub Pages, and initiate the automated npm publication workflow.

## What the release scripts do

Each `deploy:*` command performs the following sequence:

1. Runs `npm run build`.
2. Runs `npm version patch`, `minor`, or `major`.
   - Updates the version in `package.json` and `package-lock.json`.
   - Creates a Git commit.
   - Creates a tag such as `v1.1.1`.
3. Runs `npm run deploy_all`, which:
   - Pushes the version commit and tags.
   - Recreates and versions `dist/package.json`.
   - Creates the `jsoi-lib` package archive in `dist`.
   - Renames the archive to `jsoi-lib-latest.tgz`.
   - Publishes `dist` to the `gh-pages` branch.
   - Creates and pushes a distribution tag such as `v1.1.1-dist`.

Pushing the main version tag triggers `.github/workflows/CI.yaml`. GitHub Actions checks out that tag, installs dependencies with Node.js 20, runs the full build, uploads coverage, and starts `.github/workflows/publish-npm.yaml`. The publish workflow rebuilds the tagged version, verifies that the tag matches `dist/package.json`, and publishes `jsoi-lib` using the repository's `NPM_TOKEN` secret.

Local npm authentication is not required for this automated publication path. The GitHub repository must have valid `NPM_TOKEN` and `CODECOV_TOKEN` secrets.

## Verify the release

After the workflows finish:

1. Confirm that the tag workflow and npm publish workflow succeeded in GitHub Actions.
2. Confirm the expected package version is available on npm.
3. Confirm GitHub Pages contains the updated distribution.
4. Confirm both release tags exist:

   ```powershell
   git fetch --tags
   git tag --list "v*" --sort=-version:refname
   ```

5. Confirm the local repository is back on `master` and clean:

   ```powershell
   git branch --show-current
   git status
   ```

## If a release fails

- Read the first failing command before retrying; some earlier steps may already have pushed commits or tags.
- Check the current branch because the GitHub Pages helper temporarily switches to `gh-pages`.
- Check whether the main version tag already exists locally or remotely before rerunning `npm version`.
- Check GitHub Actions before manually publishing to npm. The tag may already have triggered publication.
- Do not delete or recreate published npm versions. npm versions are immutable; correct a bad release with a new patch version.
- Do not force-push `master`, `gh-pages`, or release tags as part of routine recovery.

## Related npm scripts

- `npm run build`: Clean, lint, test, bundle, and populate `dist`.
- `npm run deploy:patch`: Build and release the next patch version.
- `npm run deploy:minor`: Build and release the next minor version.
- `npm run deploy:major`: Build and release the next major version.
- `npm run deploy_all`: Internal release pipeline used after `npm version`; do not normally run it directly.
