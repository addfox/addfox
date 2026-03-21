#!/usr/bin/env python3
"""
Placeholder Scanner Module

Provides the PlaceholderDetector class, ScanReport dataclass, and scan_path function
for scanning source files for placeholder and non-production code patterns.

Depends on placeholder_parser for the data types (Severity, Issue, Pattern, PATTERNS).

Usage:
    from placeholder_scanner import PlaceholderDetector, ScanReport, scan_path

    report = scan_path("/path/to/project", severity_threshold="minor")
    print(report.verdict)  # APPROVED | NEEDS_FIXES | BLOCKED
"""

import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# Add shared library to path for emit_warning
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "_shared" / "python"))

from layer1 import emit_warning

from placeholder_parser import PATTERNS, Issue, Pattern, Severity


class PlaceholderDetector:
    """Scans source files for placeholder and non-production code patterns."""

    LANGUAGE_EXTENSIONS: dict[str, str] = {
        ".java": "java",
        ".scala": "scala",
        ".sc": "scala",
        ".kt": "kotlin",
        ".kts": "kotlin",
        ".cs": "csharp",
        ".py": "python",
        ".ts": "typescript",
        ".tsx": "typescript",
        ".js": "javascript",
        ".jsx": "javascript",
        ".go": "go",
        ".rs": "rust",
    }

    def __init__(self, patterns: list[Pattern] | None = None) -> None:
        if patterns is None:
            patterns = PATTERNS
        self.patterns = patterns
        self.compiled_patterns: list[tuple[Pattern, re.Pattern[str]]] = [
            (p, re.compile(p.regex, re.IGNORECASE if "(?i)" in p.regex else 0))
            for p in patterns
        ]

    def detect_language(self, file_path: Path) -> str:
        """Return the language name for the given file path based on extension."""
        return self.LANGUAGE_EXTENSIONS.get(file_path.suffix.lower(), "unknown")

    def scan_file(self, file_path: Path) -> list[Issue]:
        """Scan a single file and return all detected issues."""
        issues: list[Issue] = []
        extension = file_path.suffix.lower()
        language = self.detect_language(file_path)

        try:
            with open(file_path, encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
        except OSError as e:
            emit_warning(f"Could not read {file_path}: {e}")
            return issues

        for line_num, line in enumerate(lines, start=1):
            for pattern, compiled in self.compiled_patterns:
                if pattern.file_extensions and extension not in pattern.file_extensions:
                    continue
                if compiled.search(line):
                    issues.append(
                        Issue(
                            str(file_path),
                            line_num,
                            line,
                            pattern.name,
                            pattern.severity,
                            pattern.message,
                            pattern.language if pattern.language != "all" else language,
                        )
                    )
        return issues

    def scan_directory(
        self,
        directory: Path,
        extensions: set[str] | None = None,
        exclude_dirs: set[str] | None = None,
    ) -> list[Issue]:
        """Recursively scan a directory and return all detected issues."""
        if extensions is None:
            extensions = set(self.LANGUAGE_EXTENSIONS.keys())
        if exclude_dirs is None:
            exclude_dirs = {
                "bin",
                "obj",
                "build",
                "dist",
                "target",
                "out",
                "node_modules",
                "vendor",
                ".venv",
                "venv",
                "__pycache__",
                ".gradle",
                ".git",
                ".vs",
                ".idea",
                "coverage",
            }

        all_issues: list[Issue] = []
        for root, dirs, files in Path(directory).walk():
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for file in files:
                file_path = root / file
                if file_path.suffix.lower() in extensions:
                    all_issues.extend(self.scan_file(file_path))
        return all_issues


@dataclass
class ScanReport:
    """Summary report of a placeholder scan across one or more files."""

    path: str
    total_files_scanned: int = 0
    total_issues: int = 0
    issues_by_severity: dict[str, int] = field(default_factory=dict)
    issues_by_language: dict[str, int] = field(default_factory=dict)
    issues: list[Issue] = field(default_factory=list)
    verdict: str = "UNKNOWN"

    def calculate_verdict(self) -> str:
        """Determine the overall verdict based on issue severity counts."""
        blockers = self.issues_by_severity.get("BLOCKER", 0)
        critical = self.issues_by_severity.get("CRITICAL", 0)
        major = self.issues_by_severity.get("MAJOR", 0)
        if blockers > 0:
            self.verdict = "BLOCKED"
        elif critical > 0 or major > 3:
            self.verdict = "NEEDS_FIXES"
        else:
            self.verdict = "APPROVED"
        return self.verdict

    def to_dict(self) -> dict[str, Any]:
        """Serialize the report to a JSON-compatible dictionary."""
        return {
            "path": self.path,
            "total_files_scanned": self.total_files_scanned,
            "total_issues": self.total_issues,
            "issues_by_severity": self.issues_by_severity,
            "issues_by_language": self.issues_by_language,
            "verdict": self.verdict,
            "items": [i.to_dict() for i in self.issues],
        }


def scan_path(path: str, severity_threshold: str = "minor") -> ScanReport:
    """
    Scan a file or directory for placeholder patterns.

    Args:
        path: File or directory path to scan.
        severity_threshold: Minimum severity to include ('minor', 'major', 'critical', 'blocker').

    Returns:
        ScanReport with all detected issues above the threshold.
    """
    detector = PlaceholderDetector()
    path_obj = Path(path)
    report = ScanReport(path=path)

    if path_obj.is_file():
        issues = detector.scan_file(path_obj)
        report.total_files_scanned = 1
    elif path_obj.is_dir():
        issues = detector.scan_directory(path_obj)
        report.total_files_scanned = len({i.file_path for i in issues}) if issues else 0
    else:
        return report

    threshold_value = Severity[severity_threshold.upper()].value
    issues = [i for i in issues if i.severity.value >= threshold_value]

    report.issues = issues
    report.total_issues = len(issues)
    for issue in issues:
        sev = str(issue.severity)
        report.issues_by_severity[sev] = report.issues_by_severity.get(sev, 0) + 1
        report.issues_by_language[issue.language] = (
            report.issues_by_language.get(issue.language, 0) + 1
        )
    report.calculate_verdict()
    return report
