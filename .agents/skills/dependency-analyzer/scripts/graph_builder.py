#!/usr/bin/env python3
"""
Graph Builder - Builds dependency graphs from source code.

Analyzes import statements to create module dependency graphs.

Usage:
    graph_builder.py [-o json|dot] [--type internal|external|all] [--root MODULE] SOURCE

Examples:
    graph_builder.py src/
    graph_builder.py --type internal --root mypackage src/
    graph_builder.py -o dot project/
"""

import argparse
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# Add shared library to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "_shared" / "python"))

from layer0 import EXIT_ERROR, EXIT_FILE_NOT_FOUND, EXIT_SUCCESS
from layer1 import OutputFormat, emit_error, emit_info, emit_warning, glob_files, output


@dataclass
class DependencyEdge:
    """An edge in the dependency graph."""

    source: str
    target: str
    import_type: str  # import, from_import
    line: int = 0

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "source": self.source,
            "target": self.target,
            "import_type": self.import_type,
            "line": self.line,
        }


@dataclass
class DependencyGraph:
    """A dependency graph."""

    source_dir: str
    root_module: str
    nodes: set = field(default_factory=set)
    edges: list = field(default_factory=list)
    cycles: list = field(default_factory=list)
    errors: list = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        # Build adjacency list
        adjacency: dict[str, list[str]] = defaultdict(list)
        for edge in self.edges:
            adjacency[edge.source].append(edge.target)

        return {
            "source_dir": self.source_dir,
            "root_module": self.root_module,
            "summary": {
                "nodes": len(self.nodes),
                "edges": len(self.edges),
                "cycles": len(self.cycles),
            },
            "adjacency_list": dict(adjacency),
            "edges": [e.to_dict() for e in self.edges],
            "cycles": self.cycles,
            "errors": self.errors if self.errors else None,
        }


def extract_imports(file_path: Path) -> list[tuple[str, str, int]]:
    """
    Extract import statements from a Python file.

    Args:
        file_path: Path to Python file

    Returns:
        List of (module_name, import_type, line_number)
    """
    imports = []

    try:
        content = file_path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return imports

    for line_num, line in enumerate(content.splitlines(), start=1):
        line = line.strip()

        # import x, import x.y, import x as y
        match = re.match(r"^import\s+([\w.]+)", line)
        if match:
            imports.append((match.group(1), "import", line_num))
            continue

        # from x import y, from x.y import z
        match = re.match(r"^from\s+([\w.]+)\s+import", line)
        if match:
            imports.append((match.group(1), "from_import", line_num))

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
    relative = file_path.relative_to(source_dir)

    # Remove .py extension and convert path to dots
    parts = list(relative.parts)
    if parts[-1].endswith(".py"):
        parts[-1] = parts[-1][:-3]

    # Remove __init__
    if parts[-1] == "__init__":
        parts = parts[:-1]

    return ".".join(parts)


def is_internal_module(module: str, root_module: str) -> bool:
    """
    Check if module is internal (part of the project).

    Args:
        module: Module name
        root_module: Root module name

    Returns:
        True if module is internal
    """
    if not root_module:
        return True
    return module == root_module or module.startswith(root_module + ".")


def build_from_imports(
    source_dir: Path, root_module: str = "", dep_type: str = "all"
) -> DependencyGraph:
    """
    Build dependency graph from import statements.

    Args:
        source_dir: Source directory
        root_module: Root module name for internal detection
        dep_type: Type of dependencies (internal, external, all)

    Returns:
        DependencyGraph
    """
    graph = DependencyGraph(
        source_dir=str(source_dir),
        root_module=root_module,
    )

    # Find all Python files
    for file_path in glob_files(source_dir, "*.py", recursive=True):
        source_module = file_to_module(file_path, source_dir)
        graph.nodes.add(source_module)

        # Extract imports
        for module, import_type, line in extract_imports(file_path):
            target_module = module.split(".")[0]  # Get top-level module

            # Filter by type
            is_internal = is_internal_module(target_module, root_module)
            if dep_type == "internal" and not is_internal:
                continue
            if dep_type == "external" and is_internal:
                continue

            graph.nodes.add(target_module)
            graph.edges.append(
                DependencyEdge(
                    source=source_module,
                    target=target_module,
                    import_type=import_type,
                    line=line,
                )
            )

    # Detect cycles
    graph.cycles = detect_cycles(graph)

    return graph


