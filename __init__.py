"""ComfyUI extension entry point for ComfyUI LoRA Loader."""

from .nodes.multi_lora_loader import MultiLoraLoaderExtension


WEB_DIRECTORY = "./web"


async def comfy_entrypoint() -> MultiLoraLoaderExtension:
    """Return the extension loaded by current ComfyUI releases."""
    return MultiLoraLoaderExtension()


__all__ = ["WEB_DIRECTORY", "comfy_entrypoint"]
