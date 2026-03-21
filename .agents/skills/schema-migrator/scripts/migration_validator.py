#!/usr/bin/env python3
"""
Migration Validator - Validates migration file sequences.

Ensures migration files are properly ordered and formatted.

Usage:
    migration_validator.py [-o json|human] [--migrations-dir DIR] [--from-version V] [--to-version V]

Examples:
    migration_validator.py --migrations-dir migrations/
    migration_validator.py --from-version 1.0 --to-version 2.0 --migrations-dir db/migrations/
"""

import argparse
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# Add shared library to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "_shared" / "python"))

from layer0 import EXIT_ERROR, EXIT_FILE_NOT_FOUND, EXIT_SUCCESS, EXIT_VALIDATION_ERROR
from layer1 import OutputFormat, emit_error, emit_info, emit_warning, glob_files, output
from layer3.migrate import parse_version


@dataclass
class MigrationFile:
    """Information about a migration file."""

    path: str
    filename: str
    from_version: str = ""
    to_version: str = ""
    sequence: int = 0
    has_up: bool = False
    has_down: bool = False
    description: str = ""

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "path": self.path,
            "filename": self.filename,
            "from_version": self.from_version,
            "to_version": self.to_version,
            "sequence": self.sequence,
            "has_up": self.has_up,
            "has_down": self.has_down,
            "description": self.description,
        }


@dataclass
class MigrationIssue:
    """An issue found in migration validation."""

    migration: str
    severity: str  # error, warning
    message: str

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "migration": self.migration,
            "severity": self.severity,
            "message": self.message,
        }


@dataclass
class MigrationValidationReport:
    """Report of migration validation."""

    migrations_dir: str
    migrations: list[MigrationFile] = field(default_factory=list)
    issues: list[MigrationIssue] = field(default_factory=list)
    version_sequence: list[str] = field(default_factory=list)
    is_valid: bool = True
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "migrations_dir": self.migrations_dir,
            "summary": {
                "total_migrations": len(self.migrations),
                "issues_count": len(self.issues),
                "errors": sum(1 for i in self.issues if i.severity == "error"),
                "warnings": sum(1 for i in self.issues if i.severity == "warning"),
                "is_valid": self.is_valid,
            },
            "version_sequence": self.version_sequence,
            "migrations": [m.to_dict() for m in self.migrations],
            "issues": [i.to_dict() for i in self.issues],
            "errors": self.errors if self.errors else None,
        }


# Common migration filename patterns
MIGRATION_PATTERNS = [
    # Django style: 0001_initial.py
    r"^(\d+)_(.+)\.py$",
    # Alembic style: abc123_initial.py
    r"^([a-f0-9]+)_(.+)\.py$",
    # Version style: v1_0_0_to_v1_1_0.sql
    r"^v?(\d+[._]\d+[._]\d+)_to_v?(\d+[._]\d+[._]\d+)\.sql$",
    # Timestamp style: 20240101120000_add_users.sql
    r"^(\d{14})_(.+)\.sql$",
    # Simple sequence: 001.sql, 002.sql
    r"^(\d+)\.sql$",
]


def discover_migrations(migrations_dir: Path) -> list[MigrationFile]:
    """
    Discover migration files in directory.

    Args:
        migrations_dir: Directory to search

    Returns:
        List of MigrationFile
    """
    migrations = []

    # Look for Python and SQL migration files
    for ext in ["py", "sql"]:
        for file_path in glob_files(migrations_dir, f"*.{ext}", recursive=False):
            if file_path.name.startswith("__"):
                continue

            migration = MigrationFile(
                path=str(file_path),
                filename=file_path.name,
            )

            # Try to parse filename
            for pattern in MIGRATION_PATTERNS:
                match = re.match(pattern, file_path.name)
                if match:
                    groups = match.groups()

                    # Check if it's a version-to-version pattern
                    if len(groups) >= 2 and "_to_" in pattern:
                        migration.from_version = groups[0].replace("_", ".")
                        migration.to_version = groups[1].replace("_", ".")
                    elif groups[0].isdigit():
                        migration.sequence = int(groups[0])
                    else:
                        migration.sequence = 0

                    if len(groups) >= 2:
                        migration.description = groups[-1]
                    break

            # Check file contents for up/down migrations
            try:
                content = file_path.read_text()
                migration.has_up = "def upgrade" in content or "-- up" in content.lower()
                migration.has_down = "def downgrade" in content or "-- down" in content.lower()
            except Exception:
                pass

            migrations.append(migration)

    # Sort by sequence
    migrations.sort(key=lambda m: (m.sequence, m.from_version, m.filename))

    return migrations


