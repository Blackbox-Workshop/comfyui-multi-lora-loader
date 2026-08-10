# ComfyUI LoRA Loader

## Working rules

- Keep backend code in `nodes/` and frontend code in `web/`.
- Prefer ComfyUI's current V3 (`comfy_api.latest`) API for new code.
- Preserve workflow serialization when changing frontend widgets.
- Keep the first release focused on multi-LoRA selection, enable/disable, and
  one shared strength per LoRA. Metadata is explicitly out of scope.

## Checks

- Run `python -m compileall -q .` for Python syntax checks.
- Run `docker compose run --rm smoke` to verify the extension loads in a real
  CPU-only ComfyUI server.
- Test in a current ComfyUI install before calling a UI change complete.

## Documentation

- [ComfyUI custom-node overview](https://docs.comfy.org/custom-nodes/overview)
- [Getting-started walkthrough](https://docs.comfy.org/custom-nodes/walkthrough)
- [JavaScript extensions](https://docs.comfy.org/custom-nodes/js/javascript_overview)
- [Official example node](https://github.com/Comfy-Org/ComfyUI/blob/master/custom_nodes/example_node.py.example)
- [ComfyUI custom-node skills](https://github.com/Comfy-Org/comfyui-custom-node-skills) — an agent-oriented reference covering V3 and V1 APIs.
