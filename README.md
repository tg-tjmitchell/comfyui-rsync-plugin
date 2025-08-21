# ComfyUI rsync plugin (comfyui-rsync-plugin)

Lightweight helper for using `rsync` from ComfyUI workflows. This repository contains a small Python wrapper (`comfy_rsync.py`) you can drop into ComfyUI's plugin/custom nodes folder to run `rsync` jobs from nodes or scripts.

## What this repo contains

- `comfy_rsync.py` — small, dependency-free wrapper around the `rsync` CLI and a helper function you can call from ComfyUI nodes or scripts.
- `README.md` — this file.
- `requirements.txt` — optional runtime dependencies (empty by default).
- `.gitignore` — common ignores.
- `LICENSE` — MIT license.

## Assumptions

- `rsync` is installed and available on PATH (on Windows, via WSL, Cygwin, or an rsync build). The plugin calls the `rsync` binary.
- You will copy `comfy_rsync.py` into your ComfyUI `plugins` or `custom_nodes` folder if you want ComfyUI to auto-load it.

## Quick install

1. Ensure `rsync` works on your machine (try `rsync --version`).
2. Copy `comfy_rsync.py` into your ComfyUI plugin folder (for example `ComfyUI/plugins` or `ComfyUI/custom_nodes`).
3. Restart ComfyUI. If you want to call the helper from an existing node or script, import the module and call `rsync_sync(...)`.

## Example usage (Python)

```py
from comfy_rsync import rsync_sync

result = rsync_sync("/path/to/source/", "/path/to/dest/", flags=["-avz"], dry_run=True)
print("rc:", result.returncode)
print("stdout:\n", result.stdout)
```

## Notes for Windows users

- Native `rsync` isn't typically installed. Use WSL (`wsl rsync ...`) or install a Windows-compatible rsync. The wrapper can be adapted to call `wsl rsync` if you prefer.
- The plugin is intentionally minimal to avoid forcing ComfyUI-specific APIs; it exposes a function you can call from custom nodes.

## License

MIT — see `LICENSE`.
