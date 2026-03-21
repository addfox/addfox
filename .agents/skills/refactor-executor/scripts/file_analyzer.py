#!/usr/bin/env python3
"""
File Analyzer - Calculates file metrics for refactoring decisions.

Analyzes Python files to identify candidates for splitting based on size,
complexity, and cohesion metrics.

Usage:
    file_analyzer.py [-o json|human] [--threshold-lines N] [--threshold-complexity N] TARGET

Examples:
    file_analyzer.py src/large_module.py
    file_analyzer.py --threshold-lines 300 src/
    file_analyzer.py -o human --threshold-complexity 10 lib/
"""

import argparse
import ast
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# Add shared library to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "_shared" / "python"))

from layer0 import EXIT_ERROR, EXIT_FILE_NOT_FOUND, EXIT_SUCCESS
from layer1 import OutputFormat, emit_error, emit_info, glob_files, output


def validate_safe_path(path: Path, context: str = "") -> Path:
    """Validate that a path is safe (no traversal attacks).

    Args:
        path: Path to validate
        context: Optional context for error messages

    Returns:
        Resolved absolute path

    Raises:
        ValueError: If path appears to be a traversal attack
    """
    resolved = path.resolve()
    # Check for null bytes
    if "\x00" in str(path):
        raise ValueError(f"Path contains null bytes{': ' + context if context else ''}")
    return resolved


@dataclass
class FunctionMetrics:
    """Metrics for a single function."""

    name: str
    line_start: int
    line_end: int
    lines: int
    complexity: int
    parameters: int
    has_docstring: bool

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "name": self.name,
            "line_start": self.line_start,
            "line_end": self.line_end,
            "lines": self.lines,
            "complexity": self.complexity,
            "parameters": self.parameters,
            "has_docstring": self.has_docstring,
        }


@dataclass
class ClassMetrics:
    """Metrics for a single class."""

    name: str
    line_start: int
    line_end: int
    lines: int
    methods: int
    attributes: int
    complexity: int

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "name": self.name,
            "line_start": self.line_start,
            "line_end": self.line_end,
            "lines": self.lines,
            "methods": self.methods,
            "attributes": self.attributes,
            "complexity": self.complexity,
        }


@dataclass
class FileMetrics:
    """Metrics for a single file."""

    path: str
    lines_total: int
    lines_code: int
    lines_blank: int
    lines_comment: int
    functions: list[FunctionMetrics] = field(default_factory=list)
    classes: list[ClassMetrics] = field(default_factory=list)
    imports: int = 0
    complexity: int = 0
    cohesion_score: float = 1.0

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "path": self.path,
            "lines": {
                "total": self.lines_total,
                "code": self.lines_code,
                "blank": self.lines_blank,
                "comment": self.lines_comment,
            },
            "functions": [f.to_dict() for f in self.functions],
            "classes": [c.to_dict() for c in self.classes],
            "imports": self.imports,
            "complexity": self.complexity,
            "cohesion_score": round(self.cohesion_score, 2),
        }


@dataclass
class SplitCandidate:
    """A file identified as candidate for splitting."""

    path: str
    reason: str
    metrics: dict[str, Any]
    priority: str

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "path": self.path,
            "reason": self.reason,
            "metrics": self.metrics,
            "priority": self.priority,
        }


@dataclass
class AnalysisReport:
    """Report containing file analysis results."""

    target: str
    files: list[FileMetrics] = field(default_factory=list)
    candidates_for_split: list[SplitCandidate] = field(default_factory=list)
    thresholds: dict[str, int] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "target": self.target,
            "summary": {
                "files_analyzed": len(self.files),
                "total_lines": sum(f.lines_total for f in self.files),
                "total_functions": sum(len(f.functions) for f in self.files),
                "total_classes": sum(len(f.classes) for f in self.files),
                "split_candidates": len(self.candidates_for_split),
            },
            "thresholds": self.thresholds,
            "files": [f.to_dict() for f in self.files],
            "candidates_for_split": [c.to_dict() for c in self.candidates_for_split],
            "errors": self.errors if self.errors else None,
        }


def calculate_complexity(node: ast.AST) -> int:
    """
    Calculate cyclomatic complexity of AST node.

    Counts decision points: if, for, while, except, with, assert,
    and boolean operators.

    Args:
        node: AST node to analyze

    Returns:
        Complexity score (1 = baseline)
    """
    complexity = 1

    for child in ast.walk(node):
        if isinstance(
            child,
            (
                ast.If,
                ast.IfExp,
                ast.For,
                ast.AsyncFor,
                ast.While,
                ast.ExceptHandler,
                ast.With,
                ast.AsyncWith,
                ast.Assert,
            ),
        ):
            complexity += 1
        elif isinstance(child, ast.BoolOp):
            complexity += len(child.values) - 1
        elif isinstance(child, ast.comprehension):
            complexity += 1
            if child.ifs:
                complexity += len(child.ifs)

    return complexity


