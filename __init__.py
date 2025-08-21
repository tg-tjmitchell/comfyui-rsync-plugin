"""ComfyUI File Transfer Plugin - UI Panel for rsync and rclone operations."""

from .comfy_rsync import get_extension_web_dirs, get_js_web_extensions
from .comfy_rsync import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

# Required for ComfyUI custom_nodes loading system
__all__ = [
    "get_extension_web_dirs", 
    "get_js_web_extensions",
    "NODE_CLASS_MAPPINGS",
    "NODE_DISPLAY_NAME_MAPPINGS"
]
