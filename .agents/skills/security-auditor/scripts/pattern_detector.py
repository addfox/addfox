#!/usr/bin/env python3
"""
Security Pattern Detector - Scans codebase for security anti-patterns.

Detects hardcoded secrets, dangerous function usage, and other security issues.

Usage:
    pattern_detector.py [-o json|human] [--patterns FILE] [--exclude GLOB] TARGET_DIR

Examples:
    pattern_detector.py .
    pattern_detector.py --exclude "test_*" src/
    pattern_detector.py -o human .
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
from layer1 import OutputFormat, emit_error, emit_info, glob_files, output


@dataclass
class SecurityFinding:
    """A single security finding."""

    file: str
    line: int
    category: str
    pattern_name: str
    message: str
    severity: str
    snippet: str = ""

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "file": self.file,
            "line": self.line,
            "category": self.category,
            "pattern_name": self.pattern_name,
            "message": self.message,
            "severity": self.severity,
            "snippet": self.snippet,
        }


@dataclass
class DetectionReport:
    """Report of security pattern findings."""

    target: str
    findings: list[SecurityFinding] = field(default_factory=list)
    files_scanned: int = 0
    patterns_used: int = 0
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        by_category: dict[str, int] = {}
        by_severity: dict[str, int] = {}

        for finding in self.findings:
            by_category[finding.category] = by_category.get(finding.category, 0) + 1
            by_severity[finding.severity] = by_severity.get(finding.severity, 0) + 1

        return {
            "target": self.target,
            "summary": {
                "total_findings": len(self.findings),
                "files_scanned": self.files_scanned,
                "patterns_used": self.patterns_used,
                "by_category": by_category,
                "by_severity": by_severity,
            },
            "findings": [f.to_dict() for f in self.findings],
            "errors": self.errors if self.errors else None,
        }


# Built-in security patterns
DEFAULT_PATTERNS = {
    "hardcoded_password": {
        "category": "secrets",
        "pattern": r"(?:password|passwd|pwd)\s*=\s*['\"][^'\"]+['\"]",
        "severity": "high",
        "message": "Hardcoded password detected",
    },
    "hardcoded_api_key": {
        "category": "secrets",
        "pattern": r"(?:api[_-]?key|apikey|api[_-]?secret)\s*=\s*['\"][^'\"]+['\"]",
        "severity": "high",
        "message": "Hardcoded API key detected",
    },
    "hardcoded_token": {
        "category": "secrets",
        "pattern": r"(?:token|bearer|auth[_-]?token)\s*=\s*['\"][^'\"]+['\"]",
        "severity": "high",
        "message": "Hardcoded token detected",
    },
    "aws_access_key": {
        "category": "secrets",
        "pattern": r"AKIA[0-9A-Z]{16}",
        "severity": "critical",
        "message": "AWS access key ID detected",
    },
    "private_key": {
        "category": "secrets",
        "pattern": r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
        "severity": "critical",
        "message": "Private key detected",
    },
    "eval_usage": {
        "category": "code_injection",
        "pattern": r"\beval\s*\(",
        "severity": "high",
        "message": "Use of eval() - potential code injection",
    },
    "exec_usage": {
        "category": "code_injection",
        "pattern": r"\bexec\s*\(",
        "severity": "high",
        "message": "Use of exec() - potential code injection",
    },
    "subprocess_shell": {
        "category": "command_injection",
        "pattern": r"subprocess\.(?:call|run|Popen)\s*\([^)]*shell\s*=\s*True",
        "severity": "high",
        "message": "subprocess with shell=True - potential command injection",
    },
    "os_system": {
        "category": "command_injection",
        "pattern": r"os\.system\s*\(",
        "severity": "medium",
        "message": "os.system() usage - consider subprocess with shell=False",
    },
    "sql_format_string": {
        "category": "sql_injection",
        "pattern": r"(?:execute|cursor\.execute)\s*\(\s*['\"].*%[sd]",
        "severity": "high",
        "message": "SQL query with format string - potential SQL injection",
    },
    "sql_fstring": {
        "category": "sql_injection",
        "pattern": r"(?:execute|cursor\.execute)\s*\(\s*f['\"]",
        "severity": "high",
        "message": "SQL query with f-string - potential SQL injection",
    },
    "pickle_load": {
        "category": "deserialization",
        "pattern": r"pickle\.loads?\s*\(",
        "severity": "medium",
        "message": "pickle.load() - unsafe deserialization",
    },
    "yaml_load_unsafe": {
        "category": "deserialization",
        "pattern": r"yaml\.load\s*\([^)]*(?!Loader)",
        "severity": "medium",
        "message": "yaml.load() without safe Loader - use yaml.safe_load()",
    },
    "md5_usage": {
        "category": "cryptography",
        "pattern": r"hashlib\.md5\s*\(",
        "severity": "low",
        "message": "MD5 usage - weak hash algorithm",
    },
    "sha1_usage": {
        "category": "cryptography",
        "pattern": r"hashlib\.sha1\s*\(",
        "severity": "low",
        "message": "SHA1 usage - weak hash algorithm for security",
    },
    "debug_true": {
        "category": "configuration",
        "pattern": r"DEBUG\s*=\s*True",
        "severity": "medium",
        "message": "DEBUG=True in code - ensure disabled in production",
    },
    "binding_all_interfaces": {
        "category": "configuration",
        "pattern": r"(?:host|bind)\s*=\s*['\"]0\.0\.0\.0['\"]",
        "severity": "low",
        "message": "Binding to all interfaces - ensure intentional",
    },
    "disable_ssl_verify": {
        "category": "network",
        "pattern": r"verify\s*=\s*False",
        "severity": "high",
        "message": "SSL verification disabled",
    },
}


def redact_secret(text: str, category: str) -> str:
    """
    Redact potential secrets from text.

    Args:
        text: Text to redact
        category: Finding category

    Returns:
        Redacted text
    """
    if category == "secrets":
        # Redact anything in quotes after = sign
        return re.sub(r"(['\"])[^'\"]+\1", r"\1***REDACTED***\1", text)
    return text


def load_patterns(custom_file: str | None) -> dict[str, dict]:
    """
    Load patterns from file or use defaults.

    Args:
        custom_file: Path to custom patterns JSON file

    Returns:
        Dictionary of patterns
    """
    if custom_file:
        with open(custom_file) as f:
            return json.load(f)
    return DEFAULT_PATTERNS


def scan_file(path: Path, patterns: dict[str, dict]) -> list[SecurityFinding]:
    """
    Scan a single file for security patterns.

    Args:
        path: Path to file
        patterns: Dictionary of patterns

    Returns:
        List of SecurityFinding
    """
    findings = []

    try:
        content = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return findings

    lines = content.splitlines()

    for line_num, line in enumerate(lines, start=1):
        for pattern_name, config in patterns.items():
            if re.search(config["pattern"], line, re.IGNORECASE):
                snippet = redact_secret(line.strip()[:100], config["category"])
                findings.append(
                    SecurityFinding(
                        file=str(path),
                        line=line_num,
                        category=config["category"],
                        pattern_name=pattern_name,
                        message=config["message"],
                        severity=config["severity"],
                        snippet=snippet,
                    )
                )

    return findings


def scan_directory(target: Path, patterns: dict[str, dict], exclude: list[str]) -> DetectionReport:
    """
    Scan directory for security patterns.

    Args:
        target: Directory to scan
        patterns: Security patterns
        exclude: Exclude patterns

    Returns:
        DetectionReport
    """
    findings = []
    files_scanned = 0

    # File extensions to scan
    code_extensions = {
        ".py",
        ".js",
        ".ts",
        ".jsx",
        ".tsx",
        ".java",
        ".go",
        ".rb",
        ".rs",
        ".c",
        ".cpp",
        ".h",
        ".hpp",
        ".sh",
        ".yml",
        ".yaml",
        ".json",
        ".xml",
        ".env",
        ".config",
    }

    for file_path in glob_files(target, "*", recursive=True):
        # Skip excluded patterns
        if any(file_path.match(p) for p in exclude):
            continue

        # Only scan code files
        if file_path.suffix.lower() not in code_extensions:
            continue

        file_findings = scan_file(file_path, patterns)
        findings.extend(file_findings)
        files_scanned += 1

    return DetectionReport(
        target=str(target),
        findings=findings,
        files_scanned=files_scanned,
        patterns_used=len(patterns),
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Scan codebase for security anti-patterns",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  pattern_detector.py .
  pattern_detector.py --exclude "test_*" src/
  pattern_detector.py -o human .
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
        "--patterns",
        help="Custom patterns JSON file",
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

    try:
        patterns = load_patterns(args.patterns)
    except Exception as e:
        emit_error(EXIT_ERROR, f"Failed to load patterns: {e}")
        return EXIT_ERROR

    emit_info(f"Scanning {target} with {len(patterns)} security patterns...")

    report = scan_directory(target, patterns, args.exclude)

    output_format = OutputFormat(args.output)
    output(report.to_dict(), output_format)

    emit_info(f"Found {len(report.findings)} security findings in {report.files_scanned} files")

    return EXIT_SUCCESS


if __name__ == "__main__":
    sys.exit(main())
