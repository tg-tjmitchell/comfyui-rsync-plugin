# ComfyUI File Transfer Plugin (comfyui-rsync-plugin)

Lightweight helper for using `rsync` and `rclone` from ComfyUI with a dedicated UI panel. This repository contains Python wrappers for file transfer CLI tools and a ComfyUI plugin that adds a user-friendly panel for file transfer operations.

## What this repo contains

- `comfy_rsync.py` — Core functionality for rsync and rclone operations, including ComfyUI integration.
- `web/` — Web UI components for the ComfyUI panel.
- `__init__.py` — Package definition for ComfyUI plugin system.
- `README.md` — this file.
- `requirements.txt` — optional runtime dependencies.
- `.gitignore` — common ignores.
- `LICENSE` — MIT license.

## Assumptions

- `rsync` is installed and available on PATH (on Windows, via WSL, Cygwin, or an rsync build). The plugin calls the `rsync` binary.
- You will copy `comfy_rsync.py` into your ComfyUI `plugins` or `custom_nodes` folder if you want ComfyUI to auto-load it.

## Quick install

1. Ensure `rsync` and/or `rclone` are installed on your machine (try `rsync --version` or `rclone --version`).
2. Copy the entire `comfyui-rsync-plugin` folder into your ComfyUI plugin directory (for example `ComfyUI/custom_nodes/`).
3. Restart ComfyUI.
4. A new "File Transfer" menu item will appear in the ComfyUI menu.

## Using the File Transfer UI Panel

1. Click on the "File Transfer" menu item in the ComfyUI menu.
2. Choose between the Rsync or Rclone tab based on your needs.

### For Rsync:
1. Fill in the source and destination paths.
2. Adjust flags, dry run settings, and other options as needed.
3. Click "Run Rsync" to execute the operation.
4. Results will appear in the output area at the bottom of the panel.

### For Rclone:
1. Fill in the source and destination paths (can be local paths or remote:path format).
2. Optionally specify a path to your rclone.conf file if you have one.
3. Set the command and flags (default is "copy").
4. Adjust dry run settings and other options as needed.
5. Click "Run Rclone" to execute the operation.
6. Results will appear in the output area at the bottom of the panel.

## Example usage from Python (for custom nodes/scripts)

```py
from comfy_rsync import rsync_sync

result = rsync_sync("/path/to/source/", "/path/to/dest/", flags=["-avz"], dry_run=True)
print("rc:", result.returncode)
print("stdout:\n", result.stdout)
```

## Notes for Windows users

- Native `rsync` isn't typically installed. Use WSL (`wsl rsync ...`) or install a Windows-compatible rsync.
- For `rclone`, you can download and install from https://rclone.org/downloads/
- Enable the "Use WSL" checkbox in the UI if you're using the Windows Subsystem for Linux.
- The plugin provides a "Use WSL" option in the UI for both tools.

## Using rclone.conf Files

If you have existing rclone.conf files with remote configurations:

1. In the Rclone tab, provide the full path to your rclone.conf file.
2. Use your configured remotes in the source or destination field (e.g., `gdrive:backup`).
3. The plugin will pass the config file to rclone.

You can also use rclone without a config file for local transfers.

## License

MIT — see `LICENSE`.