def detect_cycles(graph: DependencyGraph) -> list[list[str]]:
    """
    Detect cycles in the dependency graph using DFS.

    Args:
        graph: Dependency graph

    Returns:
        List of cycles (each cycle is a list of nodes)
    """
    # Build adjacency list
    adjacency: dict[str, set[str]] = defaultdict(set)
    for edge in graph.edges:
        adjacency[edge.source].add(edge.target)

    cycles = []
    visited = set()
    rec_stack = set()
    path = []

    def dfs(node: str) -> None:
        visited.add(node)
        rec_stack.add(node)
        path.append(node)

        for neighbor in adjacency.get(node, []):
            if neighbor not in visited:
                dfs(neighbor)
            elif neighbor in rec_stack:
                # Found a cycle
                cycle_start = path.index(neighbor)
                cycle = path[cycle_start:] + [neighbor]
                cycles.append(cycle)

        path.pop()
        rec_stack.remove(node)

    for node in graph.nodes:
        if node not in visited:
            dfs(node)

    return cycles


def to_adjacency_list(graph: DependencyGraph) -> dict[str, list[str]]:
    """
    Convert graph to adjacency list format.

    Args:
        graph: Dependency graph

    Returns:
        Dictionary mapping source -> [targets]
    """
    adjacency: dict[str, list[str]] = defaultdict(list)
    for edge in graph.edges:
        if edge.target not in adjacency[edge.source]:
            adjacency[edge.source].append(edge.target)
    return dict(adjacency)


def to_dot_format(graph: DependencyGraph) -> str:
    """
    Convert graph to DOT format for visualization.

    Args:
        graph: Dependency graph

    Returns:
        DOT format string
    """
    lines = ["digraph dependencies {"]
    lines.append("    rankdir=LR;")
    lines.append("    node [shape=box];")
    lines.append("")

    # Add edges
    seen_edges = set()
    for edge in graph.edges:
        edge_key = (edge.source, edge.target)
        if edge_key not in seen_edges:
            lines.append(f'    "{edge.source}" -> "{edge.target}";')
            seen_edges.add(edge_key)

    lines.append("}")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build dependency graphs from source code imports",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  graph_builder.py src/
  graph_builder.py --type internal --root mypackage src/
  graph_builder.py -o dot project/
        """,
    )
    parser.add_argument(
        "source",
        help="Source directory to analyze",
    )
    parser.add_argument(
        "-o",
        "--output",
        choices=["json", "dot"],
        default="json",
        help="Output format (default: json)",
    )
    parser.add_argument(
        "--type",
        choices=["internal", "external", "all"],
        default="all",
        help="Dependency type to include (default: all)",
    )
    parser.add_argument(
        "--root",
        default="",
        help="Root module name for internal detection",
    )

    args = parser.parse_args()

    source = Path(args.source)
    if not source.exists():
        emit_error(EXIT_FILE_NOT_FOUND, f"Directory not found: {source}")
        return EXIT_FILE_NOT_FOUND

    if not source.is_dir():
        emit_error(EXIT_ERROR, f"Not a directory: {source}")
        return EXIT_ERROR

    emit_info(f"Building dependency graph from {source}...")

    graph = build_from_imports(source, args.root, args.type)

    if args.output == "dot":
        print(to_dot_format(graph))
    else:
        output(graph.to_dict(), OutputFormat.JSON)

    emit_info(
        f"Graph: {len(graph.nodes)} nodes, {len(graph.edges)} edges, {len(graph.cycles)} cycles"
    )

    if graph.cycles:
        emit_warning(f"Circular dependencies detected: {len(graph.cycles)}")

    return EXIT_SUCCESS


if __name__ == "__main__":
    sys.exit(main())
