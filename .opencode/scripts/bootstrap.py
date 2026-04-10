#!/usr/bin/env python3
"""
CaroCut Bootstrap Script

全局环境初始化：环境检查 + Remotion 模板缓存 + 浏览器下载。
运行一次后，所有项目共享此环境。

Usage:
    python3 .opencode/scripts/bootstrap.py
    python3 .opencode/scripts/bootstrap.py --force  # 强制重新初始化
"""

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from datetime import datetime

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
BOOTSTRAP_FILE = WORKSPACE_ROOT / ".carocut" / "bootstrap.yaml"
TEMPLATE_CACHE = WORKSPACE_ROOT / ".carocut" / "template-cache"
TEMPLATE_SOURCE = WORKSPACE_ROOT / "templates" / "template-project"
HASH_EXCLUDED_DIRS = {"node_modules", ".git", "__pycache__", "out", "dist"}
SYNC_EXCLUDES = ["node_modules", "package-lock.json"]


def run_command(cmd, cwd=None, check=True):
    """Run shell command and return output."""
    print(f">>> {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if check and result.returncode != 0:
        print(f"Error: {result.stderr}", file=sys.stderr)
        raise RuntimeError(f"Command failed: {' '.join(cmd)}")
    return result


def compute_template_source_hash():
    """Compute a content hash for the bundled template source."""
    digest = hashlib.sha256()

    for path in sorted(TEMPLATE_SOURCE.rglob("*")):
        if not path.is_file():
            continue

        if any(part in HASH_EXCLUDED_DIRS for part in path.parts):
            continue

        relative_path = path.relative_to(TEMPLATE_SOURCE).as_posix()
        digest.update(relative_path.encode("utf-8"))
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")

    return digest.hexdigest()


def read_bootstrap_metadata():
    """Read the simple YAML status file into a dict."""
    if not BOOTSTRAP_FILE.exists():
        return {}

    metadata = {}
    with open(BOOTSTRAP_FILE, "r", encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line or line.startswith("#") or ":" not in line:
                continue
            key, value = line.split(":", 1)
            metadata[key.strip()] = value.strip().strip('"').strip("'")

    return metadata


def get_bootstrap_status_reason():
    """Return (is_valid, reason) for the current bootstrap state."""
    metadata = read_bootstrap_metadata()
    if not metadata:
        return False, "missing_status"

    if metadata.get("status") != "completed":
        return False, "not_completed"

    if not TEMPLATE_CACHE.exists() or not (TEMPLATE_CACHE / "node_modules").exists():
        return False, "missing_cache"

    current_hash = compute_template_source_hash()
    stored_hash = metadata.get("template_source_hash")
    if not stored_hash:
        return False, "missing_template_hash"

    if stored_hash != current_hash:
        return False, "template_changed"

    return True, "up_to_date"


def check_bootstrap_status():
    """Check if bootstrap is already completed."""
    is_valid, _reason = get_bootstrap_status_reason()
    return is_valid


def print_rebootstrap_reason(reason):
    if reason == "template_changed":
        print("\n检测到模板版本更新，正在重新初始化 bootstrap 缓存...")
    elif reason == "missing_template_hash":
        print("\n检测到旧版 bootstrap 状态文件，正在补齐模板版本信息并重新初始化...")
    elif reason == "missing_cache":
        print("\n检测到模板缓存缺失，正在重新初始化...")
    elif reason == "not_completed":
        print("\n检测到 bootstrap 未完成，正在重新初始化...")


def check_environment():
    """Run environment check."""
    print("\n[1/3] 系统环境检查")

    check_script = WORKSPACE_ROOT / ".opencode" / "scripts" / "check_env.py"
    env_file = WORKSPACE_ROOT / ".env"

    result = run_command([
        "python3", str(check_script),
        "--json",
        "--env-file", str(env_file)
    ])

    env_check = json.loads(result.stdout)

    # Print summary
    for r in env_check['results']:
        if r['category'] in ('tool', 'required_api'):
            status = "✓" if r['status'] == 'ok' else "✗"
            version = f" {r['version']}" if r.get('version') else ""
            print(f"  {status} {r['name']}{version}")

    if not env_check['all_passed']:
        print("\n缺失项目:")
        for r in env_check['results']:
            if r['status'] != 'ok':
                msg = r.get('message') or r.get('install_command') or '缺失'
                print(f"  - {r['name']}: {msg}")
        return False, env_check

    return True, env_check


def prepare_template_cache():
    """Prepare shared Remotion template cache."""
    print("\n[2/3] Remotion 模板准备")

    if TEMPLATE_CACHE.exists():
        print(f"  增量同步模板: {TEMPLATE_SOURCE} -> {TEMPLATE_CACHE}")
        rsync_cmd = ["rsync", "-a", "--delete"]
        for excluded in SYNC_EXCLUDES:
            rsync_cmd.extend(["--exclude", excluded])
        rsync_cmd.extend([f"{TEMPLATE_SOURCE}/", str(TEMPLATE_CACHE)])
        run_command(rsync_cmd)
    else:
        TEMPLATE_CACHE.parent.mkdir(parents=True, exist_ok=True)
        print(f"  复制模板: {TEMPLATE_SOURCE} -> {TEMPLATE_CACHE}")
        shutil.copytree(TEMPLATE_SOURCE, TEMPLATE_CACHE)

    print("  安装依赖 (可能需要 1-2 分钟)...")
    run_command(["npm", "install"], cwd=TEMPLATE_CACHE)
    print("  ✓ 依赖安装完成")


def install_browser():
    """Install Chrome headless shell."""
    print("\n[3/3] Chrome 浏览器下载")

    browser_script = TEMPLATE_CACHE / "scripts" / "browser_install.sh"
    if browser_script.exists():
        print("  下载 chrome-headless-shell (可能需要 3-6 min)...")
        run_command(["sh", str(browser_script)], cwd=TEMPLATE_CACHE)
        print("  ✓ 浏览器已安装")
    else:
        print("  警告: browser_install.sh 不存在，跳过浏览器安装")


def write_bootstrap_status(status, env_check=None, error=None):
    """Write bootstrap status to YAML file."""
    BOOTSTRAP_FILE.parent.mkdir(parents=True, exist_ok=True)

    lines = [
        f"status: {status}",
        f'timestamp: "{datetime.utcnow().isoformat()}Z"',
    ]

    if env_check:
        node_ver = next((r['version'] for r in env_check['results'] if r['name'] == 'Node.js'), None)
        python_ver = next((r['version'] for r in env_check['results'] if r['name'] == 'Python'), None)
        ffmpeg_ver = next((r['version'] for r in env_check['results'] if r['name'] == 'ffmpeg'), None)

        if node_ver:
            lines.append(f'node_version: "{node_ver}"')
        if python_ver:
            lines.append(f'python_version: "{python_ver}"')
        if ffmpeg_ver:
            lines.append(f'ffmpeg_version: "{ffmpeg_ver}"')

    if status == 'completed':
        lines.append('template_cache_path: ".carocut/template-cache"')
        lines.append(f'template_source_hash: "{compute_template_source_hash()}"')

    if error:
        lines.append(f'error: "{error.replace(chr(34), chr(92) + chr(34))}"')

    with open(BOOTSTRAP_FILE, 'w') as f:
        f.write('\n'.join(lines) + '\n')


def main():
    parser = argparse.ArgumentParser(description="CaroCut 全局环境初始化")
    parser.add_argument("--force", action="store_true", help="强制重新初始化")
    args = parser.parse_args()

    print("CaroCut Bootstrap")
    print("=" * 50)

    # Check if already bootstrapped
    if not args.force:
        is_valid, reason = get_bootstrap_status_reason()
        if is_valid:
            print("\n环境已初始化，模板缓存已是最新版本。")
            print(f"状态文件: {BOOTSTRAP_FILE}")
            print("\n如需强制重新初始化，使用: python3 .opencode/scripts/bootstrap.py --force")
            return 0
        print_rebootstrap_reason(reason)

    try:
        # Step 1: Environment check
        passed, env_check = check_environment()
        if not passed:
            write_bootstrap_status('failed', env_check, '环境检查失败')
            print("\n请解决以上问题后重新运行 bootstrap。")
            return 1

        # Step 2: Template cache
        prepare_template_cache()

        # Step 3: Browser
        install_browser()

        # Write success status
        write_bootstrap_status('completed', env_check)

        print("\n" + "=" * 50)
        print("环境初始化完成！")
        print("=" * 50)
        print(f"\n状态文件: {BOOTSTRAP_FILE}")
        print(f"模板缓存: {TEMPLATE_CACHE}")
        print("\n后续项目将复用此环境，无需重复安装。")

        return 0

    except Exception as e:
        write_bootstrap_status('failed', error=str(e))
        print(f"\n初始化失败: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
