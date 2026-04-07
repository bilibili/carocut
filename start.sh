#!/bin/bash

# CaroCut 启动脚本

set -e

echo "🚀 CaroCut 启动中..."
echo ""

# 检查虚拟环境
if [ ! -d ".venv" ]; then
    echo "❌ 未找到虚拟环境，请先运行："
    echo "   uv venv"
    echo "   source .venv/bin/activate"
    echo "   uv pip install -r requirements.txt"
    exit 1
fi

# 检查是否在虚拟环境中
if [ -z "$VIRTUAL_ENV" ]; then
    echo "⚠️  未激活虚拟环境，正在激活..."
    source .venv/bin/activate
fi

# 检查 opencode.json
if [ ! -f "opencode.json" ]; then
    echo "❌ 未找到 opencode.json，请先运行："
    echo "   cp opencode-template.json opencode.json"
    echo "   然后编辑配置文件，设置各agent的model"
    exit 1
fi

# 检查 nodejs 环境
if ! command -v pnpm &> /dev/null; then
    # 尝试激活 nvm
    if [ -s "$HOME/.nvm/nvm.sh" ]; then
        source "$HOME/.nvm/nvm.sh" --no-use
        nvm use default 2>/dev/null
    elif [ -s "/opt/homebrew/opt/nvm/nvm.sh" ]; then
        source "/opt/homebrew/opt/nvm/nvm.sh" --no-use
        nvm use default 2>/dev/null
    fi
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ 未找到 pnpm，请先安装："
    echo "   npm install -g pnpm"
    exit 1
fi


# 检查 bootstrap 状态
if [ ! -f ".carocut/bootstrap.yaml" ]; then
    echo "⚠️  未检测到 bootstrap，正在执行首次初始化..."
    python .opencode/scripts/bootstrap.py
    echo ""
fi

echo "✅ 环境检查完成"
echo ""
echo "启动服务..."
echo "  - OpenCode: http://localhost:4096"
echo "  - 前端: http://localhost:3000"
echo ""

# 启动 OpenCode 后端（后台）
export OPENCODE_ENABLE_EXA=1
export OPENCODE_DISABLE_CLAUDE_CODE=1
opencode serve &
OPENCODE_PID=$!

# 等待 OpenCode 启动
sleep 2

# 启动前端
pnpm dev &
FRONTEND_PID=$!

echo ""
echo "✅ 服务已启动"
echo "   OpenCode PID: $OPENCODE_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 捕获退出信号
trap "echo ''; echo '🛑 正在停止服务...'; kill $OPENCODE_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# 等待
wait
