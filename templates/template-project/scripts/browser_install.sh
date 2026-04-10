#!/bin/bash
#
# 安装 Remotion 所需的 chrome-headless-shell。
# 由于 Node.js 原生 https.get() 不支持 https_proxy，
# 在代理环境下 `npx remotion browser ensure` 会超时。
# 此脚本支持通过代理手动下载并安装到正确目录。
#
# 用法:
#   bash scripts/browser_install.sh              # 先尝试自动下载，失败则提示手动
#   bash scripts/browser_install.sh /path/to.zip # 从已下载的 zip 安装

set -euo pipefail
cd "$(dirname "$0")/.."

# --- 从 Remotion 源码中提取版本号 ---
FETCHER_JS="node_modules/@remotion/renderer/dist/browser/BrowserFetcher.js"
if [ ! -f "$FETCHER_JS" ]; then
  echo "错误: 找不到 $FETCHER_JS，请先运行 npm install"
  exit 1
fi

VERSION=$(grep -o "TESTED_VERSION = '[^']*'" "$FETCHER_JS" | head -1 | sed "s/TESTED_VERSION = '//;s/'//")
if [ -z "$VERSION" ]; then
  echo "错误: 无法从 BrowserFetcher.js 提取 Chrome 版本号"
  exit 1
fi

# --- 检测平台 ---
OS=$(uname -s)
ARCH=$(uname -m)

if [ "$OS" = "Darwin" ]; then
  [ "$ARCH" = "arm64" ] && PLATFORM="mac-arm64" || PLATFORM="mac-x64"
elif [ "$OS" = "Linux" ]; then
  [ "$ARCH" = "aarch64" ] && PLATFORM="linux-arm64" || PLATFORM="linux64"
else
  echo "错误: 不支持的操作系统 $OS"
  exit 1
fi

DOWNLOAD_URL="https://storage.googleapis.com/chrome-for-testing-public/${VERSION}/${PLATFORM}/chrome-headless-shell-${PLATFORM}.zip"
CACHE_DIR="node_modules/.remotion/chrome-headless-shell"
INSTALL_DIR="${CACHE_DIR}/${PLATFORM}"
ZIP_NAME="chrome-headless-shell-${PLATFORM}.zip"

echo "Chrome Headless Shell 安装器"
echo "  版本:   ${VERSION}"
echo "  平台:   ${PLATFORM}"
echo "  目标:   ${INSTALL_DIR}/"
echo ""

# --- 检查是否已安装 ---
if [ -f "${CACHE_DIR}/VERSION" ]; then
  INSTALLED=$(cat "${CACHE_DIR}/VERSION")
  if [ "$INSTALLED" = "$VERSION" ] && [ -d "$INSTALL_DIR" ]; then
    echo "已安装 chrome-headless-shell ${VERSION}，无需重复安装。"
    exit 0
  fi
fi

# --- 确定 zip 来源 ---
ZIP_PATH=""

if [ -n "${1:-}" ]; then
  # 参数传入的 zip 路径
  if [ ! -f "$1" ]; then
    echo "错误: 指定的文件不存在: $1"
    exit 1
  fi
  ZIP_PATH="$1"
  echo "使用指定的 zip: ${ZIP_PATH}"
else
  # 尝试自动下载
  echo "下载地址: ${DOWNLOAD_URL}"
  echo ""
  echo "尝试自动下载..."

  TMP_ZIP="/tmp/${ZIP_NAME}"
  DOWNLOAD_OK=false

  if curl -fSL --connect-timeout 15 --max-time 300 -o "$TMP_ZIP" "$DOWNLOAD_URL" 2>&1; then
    DOWNLOAD_OK=true
    ZIP_PATH="$TMP_ZIP"
  fi

  if [ "$DOWNLOAD_OK" = false ]; then
    cat >&2 <<EOF

==========================================
自动下载失败（可能需要代理）
==========================================

请手动下载后重新运行:

  1. 下载: ${DOWNLOAD_URL} 到 /path/to/${ZIP_NAME}
  2. 执行: bash scripts/browser_install.sh /path/to/${ZIP_NAME}

EOF
    exit 1
  fi
fi

# --- 安装 ---
echo "正在安装..."

# 清理旧版本
rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"

# 解压
unzip -qo "$ZIP_PATH" -d "$INSTALL_DIR/"

# 写入版本文件
printf '%s' "$VERSION" > "${CACHE_DIR}/VERSION"

# 设置可执行权限
EXEC_PATH="${INSTALL_DIR}/chrome-headless-shell-${PLATFORM}/chrome-headless-shell"
if [ "$OS" = "Linux" ] && [ "$ARCH" = "aarch64" ]; then
  EXEC_PATH="${INSTALL_DIR}/chrome-headless-shell-${PLATFORM}/headless_shell"
fi

if [ -f "$EXEC_PATH" ]; then
  chmod +x "$EXEC_PATH"
else
  echo "警告: 未找到可执行文件 ${EXEC_PATH}"
  echo "解压内容:"
  ls -la "$INSTALL_DIR/"
  exit 1
fi

echo ""
echo "安装完成！"
echo "  可执行文件: ${EXEC_PATH}"
echo "  版本文件:   ${CACHE_DIR}/VERSION → ${VERSION}"
