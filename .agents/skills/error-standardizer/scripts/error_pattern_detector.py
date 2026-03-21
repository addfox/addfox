#!/usr/bin/env python3
"""
Error Pattern Detector - Scans for inconsistent error patterns in code.

Detects error handling anti-patterns and suggests standardized alternatives.

Usage:
    error_pattern_detector.py [-o json|human] [--exclude GLOB] TARGET_DIR

Examples:
    error_pattern_detector.py .
    error_pattern_detector.py --exclude "*test*" src/
    error_pattern_detector.py -o human .
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
class ErrorPattern:
    """Represents a detected error pattern."""

    pattern_type: str
    file: str
    line: int
    code: str
    classification: str
    recommendation: str

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "pattern_type": self.pattern_type,
            "file": self.file,
            "line": self.line,
            "code": self.code,
            "classification": self.classification,
            "recommendation": self.recommendation,
        }


@dataclass
class Recommendation:
    """A recommendation for improving error handling."""

    category: str
    count: int
    description: str
    suggestion: str

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "category": self.category,
            "count": self.count,
            "description": self.description,
            "suggestion": self.suggestion,
        }


@dataclass
class DetectionReport:
    """Report containing all detected error patterns."""

    target: str
    findings: list[ErrorPattern] = field(default_factory=list)
    by_pattern: dict[str, int] = field(default_factory=dict)
    recommendations: list[Recommendation] = field(default_factory=list)
    files_scanned: int = 0
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "target": self.target,
            "summary": {
                "files_scanned": self.files_scanned,
                "total_findings": len(self.findings),
                "by_classification": {
                    "nonstandard": sum(
                        1 for f in self.findings if f.classification == "nonstandard"
                    ),
                    "legacy": sum(1 for f in self.findings if f.classification == "legacy"),
                    "standard": sum(1 for f in self.findings if f.classification == "standard"),
                },
            },
            "findings": [f.to_dict() for f in self.findings],
            "by_pattern": self.by_pattern,
            "recommendations": [r.to_dict() for r in self.recommendations],
            "errors": self.errors if self.errors else None,
        }


# Error patterns to detect
ERROR_PATTERNS = {
    "print_error": {
        "regex": r'print\s*\(\s*["\'](?:Error|ERROR|error)[:\s]',
        "classification": "nonstandard",
        "recommendation": "Use emit_error() from layer1 instead of print() for error messages",
    },
    "sys_exit_bare": {
        "regex": r"sys\.exit\s*\(\s*[1-9]\s*\)",
        "classification": "legacy",
        "recommendation": "Use named exit codes from layer0 (EXIT_ERROR, EXIT_FILE_NOT_FOUND, etc.)",
    },
    "generic_exception": {
        "regex": r"raise\s+Exception\s*\(",
        "classification": "nonstandard",
        "recommendation": "Use custom exception classes or specific built-in exceptions",
    },
    "bare_except": {
        "regex": r"except\s*:",
        "classification": "nonstandard",
        "recommendation": "Catch specific exceptions instead of using bare except",
    },
    "except_pass": {
        "regex": r"except.*:\s*\n\s*pass",
        "classification": "nonstandard",
        "recommendation": "Handle exceptions properly; avoid silently swallowing errors",
    },
    "print_traceback": {
        "regex": r"traceback\.print_exc\s*\(",
        "classification": "legacy",
        "recommendation": "Use proper logging or emit_error() with exception details",
    },
    "inconsistent_error_format": {
        "regex": r'(?:print|raise|emit)\s*\(\s*["\'][^"\']*(?:failed|Failed|FAILED)[^"\']*["\']\s*\)',
        "classification": "nonstandard",
        "recommendation": "Standardize error message format: 'Error: <action> failed: <details>'",
    },
}

# Language-specific patterns
PYTHON_PATTERNS = {
    "assert_error": {
        "regex": r"assert\s+False\s*,",
        "classification": "nonstandard",
        "recommendation": "Raise explicit exceptions instead of using assert for error handling",
    },
    "exit_no_code": {
        "regex": r"(?:sys\.)?exit\s*\(\s*\)",
        "classification": "legacy",
        "recommendation": "Always use explicit exit codes for clarity",
    },
}


def detect_error_patterns(content: str, lang: str = "python") -> list[ErrorPattern]:
    """
    Detect error patterns in file content.

    Args:
        content: File content to scan
        lang: Programming language

    Returns:
        List of detected error patterns (without file/line info)
    """
    patterns_to_check = dict(ERROR_PATTERNS)
    if lang == "python":
        patterns_to_check.update(PYTHON_PATTERNS)

    findings: list[ErrorPattern] = []
    lines = content.splitlines()

    for line_num, line in enumerate(lines, 1):
        for pattern_name, pattern_config in patterns_to_check.items():
            if re.search(pattern_config["regex"], line):
                findings.append(
                    ErrorPattern(
                        pattern_type=pattern_name,
                        file="",
                        line=line_num,
                        code=line.strip(),
                        classification=pattern_config["classification"],
                        recommendation=pattern_config["recommendation"],
                    )
                )

    return findings


def classify_pattern(pattern: str) -> str:
    """
    Classify an error pattern.

    Args:
        pattern: Pattern type name

    Returns:
        Classification: 'standard', 'nonstandard', or 'legacy'
    """
    all_patterns = {**ERROR_PATTERNS, **PYTHON_PATTERNS}
    if pattern in all_patterns:
        return all_patterns[pattern]["classification"]
    return "standard"


def scan_file(path: Path) -> list[ErrorPattern]:
    """
    Scan a single file for error patterns.

    Args:
        path: Path to file

    Returns:
        List of detected error patterns
    """
    try:
        content = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return []

    # Determine language from extension
    ext = path.suffix.lower()
    lang_map = {
        ".py": "python",
        ".js": "javascript",
        ".ts": "typescript",
        ".go": "go",
        ".rb": "ruby",
    }
    lang = lang_map.get(ext, "python")

    findings = detect_error_patterns(content, lang)

    # Add file path to findings
    for finding in findings:
        finding.file = str(path)

    return findings


def scan_directory(target: Path, exclude: list[str]) -> DetectionReport:
    """
    Scan directory for error patterns.

    Args:
        target: Target directory
        exclude: Patterns to exclude

    Returns:
        DetectionReport with all findings
    """
    report = DetectionReport(target=str(target))

    # Default code file patterns
    include = ["*.py", "*.js", "*.ts", "*.go", "*.rb"]

    for file_path in glob_files(target, "*", recursive=True):
        # Check include patterns
        if not any(file_path.match(p) for p in include):
            continue
        # Check exclude patterns
        if any(file_path.match(p) for p in exclude):
            continue

        try:
            findings = scan_file(file_path)
            report.findings.extend(findings)
            report.files_scanned += 1

            # Update pattern counts
            for finding in findings:
                report.by_pattern[finding.pattern_type] = (
                    report.by_pattern.get(finding.pattern_type, 0) + 1
                )
        except Exception as e:
            report.errors.append(f"{file_path}: {e}")

    # Generate recommendations
    report.recommendations = generate_recommendations(report.findings)

    return report


def generate_recommendations(findings: list[ErrorPattern]) -> list[Recommendation]:
    """
    Generate recommendations based on findings.

    Args:
        findings: List of error patterns found

    Returns:
        List of recommendations
    """
    recommendations: list[Recommendation] = []

    # Group by pattern type
    by_type: dict[str, list[ErrorPattern]] = {}
    for finding in findings:
        if finding.pattern_type not in by_type:
            by_type[finding.pattern_type] = []
        by_type[finding.pattern_type].append(finding)

    # Generate recommendations for each pattern type
    for pattern_type, pattern_findings in by_type.items():
        if pattern_findings:
            recommendations.append(
                Recommendation(
                    category=pattern_type,
                    count=len(pattern_findings),
                    description=f"Found {len(pattern_findings)} instance(s) of {pattern_type.replace('_', ' ')}",
                    suggestion=pattern_findings[0].recommendation,
                )
            )

    # Sort by count descending
    recommendations.sort(key=lambda r: r.count, reverse=True)

    return recommendations


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Detect inconsistent error patterns in code",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  error_pattern_detector.py .
  error_pattern_detector.py --exclude "*test*" src/
  error_pattern_detector.py -o human .
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

    emit_info(f"Scanning {target} for error patterns...")

    report = scan_directory(target, args.exclude)

    output_format = OutputFormat(args.output)
    output(report.to_dict(), output_format)

    emit_info(
        f"Scanned {report.files_scanned} files, "
        f"found {len(report.findings)} issues in {len(report.by_pattern)} pattern categories"
    )

    return EXIT_SUCCESS


if __name__ == "__main__":
    sys.exit(main())
