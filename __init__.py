"""ComfyUI extension entry point for ComfyUI LoRA Loader."""

from .nodes.hello_world import HelloWorldExtension


async def comfy_entrypoint() -> HelloWorldExtension:
    """Return the extension loaded by current ComfyUI releases."""
    return HelloWorldExtension()
