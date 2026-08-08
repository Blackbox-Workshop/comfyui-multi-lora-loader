# ComfyUI LoRA Loader

## Scope

Build a Nodes 2.0-compatible ComfyUI custom node that applies a user-managed
list of LoRAs to a model and CLIP.

## Working rules

- Keep backend code in `nodes/` and frontend code in `web/`.
- Prefer ComfyUI's current V3 (`comfy_api.latest`) API for new code.
- Do not copy rgthree source. Treat `reference/rgthree-comfy/` as behavioral
  research only; implement this project independently.
- Preserve workflow serialization when changing frontend widgets.
- Keep the first release focused on multi-LoRA selection, enable/disable, and
  model/CLIP strength. Metadata is explicitly out of scope.

## Checks

- Run `python -m compileall -q .` for Python syntax checks.
- Test in a current ComfyUI install before calling a UI change complete.
