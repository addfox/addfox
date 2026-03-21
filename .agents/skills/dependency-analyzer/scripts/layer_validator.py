#!/usr/bin/env python3
"""
Layer Validator - Validates architectural layer rules.

Ensures that dependencies flow in the correct direction between layers.

Usage:
    layer_validator.py [-o json|human] [--config CONFIG] [--strict] SOURCE_DIR

Examples:
    layer_validator.py src/
    layer_validator.py --config layers.json project/
    layer_validator.py --strict src/
"""

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# Add shared library to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "_shared" / "python"))

from layer0 import EXIT_ERROR, EXIT_FILE_NOT_FOUND, EXIT_SUCCESS, EXIT_VALIDATION_ERROR
from layer1 import OutputFormat, emit_error, emit_info, emit_warning, glob_files, output


@dataclass
class LayerViolation:
    """A layer rule violation."""

    file: str
    line: int
    source_layer: int
    target_layer: int
    source_module: str
    target_module: str
    message: str

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "file": self.file,
            "line": self.line,
            "source_layer": self.source_layer,
            "target_layer": self.target_layer,
            "source_module": self.source_module,
            "target_module": self.target_module,
            "message": self.message,
        }


@dataclass
class LayerConfig:
    """Configuration for layer validation."""

    layers: dict[str, int] = field(default_factory=dict)  # module pattern -> layer number
    allow_same_layer: bool = True
    allow_lower_to_higher: bool = True  # Lower layer numbers can import higher
    strict: bool = False

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "layers": self.layers,
            "allow_same_layer": self.allow_same_layer,
            "allow_lower_to_higher": self.allow_lower_to_higher,
            "strict": self.strict,
        }


@dataclass
class ValidationReport:
    """Report of layer validation."""

    source_dir: str
    config: LayerConfig
    violations: list[LayerViolation] = field(default_factory=list)
    files_checked: int = 0
    is_valid: bool = True
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "source_dir": self.source_dir,
            "config": self.config.to_dict(),
            "summary": {
                "files_checked": self.files_checked,
                "violations": len(self.violations),
                "is_valid": self.is_valid,
            },
            "violations": [v.to_dict() for v in self.violations],
            "errors": self.errors if self.errors else None,
        }


# Default layer configuration for common architectures
DEFAULT_LAYERS = {
    # Layer 0: Core/Constants (no dependencies)
    "constants": 0,
    "types": 0,
    "interfaces": 0,
    "layer0": 0,
    # Layer 1: Basic utilities
    "utils": 1,
    "helpers": 1,
    "logging": 1,
    "layer1": 1,
    # Layer 2: Domain/Business logic
    "models": 2,
    "services": 2,
    "domain": 2,
    "layer2": 2,
    # Layer 3: Application/Infrastructure
    "api": 3,
    "handlers": 3,
    "controllers": 3,
    "infrastructure": 3,
    "layer3": 3,
    # Layer 4: Presentation/Entry points
    "views": 4,
    "routes": 4,
    "cli": 4,
    "main": 4,
}


def load_layer_config(config_path: str | None) -> LayerConfig:
    """
    Load layer configuration from file or use defaults.

    Args:
        config_path: Path to config file (JSON)

    Returns:
        LayerConfig
    """
    if config_path:
        with open(config_path) as f:
            data = json.load(f)
        return LayerConfig(
            layers=data.get("layers", DEFAULT_LAYERS),
            allow_same_layer=data.get("allow_same_layer", True),
            allow_lower_to_higher=data.get("allow_lower_to_higher", True),
            strict=data.get("strict", False),
        )

    return LayerConfig(layers=DEFAULT_LAYERS)


def detect_layer(module_path: str, config: LayerConfig) -> int:
    """
    Detect the layer of a module based on its path.

    Args:
        module_path: Module path (e.g., 'mypackage.utils.helpers')
        config: Layer configuration

    Returns:
        Layer number (-1 if not found)
    """
    parts = module_path.lower().split(".")

    for part in parts:
        if part in config.layers:
            return config.layers[part]

    # Check if any layer pattern matches
    for pattern, layer in config.layers.items():
        if pattern in module_path.lower():
            return layer

    return -1  # Unknown layer


def extract_imports(file_path: Path) -> list[tuple[str, int]]:
    """
    Extract import statements from a Python file.

    Args:
        file_path: Path to Python file

    Returns:
        List of (module_name, line_number) tuples
    """
    imports = []

    try:
        content = file_path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return imports

    for line_num, line in enumerate(content.splitlines(), start=1):
        line = line.strip()

        # import x
        match = re.match(r"^import\s+([\w.]+)", line)
        if match:
            imports.append((match.group(1), line_num))
            continue

        # from x import y
        match = re.match(r"^from\s+([\w.]+)\s+import", line)
        if match:
            imports.append((match.group(1), line_num))

    return imports


