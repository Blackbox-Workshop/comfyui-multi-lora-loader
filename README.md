# ComfyUI LoRA Loader

A Nodes 2.0-native ComfyUI custom node for applying a configurable list of
LoRAs from one node. **Multi Lora Loader** lets you add, order, enable/disable,
and independently set model and CLIP strengths for any number of LoRAs.

## Install for development

Clone this directory into `ComfyUI/custom_nodes/`, then restart ComfyUI. Add
**LoRA Loader → Multi Lora Loader** to a workflow. Connect a model (and
optionally a CLIP), then use **Add LoRA** to build the ordered list.

## CPU-only Docker development

Docker is intended for extension loading and API/UI checks, not image
generation performance. It mounts this working tree into a current ComfyUI
installation, so source edits only require a service restart.
