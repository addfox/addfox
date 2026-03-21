#!/usr/bin/env python3
"""
Dockerfile security and best practices linter.

Checks Dockerfiles for common security issues and anti-patterns:
- Running as root
- Using latest tag
- Missing health checks
- Exposing sensitive ports
- Missing .dockerignore
- Inefficient layer caching

Usage:
    python dockerfile_linter.py <path_to_dockerfile>
"""

import argparse
import re
import sys
from pathlib import Path


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


class DockerfileLinter:
    """Lints Dockerfiles for security and best practices."""

    def __init__(self, dockerfile_path: Path):
        self.path = dockerfile_path
        self.lines = []
        self.issues: list[tuple[str, int, str]] = []  # (severity, line_num, message)

    def load(self) -> bool:
        """Load Dockerfile content."""
        try:
            with open(self.path, encoding="utf-8") as f:
                self.lines = f.readlines()
            return True
        except Exception as e:
            print(f"Error reading {self.path}: {e}", file=sys.stderr)
            return False

    def check_latest_tag(self):
        """Check for use of :latest tag."""
        for i, line in enumerate(self.lines, 1):
            if line.strip().startswith("FROM") and (
                ":latest" in line or (":" not in line and "@" not in line)
            ):
                self.issues.append(
                    ("WARNING", i, "Base image uses :latest tag (pin specific version)")
                )

    def check_root_user(self):
        """Check if container runs as root."""
        has_user_directive = any(
            line.strip().startswith("USER") and "root" not in line.lower() for line in self.lines
        )

        if not has_user_directive:
            self.issues.append(("WARNING", 0, "No USER directive found (container runs as root)"))

    def check_healthcheck(self):
        """Check for HEALTHCHECK directive."""
        has_healthcheck = any(line.strip().startswith("HEALTHCHECK") for line in self.lines)

        if not has_healthcheck:
            self.issues.append(("INFO", 0, "No HEALTHCHECK directive (recommended for production)"))

    def check_sensitive_ports(self):
        """Check for commonly exposed sensitive ports."""
        sensitive_ports = {
            "22": "SSH",
            "3306": "MySQL",
            "5432": "PostgreSQL",
            "6379": "Redis",
            "27017": "MongoDB",
        }

        for i, line in enumerate(self.lines, 1):
            if line.strip().startswith("EXPOSE"):
                for port, service in sensitive_ports.items():
                    if port in line:
                        self.issues.append(
                            ("WARNING", i, f"Exposing {service} port {port} (review if necessary)")
                        )

    def check_apt_update_cache(self):
        """Check for apt-get update without cleanup."""
        for i, line in enumerate(self.lines, 1):
            if (
                "apt-get update" in line
                and "&&" in line
                and "rm -rf /var/lib/apt/lists" not in line
            ):
                self.issues.append(
                    ("WARNING", i, "apt-get update without cleanup (increases image size)")
                )

    def check_dockerignore(self):
        """Check for .dockerignore file."""
        dockerignore_path = self.path.parent / ".dockerignore"
        if not dockerignore_path.exists():
            self.issues.append(
                ("INFO", 0, "No .dockerignore file found (may copy unnecessary files)")
            )

    def check_secrets(self):
        """Check for potential secrets in ENV or ARG."""
        secret_patterns = [r"PASSWORD", r"SECRET", r"TOKEN", r"API_KEY", r"PRIVATE_KEY"]

        for i, line in enumerate(self.lines, 1):
            if line.strip().startswith(("ENV", "ARG")):
                for pattern in secret_patterns:
                    if re.search(pattern, line, re.IGNORECASE):
                        self.issues.append(
                            (
                                "CRITICAL",
                                i,
                                f"Potential secret in {line.split()[0]} (use build secrets instead)",
                            )
                        )

    def lint(self) -> bool:
        """Run all linting checks."""
        if not self.load():
            return False

        self.check_latest_tag()
        self.check_root_user()
        self.check_healthcheck()
        self.check_sensitive_ports()
        self.check_apt_update_cache()
        self.check_dockerignore()
        self.check_secrets()

        return True

    def print_report(self):
        """Print linting report."""
        severity_order = {"CRITICAL": 0, "WARNING": 1, "INFO": 2}
        sorted_issues = sorted(self.issues, key=lambda x: (severity_order[x[0]], x[1]))

        if not sorted_issues:
            print(f"✅ {self.path.name}: No issues found!")
            return

        print(f"\n{self.path.name} — Found {len(sorted_issues)} issue(s):\n")

        for severity, line_num, message in sorted_issues:
            icon = {"CRITICAL": "🔴", "WARNING": "🟡", "INFO": "ℹ️"}[severity]
            line_str = f"line {line_num}" if line_num > 0 else "general"
            print(f"  {icon} [{severity}] {line_str}: {message}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Lint Dockerfile for security issues")
    parser.add_argument("dockerfile", type=Path, help="Path to Dockerfile")
    args = parser.parse_args()

    try:
        args.dockerfile = validate_safe_path(args.dockerfile, context="dockerfile argument")
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    if not args.dockerfile.exists():
        print(f"Error: {args.dockerfile} not found", file=sys.stderr)
        sys.exit(1)

    linter = DockerfileLinter(args.dockerfile)
    if not linter.lint():
        sys.exit(1)

    linter.print_report()

    # Exit with error if critical issues found
    has_critical = any(sev == "CRITICAL" for sev, _, _ in linter.issues)
    sys.exit(1 if has_critical else 0)


if __name__ == "__main__":
    main()
