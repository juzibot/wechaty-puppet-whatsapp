#!/usr/bin/env bash
set -e

VERSION=$(node -p "require('./package.json').version")

if npx --package @chatie/semver semver-is-prod $VERSION; then
  npm pkg set publishConfig.tag=latest
  echo "production release: publicConfig.tag set to latest."
else
  npm pkg set publishConfig.tag=next
  echo 'development release: publicConfig.tag set to next.'
fi
