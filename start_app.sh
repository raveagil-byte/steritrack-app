#!/bin/bash
echo "Starting SteriTrack System..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Starting Backend and Frontend..."
npm run start
