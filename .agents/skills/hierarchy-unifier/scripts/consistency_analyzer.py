#!/usr/bin/env python3
"""
Consistency Analyzer - Checks naming conventions and consistency.

Analyzes function discovery output to find naming inconsistencies,
parameter ordering issues, and return type inconsistencies.

Usage:
    consistency_analyzer.py [-o json|human] [--style snake_case|camelCase|auto] DISCOVERY_JSON

Examples:
    consistency_analyzer.py functions.json
    consistency_analyzer.py --style snake_case discovery.json
    consistency_analyzer.py -o human --style auto functions.json
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
class ConsistencyIssue:
    """A naming or consistency issue."""

    category: str
    function_name: str
    file: str
    line: int
    message: str
    suggestion: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        result = {
            "category": self.category,
            "function_name": self.function_name,
            "file": self.file,
            "line": self.line,
            "message": self.message,
        }
        if self.suggestion:
            result["suggestion"] = self.suggestion
        return result


@dataclass
class ConsistencyReport:
    """Report containing consistency analysis results."""

    source_file: str
    expected_style: str
    issues: list[ConsistencyIssue] = field(default_factory=list)
    by_category: dict[str, int] = field(default_factory=dict)
    consistency_score: float = 1.0
    total_functions: int = 0

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "source_file": self.source_file,
            "expected_style": self.expected_style,
            "summary": {
                "total_functions": self.total_functions,
                "total_issues": len(self.issues),
                "consistency_score": round(self.consistency_score, 2),
            },
            "issues": [i.to_dict() for i in self.issues],
            "by_category": self.by_category,
        }


def detect_naming_style(name: str) -> str:
    """
    Detect the naming style of an identifier.

    Args:
        name: Identifier name

    Returns:
        Style: 'snake_case', 'camelCase', 'PascalCase', 'SCREAMING_SNAKE', 'mixed'
    """
    # Skip dunder methods
    if name.startswith("__") and name.endswith("__"):
        return "dunder"

    # Skip private methods
    if name.startswith("_"):
        name = name.lstrip("_")

    if not name:
        return "unknown"

    # SCREAMING_SNAKE_CASE
    if name.isupper() and "_" in name:
        return "SCREAMING_SNAKE"

    # ALL_CAPS (single word)
    if name.isupper():
        return "UPPER"

    # snake_case: all lowercase with underscores
    if name.islower() and "_" in name:
        return "snake_case"

    # lowercase single word
    if name.islower():
        return "snake_case"

    # PascalCase: starts with uppercase, no underscores
    if name[0].isupper() and "_" not in name:
        return "PascalCase"

    # camelCase: starts with lowercase, has uppercase, no underscores
    if name[0].islower() and any(c.isupper() for c in name) and "_" not in name:
        return "camelCase"

    # Mixed: has both underscores and mixed case
    return "mixed"


def convert_to_snake_case(name: str) -> str:
    """
    Convert identifier to snake_case.

    Args:
        name: Identifier name

    Returns:
        snake_case version
    """
    # Handle leading underscores
    prefix = ""
    while name.startswith("_"):
        prefix += "_"
        name = name[1:]

    # Insert underscores before capitals
    result = re.sub(r"([a-z])([A-Z])", r"\1_\2", name)
    result = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1_\2", result)

    return prefix + result.lower()


def convert_to_camel_case(name: str) -> str:
    """
    Convert identifier to camelCase.

    Args:
        name: Identifier name

    Returns:
        camelCase version
    """
    # Handle leading underscores
    prefix = ""
    while name.startswith("_"):
        prefix += "_"
        name = name[1:]

    # Split by underscores
    parts = name.split("_")
    if not parts:
        return prefix

    # First part lowercase, rest title case
    result = parts[0].lower()
    for part in parts[1:]:
        if part:
            result += part.title()

    return prefix + result


def check_naming_consistency(
    functions: list[dict[str, Any]], expected_style: str
) -> list[ConsistencyIssue]:
    """
    Check function naming consistency.

    Args:
        functions: List of function info dictionaries
        expected_style: Expected naming style

    Returns:
        List of consistency issues
    """
    issues: list[ConsistencyIssue] = []

    for func in functions:
        name = func.get("name", "")
        file_path = func.get("file", "")
        line = func.get("line", 0)

        # Skip dunder methods
        if name.startswith("__") and name.endswith("__"):
            continue

        detected_style = detect_naming_style(name)

        # Check against expected style
        if expected_style == "snake_case" and detected_style not in ("snake_case", "dunder"):
            suggestion = convert_to_snake_case(name)
            issues.append(
                ConsistencyIssue(
                    category="naming_style",
                    function_name=name,
                    file=file_path,
                    line=line,
                    message=f"Function '{name}' uses {detected_style} instead of snake_case",
                    suggestion=f"Rename to '{suggestion}'",
                )
            )

        elif expected_style == "camelCase" and detected_style not in ("camelCase", "dunder"):
            suggestion = convert_to_camel_case(name)
            issues.append(
                ConsistencyIssue(
                    category="naming_style",
                    function_name=name,
                    file=file_path,
                    line=line,
                    message=f"Function '{name}' uses {detected_style} instead of camelCase",
                    suggestion=f"Rename to '{suggestion}'",
                )
            )

        elif detected_style == "mixed":
            issues.append(
                ConsistencyIssue(
                    category="naming_style",
                    function_name=name,
                    file=file_path,
                    line=line,
                    message=f"Function '{name}' uses mixed naming style",
                    suggestion="Use consistent naming style",
                )
            )

    return issues


def check_parameter_ordering(functions: list[dict[str, Any]]) -> list[ConsistencyIssue]:
    """
    Check for consistent parameter ordering patterns.

    Args:
        functions: List of function info dictionaries

    Returns:
        List of consistency issues
    """
    issues: list[ConsistencyIssue] = []

    # Common parameter patterns
    common_last_params = {"timeout", "callback", "options", "kwargs", "args"}

    for func in functions:
        name = func.get("name", "")
        file_path = func.get("file", "")
        line = func.get("line", 0)
        signature = func.get("signature", {})
        parameters = signature.get("parameters", [])

        if len(parameters) < 2:
            continue

        param_names = [p.get("name", "").lstrip("*") for p in parameters]

        # Check if self/cls is not first
        for i, param_name in enumerate(param_names[1:], 1):
            if param_name in {"self", "cls"}:
                issues.append(
                    ConsistencyIssue(
                        category="parameter_order",
                        function_name=name,
                        file=file_path,
                        line=line,
                        message=f"'{param_name}' should be first parameter, found at position {i + 1}",
                    )
                )

        # Check if timeout-like params are not last (excluding *args, **kwargs)
        regular_params = [p for p in param_names if not p.startswith("*")]
        if len(regular_params) > 1:
            for i, param_name in enumerate(regular_params[:-1]):
                if param_name in common_last_params:
                    issues.append(
                        ConsistencyIssue(
                            category="parameter_order",
                            function_name=name,
                            file=file_path,
                            line=line,
                            message=f"'{param_name}' is typically a last parameter, found at position {i + 1}",
                            suggestion=f"Consider moving '{param_name}' to the end",
                        )
                    )

    return issues


def check_return_type_consistency(functions: list[dict[str, Any]]) -> list[ConsistencyIssue]:
    """
    Check for return type annotation consistency.

    Args:
        functions: List of function info dictionaries

    Returns:
        List of consistency issues
    """
    issues: list[ConsistencyIssue] = []

    # Group functions by prefix
    prefixes: dict[str, list[dict]] = {}
    for func in functions:
        name = func.get("name", "")
        # Get prefix (e.g., "get", "is", "has", "set")
        parts = name.lstrip("_").split("_")
        if parts:
            prefix = parts[0]
            if prefix not in prefixes:
                prefixes[prefix] = []
            prefixes[prefix].append(func)

    # Check consistency within prefix groups
    for prefix, funcs in prefixes.items():
        if len(funcs) < 2:
            continue

        # For "is_" and "has_" prefixes, should return bool
        if prefix in ("is", "has"):
            for func in funcs:
                signature = func.get("signature", {})
                return_type = signature.get("return_type")
                if return_type and return_type != "bool":
                    issues.append(
                        ConsistencyIssue(
                            category="return_types",
                            function_name=func.get("name", ""),
                            file=func.get("file", ""),
                            line=func.get("line", 0),
                            message=f"Function with '{prefix}_' prefix should return bool, not {return_type}",
                            suggestion="Change return type to bool or rename function",
                        )
                    )

        # For "get_" prefix, should not return None explicitly (usually)
        if prefix == "get":
            for func in funcs:
                signature = func.get("signature", {})
                return_type = signature.get("return_type")
                if return_type == "None":
                    issues.append(
                        ConsistencyIssue(
                            category="return_types",
                            function_name=func.get("name", ""),
                            file=func.get("file", ""),
                            line=func.get("line", 0),
                            message="Function with 'get_' prefix typically returns a value, not None",
                            suggestion="Consider returning a value or renaming function",
                        )
                    )

    # Check for missing return type annotations
    typed_count = sum(1 for f in functions if f.get("signature", {}).get("return_type"))
    untyped_count = len(functions) - typed_count

    if typed_count > 0 and untyped_count > 0 and typed_count > untyped_count:
        for func in functions:
            signature = func.get("signature", {})
            if not signature.get("return_type"):
                issues.append(
                    ConsistencyIssue(
                        category="return_types",
                        function_name=func.get("name", ""),
                        file=func.get("file", ""),
                        line=func.get("line", 0),
                        message="Function missing return type annotation (most functions are typed)",
                        suggestion="Add return type annotation for consistency",
                    )
                )

    return issues


def check_docstring_consistency(functions: list[dict[str, Any]]) -> list[ConsistencyIssue]:
    """
    Check for docstring consistency.

    Args:
        functions: List of function info dictionaries

    Returns:
        List of consistency issues
    """
    issues: list[ConsistencyIssue] = []

    # Count functions with/without docstrings
    with_docstring = sum(1 for f in functions if f.get("docstring"))
    without_docstring = len(functions) - with_docstring

    # If majority have docstrings, flag those without
    if with_docstring > without_docstring and without_docstring > 0:
        for func in functions:
            if not func.get("docstring"):
                # Skip private/dunder methods
                name = func.get("name", "")
                if name.startswith("_"):
                    continue

                issues.append(
                    ConsistencyIssue(
                        category="docstring_format",
                        function_name=name,
                        file=func.get("file", ""),
                        line=func.get("line", 0),
                        message="Public function missing docstring (most functions are documented)",
                        suggestion="Add a docstring describing the function's purpose",
                    )
                )

    return issues


def detect_dominant_style(functions: list[dict[str, Any]]) -> str:
    """
    Detect the dominant naming style in the codebase.

    Args:
        functions: List of function info dictionaries

    Returns:
        Dominant style: 'snake_case', 'camelCase', or 'auto'
    """
    style_counts: dict[str, int] = {}

    for func in functions:
        name = func.get("name", "")
        style = detect_naming_style(name)
        if style not in ("dunder", "mixed", "unknown"):
            style_counts[style] = style_counts.get(style, 0) + 1

    if not style_counts:
        return "snake_case"  # Default for Python

    dominant = max(style_counts.items(), key=lambda x: x[1])
    return dominant[0]


def analyze_consistency(discovery_data: dict[str, Any], style: str) -> ConsistencyReport:
    """
    Analyze consistency of discovered functions.

    Args:
        discovery_data: Output from function_discoverer
        style: Expected naming style ('auto' to detect)

    Returns:
        ConsistencyReport
    """
    functions = discovery_data.get("functions", [])

    # Auto-detect style if requested
    if style == "auto":
        style = detect_dominant_style(functions)

    report = ConsistencyReport(
        source_file=discovery_data.get("target", ""),
        expected_style=style,
        total_functions=len(functions),
    )

    # Run all consistency checks
    report.issues.extend(check_naming_consistency(functions, style))
    report.issues.extend(check_parameter_ordering(functions))
    report.issues.extend(check_return_type_consistency(functions))
    report.issues.extend(check_docstring_consistency(functions))

    # Count by category
    for issue in report.issues:
        report.by_category[issue.category] = report.by_category.get(issue.category, 0) + 1

    # Calculate consistency score
    if len(functions) > 0:
        issue_weight = len(report.issues)
        # Normalize: fewer issues = higher score
        report.consistency_score = max(0, 1 - (issue_weight / (len(functions) * 2)))

    return report


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Analyze naming consistency in discovered functions",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  consistency_analyzer.py functions.json
  consistency_analyzer.py --style snake_case discovery.json
  consistency_analyzer.py -o human --style auto functions.json
        """,
    )
    parser.add_argument(
        "discovery_json",
        help="JSON output from function_discoverer",
    )
    parser.add_argument(
        "-o",
        "--output",
        choices=["json", "human"],
        default="json",
        help="Output format (default: json)",
    )
    parser.add_argument(
        "--style",
        choices=["snake_case", "camelCase", "auto"],
        default="auto",
        help="Expected naming style (default: auto-detect)",
    )

    args = parser.parse_args()

    discovery_path = Path(args.discovery_json)
    if not discovery_path.exists():
        emit_error(EXIT_FILE_NOT_FOUND, f"File not found: {discovery_path}")
        return EXIT_FILE_NOT_FOUND

    try:
        with open(discovery_path, encoding="utf-8") as f:
            discovery_data = json.load(f)
    except json.JSONDecodeError as e:
        emit_error(EXIT_ERROR, f"Invalid JSON: {e}")
        return EXIT_ERROR

    emit_info(f"Analyzing consistency of {discovery_path}...")

    report = analyze_consistency(discovery_data, args.style)

    output_format = OutputFormat(args.output)
    output(report.to_dict(), output_format)

    summary = report.to_dict()["summary"]
    emit_info(
        f"Analyzed {summary['total_functions']} functions: "
        f"{summary['total_issues']} issues, "
        f"score: {summary['consistency_score']}"
    )

    return EXIT_SUCCESS


if __name__ == "__main__":
    sys.exit(main())
