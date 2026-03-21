#!/usr/bin/env python3
"""
Metric Collector - Collects codebase metrics.

Counts lines of code, files, functions, and calculates complexity metrics.

Usage:
    metric_collector.py [-o json|human] [--include GLOB] [--exclude GLOB] TARGET_DIR

Examples:
    metric_collector.py .
    metric_collector.py --include "*.py" src/
    metric_collector.py -o human --exclude "*test*" .
"""

import argparse
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# Add shared library to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "_shared" / "python"))

from layer0 import EXIT_ERROR, EXIT_FILE_NOT_FOUND, EXIT_SUCCESS
from layer1 import OutputFormat, emit_error, emit_info, glob_files, output


@dataclass
class FileMetrics:
    """Metrics for a single file."""

    path: str
    lines_total: int = 0
    lines_blank: int = 0
    lines_comment: int = 0
    lines_code: int = 0
    functions: int = 0
    classes: int = 0
    extension: str = ""

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "path": self.path,
            "lines": {
                "total": self.lines_total,
                "blank": self.lines_blank,
                "comment": self.lines_comment,
                "code": self.lines_code,
            },
            "functions": self.functions,
            "classes": self.classes,
            "extension": self.extension,
        }


@dataclass
class CodebaseMetrics:
    """Aggregated codebase metrics."""

    target: str
    files: list[FileMetrics] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        # Aggregate totals
        totals = {
            "files": len(self.files),
            "lines_total": sum(f.lines_total for f in self.files),
            "lines_blank": sum(f.lines_blank for f in self.files),
            "lines_comment": sum(f.lines_comment for f in self.files),
            "lines_code": sum(f.lines_code for f in self.files),
            "functions": sum(f.functions for f in self.files),
            "classes": sum(f.classes for f in self.files),
        }

        # Aggregate by extension
        by_extension: dict[str, dict] = {}
        for f in self.files:
            ext = f.extension or "(no extension)"
            if ext not in by_extension:
                by_extension[ext] = {"files": 0, "lines_code": 0, "functions": 0, "classes": 0}
            by_extension[ext]["files"] += 1
            by_extension[ext]["lines_code"] += f.lines_code
            by_extension[ext]["functions"] += f.functions
            by_extension[ext]["classes"] += f.classes

        # Aggregate by directory
        by_directory: dict[str, dict] = {}
        for f in self.files:
            dir_path = str(Path(f.path).parent)
            if dir_path not in by_directory:
                by_directory[dir_path] = {"files": 0, "lines_code": 0, "functions": 0}
            by_directory[dir_path]["files"] += 1
            by_directory[dir_path]["lines_code"] += f.lines_code
            by_directory[dir_path]["functions"] += f.functions

        return {
            "target": self.target,
            "totals": totals,
            "by_extension": by_extension,
            "directories": by_directory,
            "files": [f.to_dict() for f in self.files],
            "errors": self.errors if self.errors else None,
        }


# Comment patterns by extension
COMMENT_PATTERNS = {
    ".py": {
        "line": r"^\s*#",
        "block_start": r'^\s*"""',
        "block_end": r'"""',
    },
    ".js": {
        "line": r"^\s*//",
        "block_start": r"^\s*/\*",
        "block_end": r"\*/",
    },
    ".ts": {
        "line": r"^\s*//",
        "block_start": r"^\s*/\*",
        "block_end": r"\*/",
    },
    ".java": {
        "line": r"^\s*//",
        "block_start": r"^\s*/\*",
        "block_end": r"\*/",
    },
    ".go": {
        "line": r"^\s*//",
        "block_start": r"^\s*/\*",
        "block_end": r"\*/",
    },
    ".rb": {
        "line": r"^\s*#",
        "block_start": r"^\s*=begin",
        "block_end": r"=end",
    },
    ".sh": {
        "line": r"^\s*#",
        "block_start": None,
        "block_end": None,
    },
}

# Definition patterns by extension
DEFINITION_PATTERNS = {
    ".py": {
        "function": r"^\s*def\s+\w+",
        "class": r"^\s*class\s+\w+",
    },
    ".js": {
        "function": r"^\s*(?:async\s+)?function\s+\w+|^\s*(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?\(",
        "class": r"^\s*class\s+\w+",
    },
    ".ts": {
        "function": r"^\s*(?:async\s+)?function\s+\w+|^\s*(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?\(",
        "class": r"^\s*class\s+\w+",
    },
    ".java": {
        "function": r"^\s*(?:public|private|protected)?\s*(?:static)?\s*\w+\s+\w+\s*\(",
        "class": r"^\s*(?:public|private)?\s*class\s+\w+",
    },
    ".go": {
        "function": r"^\s*func\s+",
        "class": r"^\s*type\s+\w+\s+struct",
    },
    ".rb": {
        "function": r"^\s*def\s+\w+",
        "class": r"^\s*class\s+\w+",
    },
    ".sh": {
        "function": r"^\s*\w+\s*\(\s*\)|^\s*function\s+\w+",
        "class": None,
    },
}


