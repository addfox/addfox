#!/usr/bin/env python3
"""
Split Planner - Suggests how to split large files into smaller modules.

Analyzes file structure to identify logical boundaries and suggests
split points based on responsibility groupings.

Usage:
    split_planner.py [-o json|human|markdown] [--min-size N] ANALYSIS_JSON

Examples:
    split_planner.py analysis.json
    split_planner.py --min-size 50 file_analysis.json
    split_planner.py -o markdown analysis.json
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
from layer1 import OutputFormat, emit_error, emit_info, output, read_file


@dataclass
class Boundary:
    """A logical boundary in the code."""

    start_line: int
    end_line: int
    boundary_type: str
    name: str
    reason: str

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "start_line": self.start_line,
            "end_line": self.end_line,
            "type": self.boundary_type,
            "name": self.name,
            "reason": self.reason,
        }


@dataclass
class ProposedFile:
    """A proposed new file from splitting."""

    name: str
    functions: list[str]
    classes: list[str]
    estimated_lines: int
    imports_needed: list[str]
    description: str

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "name": self.name,
            "functions": self.functions,
            "classes": self.classes,
            "estimated_lines": self.estimated_lines,
            "imports_needed": self.imports_needed,
            "description": self.description,
        }


@dataclass
class ImportChange:
    """A required import change after splitting."""

    affected_file: str
    old_import: str
    new_import: str

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "affected_file": self.affected_file,
            "old_import": self.old_import,
            "new_import": self.new_import,
        }


@dataclass
class SplitPlan:
    """A plan for splitting a file."""

    original_file: str
    boundaries: list[Boundary] = field(default_factory=list)
    proposed_files: list[ProposedFile] = field(default_factory=list)
    import_changes: list[ImportChange] = field(default_factory=list)
    dependency_graph: dict[str, list[str]] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "original_file": self.original_file,
            "summary": {
                "proposed_files": len(self.proposed_files),
                "total_estimated_lines": sum(f.estimated_lines for f in self.proposed_files),
                "boundaries_identified": len(self.boundaries),
            },
            "boundaries": [b.to_dict() for b in self.boundaries],
            "proposed_files": [f.to_dict() for f in self.proposed_files],
            "import_changes": [c.to_dict() for c in self.import_changes],
            "dependency_graph": self.dependency_graph,
            "warnings": self.warnings if self.warnings else None,
        }


def identify_logical_boundaries(analysis: dict[str, Any]) -> list[Boundary]:
    """
    Identify logical boundaries in the file.

    Args:
        analysis: File analysis from file_analyzer

    Returns:
        List of boundaries
    """
    boundaries: list[Boundary] = []

    # Extract functions and classes from analysis
    files = analysis.get("files", [])
    if not files:
        return boundaries

    file_data = files[0]
    functions = file_data.get("functions", [])
    classes = file_data.get("classes", [])

    # Each class is a natural boundary
    for cls in classes:
        boundaries.append(
            Boundary(
                start_line=cls["line_start"],
                end_line=cls["line_end"],
                boundary_type="class",
                name=cls["name"],
                reason="Class definition forms a natural module boundary",
            )
        )

    # Group standalone functions by prefix
    class_ranges = [(c["line_start"], c["line_end"]) for c in classes]

    standalone_functions = []
    for func in functions:
        line = func["line_start"]
        # Check if function is inside a class
        in_class = any(start <= line <= end for start, end in class_ranges)
        if not in_class:
            standalone_functions.append(func)

    # Group by prefix
    prefix_groups: dict[str, list[dict]] = {}
    for func in standalone_functions:
        name = func["name"]
        # Get prefix (first word before underscore)
        parts = name.lstrip("_").split("_")
        prefix = parts[0] if parts else "misc"
        if prefix not in prefix_groups:
            prefix_groups[prefix] = []
        prefix_groups[prefix].append(func)

    # Create boundaries for function groups
    for prefix, group in prefix_groups.items():
        if len(group) >= 2:
            start = min(f["line_start"] for f in group)
            end = max(f["line_end"] for f in group)
            boundaries.append(
                Boundary(
                    start_line=start,
                    end_line=end,
                    boundary_type="function_group",
                    name=f"{prefix}_* functions",
                    reason=f"Group of {len(group)} related functions with '{prefix}_' prefix",
                )
            )

    # Sort by start line
    boundaries.sort(key=lambda b: b.start_line)

    return boundaries


def group_by_responsibility(functions: list[dict[str, Any]]) -> dict[str, list[str]]:
    """
    Group functions by their apparent responsibility.

    Args:
        functions: List of function dictionaries

    Returns:
        Dictionary mapping responsibility to function names
    """
    groups: dict[str, list[str]] = {}

    # Common responsibility prefixes
    responsibility_prefixes = {
        "validate": "validation",
        "check": "validation",
        "is_": "validation",
        "has_": "validation",
        "parse": "parsing",
        "load": "io",
        "save": "io",
        "read": "io",
        "write": "io",
        "format": "formatting",
        "render": "formatting",
        "calculate": "computation",
        "compute": "computation",
        "process": "processing",
        "handle": "handlers",
        "on_": "handlers",
        "create": "factory",
        "make": "factory",
        "build": "factory",
        "get": "accessors",
        "set": "accessors",
        "convert": "conversion",
        "transform": "conversion",
        "to_": "conversion",
        "from_": "conversion",
    }

    for func in functions:
        name = func.get("name", "").lstrip("_")
        assigned = False

        for prefix, responsibility in responsibility_prefixes.items():
            if name.startswith(prefix):
                if responsibility not in groups:
                    groups[responsibility] = []
                groups[responsibility].append(func.get("name", ""))
                assigned = True
                break

        if not assigned:
            if "misc" not in groups:
                groups["misc"] = []
            groups["misc"].append(func.get("name", ""))

    return groups


def build_dependency_graph(file_content: str) -> dict[str, list[str]]:
    """
    Build a simple dependency graph of function calls.

    Args:
        file_content: File content

    Returns:
        Dictionary mapping function names to functions they call
    """
    graph: dict[str, list[str]] = {}

    # Find all function definitions
    func_pattern = r"def\s+(\w+)\s*\("
    func_matches = list(re.finditer(func_pattern, file_content))

    func_names = {m.group(1) for m in func_matches}

    # For each function, find what other functions it calls
    lines = file_content.splitlines()
    current_func = None
    indent_level = 0

    for line in lines:
        # Check for function definition
        func_match = re.match(r"^(\s*)def\s+(\w+)\s*\(", line)
        if func_match:
            current_func = func_match.group(2)
            indent_level = len(func_match.group(1))
            graph[current_func] = []
            continue

        # If we're in a function, look for calls to other functions
        if current_func:
            # Check if we've left the function (dedented)
            stripped = line.lstrip()
            if (
                stripped
                and not line.startswith(" " * (indent_level + 1))
                and not stripped.startswith("#")
            ):
                current_func = None
                continue

            # Find function calls in this line
            call_pattern = r"(\w+)\s*\("
            for match in re.finditer(call_pattern, line):
                called = match.group(1)
                if (
                    called in func_names
                    and called != current_func
                    and called not in graph[current_func]
                ):
                    graph[current_func].append(called)

    return graph


def generate_split_plan(analysis: dict[str, Any], min_size: int) -> SplitPlan:
    """
    Generate a split plan for the file.

    Args:
        analysis: File analysis from file_analyzer
        min_size: Minimum lines for a proposed file

    Returns:
        SplitPlan
    """
    files = analysis.get("files", [])
    if not files:
        return SplitPlan(original_file="unknown")

    file_data = files[0]
    original_file = file_data.get("path", "")

    plan = SplitPlan(original_file=original_file)

    # Identify boundaries
    plan.boundaries = identify_logical_boundaries(analysis)

    # Get functions and classes
    functions = file_data.get("functions", [])
    classes = file_data.get("classes", [])

    # Group by responsibility
    groups = group_by_responsibility(functions)

    # Try to read file content for dependency analysis
    try:
        content = read_file(original_file)
        plan.dependency_graph = build_dependency_graph(content)
    except Exception:
        plan.warnings.append("Could not analyze dependencies - file not readable")
        content = ""

    # Generate proposed files
    original_stem = Path(original_file).stem
    original_suffix = Path(original_file).suffix

    # Propose file for each class
    for cls in classes:
        class_name = cls["name"]
        class_lines = cls["lines"]

        if class_lines >= min_size:
            # Find methods that belong to this class
            class_methods = []
            for func in functions:
                if cls["line_start"] <= func["line_start"] <= cls["line_end"]:
                    class_methods.append(func["name"])

            proposed_name = f"{original_stem}_{class_name.lower()}{original_suffix}"
            plan.proposed_files.append(
                ProposedFile(
                    name=proposed_name,
                    functions=class_methods,
                    classes=[class_name],
                    estimated_lines=class_lines,
                    imports_needed=[],
                    description=f"Extract {class_name} class and its {len(class_methods)} methods",
                )
            )

    # Propose files for function groups
    for responsibility, func_names in groups.items():
        if responsibility == "misc":
            continue

        # Estimate lines for this group
        total_lines = sum(f["lines"] for f in functions if f["name"] in func_names)

        if total_lines >= min_size and len(func_names) >= 2:
            proposed_name = f"{original_stem}_{responsibility}{original_suffix}"
            plan.proposed_files.append(
                ProposedFile(
                    name=proposed_name,
                    functions=func_names,
                    classes=[],
                    estimated_lines=total_lines,
                    imports_needed=_identify_imports_needed(func_names, plan.dependency_graph),
                    description=f"Group {len(func_names)} {responsibility} functions",
                )
            )

    # Check for circular dependencies
    if plan.dependency_graph:
        _check_circular_dependencies(plan)

    # Generate import changes
    if plan.proposed_files:
        module_name = Path(original_file).stem
        for proposed in plan.proposed_files:
            new_module = Path(proposed.name).stem
            for func_name in proposed.functions:
                plan.import_changes.append(
                    ImportChange(
                        affected_file="<files importing from " + module_name + ">",
                        old_import=f"from {module_name} import {func_name}",
                        new_import=f"from {new_module} import {func_name}",
                    )
                )

    return plan


def _identify_imports_needed(
    func_names: list[str], dependency_graph: dict[str, list[str]]
) -> list[str]:
    """Identify what imports the proposed module would need."""
    imports_needed: set[str] = set()

    for func_name in func_names:
        deps = dependency_graph.get(func_name, [])
        for dep in deps:
            if dep not in func_names:
                imports_needed.add(dep)

    return sorted(imports_needed)


def _check_circular_dependencies(plan: SplitPlan) -> None:
    """Check for circular dependencies between proposed modules."""
    # Build module -> functions mapping
    module_funcs: dict[str, set[str]] = {}
    for proposed in plan.proposed_files:
        module_funcs[proposed.name] = set(proposed.functions)

    # Check each pair of modules
    for mod1 in plan.proposed_files:
        for mod2 in plan.proposed_files:
            if mod1.name >= mod2.name:
                continue

            funcs1 = module_funcs[mod1.name]
            funcs2 = module_funcs[mod2.name]

            # Check if mod1 calls mod2 and vice versa
            mod1_calls_mod2 = False
            mod2_calls_mod1 = False

            for func in funcs1:
                deps = plan.dependency_graph.get(func, [])
                if any(d in funcs2 for d in deps):
                    mod1_calls_mod2 = True
                    break

            for func in funcs2:
                deps = plan.dependency_graph.get(func, [])
                if any(d in funcs1 for d in deps):
                    mod2_calls_mod1 = True
                    break

            if mod1_calls_mod2 and mod2_calls_mod1:
                plan.warnings.append(
                    f"Potential circular dependency between {mod1.name} and {mod2.name}"
                )


def estimate_new_files(plan: SplitPlan) -> list[ProposedFile]:
    """
    Return the list of proposed files.

    Args:
        plan: Split plan

    Returns:
        List of proposed files
    """
    return plan.proposed_files


def format_as_markdown(plan: SplitPlan) -> str:
    """
    Format the split plan as markdown.

    Args:
        plan: Split plan

    Returns:
        Markdown string
    """
    lines = [
        f"# Split Plan for `{plan.original_file}`",
        "",
        "## Summary",
        "",
        f"- **Original file:** `{plan.original_file}`",
        f"- **Proposed splits:** {len(plan.proposed_files)} files",
        f"- **Boundaries identified:** {len(plan.boundaries)}",
        "",
    ]

    if plan.warnings:
        lines.extend(
            [
                "## Warnings",
                "",
            ]
        )
        for warning in plan.warnings:
            lines.append(f"- [WARNING] {warning}")
        lines.append("")

    lines.extend(
        [
            "## Proposed Files",
            "",
        ]
    )

    for i, proposed in enumerate(plan.proposed_files, 1):
        lines.extend(
            [
                f"### {i}. `{proposed.name}`",
                "",
                f"**Description:** {proposed.description}",
                "",
                f"**Estimated lines:** {proposed.estimated_lines}",
                "",
            ]
        )

        if proposed.classes:
            lines.append("**Classes:**")
            for cls in proposed.classes:
                lines.append(f"- `{cls}`")
            lines.append("")

        if proposed.functions:
            lines.append("**Functions:**")
            for func in proposed.functions:
                lines.append(f"- `{func}`")
            lines.append("")

        if proposed.imports_needed:
            lines.append("**Imports needed from other modules:**")
            for imp in proposed.imports_needed:
                lines.append(f"- `{imp}`")
            lines.append("")

    if plan.import_changes:
        lines.extend(
            [
                "## Required Import Changes",
                "",
                "After splitting, update imports in dependent files:",
                "",
            ]
        )
        for change in plan.import_changes[:10]:  # Limit to first 10
            lines.append(f"- `{change.old_import}` -> `{change.new_import}`")
        if len(plan.import_changes) > 10:
            lines.append(f"- ... and {len(plan.import_changes) - 10} more")
        lines.append("")

    return "\n".join(lines)


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Generate a plan for splitting large files",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  split_planner.py analysis.json
  split_planner.py --min-size 50 file_analysis.json
  split_planner.py -o markdown analysis.json
        """,
    )
    parser.add_argument(
        "analysis_json",
        help="JSON output from file_analyzer",
    )
    parser.add_argument(
        "-o",
        "--output",
        choices=["json", "human", "markdown"],
        default="json",
        help="Output format (default: json)",
    )
    parser.add_argument(
        "--min-size",
        type=int,
        default=30,
        help="Minimum lines for a proposed file (default: 30)",
    )

    args = parser.parse_args()

    analysis_path = Path(args.analysis_json)
    if not analysis_path.exists():
        emit_error(EXIT_FILE_NOT_FOUND, f"File not found: {analysis_path}")
        return EXIT_FILE_NOT_FOUND

    try:
        with open(analysis_path, encoding="utf-8") as f:
            analysis_data = json.load(f)
    except json.JSONDecodeError as e:
        emit_error(EXIT_ERROR, f"Invalid JSON: {e}")
        return EXIT_ERROR

    emit_info(f"Generating split plan from {analysis_path}...")

    plan = generate_split_plan(analysis_data, args.min_size)

    if args.output == "markdown":
        print(format_as_markdown(plan))
    else:
        output_format = OutputFormat(args.output)
        output(plan.to_dict(), output_format)

    summary = plan.to_dict()["summary"]
    emit_info(
        f"Proposed {summary['proposed_files']} files "
        f"(~{summary['total_estimated_lines']} lines total)"
    )

    return EXIT_SUCCESS


if __name__ == "__main__":
    sys.exit(main())
