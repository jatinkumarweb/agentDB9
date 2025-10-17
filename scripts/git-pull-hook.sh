#!/bin/bash

# Configuration
REPO_PATH="/Users/jatinrao/agents/agentDB9" # Replace with the actual path to your local Git repository
REMOTE_NAME="origin"                # Typically 'origin'
BRANCH_NAME="main"                  # The branch to monitor, e.g., 'main', 'master', 'develop'
POLLING_INTERVAL=30                 # Time in seconds between checks

# Navigate to the repository directory
cd "$REPO_PATH" || { echo "Error: Could not change to directory $REPO_PATH"; exit 1; }

echo "Starting Git remote change listener for $REPO_PATH/$BRANCH_NAME..."

while true; do
    echo "$(date): Checking for remote changes..."

    # Fetch remote updates without merging
    git fetch "$REMOTE_NAME"

    # Compare local branch with its remote tracking branch
    LOCAL_COMMIT=$(git rev-parse "$BRANCH_NAME")
    REMOTE_COMMIT=$(git rev-parse "$REMOTE_NAME/$BRANCH_NAME")

    if [ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]; then
        echo "$(date): Remote changes detected! Pulling latest changes..."
        git pull "$REMOTE_NAME" "$BRANCH_NAME"
        echo "$(date): Pull complete."
        # Add any post-pull actions here, e.g., restarting a service
        # service myapp restart
    else
        echo "$(date): No new changes on remote."
    fi

    # Wait for the specified interval before checking again
    sleep "$POLLING_INTERVAL"
done