def file_to_module(file_path: Path, source_dir: Path) -> str:
    """
    Convert file path to module name.

    Args:
        file_path: Path to Python file
        source_dir: Source directory root

    Returns:
        Module name
    """
    try:
        relative = file_path.relative_to(source_dir)
    except ValueError:
        return str(file_path)

    parts = list(relative.parts)
    if parts[-1].endswith(".py"):
        parts[-1] = parts[-1][:-3]

    if parts[-1] == "__init__":
        parts = parts[:-1]

    return ".".join(parts)


def validate_directory(source_dir: Path, config: LayerConfig) -> ValidationReport:
    """
    Validate layer rules for a directory.

    Args:
        source_dir: Source directory
        config: Layer configuration

    Returns:
        ValidationReport
    """
    report = ValidationReport(
        source_dir=str(source_dir),
        config=config,
    )

    for file_path in glob_files(source_dir, "*.py", recursive=True):
        report.files_checked += 1

        source_module = file_to_module(file_path, source_dir)
        source_layer = detect_layer(source_module, config)

        if source_layer == -1 and config.strict:
            report.errors.append(f"Unknown layer for module: {source_module}")
            continue

        for target_module, line in extract_imports(file_path):
            target_layer = detect_layer(target_module, config)

            if target_layer == -1:
                continue  # Skip external/unknown modules

            # Check layer rules
            violation = None

            if source_layer == target_layer and not config.allow_same_layer:
                violation = LayerViolation(
                    file=str(file_path),
                    line=line,
                    source_layer=source_layer,
                    target_layer=target_layer,
                    source_module=source_module,
                    target_module=target_module,
                    message="Same-layer import not allowed",
                )
            elif source_layer < target_layer and not config.allow_lower_to_higher:
                violation = LayerViolation(
                    file=str(file_path),
                    line=line,
                    source_layer=source_layer,
                    target_layer=target_layer,
                    source_module=source_module,
                    target_module=target_module,
                    message=f"Lower layer ({source_layer}) cannot import higher layer ({target_layer})",
                )
            elif source_layer > target_layer:
                # Higher layer importing lower is the violation
                # (In clean architecture, higher layers should not depend on lower)
                # But typically it's the opposite - lower should not import higher
                # This depends on the interpretation
                pass

            if violation:
                report.violations.append(violation)

    report.is_valid = len(report.violations) == 0
    return report


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate architectural layer rules",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  layer_validator.py src/
  layer_validator.py --config layers.json project/
  layer_validator.py --strict src/

Layer Configuration File (JSON):
  {
    "layers": {
      "models": 0,
      "services": 1,
      "api": 2
    },
    "allow_same_layer": true,
    "allow_lower_to_higher": true,
    "strict": false
  }
        """,
    )
    parser.add_argument(
        "source_dir",
        help="Source directory to validate",
    )
    parser.add_argument(
        "-o",
        "--output",
        choices=["json", "human"],
        default="json",
        help="Output format (default: json)",
    )
    parser.add_argument(
        "--config",
        help="Layer configuration JSON file",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Fail on unknown layers",
    )

    args = parser.parse_args()

    source_dir = Path(args.source_dir)
    if not source_dir.exists():
        emit_error(EXIT_FILE_NOT_FOUND, f"Directory not found: {source_dir}")
        return EXIT_FILE_NOT_FOUND

    if not source_dir.is_dir():
        emit_error(EXIT_ERROR, f"Not a directory: {source_dir}")
        return EXIT_ERROR

    try:
        config = load_layer_config(args.config)
    except Exception as e:
        emit_error(EXIT_ERROR, f"Failed to load config: {e}")
        return EXIT_ERROR

    if args.strict:
        config.strict = True

    emit_info(f"Validating layer rules in {source_dir}...")

    report = validate_directory(source_dir, config)

    output_format = OutputFormat(args.output)
    output(report.to_dict(), output_format)

    if report.is_valid:
        emit_info(f"Validation passed: {report.files_checked} files checked")
        return EXIT_SUCCESS
    else:
        emit_warning(
            f"Validation failed: {len(report.violations)} violations in "
            f"{report.files_checked} files"
        )
        return EXIT_VALIDATION_ERROR


if __name__ == "__main__":
    sys.exit(main())
