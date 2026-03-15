#!/bin/bash

# Fallout 4 Blender Add-on Setup Script
# For macOS and Linux
# This script helps install dependencies for the add-on

set -e  # Exit on error

echo "================================================"
echo "Fallout 4 Blender Add-on - Setup Script"
echo "================================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect OS
OS="$(uname -s)"
case "${OS}" in
    Darwin*)    PLATFORM="macOS";;
    Linux*)     PLATFORM="Linux";;
    *)          PLATFORM="Unknown";;
esac

echo "Detected Platform: ${PLATFORM}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Check and install Homebrew (macOS only)
if [ "${PLATFORM}" = "macOS" ]; then
    echo "Checking for Homebrew..."
    if ! command_exists brew; then
        echo -e "${YELLOW}Homebrew not found. Installing Homebrew...${NC}"
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # Add Homebrew to PATH for Apple Silicon Macs
        if [ -f "/opt/homebrew/bin/brew" ]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
        fi
        
        echo -e "${GREEN}✓ Homebrew installed successfully${NC}"
    else
        echo -e "${GREEN}✓ Homebrew already installed${NC}"
    fi
    echo ""
fi

# Step 2: Check Python 3
echo "Checking for Python 3..."
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✓ Found: ${PYTHON_VERSION}${NC}"
else
    echo -e "${RED}✗ Python 3 not found${NC}"
    if [ "${PLATFORM}" = "macOS" ]; then
        echo "Install Python 3 using Homebrew:"
        echo "  brew install python3"
    elif [ "${PLATFORM}" = "Linux" ]; then
        echo "Install Python 3 using your package manager:"
        echo "  Ubuntu/Debian: sudo apt-get install python3 python3-pip"
        echo "  Fedora: sudo dnf install python3 python3-pip"
        echo "  Arch: sudo pacman -S python python-pip"
    fi
    exit 1
fi
echo ""

# Step 3: Check pip
echo "Checking for pip..."
if command_exists pip3; then
    echo -e "${GREEN}✓ pip3 found${NC}"
else
    echo -e "${RED}✗ pip3 not found${NC}"
    echo "Please install pip3 for Python 3"
    exit 1
fi
echo ""

# Step 4: Upgrade pip and setuptools
echo "Upgrading pip and setuptools..."
python3 -m pip install --upgrade pip setuptools
echo -e "${GREEN}✓ pip and setuptools upgraded${NC}"
echo ""

# Step 5: Install core dependencies
echo "Installing core Python dependencies..."
if [ -f "requirements.txt" ]; then
    pip3 install -r requirements.txt
    echo -e "${GREEN}✓ Core dependencies installed${NC}"
else
    echo -e "${YELLOW}Note: requirements.txt not found, skipping${NC}"
fi
echo ""

# Step 6: Optional AI/ML dependencies
echo "================================================"
echo "Optional AI/ML Dependencies"
echo "================================================"
echo ""
echo "The following are OPTIONAL dependencies for AI features:"
echo "  - Shap-E (text/image to 3D)"
echo "  - Point-E (fast point cloud generation)"
echo "  - PyTorch (required for AI models)"
echo "  - Other ML models"
echo ""
read -p "Do you want to install optional AI dependencies? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Installing optional dependencies..."
    if [ -f "requirements-optional.txt" ]; then
        pip3 install -r requirements-optional.txt
        echo -e "${GREEN}✓ Optional dependencies installed${NC}"
    else
        echo -e "${YELLOW}Installing PyTorch and basic ML dependencies...${NC}"
        pip3 install torch torchvision pillow numpy
        echo -e "${GREEN}✓ Basic ML dependencies installed${NC}"
    fi
else
    echo "Skipping optional dependencies"
fi
echo ""

# Step 7: Installation summary
echo "================================================"
echo "Setup Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "  1. Open Blender"
echo "  2. Go to Edit > Preferences > Add-ons"
echo "  3. Click 'Install' and select this add-on folder"
echo "  4. Enable 'Fallout 4 Tutorial Helper'"
echo "  5. Press N in 3D viewport to see the Fallout 4 tab"
echo ""
echo "For AI features (optional):"
echo "  - Install Shap-E: gh repo clone openai/shap-e"
echo "  - Install Point-E: gh repo clone openai/point-e"
echo ""
echo "For more information, see:"
echo "  - INSTALLATION.md"
echo "  - SETUP_GUIDE.md"
echo "  - README.md"
echo ""
echo -e "${GREEN}Setup completed successfully!${NC}"