def calculate_function_metrics(path: Path) -> list[FunctionMetrics]:
    """
    Calculate metrics for all functions in a file.

    Args:
        path: Path to Python file

    Returns:
        List of FunctionMetrics
    """
    try:
        content = path.read_text(encoding="utf-8", errors="ignore")
        tree = ast.parse(content, filename=str(path))
    except Exception:
        return []

    content.splitlines()
    metrics: list[FunctionMetrics] = []

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            line_start = node.lineno
            line_end = node.end_lineno or line_start

            metrics.append(
                FunctionMetrics(
                    name=node.name,
                    line_start=line_start,
                    line_end=line_end,
                    lines=line_end - line_start + 1,
                    complexity=calculate_complexity(node),
                    parameters=len(node.args.args) + len(node.args.kwonlyargs),
                    has_docstring=ast.get_docstring(node) is not None,
                )
            )

    return metrics


def calculate_class_metrics(path: Path) -> list[ClassMetrics]:
    """
    Calculate metrics for all classes in a file.

    Args:
        path: Path to Python file

    Returns:
        List of ClassMetrics
    """
    try:
        content = path.read_text(encoding="utf-8", errors="ignore")
        tree = ast.parse(content, filename=str(path))
    except Exception:
        return []

    metrics: list[ClassMetrics] = []

    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            line_start = node.lineno
            line_end = node.end_lineno or line_start

            # Count methods and attributes
            methods = 0
            attributes = 0
            for item in node.body:
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    methods += 1
                elif isinstance(item, ast.Assign):
                    attributes += len(item.targets)
                elif isinstance(item, ast.AnnAssign):
                    attributes += 1

            metrics.append(
                ClassMetrics(
                    name=node.name,
                    line_start=line_start,
                    line_end=line_end,
                    lines=line_end - line_start + 1,
                    methods=methods,
                    attributes=attributes,
                    complexity=calculate_complexity(node),
                )
            )

    return metrics


def count_imports(path: Path) -> int:
    """
    Count import statements in file.

    Args:
        path: Path to Python file

    Returns:
        Number of import statements
    """
    try:
        content = path.read_text(encoding="utf-8", errors="ignore")
        tree = ast.parse(content, filename=str(path))
    except Exception:
        return 0

    count = 0
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            count += len(node.names)

    return count


def calculate_cohesion(functions: list[FunctionMetrics], content: str) -> float:
    """
    Calculate a simple cohesion score for the file.

    Higher score = more cohesive (functions use similar names/patterns).
    Score is between 0 and 1.

    Args:
        functions: List of function metrics
        content: File content

    Returns:
        Cohesion score (0-1)
    """
    if len(functions) <= 1:
        return 1.0

    # Simple heuristic: check if functions share common prefixes
    names = [f.name for f in functions]
    prefixes: set[str] = set()

    for name in names:
        # Get prefix (first part before underscore or camelCase boundary)
        if "_" in name:
            prefixes.add(name.split("_")[0])
        else:
            # camelCase: get lowercase prefix
            prefix = ""
            for c in name:
                if c.isupper() and prefix:
                    break
                prefix += c.lower()
            if prefix:
                prefixes.add(prefix)

    # More shared prefixes = higher cohesion
    if not prefixes:
        return 0.5

    # Calculate cohesion based on prefix diversity
    unique_prefixes = len(prefixes)
    cohesion = 1.0 - (unique_prefixes - 1) / len(names)
    return max(0.0, min(1.0, cohesion))


def calculate_file_metrics(path: Path) -> FileMetrics:
    """
    Calculate all metrics for a file.

    Args:
        path: Path to Python file

    Returns:
        FileMetrics
    """
    try:
        content = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return FileMetrics(
            path=str(path), lines_total=0, lines_code=0, lines_blank=0, lines_comment=0
        )

    lines = content.splitlines()
    total = len(lines)
    blank = sum(1 for line in lines if not line.strip())
    comment = sum(1 for line in lines if line.strip().startswith("#"))
    code = total - blank - comment

    functions = calculate_function_metrics(path)
    classes = calculate_class_metrics(path)

    # Total complexity
    complexity = sum(f.complexity for f in functions) + sum(c.complexity for c in classes)

    return FileMetrics(
        path=str(path),
        lines_total=total,
        lines_code=code,
        lines_blank=blank,
        lines_comment=comment,
        functions=functions,
        classes=classes,
        imports=count_imports(path),
        complexity=complexity,
        cohesion_score=calculate_cohesion(functions, content),
    )


