from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


DEFAULT_FILES = (
    ("logo.AtCoder.white.png", "logo.AtCoder.png"),
    ("logo.洛谷.white.png", "logo.洛谷.png"),
)


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def remove_white_background(
    image: Image.Image,
    white_tolerance: int = 3,
    edge_limit: int = 32,
    opaque_at: int = 96,
) -> Image.Image:
    source = image.convert("RGBA")
    output: list[tuple[int, int, int, int]] = []

    # Recover edge colors from their white matte, then gradually restore full
    # opacity before reaching the light-blue colors used by the Luogu logo.
    for red, green, blue, source_alpha in source.get_flattened_data():
        distance = 255 - min(red, green, blue)
        if distance <= white_tolerance:
            output.append((red, green, blue, 0))
            continue
        if distance >= opaque_at:
            output.append((red, green, blue, source_alpha))
            continue

        matte_alpha = distance / 255.0
        recovered = tuple(
            max(0, min(255, round((channel - 255 * (1.0 - matte_alpha)) / matte_alpha)))
            for channel in (red, green, blue)
        )

        if distance <= edge_limit:
            blend = 0.0
            alpha = distance
        else:
            blend = smoothstep((distance - edge_limit) / (opaque_at - edge_limit))
            alpha = round(distance + (255 - distance) * blend)

        color = tuple(
            round(recovered_channel * (1.0 - blend) + source_channel * blend)
            for recovered_channel, source_channel in zip(recovered, (red, green, blue))
        )
        output.append((*color, round(alpha * source_alpha / 255)))

    result = Image.new("RGBA", source.size)
    result.putdata(output)
    return result


def process_file(source_path: Path, output_path: Path, args: argparse.Namespace) -> None:
    if not source_path.is_file():
        raise FileNotFoundError(f"Source image not found: {source_path}")

    with Image.open(source_path) as image:
        result = remove_white_background(
            image,
            white_tolerance=args.white_tolerance,
            edge_limit=args.edge_limit,
            opaque_at=args.opaque_at,
        )
        result.save(output_path, "PNG", optimize=True)

    alpha = result.getchannel("A")
    transparent = sum(1 for value in alpha.get_flattened_data() if value == 0)
    print(
        f"Created {output_path.name}: {result.width}x{result.height}, "
        f"transparent pixels={transparent}"
    )


def parse_args() -> argparse.Namespace:
    script_dir = Path(__file__).resolve().parent
    default_logo_dir = script_dir.parent / "assets" / "logo"
    parser = argparse.ArgumentParser(
        description="Remove white backgrounds from the AtCoder and Luogu logo images."
    )
    parser.add_argument("--logo-dir", type=Path, default=default_logo_dir)
    parser.add_argument("--white-tolerance", type=int, default=3)
    parser.add_argument("--edge-limit", type=int, default=32)
    parser.add_argument("--opaque-at", type=int, default=96)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not 0 <= args.white_tolerance < args.edge_limit < args.opaque_at <= 255:
        raise ValueError(
            "Expected 0 <= white-tolerance < edge-limit < opaque-at <= 255"
        )

    logo_dir = args.logo_dir.resolve()
    logo_dir.mkdir(parents=True, exist_ok=True)
    for source_name, output_name in DEFAULT_FILES:
        process_file(logo_dir / source_name, logo_dir / output_name, args)


if __name__ == "__main__":
    main()
