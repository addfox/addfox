#!/usr/bin/env python3
"""
Layer dependency checker for Python libraries.

Validates that modules follow the layered architecture rules:
- Layer N can only import from Layer N-1, N-2, etc. (lower layers)
- Higher layers cannot import from lower layers
- No circular dependencies

Usage:
    python layer_checker.py <library_dir>

Example:
    python layer_checker.py skills/_shared/python
"""

import argparse
import ast
import sys
from pathlib import Path


class ImportVisitor(ast.NodeVisitor):
    """AST visitor to extract import statements."""

    def __init__(self):
        self.imports: list[str] = []

    def visit_Import(self, node: ast.Import):
        """Visit regular import statement."""
        for alias in node.names:
            self.imports.append(alias.name)

    def visit_ImportFrom(self, node: ast.ImportFrom):
        """Visit from...import statement."""
        if node.module:
            self.imports.append(node.module)


def extract_imports(file_path: Path) -> list[str]:
    """Extract all imports from a Python file.

    Args:
        file_path: Path to Python file.

    Returns:
        List of imported module names.
    """
    try:
        with open(file_path, encoding="utf-8") as f:
            tree = ast.parse(f.read(), filename=str(file_path))

        visitor = ImportVisitor()
        visitor.visit(tree)
        return visitor.imports
    except SyntaxError as e:
        print(f"Syntax error in {file_path}: {e}", file=sys.stderr)
        return []


def get_layer_number(module_name: str) -> int:
    """Extract layer number from module name.

    Args:
        module_name: Module name (e.g., 'layer0.colors').

    Returns:
        Layer number, or -1 if not a layer module.
    """
    if module_name.startswith("layer"):
        try:
            # Extract number from 'layerN'
            return int(module_name[5])
        except (ValueError, IndexError):
            return -1
    return -1


def check_layer_violations(library_dir: Path) -> tuple[list[str], dict[str, list[str]]]:
    """Check for layer dependency violations.

    Args:
        library_dir: Root directory of the library.

    Returns:
        Tuple of (violations list, dependency graph).
    """
    violations = []
    dependency_graph: dict[str, list[str]] = {}

    # Find all Python files in layer directories
    layer_files = list(library_dir.glob("layer*/*.py"))

    for file_path in layer_files:
        if file_path.name == "__init__.py":
            continue

        # Determine current layer
        layer_dir = file_path.parent.name
        current_layer = get_layer_number(layer_dir)

        if current_layer == -1:
            continue

        # Extract imports
        imports = extract_imports(file_path)

        # Track dependencies
        module_key = f"{layer_dir}.{file_path.stem}"
        dependency_graph[module_key] = imports

        # Check each import
        for imp in imports:
            imported_layer = get_layer_number(imp)

            if imported_layer == -1:
                # Not a layer module, skip
                continue

            # Violation: importing from same or higher layer
            if imported_layer >= current_layer:
                violations.append(
                    f"{file_path.relative_to(library_dir)}: "
                    f"{layer_dir} imports from {imp} (layer {imported_layer})"
                )

    return violations, dependency_graph


def print_dependency_graph(graph: dict[str, list[str]]):
    """Print dependency graph in human-readable format.

    Args:
        graph: Dependency graph dictionary.
    """
    print("\nDependency Graph:")
    print("=" * 60)
    for module, deps in sorted(graph.items()):
        if deps:
            print(f"{module}:")
            for dep in sorted(deps):
                if dep.startswith("layer"):
                    print(f"  → {dep}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Check layer dependencies in Python library")
    parser.add_argument(
        "library_dir", type=Path, help="Path to library directory containing layerN/ subdirectories"
    )
    parser.add_argument("-v", "--verbose", action="store_true", help="Show dependency graph")

    args = parser.parse_args()

    if not args.library_dir.is_dir():
        print(f"Error: {args.library_dir} is not a directory", file=sys.stderr)
        sys.exit(1)

    print(f"Checking layer dependencies in: {args.library_dir}")

    violations, graph = check_layer_violations(args.library_dir)

    if violations:
        print(f"\n❌ Found {len(violations)} layer violation(s):")
        for violation in violations:
            print(f"  • {violation}")

        if args.verbose:
            print_dependency_graph(graph)

        sys.exit(1)
    else:
        print("✅ No layer violations found!")

        if args.verbose:
            print_dependency_graph(graph)

        sys.exit(0)


if __name__ == "__main__":
    main()
