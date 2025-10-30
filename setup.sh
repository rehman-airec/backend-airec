#!/bin/bash

# Recruitment Backend Setup Script

echo "🚀 Setting up Recruitment Backend..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from env.example..."
    cp env.example .env
    echo "✅ .env file created successfully!"
    echo "⚠️  Please update the .env file with your actual values before running the server."
else
    echo "✅ .env file already exists"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed successfully!"
else
    echo "✅ Dependencies already installed"
fi

# Check if MongoDB is running
echo "🔍 Checking MongoDB connection..."
if command -v mongosh &> /dev/null; then
    if mongosh --eval "db.runCommand('ping')" --quiet; then
        echo "✅ MongoDB is running"
    else
        echo "⚠️  MongoDB is not running. Please start MongoDB before running the server."
        echo "   You can start MongoDB with: brew services start mongodb-community"
        echo "   Or using Docker: docker run -d -p 27017:27017 --name mongodb mongo:latest"
    fi
else
    echo "⚠️  MongoDB client not found. Please ensure MongoDB is installed and running."
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env file with your configuration"
echo "2. Start MongoDB if not already running"
echo "3. Run: npm run create-admin (to create default admin)"
echo "4. Run: npm run dev (to start development server)"
echo ""
echo "Default admin credentials (after running create-admin):"
echo "Email: admin@recruitment.com"
echo "Password: admin1234"
