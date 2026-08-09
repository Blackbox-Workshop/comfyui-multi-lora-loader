#!/bin/sh
# Start a real CPU-only ComfyUI server, then assert this extension is exposed
# through ComfyUI's node-definition API.
set -eu

log_file=/tmp/comfyui-smoke.log
python main.py --cpu --listen 127.0.0.1 --port 8188 >"$log_file" 2>&1 &
server_pid=$!

cleanup() {
  kill "$server_pid" 2>/dev/null || true
  wait "$server_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

attempt=0
while [ "$attempt" -lt 90 ]; do
  if python - <<'PY' 2>/dev/null
from urllib.request import urlopen

with urlopen("http://127.0.0.1:8188/object_info", timeout=2) as response:
    if response.status == 200:
        raise SystemExit(0)
raise SystemExit(1)
PY
  then
    break
  fi
  if ! kill -0 "$server_pid" 2>/dev/null; then
    echo "ComfyUI exited before becoming ready." >&2
    cat "$log_file" >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 1
done

if [ "$attempt" -eq 90 ]; then
  echo "ComfyUI did not become ready within 90 seconds." >&2
  cat "$log_file" >&2
  exit 1
fi

python - <<'PY'
import json
from urllib.request import urlopen

with urlopen("http://127.0.0.1:8188/object_info/ComfyUILoraLoaderMultiLoraLoader") as response:
    node = json.load(response)["ComfyUILoraLoaderMultiLoraLoader"]

assert node["display_name"] == "Multi Lora Loader", node
assert "model" in node["input"]["required"], node
assert "loras" not in node["input"]["required"], node
assert "clip" in node["input"]["optional"], node
with urlopen("http://127.0.0.1:8188/multi-lora-loader/loras") as response:
    assert isinstance(json.load(response), list)
print("Smoke test passed: Multi Lora Loader loaded by ComfyUI.")
PY
