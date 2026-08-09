# syntax=docker/dockerfile:1.7
# CPU-only ComfyUI environment used for local extension testing.
FROM python:3.12-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    git \
    libx11-6 \
    libxext6 \
    libxcb1 \
    && rm -rf /var/lib/apt/lists/*

RUN --mount=type=cache,id=comfyui-pip,target=/root/.cache/pip \
    python -m pip install --upgrade pip \
    && python -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

WORKDIR /app

ARG COMFYUI_REF=master
RUN git clone --depth 1 --branch "${COMFYUI_REF}" https://github.com/Comfy-Org/ComfyUI.git .
RUN --mount=type=cache,id=comfyui-pip,target=/root/.cache/pip python -m pip install -r requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip pip install -r manager_requirements.txt

EXPOSE 8188

CMD ["python", "main.py", "--cpu", "--listen", "0.0.0.0", "--port", "8188", "--enable-manager"]
