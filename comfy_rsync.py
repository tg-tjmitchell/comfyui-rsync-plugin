"""comfy_rsync.py

Simple wrapper around the rsync CLI with a small helper suitable for calling from ComfyUI scripts or custom nodes.

This module intentionally keeps no hard dependency on ComfyUI so you can import and call `rsync_sync` from any Python code. If you place this file inside ComfyUI's plugin/custom_nodes directory, you can import it from node scripts.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from typing import List, Optional


def find_rsync() -> Optional[str]:
    """Return the rsync executable path if found on PATH, otherwise None."""
    return shutil.which("rsync")


def _build_cmd(source: str, dest: str, flags: Optional[List[str]] = None, use_wsl: bool = False) -> List[str]:
    flags = flags or ["-avz"]
    base = ["rsync"] + flags + [source, dest]
    if use_wsl:
        # On Windows, optionally run via WSL to use Linux rsync
        return ["wsl"] + base
    return base


def rsync_sync(
    source: str,
    dest: str,
    flags: Optional[List[str]] = None,
    dry_run: bool = False,
    use_wsl: bool = False,
    env: Optional[dict] = None,
    timeout: Optional[int] = 300,
) -> subprocess.CompletedProcess:
    """Run rsync and return subprocess.CompletedProcess.

    Args:
        source: source path (trailing slash matters for rsync semantics).
        dest: destination path.
        flags: extra rsync flags (defaults to ['-avz']).
        dry_run: if True, add --dry-run.
        use_wsl: if True, prefix the command with `wsl` (Windows + WSL case).
        env: optional environment dictionary to pass to subprocess.run.
        timeout: seconds before timing out.

    Returns:
        subprocess.CompletedProcess

    Raises:
        FileNotFoundError: if rsync isn't available on PATH (and use_wsl not set or wsl not available).
        subprocess.TimeoutExpired: if the command times out.
    """
    rsync_path = find_rsync()
    # If rsync not found and not using wsl, raise
    if rsync_path is None and not use_wsl:
        raise FileNotFoundError("rsync executable not found on PATH. On Windows, consider using WSL or install rsync.")

    cmd = _build_cmd(source, dest, flags=flags, use_wsl=use_wsl)
    if dry_run:
        # insert --dry-run after rsync invocation
        # if using wsl, rsync is after the 'wsl' token
        insert_at = 1 if use_wsl else 1
        cmd.insert(insert_at, "--dry-run")

    try:
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            encoding="utf-8",
            env=env,
            timeout=timeout,
            check=False,
        )
    except FileNotFoundError:
        raise FileNotFoundError("Command not found: {}".format(cmd[0]))

    return proc


# Optional helper for ComfyUI node authors: a tiny wrapper function so you can
# import and call rsync_sync directly from node code.
def rsync_call_node(inputs: dict) -> dict:
    """Example adaptor that accepts a dict of inputs and returns a dict of outputs.

    Expected keys in inputs: 'source', 'dest', optional 'flags', 'dry_run', 'use_wsl'.
    """
    source = inputs.get("source")
    dest = inputs.get("dest")
    flags = inputs.get("flags")
    dry_run = bool(inputs.get("dry_run"))
    use_wsl = bool(inputs.get("use_wsl"))

    if not source or not dest:
        return {"success": False, "error": "'source' and 'dest' are required"}

    try:
        proc = rsync_sync(source, dest, flags=flags, dry_run=dry_run, use_wsl=use_wsl)
        return {"success": True, "rc": proc.returncode, "output": proc.stdout}
    except Exception as e:
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    # Simple CLI for quick tests
    if len(sys.argv) < 3:
        print("Usage: python comfy_rsync.py <source> <dest> [--dry-run] [--wsl]")
        sys.exit(2)

    src = sys.argv[1]
    dst = sys.argv[2]
    dry = "--dry-run" in sys.argv
    wsl = "--wsl" in sys.argv
    try:
        res = rsync_sync(src, dst, dry_run=dry, use_wsl=wsl)
        print(res.stdout)
        sys.exit(res.returncode)
    except Exception as e:
        print("Error:", e)
        sys.exit(1)
