"""comfy_rsync.py

Simple wrapper around the rsync and rclone CLI tools with a small helper suitable for calling from ComfyUI scripts or custom nodes.
Now includes a ComfyUI web interface for easy file transfer operations.

This module keeps minimal dependencies on ComfyUI so you can still import and call the sync functions from any Python code.
If you place this file inside ComfyUI's plugin/custom_nodes directory, it will register a web UI panel.
"""

from __future__ import annotations

import os
import json
import shutil
import subprocess
import sys
from typing import List, Optional, Dict, Any, Tuple, Union

# Check if we're running inside ComfyUI
COMFYUI_AVAILABLE = False
try:
    import server
    from aiohttp import web
    COMFYUI_AVAILABLE = True
except ImportError:
    pass


def find_rsync() -> Optional[str]:
    """Return the rsync executable path if found on PATH, otherwise None."""
    return shutil.which("rsync")


def find_rclone() -> Optional[str]:
    """Return the rclone executable path if found on PATH, otherwise None."""
    return shutil.which("rclone")


def _build_rsync_cmd(source: str, dest: str, flags: Optional[List[str]] = None, use_wsl: bool = False) -> List[str]:
    flags = flags or ["-avz"]
    base = ["rsync"] + flags + [source, dest]
    if use_wsl:
        # On Windows, optionally run via WSL to use Linux rsync
        return ["wsl"] + base
    return base


def _build_rclone_cmd(
    source: str, 
    dest: str, 
    flags: Optional[List[str]] = None, 
    use_wsl: bool = False,
    config_path: Optional[str] = None
) -> List[str]:
    flags = flags or ["copy"]
    cmd = ["rclone"] + flags
    
    # Add config file if provided
    if config_path:
        cmd += ["--config", config_path]
    
    # Add source and destination
    cmd += [source, dest]
    
    if use_wsl:
        # On Windows, optionally run via WSL
        return ["wsl"] + cmd
    return cmd


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

    cmd = _build_rsync_cmd(source, dest, flags=flags, use_wsl=use_wsl)
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


def rclone_sync(
    source: str,
    dest: str,
    flags: Optional[List[str]] = None,
    dry_run: bool = False,
    use_wsl: bool = False,
    config_path: Optional[str] = None,
    env: Optional[dict] = None,
    timeout: Optional[int] = 300,
) -> subprocess.CompletedProcess:
    """Run rclone and return subprocess.CompletedProcess.

    Args:
        source: source path (can be local or remote like "remote:path").
        dest: destination path (can be local or remote).
        flags: rclone command and flags (defaults to ["copy"]).
        dry_run: if True, add --dry-run.
        use_wsl: if True, prefix the command with `wsl`.
        config_path: path to rclone.conf file.
        env: optional environment dictionary to pass to subprocess.run.
        timeout: seconds before timing out.

    Returns:
        subprocess.CompletedProcess

    Raises:
        FileNotFoundError: if rclone isn't available on PATH (and use_wsl not set or wsl not available).
        subprocess.TimeoutExpired: if the command times out.
    """
    rclone_path = find_rclone()
    # If rclone not found and not using wsl, raise
    if rclone_path is None and not use_wsl:
        raise FileNotFoundError("rclone executable not found on PATH. Install rclone or use WSL.")

    cmd = _build_rclone_cmd(
        source, dest, flags=flags, use_wsl=use_wsl, config_path=config_path
    )
    
    if dry_run:
        # Add --dry-run flag to command
        cmd.append("--dry-run")

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


