#!/bin/bash
set -e

echo "📦 Building and installing PRM..."

# 切换到脚本所在目录
cd "$(dirname "$0")"
ROOT_DIR="$(pwd)"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# 1. 检查 node 版本
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18+ is required. Current version: $(node -v)${NC}"
    exit 1
fi

# 2. 检查 pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}Error: pnpm is not installed. Please install pnpm first:${NC}"
    echo "  npm install -g pnpm"
    exit 1
fi

# 3. 安装依赖并构建
echo "🔧 Installing dependencies..."
pnpm install

echo "🔨 Building project..."
pnpm build

# 4. 打包并全局安装
echo "📦 Creating package..."
PACKAGE_NAME="prm-$(node -p "require('./package.json').version").tgz"

# 使用 pnpm pack 打包
pnpm pack

# 检查打包是否成功
if [ ! -f "$PACKAGE_NAME" ]; then
    echo -e "${RED}Error: Failed to create package${NC}"
    exit 1
fi

# 全局安装
echo "🌍 Installing globally..."
npm install -g "$PACKAGE_NAME"

# 清理临时文件
rm -f "$PACKAGE_NAME"

# 5. 验证安装
echo ""
echo -e "${GREEN}✅ PRM installed successfully!${NC}"
echo ""
echo "📍 Installed location: $(which prm)"
echo ""
echo "🚀 Get started:"
echo "  prm --help"
echo "  prm init"
echo ""

# 尝试运行帮助命令
if command -v prm &> /dev/null; then
    echo "🎉 Test run:"
    prm --help
else
    echo -e "${RED}Warning: 'prm' command not found in PATH${NC}"
    echo "You may need to restart your terminal or run: source ~/.zshrc"
fi