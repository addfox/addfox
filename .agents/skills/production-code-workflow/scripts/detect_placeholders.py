#!/usr/bin/env python3
"""
Multi-Language Placeholder and Non-Production Code Detector

Scans source files for patterns indicating incomplete or non-production code.
Supports: Java, Scala, Kotlin, C#, Python, TypeScript, JavaScript, Go, Rust

Usage:
    python detect_placeholders.py <path> [-o json|human|table] [--severity-threshold minor]

Examples:
    detect_placeholders.py .
    detect_placeholders.py --severity-threshold critical src/
    detect_placeholders.py -o table .
"""

import argparse
import sys
from pathlib import Path

# Add shared library to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "_shared" / "python"))

from layer0 import EXIT_ERROR, EXIT_FILE_NOT_FOUND, EXIT_SUCCESS
from layer1 import OutputFormat, emit_error, emit_info, output

from placeholder_scanner import ScanReport, scan_path

# Re-export public API for backward compatibility
from placeholder_parser import Issue, Pattern, Severity, PATTERNS
from placeholder_scanner import PlaceholderDetector

__all__ = [
    "Severity",
    "Issue",
    "Pattern",
    "PATTERNS",
    "PlaceholderDetector",
    "ScanReport",
    "scan_path",
]


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Detect placeholder and non-production code patterns",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  detect_placeholders.py .
  detect_placeholders.py --severity-threshold critical src/
  detect_placeholders.py -o table .
        """,
    )
    parser.add_argument("path", help="File or directory to scan")
    parser.add_argument(
        "-o",
        "--output",
        choices=["json", "human", "table"],
        default="json",
        help="Output format (default: json)",
    )
    parser.add_argument(
        "-s",
        "--severity-threshold",
        choices=["blocker", "critical", "major", "minor"],
        default="minor",
        help="Minimum severity to report (default: minor)",
    )
    args = parser.parse_args()

    path = Path(args.path)
    if not path.exists():
        emit_error(EXIT_FILE_NOT_FOUND, f"Path not found: {path}")
        return EXIT_FILE_NOT_FOUND

    emit_info(f"Scanning {path} for placeholder patterns...")

    report = scan_path(str(path), args.severity_threshold)

    output_format = OutputFormat(args.output)
    output(report.to_dict(), output_format)

    emit_info(
        f"Found {report.total_issues} issues in {report.total_files_scanned} files (verdict: {report.verdict})"
    )

    return EXIT_ERROR if report.verdict in ["BLOCKED", "NEEDS_FIXES"] else EXIT_SUCCESS


if __name__ == "__main__":
    sys.exit(main())