# ComfyUI web server integration
if COMFYUI_AVAILABLE:
    # Define the web routes for the file transfer UI
    @server.PromptServer.instance.routes.post("/rsync/run")
    async def run_rsync_api(request):
        """API endpoint to run rsync with provided parameters."""
        try:
            data = await request.json()
            
            source = data.get("source", "")
            destination = data.get("destination", "")
            flags_str = data.get("flags", "-avz")
            dry_run = data.get("dry_run", True)
            use_wsl = data.get("use_wsl", False)
            timeout = data.get("timeout", 300)
            
            if not source or not destination:
                return web.json_response({
                    "success": False,
                    "error": "Source and destination paths are required",
                    "output": "Error: Source and destination paths are required."
                })
                
            # Parse flags from string to list
            flags_list = flags_str.split() if flags_str else ["-avz"]
            
            try:
                result = rsync_sync(
                    source, 
                    destination, 
                    flags=flags_list, 
                    dry_run=dry_run, 
                    use_wsl=use_wsl,
                    timeout=timeout
                )
                
                status = "Success" if result.returncode == 0 else f"Error (code {result.returncode})"
                output = f"Rsync {status}:\n{result.stdout}"
                
                return web.json_response({
                    "success": result.returncode == 0,
                    "returnCode": result.returncode,
                    "output": output
                })
            except Exception as e:
                return web.json_response({
                    "success": False,
                    "error": str(e),
                    "output": f"Rsync error: {str(e)}"
                })
        except Exception as e:
            return web.json_response({
                "success": False,
                "error": str(e),
                "output": f"Server error: {str(e)}"
            })
            
    @server.PromptServer.instance.routes.post("/rclone/run")
    async def run_rclone_api(request):
        """API endpoint to run rclone with provided parameters."""
        try:
            data = await request.json()
            
            source = data.get("source", "")
            destination = data.get("destination", "")
            flags_str = data.get("flags", "copy")
            dry_run = data.get("dry_run", True)
            use_wsl = data.get("use_wsl", False)
            timeout = data.get("timeout", 300)
            config_path = data.get("config_path", "")
            
            if not source or not destination:
                return web.json_response({
                    "success": False,
                    "error": "Source and destination paths are required",
                    "output": "Error: Source and destination paths are required."
                })
                
            # Parse flags from string to list
            flags_list = flags_str.split() if flags_str else ["copy"]
            
            # Normalize config path
            config_path = config_path if config_path else None
            
            try:
                result = rclone_sync(
                    source, 
                    destination, 
                    flags=flags_list, 
                    dry_run=dry_run, 
                    use_wsl=use_wsl,
                    config_path=config_path,
                    timeout=timeout
                )
                
                status = "Success" if result.returncode == 0 else f"Error (code {result.returncode})"
                output = f"Rclone {status}:\n{result.stdout}"
                
                return web.json_response({
                    "success": result.returncode == 0,
                    "returnCode": result.returncode,
                    "output": output
                })
            except Exception as e:
                return web.json_response({
                    "success": False,
                    "error": str(e),
                    "output": f"Rclone error: {str(e)}"
                })
        except Exception as e:
            return web.json_response({
                "success": False,
                "error": str(e),
                "output": f"Server error: {str(e)}"
            })
    
    # Register extension web UI directory
    def get_extension_web_dirs():
        """Register the web directory for the UI components."""
        return {"rsync_plugin": os.path.join(os.path.dirname(os.path.realpath(__file__)), "web")}

    # Register extension files to load
    def get_js_web_extensions():
        """Return list of JavaScript files to include in ComfyUI."""
        return ["js/rsync_panel.js"]  # We kept the same file name for compatibility

    print("ComfyUI File Transfer Plugin: UI Panel registered successfully")
    
    # Define a minimal placeholder node that won't actually be used in workflows
    # This is just to satisfy ComfyUI's node discovery mechanism
    class FileTransferHelperNode:
        """Placeholder node to ensure plugin loading."""
        @classmethod
        def INPUT_TYPES(cls):
            return {"required": {}}
        
        RETURN_TYPES = ()
        FUNCTION = "noop"
        CATEGORY = "hidden"
        
        def noop(self):
            return {}
    
    # Node class mapping to satisfy ComfyUI's custom_nodes loader
    NODE_CLASS_MAPPINGS = {
        "FileTransferHelperNode": FileTransferHelperNode
    }
    NODE_DISPLAY_NAME_MAPPINGS = {}

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
