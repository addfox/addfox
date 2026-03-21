#!/usr/bin/env python3
"""
Schema Version Detector - Detects version from JSON/YAML files.

Reads schema files and extracts version information.

Usage:
    version_detector.py [-o json|human] [--key KEY] [--format json|yaml] DATA_FILE

Examples:
    version_detector.py manifest.json
    version_detector.py --key schema.version config.yaml
    version_detector.py -o human package.json
"""

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

# Add shared library to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "_shared" / "python"))

from layer0 import EXIT_ERROR, EXIT_FILE_NOT_FOUND, EXIT_SUCCESS
from layer1 import OutputFormat, emit_error, emit_info, output
from layer3.migrate import get_nested_key, parse_version


@dataclass
class VersionResult:
    """Result of version detection."""

    file: str
    format_type: str
    version: str | None
    key_path: str
    has_version: bool
    parsed_components: tuple = ()
    error: str = ""

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        result = {
            "file": self.file,
            "format": self.format_type,
            "has_version": self.has_version,
            "key_path": self.key_path,
        }

        if self.has_version:
            result["version"] = self.version
            result["parsed_components"] = list(self.parsed_components)

        if self.error:
            result["error"] = self.error

        return result


def detect_format(path: Path) -> str:
    """
    Detect file format from extension.

    Args:
        path: Path to file

    Returns:
        Format string ("json" or "yaml")
    """
    suffix = path.suffix.lower()
    if suffix in (".yaml", ".yml"):
        return "yaml"
    return "json"


def parse_json(path: Path) -> dict[str, Any]:
    """
    Parse JSON file.

    Args:
        path: Path to file

    Returns:
        Parsed dictionary

    Raises:
        json.JSONDecodeError: If file is not valid JSON
    """
    return json.loads(path.read_text())


def parse_yaml(path: Path) -> dict[str, Any]:
    """
    Parse YAML file.

    Args:
        path: Path to file

    Returns:
        Parsed dictionary

    Raises:
        ImportError: If PyYAML is not installed
    """
    try:
        import yaml
    except ImportError as err:
        raise ImportError("PyYAML is required for YAML files: pip install pyyaml") from err

    return yaml.safe_load(path.read_text())


def detect_version_in_file(
    path: Path, key_path: str = "version", format_hint: str | None = None
) -> VersionResult:
    """
    Detect version in a file.

    Args:
        path: Path to file
        key_path: Dot-separated path to version field
        format_hint: File format hint

    Returns:
        VersionResult with detection results
    """
    file_format = format_hint or detect_format(path)

    try:
        if file_format == "json":
            data = parse_json(path)
        elif file_format == "yaml":
            data = parse_yaml(path)
        else:
            return VersionResult(
                file=str(path),
                format_type=file_format,
                version=None,
                key_path=key_path,
                has_version=False,
                error=f"Unsupported format: {file_format}",
            )
    except json.JSONDecodeError as e:
        return VersionResult(
            file=str(path),
            format_type=file_format,
            version=None,
            key_path=key_path,
            has_version=False,
            error=f"Invalid JSON: {e}",
        )
    except ImportError as e:
        return VersionResult(
            file=str(path),
            format_type=file_format,
            version=None,
            key_path=key_path,
            has_version=False,
            error=str(e),
        )
    except Exception as e:
        return VersionResult(
            file=str(path),
            format_type=file_format,
            version=None,
            key_path=key_path,
            has_version=False,
            error=f"Parse error: {e}",
        )

    # Try to get version
    version_value = get_nested_key(data, key_path)

    if version_value is None:
        # Try common version key locations
        common_keys = ["version", "schemaVersion", "schema_version", "Version"]
        for key in common_keys:
            version_value = data.get(key)
            if version_value is not None:
                key_path = key
                break

    if version_value is None:
        return VersionResult(
            file=str(path),
            format_type=file_format,
            version=None,
            key_path=key_path,
            has_version=False,
        )

    version_str = str(version_value)
    parsed = parse_version(version_str)

    return VersionResult(
        file=str(path),
        format_type=file_format,
        version=version_str,
        key_path=key_path,
        has_version=True,
        parsed_components=parsed,
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Detect version from JSON/YAML files",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  version_detector.py manifest.json
  version_detector.py --key schema.version config.yaml
  version_detector.py -o human package.json
        """,
    )
    parser.add_argument(
        "data_file",
        help="Data file to read (JSON or YAML)",
    )
    parser.add_argument(
        "-o",
        "--output",
        choices=["json", "human"],
        default="json",
        help="Output format (default: json)",
    )
    parser.add_argument(
        "--key",
        default="version",
        help="Key path to version field (e.g., 'schema.version')",
    )
    parser.add_argument(
        "--format",
        choices=["json", "yaml"],
        help="File format (auto-detected if not specified)",
    )

    args = parser.parse_args()

    path = Path(args.data_file)
    if not path.exists():
        emit_error(EXIT_FILE_NOT_FOUND, f"File not found: {path}")
        return EXIT_FILE_NOT_FOUND

    if not path.is_file():
        emit_error(EXIT_ERROR, f"Not a file: {path}")
        return EXIT_ERROR

    emit_info(f"Detecting version in {path}...")

    result = detect_version_in_file(path, args.key, args.format)

    output_format = OutputFormat(args.output)
    output(result.to_dict(), output_format)

    if result.has_version:
        emit_info(f"Version detected: {result.version}")
    else:
        emit_info("No version found")

    return EXIT_SUCCESS


if __name__ == "__main__":
    sys.exit(main())
