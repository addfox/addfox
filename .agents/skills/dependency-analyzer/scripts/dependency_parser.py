#!/usr/bin/env python3
"""
Dependency Parser - Parses dependency files from various package managers.

Supports requirements.txt, package.json, Cargo.toml, and Python import scanning.

Usage:
    dependency_parser.py [-o json|human] [-t python|node|rust|auto] [--include-dev] TARGET

Examples:
    dependency_parser.py requirements.txt
    dependency_parser.py -t node package.json
    dependency_parser.py --include-dev Cargo.toml
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

from layer0 import EXIT_ERROR, EXIT_FILE_NOT_FOUND, EXIT_SUCCESS
from layer1 import OutputFormat, emit_error, emit_info, output


@dataclass
class Dependency:
    """A single dependency."""

    name: str
    version: str = ""
    version_constraint: str = ""
    is_dev: bool = False
    extras: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        result = {
            "name": self.name,
            "version": self.version,
        }
        if self.version_constraint:
            result["version_constraint"] = self.version_constraint
        if self.is_dev:
            result["is_dev"] = True
        if self.extras:
            result["extras"] = self.extras
        return result


@dataclass
class ParseResult:
    """Result of parsing a dependency file."""

    source_file: str
    package_type: str
    dependencies: list[Dependency] = field(default_factory=list)
    dev_dependencies: list[Dependency] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "source_file": self.source_file,
            "package_type": self.package_type,
            "dependencies": [d.to_dict() for d in self.dependencies],
            "dev_dependencies": [d.to_dict() for d in self.dev_dependencies],
            "summary": {
                "total": len(self.dependencies) + len(self.dev_dependencies),
                "production": len(self.dependencies),
                "development": len(self.dev_dependencies),
            },
            "errors": self.errors if self.errors else None,
        }


def detect_package_type(path: Path) -> str:
    """
    Detect package type from filename.

    Args:
        path: Path to file

    Returns:
        Package type string
    """
    name = path.name.lower()

    if name == "requirements.txt" or name.endswith(".txt"):
        return "python"
    elif name == "package.json":
        return "node"
    elif name == "cargo.toml":
        return "rust"
    elif name == "pyproject.toml" or name == "setup.py":
        return "python"
    elif name == "go.mod":
        return "go"
    elif name == "gemfile":
        return "ruby"
    else:
        return "unknown"


def parse_requirements_txt(path: Path) -> ParseResult:
    """
    Parse Python requirements.txt file.

    Args:
        path: Path to requirements.txt

    Returns:
        ParseResult with dependencies
    """
    result = ParseResult(
        source_file=str(path),
        package_type="python",
    )

    try:
        content = path.read_text()
    except Exception as e:
        result.errors.append(f"Failed to read file: {e}")
        return result

    for line in content.splitlines():
        line = line.strip()

        # Skip empty lines and comments
        if not line or line.startswith("#"):
            continue

        # Skip -r includes and other flags
        if line.startswith("-"):
            continue

        # Parse package specification
        # Examples: package==1.0.0, package>=1.0, package[extra]>=1.0
        match = re.match(
            r"^([a-zA-Z0-9_-]+)(?:\[([^\]]+)\])?(?:(==|>=|<=|~=|!=|>|<)(.+))?$",
            line.split(";")[0].strip(),  # Remove environment markers
        )

        if match:
            name = match.group(1)
            extras = match.group(2).split(",") if match.group(2) else []
            constraint = match.group(3) or ""
            version = match.group(4) or ""

            result.dependencies.append(
                Dependency(
                    name=name,
                    version=version.strip(),
                    version_constraint=constraint + version.strip() if constraint else "",
                    extras=extras,
                )
            )
        else:
            result.errors.append(f"Failed to parse: {line}")

    return result


def parse_package_json(path: Path, include_dev: bool = False) -> ParseResult:
    """
    Parse Node.js package.json file.

    Args:
        path: Path to package.json
        include_dev: Include devDependencies

    Returns:
        ParseResult with dependencies
    """
    result = ParseResult(
        source_file=str(path),
        package_type="node",
    )

    try:
        content = json.loads(path.read_text())
    except Exception as e:
        result.errors.append(f"Failed to parse JSON: {e}")
        return result

    # Production dependencies
    for name, version in content.get("dependencies", {}).items():
        result.dependencies.append(
            Dependency(
                name=name,
                version=version.lstrip("^~"),
                version_constraint=version,
            )
        )

    # Dev dependencies
    if include_dev:
        for name, version in content.get("devDependencies", {}).items():
            result.dev_dependencies.append(
                Dependency(
                    name=name,
                    version=version.lstrip("^~"),
                    version_constraint=version,
                    is_dev=True,
                )
            )

    return result


def parse_cargo_toml(path: Path, include_dev: bool = False) -> ParseResult:
    """
    Parse Rust Cargo.toml file.

    Args:
        path: Path to Cargo.toml
        include_dev: Include dev-dependencies

    Returns:
        ParseResult with dependencies
    """
    result = ParseResult(
        source_file=str(path),
        package_type="rust",
    )

    try:
        content = path.read_text()
    except Exception as e:
        result.errors.append(f"Failed to read file: {e}")
        return result

    # Simple TOML parsing for dependencies section
    in_deps = False
    in_dev_deps = False

    for line in content.splitlines():
        line = line.strip()

        if line == "[dependencies]":
            in_deps = True
            in_dev_deps = False
            continue
        elif line == "[dev-dependencies]":
            in_deps = False
            in_dev_deps = True
            continue
        elif line.startswith("["):
            in_deps = False
            in_dev_deps = False
            continue

        if in_deps or (in_dev_deps and include_dev):
            # Parse dependency line
            # Examples: serde = "1.0", serde = { version = "1.0", features = ["derive"] }
            match = re.match(r'^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"', line)
            if match:
                dep = Dependency(
                    name=match.group(1),
                    version=match.group(2),
                    version_constraint=match.group(2),
                    is_dev=in_dev_deps,
                )
                if in_dev_deps:
                    result.dev_dependencies.append(dep)
                else:
                    result.dependencies.append(dep)
                continue

            # Complex dependency format
            match = re.match(r'^([a-zA-Z0-9_-]+)\s*=\s*\{.*version\s*=\s*"([^"]+)"', line)
            if match:
                dep = Dependency(
                    name=match.group(1),
                    version=match.group(2),
                    version_constraint=match.group(2),
                    is_dev=in_dev_deps,
                )
                if in_dev_deps:
                    result.dev_dependencies.append(dep)
                else:
                    result.dependencies.append(dep)

    return result


def parse_python_imports(path: Path) -> list[tuple[str, int]]:
    """
    Parse Python imports from a source file.

    Args:
        path: Path to Python file

    Returns:
        List of (module_name, line_number) tuples
    """
    imports = []

    try:
        content = path.read_text()
    except Exception:
        return imports

    for line_num, line in enumerate(content.splitlines(), start=1):
        # import statement
        match = re.match(r"^\s*import\s+([\w.]+)", line)
        if match:
            imports.append((match.group(1).split(".")[0], line_num))
            continue

        # from ... import statement
        match = re.match(r"^\s*from\s+([\w.]+)\s+import", line)
        if match:
            imports.append((match.group(1).split(".")[0], line_num))

    return imports


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Parse dependency files from various package managers",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  dependency_parser.py requirements.txt
  dependency_parser.py -t node package.json
  dependency_parser.py --include-dev Cargo.toml
        """,
    )
    parser.add_argument(
        "target",
        help="Dependency file to parse",
    )
    parser.add_argument(
        "-o",
        "--output",
        choices=["json", "human"],
        default="json",
        help="Output format (default: json)",
    )
    parser.add_argument(
        "-t",
        "--type",
        choices=["python", "node", "rust", "auto"],
        default="auto",
        help="Package type (default: auto-detect)",
    )
    parser.add_argument(
        "--include-dev",
        action="store_true",
        help="Include development dependencies",
    )

    args = parser.parse_args()

    path = Path(args.target)
    if not path.exists():
        emit_error(EXIT_FILE_NOT_FOUND, f"File not found: {path}")
        return EXIT_FILE_NOT_FOUND

    if not path.is_file():
        emit_error(EXIT_ERROR, f"Not a file: {path}")
        return EXIT_ERROR

    # Detect or use specified type
    pkg_type = args.type if args.type != "auto" else detect_package_type(path)

    emit_info(f"Parsing {path} as {pkg_type} package...")

    # Parse based on type
    if pkg_type == "python":
        result = parse_requirements_txt(path)
    elif pkg_type == "node":
        result = parse_package_json(path, args.include_dev)
    elif pkg_type == "rust":
        result = parse_cargo_toml(path, args.include_dev)
    else:
        emit_error(EXIT_ERROR, f"Unknown package type: {pkg_type}")
        return EXIT_ERROR

    output_format = OutputFormat(args.output)
    output(result.to_dict(), output_format)

    summary = result.to_dict()["summary"]
    emit_info(
        f"Found {summary['total']} dependencies "
        f"({summary['production']} production, {summary['development']} development)"
    )

    return EXIT_SUCCESS


if __name__ == "__main__":
    sys.exit(main())
