#!/bin/bash

# Initial server setup script for VPS
# Run this script once on your VPS to prepare it for deployment

set -e  # Exit on error

echo "=================================="
echo "VPS Server Setup for Math App"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Update system packages
echo -e "${YELLOW}Updating system packages...${NC}"
apt-get update
apt-get upgrade -y

# Install required packages
echo -e "${YELLOW}Installing required packages...${NC}"
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git

# Install Docker if not already installed
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Installing Docker...${NC}"

    # Add Docker's official GPG key
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

    # Set up the Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker Engine
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Install docker-compose standalone
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose

    echo -e "${GREEN}Docker installed successfully!${NC}"
else
    echo -e "${GREEN}Docker is already installed${NC}"
fi

# Start Docker service
systemctl start docker
systemctl enable docker

# Add current user to docker group (optional, if not running as root)
# usermod -aG docker $USER

# Configure firewall (UFW)
echo -e "${YELLOW}Configuring firewall...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp      # SSH
    ufw allow 80/tcp      # HTTP
    ufw allow 443/tcp     # HTTPS
    ufw allow 3000/tcp    # Application port
    # ufw --force enable  # Uncomment to enable firewall
    echo -e "${GREEN}Firewall rules configured${NC}"
fi

# Create application directory
APP_DIR="/var/www/math-app"
echo -e "${YELLOW}Creating application directory: $APP_DIR${NC}"
mkdir -p $APP_DIR

# Configure Git (you'll need to set up SSH key for GitHub)
echo -e "${YELLOW}Setting up Git...${NC}"
echo -e "${YELLOW}To clone your repository, you need to:${NC}"
echo -e "1. Generate SSH key: ssh-keygen -t ed25519 -C 'your_email@example.com'"
echo -e "2. Add the public key to GitHub: cat ~/.ssh/id_ed25519.pub"
echo -e "3. Clone repository: git clone git@github.com:yourusername/math-app.git $APP_DIR"

# Install fail2ban for security (optional)
echo -e "${YELLOW}Installing fail2ban for security...${NC}"
apt-get install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# Set up automatic security updates (optional)
echo -e "${YELLOW}Setting up automatic security updates...${NC}"
apt-get install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# Create data directories
echo -e "${YELLOW}Creating data directories...${NC}"
mkdir -p $APP_DIR/data/database
mkdir -p $APP_DIR/data/public-images
mkdir -p $APP_DIR/data/temp

# Set permissions
echo -e "${YELLOW}Setting permissions...${NC}"
chown -R www-data:www-data $APP_DIR/data

echo ""
echo -e "${GREEN}=================================="
echo "Server setup completed!"
echo "==================================${NC}"
echo ""
echo "Next steps:"
echo "1. Set up SSH key and clone your repository to $APP_DIR"
echo "2. Create .env file in $APP_DIR with your configuration"
echo "3. Run: cd $APP_DIR && bash scripts/deployment/deploy.sh"
echo ""
echo "GitHub Secrets to configure for CI/CD:"
echo "- VPS_HOST: Your VPS IP address"
echo "- VPS_USERNAME: SSH username (usually root)"
echo "- VPS_SSH_KEY: Private SSH key content"
echo "- VPS_PORT: SSH port (default 22)"
echo "- DEPLOY_PATH: Application path (default: /var/www/math-app)"
echo ""
echo "Docker info:"
docker --version
docker-compose --version
