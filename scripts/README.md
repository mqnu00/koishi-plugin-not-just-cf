```bash
uv venv --python 3.13
uv pip install Pillow>=12.0.0
uv run python remove_white_background.py
```

Probe AtCoder's official upcoming-contest page without GitHub data:

```bash
uv run --no-project --no-cache --python .venv/Scripts/python.exe python test/test-atc/fetch_atcoder_official.py --window-days 7
```
