#!/bin/bash

# DogFinder Quick Start Script

echo "🐾 Starting DogFinder..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Check if dependencies are installed
if ! pip show fastapi &> /dev/null; then
    echo "Installing dependencies..."
    pip install -r backend/requirements.txt
fi

# Start the backend
echo "Starting backend server on http://localhost:8000"
echo "Press Ctrl+C to stop"
echo ""
cd backend && python3 main.py
