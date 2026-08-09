# Project requirements

## Goal

Provide one Nodes 2.0-compatible custom node that applies any number of LoRAs
to a supplied `MODEL` and optional `CLIP`.

## First release

- Add and remove LoRA rows in the node UI.
- Choose a LoRA from ComfyUI's `loras` model directory.
- Toggle each row on or off without deleting it.
- Set one strength per row, applied to both the model and CLIP.
- Apply enabled LoRAs in their displayed order.
- Pass through `MODEL` and `CLIP` unchanged when no enabled LoRA applies.
- Save and restore all row data in normal ComfyUI workflows and API workflows.
- Work in the Nodes 2.0 UI without relying on rgthree's legacy canvas widgets.

## Not in scope

- LoRA metadata, Civitai lookups, trigger words, previews, or info dialogs.
- Prompt parsing or automatic LoRA-tag loading.
- Managing LoRA files or downloading models.

## Technical constraints

- Use ComfyUI's current V3 API (`comfy_api.latest`) for new backend nodes.
- Keep the frontend as a standard ComfyUI web extension and use supported
  Nodes 2.0 components/APIs.
- Do not take a runtime dependency on rgthree nodes.
- Treat missing LoRA files and invalid strengths as clear user-facing errors.

## Acceptance checks

1. A workflow with three rows can enable any subset and produces the same
   MODEL/CLIP result as sequential core `LoraLoader` nodes using the same
   order and strengths.
2. Disabling a row prevents it from being applied.
3. Reloading a saved workflow restores row order, selection, toggle state, and
   strength.
4. A workflow submitted through the API executes with the same serialized row
   data as the UI workflow.
