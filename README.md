# camo-buster

[![CI](https://github.com/twangodev/camo-buster/actions/workflows/main.yml/badge.svg)](https://github.com/twangodev/camo-buster/actions/workflows/main.yml)
[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-camo--buster-blue?logo=github)](https://github.com/marketplace/actions/camo-buster)
[![Release](https://img.shields.io/github/v/release/twangodev/camo-buster?display_name=tag&sort=semver)](https://github.com/twangodev/camo-buster/releases)
[![License](https://img.shields.io/github/license/twangodev/camo-buster)](./LICENSE)

A GitHub Action that purges GitHub's camo image cache so README image updates show up immediately instead of sticking around as the stale cached copy.

## Usage

```yaml
- uses: actions/checkout@v4
- uses: twangodev/camo-buster@v1.0.0
```

By default it scans `README.md`. To scan other files or purge specific URLs:

```yaml
- uses: twangodev/camo-buster@v1.0.0
  with:
    files: |
      README.md
      docs/**/*.md
    urls: |
      https://example.com/badge.svg
```

## Inputs

| Name            | Default             | Description                                       |
| --------------- | ------------------- | ------------------------------------------------- |
| `files`         | `README.md`         | Newline- or comma-separated markdown globs.       |
| `urls`          |                     | Explicit image URLs to purge.                     |
| `repository`    | `github.repository` | `owner/repo` used as the markdown-render context. |
| `github-token`  | `github.token`      | Token for the markdown-render API.                |
| `fail-on-error` | `false`             | Fail the step if any PURGE returns non-2xx.       |
| `concurrency`   | `4`                 | Maximum concurrent PURGE requests.                |