def check_sequence(migrations: list[MigrationFile]) -> list[MigrationIssue]:
    """
    Check migration sequence for issues.

    Args:
        migrations: List of migrations

    Returns:
        List of issues found
    """
    issues = []

    # Check for gaps in sequence numbers
    sequences = [m.sequence for m in migrations if m.sequence > 0]
    if sequences:
        sequences.sort()
        for i in range(1, len(sequences)):
            if sequences[i] - sequences[i - 1] > 1:
                issues.append(
                    MigrationIssue(
                        migration=f"sequence {sequences[i - 1]} to {sequences[i]}",
                        severity="warning",
                        message=f"Gap in sequence: {sequences[i - 1]} to {sequences[i]}",
                    )
                )

    # Check for duplicate sequences
    seen_sequences = {}
    for m in migrations:
        if m.sequence > 0:
            if m.sequence in seen_sequences:
                issues.append(
                    MigrationIssue(
                        migration=m.filename,
                        severity="error",
                        message=f"Duplicate sequence number: {m.sequence}",
                    )
                )
            seen_sequences[m.sequence] = m.filename

    return issues


def check_format(migration: MigrationFile) -> list[MigrationIssue]:
    """
    Check migration file format.

    Args:
        migration: Migration file to check

    Returns:
        List of issues found
    """
    issues = []

    # Check for up/down functions
    if migration.path.endswith(".py"):
        if not migration.has_up:
            issues.append(
                MigrationIssue(
                    migration=migration.filename,
                    severity="warning",
                    message="Missing upgrade/up function",
                )
            )
        if not migration.has_down:
            issues.append(
                MigrationIssue(
                    migration=migration.filename,
                    severity="warning",
                    message="Missing downgrade/down function",
                )
            )

    return issues


def validate_migration_path(
    from_version: str, to_version: str, migrations: list[MigrationFile]
) -> list[MigrationIssue]:
    """
    Validate that a migration path exists.

    Args:
        from_version: Starting version
        to_version: Target version
        migrations: Available migrations

    Returns:
        List of issues found
    """
    issues = []

    # Find migrations with version info
    versioned = [m for m in migrations if m.from_version and m.to_version]

    if not versioned:
        # Can't validate path without version info
        return issues

    # Build version graph
    version_edges: dict[str, list[str]] = {}
    for m in versioned:
        if m.from_version not in version_edges:
            version_edges[m.from_version] = []
        version_edges[m.from_version].append(m.to_version)

    # Try to find path
    visited = set()
    path = []

    def find_path(current: str, target: str) -> bool:
        if current == target:
            return True
        if current in visited:
            return False

        visited.add(current)
        path.append(current)

        for next_version in version_edges.get(current, []):
            if find_path(next_version, target):
                return True

        path.pop()
        return False

    if not find_path(from_version, to_version):
        issues.append(
            MigrationIssue(
                migration="migration_path",
                severity="error",
                message=f"No migration path from {from_version} to {to_version}",
            )
        )

    return issues


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate migration file sequences and format",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  migration_validator.py --migrations-dir migrations/
  migration_validator.py --from-version 1.0 --to-version 2.0 --migrations-dir db/migrations/
        """,
    )
    parser.add_argument(
        "--migrations-dir",
        required=True,
        help="Directory containing migration files",
    )
    parser.add_argument(
        "-o",
        "--output",
        choices=["json", "human"],
        default="json",
        help="Output format (default: json)",
    )
    parser.add_argument(
        "--from-version",
        help="Starting version for path validation",
    )
    parser.add_argument(
        "--to-version",
        help="Target version for path validation",
    )

    args = parser.parse_args()

    migrations_dir = Path(args.migrations_dir)
    if not migrations_dir.exists():
        emit_error(EXIT_FILE_NOT_FOUND, f"Directory not found: {migrations_dir}")
        return EXIT_FILE_NOT_FOUND

    if not migrations_dir.is_dir():
        emit_error(EXIT_ERROR, f"Not a directory: {migrations_dir}")
        return EXIT_ERROR

    emit_info(f"Validating migrations in {migrations_dir}...")

    # Discover migrations
    migrations = discover_migrations(migrations_dir)
    emit_info(f"Found {len(migrations)} migration files")

    report = MigrationValidationReport(
        migrations_dir=str(migrations_dir),
        migrations=migrations,
    )

    # Check sequence
    report.issues.extend(check_sequence(migrations))

    # Check format of each migration
    for migration in migrations:
        report.issues.extend(check_format(migration))

    # Validate migration path if versions specified
    if args.from_version and args.to_version:
        report.issues.extend(
            validate_migration_path(
                args.from_version,
                args.to_version,
                migrations,
            )
        )

    # Build version sequence
    seen_versions = set()
    for m in migrations:
        if m.from_version:
            seen_versions.add(m.from_version)
        if m.to_version:
            seen_versions.add(m.to_version)
    report.version_sequence = sorted(seen_versions, key=parse_version)

    # Determine validity
    report.is_valid = not any(i.severity == "error" for i in report.issues)

    output_format = OutputFormat(args.output)
    output(report.to_dict(), output_format)

    if report.is_valid:
        emit_info(f"Validation passed with {len(report.issues)} warnings")
        return EXIT_SUCCESS
    else:
        emit_warning(f"Validation failed: {len(report.issues)} issues")
        return EXIT_VALIDATION_ERROR


if __name__ == "__main__":
    sys.exit(main())
