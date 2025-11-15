#!/bin/bash
# Automatic GitHub Backup Script
# This script pushes the current checkpoint to GitHub

set -e

cd /home/ubuntu/property-manager

# Get current git status
echo "📦 Checking git status..."
git status

# Check if there are any changes
if [[ -n $(git status -s) ]]; then
  echo "⚠️  Warning: There are uncommitted changes"
  echo "   These changes are already saved in Manus checkpoints"
  echo "   Continuing with push to GitHub..."
fi

# Push to GitHub
echo "🚀 Pushing to GitHub..."
git push github main

echo "✅ Successfully backed up to GitHub!"
echo "🔗 Repository: https://github.com/glodinasflexwork/property-manager"
