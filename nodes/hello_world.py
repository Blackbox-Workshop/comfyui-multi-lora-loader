"""A deliberately small smoke-test node for the extension scaffold."""

from comfy_api.latest import ComfyExtension, io
from typing_extensions import override


class ComfyUILoraLoaderHelloWorld(io.ComfyNode):
    """Return a greeting so the extension can be verified in ComfyUI."""

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="ComfyUILoraLoaderHelloWorld",
            display_name="Hello World",
            category="LoRA Loader",
            description="Smoke-test node for the ComfyUI LoRA Loader extension.",
            inputs=[io.String.Input("name", default="ComfyUI")],
            outputs=[io.String.Output("greeting")],
        )

    @classmethod
    def execute(cls, name: str) -> io.NodeOutput:
        return io.NodeOutput(f"Hello, {name}!")


class HelloWorldExtension(ComfyExtension):
    """Registers the initial scaffold node with ComfyUI's V3 API."""

    @override
    async def get_node_list(self) -> list[type[io.ComfyNode]]:
        return [ComfyUILoraLoaderHelloWorld]
