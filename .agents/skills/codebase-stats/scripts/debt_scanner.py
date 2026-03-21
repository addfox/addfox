#!/usr/bin/env python3
"""
Technical Debt Scanner - Scans codebase for debt indicators.

Detects TODO, FIXME, HACK, XXX comments and other debt patterns.

Usage:
    debt_scanner.py [-o json|human|table] [--include GLOB] [--exclude GLOB] TARGET_DIR

Examples:
    debt_scanner.py .
    debt_scanner.py --exclude "*.test.py" src/
    debt_scanner.py -o table --include "*.py" .
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
class DebtItem:
    """A single technical debt item."""

    file: str
    line: int
    type: str
    message: str
    severity: str

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "file": self.file,
            "line": self.line,
            "type": self.type,
            "message": self.message,
            "severity": self.severity,
        }


@dataclass
class DebtReport:
    """Report of technical debt findings."""

    target: str
    items: list[DebtItem] = field(default_factory=list)
    files_scanned: int = 0
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        by_type: dict[str, int] = {}
        by_severity: dict[str, int] = {}

        for item in self.items:
            by_type[item.type] = by_type.get(item.type, 0) + 1
            by_severity[item.severity] = by_severity.get(item.severity, 0) + 1

        return {
            "target": self.target,
            "summary": {
                "total_items": len(self.items),
                "files_scanned": self.files_scanned,
                "by_type": by_type,
                "by_severity": by_severity,
            },
            "items": [item.to_dict() for item in self.items],
            "errors": self.errors if self.errors else None,
        }


# Default debt patterns with severity levels
DEFAULT_PATTERNS = {
    "TODO": {
        "pattern": r"#\s*TODO\s*:?\s*(.*)$|//\s*TODO\s*:?\s*(.*)$|/\*\s*TODO\s*:?\s*(.*)\*/",
        "severity": "low",
    },
    "FIXME": {
        "pattern": r"#\s*FIXME\s*:?\s*(.*)$|//\s*FIXME\s*:?\s*(.*)$|/\*\s*FIXME\s*:?\s*(.*)\*/",
        "severity": "medium",
    },
    "HACK": {
        "pattern": r"#\s*HACK\s*:?\s*(.*)$|//\s*HACK\s*:?\s*(.*)$|/\*\s*HACK\s*:?\s*(.*)\*/",
        "severity": "high",
    },
    "XXX": {
        "pattern": r"#\s*XXX\s*:?\s*(.*)$|//\s*XXX\s*:?\s*(.*)$|/\*\s*XXX\s*:?\s*(.*)\*/",
        "severity": "high",
    },
    "BUG": {
        "pattern": r"#\s*BUG\s*:?\s*(.*)$|//\s*BUG\s*:?\s*(.*)$|/\*\s*BUG\s*:?\s*(.*)\*/",
        "severity": "high",
    },
    "DEPRECATED": {
        "pattern": r"#\s*DEPRECATED\s*:?\s*(.*)$|//\s*DEPRECATED\s*:?\s*(.*)$",
        "severity": "medium",
    },
}


def scan_file(path: Path, patterns: dict[str, dict]) -> list[DebtItem]:
    """
    Scan a single file for debt patterns.

    Args:
        path: Path to file
        patterns: Dictionary of pattern name -> {pattern, severity}

    Returns:
        List of DebtItem found in file
    """
    items = []

    try:
        content = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return items

    lines = content.splitlines()

    for line_num, line in enumerate(lines, start=1):
        for debt_type, config in patterns.items():
            match = re.search(config["pattern"], line, re.IGNORECASE)
            if match:
                # Get the message from first non-None group
                message = ""
                for group in match.groups():
                    if group:
                        message = group.strip()
                        break

                items.append(
                    DebtItem(
                        file=str(path),
                        line=line_num,
                        type=debt_type,
                        message=message or "(no message)",
                        severity=config["severity"],
                    )
                )

    return items


def scan_directory(
    path: Path, include: list[str], exclude: list[str], patterns: dict[str, dict]
) -> tuple[list[DebtItem], int]:
    """
    Scan directory for debt patterns.

    Args:
        path: Directory path
        include: Include glob patterns
        exclude: Exclude glob patterns
        patterns: Debt patterns to search for

    Returns:
        Tuple of (list of DebtItem, files scanned count)
    """
    items = []
    files_scanned = 0

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

    for file_path in glob_files(path, "*", recursive=True):
        # Check include/exclude patterns
        if not any(file_path.match(p) for p in include):
            continue
        if any(file_path.match(p) for p in exclude):
            continue

        file_items = scan_file(file_path, patterns)
        items.extend(file_items)
        files_scanned += 1

    return items, files_scanned


def generate_report(items: list[DebtItem], target: str, files_scanned: int) -> DebtReport:
    """
    Generate a debt report from items.

    Args:
        items: List of debt items
        target: Target directory that was scanned
        files_scanned: Number of files scanned

    Returns:
        DebtReport
    """
    return DebtReport(
        target=target,
        items=items,
        files_scanned=files_scanned,
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Scan codebase for technical debt indicators",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  debt_scanner.py .
  debt_scanner.py --exclude "*.test.py" src/
  debt_scanner.py -o table --include "*.py" .
        """,
    )
    parser.add_argument(
        "target",
        help="Directory to scan",
    )
    parser.add_argument(
        "-o",
        "--output",
        choices=["json", "human", "table"],
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

    emit_info(f"Scanning {target} for technical debt...")

    items, files_scanned = scan_directory(
        target,
        args.include,
        args.exclude,
        DEFAULT_PATTERNS,
    )

    report = generate_report(items, str(target), files_scanned)

    output_format = OutputFormat(args.output)
    output(report.to_dict(), output_format)

    emit_info(f"Found {len(items)} debt items in {files_scanned} files")

    return EXIT_SUCCESS


if __name__ == "__main__":
    sys.exit(main())
