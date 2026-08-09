"""Backend for the Nodes 2.0-native Multi Lora Loader node."""

from __future__ import annotations

import json
import math
from typing import Any

import folder_paths
from aiohttp import web
from comfy_api.latest import ComfyExtension, io
from nodes import LoraLoader
from server import PromptServer
from typing_extensions import override


NODE_ID = "ComfyUILoraLoaderMultiLoraLoader"
MAX_LORA_ROWS = 100


def _rows_from_json(value: str | list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    """Decode and strictly validate the workflow representation of LoRA rows."""
    if value in (None, ""):
        return []
    try:
        rows = json.loads(value) if isinstance(value, str) else value
    except json.JSONDecodeError as error:
        raise ValueError("LoRA rows must be valid JSON.") from error

    if not isinstance(rows, list):
        raise ValueError("LoRA rows must be a JSON array.")
    if len(rows) > MAX_LORA_ROWS:
        raise ValueError(f"Multi Lora Loader supports at most {MAX_LORA_ROWS} rows.")

    normalized: list[dict[str, Any]] = []
    for index, row in enumerate(rows, start=1):
        if not isinstance(row, dict):
            raise ValueError(f"LoRA row {index} must be an object.")
        name = row.get("lora")
        enabled = row.get("enabled", True)
        # `model_strength` is accepted only to migrate workflows saved by the
        # first prototype. New workflows persist one shared strength value.
        strength = row.get("strength", row.get("model_strength", 1.0))
        if not isinstance(name, str):
            raise ValueError(f"LoRA row {index} has an invalid LoRA name.")
        if not isinstance(enabled, bool):
            raise ValueError(f"LoRA row {index} has an invalid enabled value.")
        if isinstance(strength, bool) or not isinstance(strength, (int, float)):
            raise ValueError(f"LoRA row {index} has an invalid strength.")
        if not math.isfinite(strength):
            raise ValueError(f"LoRA row {index} strength must be a finite number.")
        if enabled and not name:
            raise ValueError(f"LoRA row {index} needs a selected LoRA.")
        normalized.append(
            {
                "lora": name,
                "enabled": enabled,
                "strength": float(strength),
            }
        )
    return normalized


class ComfyUILoraLoaderMultiLoraLoader(io.ComfyNode):
    """Apply an ordered, user-managed list of LoRAs to a model and optional CLIP."""

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id=NODE_ID,
            display_name="Multi Lora Loader",
            category="LoRA Loader",
            description="Apply any number of enabled LoRAs in their displayed order.",
            inputs=[
                io.Model.Input("model", tooltip="The model to modify."),
                io.Clip.Input("clip", optional=True, tooltip="Optional CLIP to modify."),
            ],
            outputs=[
                io.Model.Output(display_name="MODEL"),
                io.Clip.Output(display_name="CLIP"),
            ],
            # The frontend owns the `loras` DOM widget. This allows its JSON
            # value to serialize normally without also rendering a V3 String
            # input above the editor.
            accept_all_inputs=True,
        )

    @classmethod
    def validate_inputs(cls, **kwargs: Any) -> bool | str:
        try:
            rows = _rows_from_json(kwargs.get("loras", "[]"))
        except ValueError as error:
            return str(error)

        available = set(folder_paths.get_filename_list("loras"))
        for row in rows:
            if row["enabled"] and row["lora"] not in available:
                return f'LoRA not found: {row["lora"]}'
        return True

    @classmethod
    def execute(cls, model: Any, clip: Any = None, **kwargs: Any) -> io.NodeOutput:
        for row in _rows_from_json(kwargs.get("loras", "[]")):
            if not row["enabled"]:
                continue
            strength = row["strength"]
            clip_strength = strength if clip is not None else 0.0
            if strength == 0.0 and clip_strength == 0.0:
                continue
            model, clip = LoraLoader().load_lora(
                model,
                clip,
                row["lora"],
                strength,
                clip_strength,
            )
        return io.NodeOutput(model, clip)


@PromptServer.instance.routes.get("/multi-lora-loader/loras")
async def list_loras(_: web.Request) -> web.Response:
    """Return current LoRA filenames for the browser-side selector."""
    return web.json_response(sorted(folder_paths.get_filename_list("loras"), key=str.casefold))


class MultiLoraLoaderExtension(ComfyExtension):
    """Registers the Multi Lora Loader node with ComfyUI's V3 API."""

    @override
    async def get_node_list(self) -> list[type[io.ComfyNode]]:
        return [ComfyUILoraLoaderMultiLoraLoader]
