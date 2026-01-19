#!/bin/bash

# Content Repurpose Engine - Setup Script
# This script sets up the development environment

set -e

echo "=================================="
echo "Content Repurpose Engine - Setup"
echo "=================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "Please edit .env with your configuration before continuing."
    echo ""
    echo "Required environment variables:"
    echo "  - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)"
    echo "  - N8N_CALLBACK_SECRET (generate with: openssl rand -hex 32)"
    echo "  - ANTHROPIC_API_KEY"
    echo "  - CLOUDINARY_* credentials"
    echo "  - BUFFER_ACCESS_TOKEN (optional for scheduling)"
    echo ""
    read -p "Press Enter after editing .env to continue..."
fi

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Error: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
if command -v bun &> /dev/null; then
    bun install
else
    npm install
fi

# Generate Prisma client
echo ""
echo "Generating Prisma client..."
if command -v bun &> /dev/null; then
    bunx prisma generate
else
    npx prisma generate
fi

# Start Docker services
echo ""
echo "Starting Docker services..."
docker compose up -d postgres

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 5
until docker compose exec -T postgres pg_isready -U postgres; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 2
done
echo "PostgreSQL is ready!"

# Run database migrations
echo ""
echo "Running database migrations..."
if command -v bun &> /dev/null; then
    bunx prisma db push
else
    npx prisma db push
fi

echo ""
echo "=================================="
echo "Setup Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Start development server:"
echo "   bun dev"
echo ""
echo "2. Start all services (including n8n):"
echo "   docker compose up -d"
echo ""
echo "3. Access the dashboard:"
echo "   http://localhost:3000"
echo ""
echo "4. Access n8n (workflow editor):"
echo "   http://localhost:5678"
echo "   Username: admin (or N8N_BASIC_AUTH_USER from .env)"
echo "   Password: changeme (or N8N_BASIC_AUTH_PASSWORD from .env)"
echo ""
echo "5. Import n8n workflows from ./n8n/workflows/"
echo ""