def identify_split_candidates(
    metrics: FileMetrics, threshold_lines: int, threshold_complexity: int
) -> SplitCandidate | None:
    """
    Identify if file is a candidate for splitting.

    Args:
        metrics: File metrics
        threshold_lines: Lines threshold
        threshold_complexity: Complexity threshold

    Returns:
        SplitCandidate if file should be split, None otherwise
    """
    reasons: list[str] = []
    priority = "low"

    # Check lines threshold
    if metrics.lines_total > threshold_lines:
        reasons.append(f"File has {metrics.lines_total} lines (threshold: {threshold_lines})")
        priority = "medium"

    if metrics.lines_total > threshold_lines * 2:
        priority = "high"

    # Check complexity threshold
    if metrics.complexity > threshold_complexity:
        reasons.append(
            f"File complexity is {metrics.complexity} (threshold: {threshold_complexity})"
        )
        if priority != "high":
            priority = "medium"

    # Check cohesion
    if metrics.cohesion_score < 0.3:
        reasons.append(f"Low cohesion score: {metrics.cohesion_score:.2f}")
        if priority == "low":
            priority = "medium"

    # Check number of functions
    if len(metrics.functions) > 15:
        reasons.append(f"Too many functions: {len(metrics.functions)}")

    # Check number of classes
    if len(metrics.classes) > 5:
        reasons.append(f"Too many classes: {len(metrics.classes)}")

    if not reasons:
        return None

    return SplitCandidate(
        path=metrics.path,
        reason="; ".join(reasons),
        metrics={
            "lines": metrics.lines_total,
            "complexity": metrics.complexity,
            "functions": len(metrics.functions),
            "classes": len(metrics.classes),
            "cohesion": metrics.cohesion_score,
        },
        priority=priority,
    )


def analyze_file(
    path: Path, threshold_lines: int, threshold_complexity: int
) -> tuple[FileMetrics, SplitCandidate | None]:
    """
    Analyze a single file.

    Args:
        path: Path to file
        threshold_lines: Lines threshold
        threshold_complexity: Complexity threshold

    Returns:
        Tuple of (FileMetrics, Optional[SplitCandidate])
    """
    metrics = calculate_file_metrics(path)
    candidate = identify_split_candidates(metrics, threshold_lines, threshold_complexity)
    return metrics, candidate


def analyze_directory(
    target: Path, threshold_lines: int, threshold_complexity: int
) -> AnalysisReport:
    """
    Analyze all Python files in directory.

    Args:
        target: Target directory
        threshold_lines: Lines threshold
        threshold_complexity: Complexity threshold

    Returns:
        AnalysisReport
    """
    report = AnalysisReport(
        target=str(target),
        thresholds={"lines": threshold_lines, "complexity": threshold_complexity},
    )

    for file_path in glob_files(target, "*.py", recursive=True):
        try:
            metrics, candidate = analyze_file(file_path, threshold_lines, threshold_complexity)
            report.files.append(metrics)
            if candidate:
                report.candidates_for_split.append(candidate)
        except Exception as e:
            report.errors.append(f"{file_path}: {e}")

    # Sort candidates by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    report.candidates_for_split.sort(key=lambda c: priority_order.get(c.priority, 3))

    return report


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Analyze Python files for refactoring decisions",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  file_analyzer.py src/large_module.py
  file_analyzer.py --threshold-lines 300 src/
  file_analyzer.py -o human --threshold-complexity 10 lib/
        """,
    )
    parser.add_argument(
        "target",
        help="File or directory to analyze",
    )
    parser.add_argument(
        "-o",
        "--output",
        choices=["json", "human"],
        default="json",
        help="Output format (default: json)",
    )
    parser.add_argument(
        "--threshold-lines",
        type=int,
        default=500,
        help="Lines threshold for split recommendation (default: 500)",
    )
    parser.add_argument(
        "--threshold-complexity",
        type=int,
        default=50,
        help="Complexity threshold for split recommendation (default: 50)",
    )

    args = parser.parse_args()

    target = Path(args.target)
    try:
        target = validate_safe_path(target, context="target argument")
    except ValueError as e:
        emit_error(EXIT_ERROR, str(e))
        return EXIT_ERROR
    if not target.exists():
        emit_error(EXIT_FILE_NOT_FOUND, f"Target not found: {target}")
        return EXIT_FILE_NOT_FOUND

    emit_info(f"Analyzing {target}...")

    if target.is_file():
        metrics, candidate = analyze_file(target, args.threshold_lines, args.threshold_complexity)
        report = AnalysisReport(
            target=str(target),
            files=[metrics],
            candidates_for_split=[candidate] if candidate else [],
            thresholds={
                "lines": args.threshold_lines,
                "complexity": args.threshold_complexity,
            },
        )
    else:
        report = analyze_directory(target, args.threshold_lines, args.threshold_complexity)

    output_format = OutputFormat(args.output)
    output(report.to_dict(), output_format)

    summary = report.to_dict()["summary"]
    emit_info(
        f"Analyzed {summary['files_analyzed']} files: "
        f"{summary['total_lines']} lines, "
        f"{summary['split_candidates']} candidates for splitting"
    )

    return EXIT_SUCCESS


if __name__ == "__main__":
    sys.exit(main())