def count_lines(path: Path) -> tuple[int, int, int]:
    """
    Count lines in a file.

    Args:
        path: Path to file

    Returns:
        Tuple of (total, blank, comment)
    """
    try:
        content = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return (0, 0, 0)

    lines = content.splitlines()
    total = len(lines)
    blank = sum(1 for line in lines if not line.strip())

    # Count comments based on extension
    ext = path.suffix.lower()
    comment_config = COMMENT_PATTERNS.get(ext, {})

    comment = 0
    in_block = False

    for line in lines:
        if in_block:
            comment += 1
            if comment_config.get("block_end") and re.search(comment_config["block_end"], line):
                in_block = False
        elif comment_config.get("block_start") and re.search(comment_config["block_start"], line):
            comment += 1
            if comment_config.get("block_end") and not re.search(comment_config["block_end"], line):
                in_block = True
        elif comment_config.get("line") and re.match(comment_config["line"], line):
            comment += 1

    return (total, blank, comment)


def count_definitions(content: str, ext: str) -> tuple[int, int]:
    """
    Count function and class definitions.

    Args:
        content: File content
        ext: File extension

    Returns:
        Tuple of (functions, classes)
    """
    patterns = DEFINITION_PATTERNS.get(ext, {})
    lines = content.splitlines()

    functions = 0
    classes = 0

    for line in lines:
        if patterns.get("function") and re.match(patterns["function"], line):
            functions += 1
        if patterns.get("class") and re.match(patterns["class"], line):
            classes += 1

    return (functions, classes)


def collect_file_metrics(path: Path) -> FileMetrics:
    """
    Collect metrics for a single file.

    Args:
        path: Path to file

    Returns:
        FileMetrics for the file
    """
    total, blank, comment = count_lines(path)
    code = total - blank - comment

    try:
        content = path.read_text(encoding="utf-8", errors="ignore")
        functions, classes = count_definitions(content, path.suffix.lower())
    except Exception:
        functions, classes = 0, 0

    return FileMetrics(
        path=str(path),
        lines_total=total,
        lines_blank=blank,
        lines_comment=comment,
        lines_code=code,
        functions=functions,
        classes=classes,
        extension=path.suffix.lower(),
    )


def collect_codebase_metrics(
    target: Path, include: list[str], exclude: list[str]
) -> CodebaseMetrics:
    """
    Collect metrics for entire codebase.

    Args:
        target: Target directory
        include: Include patterns
        exclude: Exclude patterns

    Returns:
        CodebaseMetrics
    """
    metrics = CodebaseMetrics(target=str(target))

    # Default includes for code files
    if not include:
        include = [
            "*.py",
            "*.js",
            "*.ts",
            "*.jsx",
            "*.tsx",
            "*.java",
            "*.go",
            "*.rb",
            "*.rs",
            "*.c",
            "*.cpp",
            "*.h",
            "*.hpp",
            "*.sh",
        ]

    for file_path in glob_files(target, "*", recursive=True):
        # Check include/exclude patterns
        if not any(file_path.match(p) for p in include):
            continue
        if any(file_path.match(p) for p in exclude):
            continue

        try:
            file_metrics = collect_file_metrics(file_path)
            metrics.files.append(file_metrics)
        except Exception as e:
            metrics.errors.append(f"{file_path}: {e}")

    return metrics


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Collect codebase metrics (LOC, functions, classes)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  metric_collector.py .
  metric_collector.py --include "*.py" src/
  metric_collector.py -o human --exclude "*test*" .
        """,
    )
    parser.add_argument(
        "target",
        help="Directory to scan",
    )
    parser.add_argument(
        "-o",
        "--output",
        choices=["json", "human"],
        default="json",
        help="Output format (default: json)",
    )
    parser.add_argument(
        "--include",
        action="append",
        default=[],
        help="Include file patterns (can be repeated)",
    )
    parser.add_argument(
        "--exclude",
        action="append",
        default=[],
        help="Exclude file patterns (can be repeated)",
    )

    args = parser.parse_args()

    target = Path(args.target)
    if not target.exists():
        emit_error(EXIT_FILE_NOT_FOUND, f"Target not found: {target}")
        return EXIT_FILE_NOT_FOUND

    if not target.is_dir():
        emit_error(EXIT_ERROR, f"Target is not a directory: {target}")
        return EXIT_ERROR

    emit_info(f"Collecting metrics for {target}...")

    metrics = collect_codebase_metrics(target, args.include, args.exclude)

    output_format = OutputFormat(args.output)
    output(metrics.to_dict(), output_format)

    totals = metrics.to_dict()["totals"]
    emit_info(
        f"Scanned {totals['files']} files: "
        f"{totals['lines_code']} lines of code, "
        f"{totals['functions']} functions, "
        f"{totals['classes']} classes"
    )

    return EXIT_SUCCESS


if __name__ == "__main__":
    sys.exit(main())
