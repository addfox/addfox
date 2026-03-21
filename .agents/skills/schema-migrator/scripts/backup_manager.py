#!/usr/bin/env python3
"""
Backup Manager - CLI for backup operations.

Create, list, prune, and verify backups.

Usage:
    backup_manager.py {create|list|prune|verify} [options]

Subcommands:
    create  [--exclude PATTERN] [--label LABEL] SOURCE BACKUP_DIR
    list    [--sort-by created_at|size|name] [--limit N] BACKUP_DIR
    prune   [--keep-count N] [--keep-days N] [--dry-run] BACKUP_DIR
    verify  BACKUP_FILE

Examples:
    backup_manager.py create --label "pre-migration" data/ backups/
    backup_manager.py list --limit 10 backups/
    backup_manager.py prune --keep-count 5 --dry-run backups/
    backup_manager.py verify backups/data_20240101_120000.tar.gz
"""

import argparse
import sys
from pathlib import Path
from typing import Any

# Add shared library to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "_shared" / "python"))

from layer0 import EXIT_ERROR, EXIT_FILE_NOT_FOUND, EXIT_SUCCESS
from layer1 import OutputFormat, emit_error, emit_info, output
from layer3.backup import (
    create_backup,
    list_backups,
    prune_backups,
    verify_backup,
)


def cmd_create(source: Path, backup_dir: Path, exclude: list[str], label: str) -> dict[str, Any]:
    """
    Create a backup.

    Args:
        source: Source path to backup
        backup_dir: Directory to store backup
        exclude: Patterns to exclude
        label: Backup label

    Returns:
        Result dictionary
    """
    result = create_backup(source, backup_dir, label, exclude)
    return result.to_dict()


def cmd_list(backup_dir: Path, sort_by: str, limit: int | None) -> dict[str, Any]:
    """
    List backups.

    Args:
        backup_dir: Directory containing backups
        sort_by: Sort field
        limit: Maximum number to list

    Returns:
        Result dictionary
    """
    backups = list_backups(backup_dir, sort_by, limit)

    return {
        "backup_dir": str(backup_dir),
        "count": len(backups),
        "backups": [b.to_dict() for b in backups],
    }


def cmd_prune(
    backup_dir: Path, keep_count: int | None, keep_days: int | None, dry_run: bool
) -> dict[str, Any]:
    """
    Prune old backups.

    Args:
        backup_dir: Directory containing backups
        keep_count: Number of backups to keep
        keep_days: Days of backups to keep
        dry_run: Don't actually delete

    Returns:
        Result dictionary
    """
    result = prune_backups(backup_dir, keep_count, keep_days, dry_run)

    return {
        **result.to_dict(),
        "backup_dir": str(backup_dir),
        "keep_count": keep_count,
        "keep_days": keep_days,
        "dry_run": dry_run,
    }


def cmd_verify(backup_path: Path) -> dict[str, Any]:
    """
    Verify a backup.

    Args:
        backup_path: Path to backup file

    Returns:
        Result dictionary
    """
    result = verify_backup(backup_path)

    return {
        **result.to_dict(),
        "backup_path": str(backup_path),
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Backup management CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  backup_manager.py create --label "pre-migration" data/ backups/
  backup_manager.py list --limit 10 backups/
  backup_manager.py prune --keep-count 5 --dry-run backups/
  backup_manager.py verify backups/data_20240101_120000.tar.gz
        """,
    )

    subparsers = parser.add_subparsers(dest="command", help="Subcommand")

    # Create subcommand
    create_parser = subparsers.add_parser("create", help="Create a backup")
    create_parser.add_argument("source", help="Source path to backup")
    create_parser.add_argument("backup_dir", help="Directory to store backup")
    create_parser.add_argument(
        "--exclude",
        action="append",
        default=[],
        help="Pattern to exclude (can be repeated)",
    )
    create_parser.add_argument(
        "--label",
        default="",
        help="Label for the backup",
    )

    # List subcommand
    list_parser = subparsers.add_parser("list", help="List backups")
    list_parser.add_argument("backup_dir", help="Directory containing backups")
    list_parser.add_argument(
        "--sort-by",
        choices=["created_at", "size", "name"],
        default="created_at",
        help="Sort field (default: created_at)",
    )
    list_parser.add_argument(
        "--limit",
        type=int,
        help="Maximum number of backups to list",
    )

    # Prune subcommand
    prune_parser = subparsers.add_parser("prune", help="Prune old backups")
    prune_parser.add_argument("backup_dir", help="Directory containing backups")
    prune_parser.add_argument(
        "--keep-count",
        type=int,
        help="Number of most recent backups to keep",
    )
    prune_parser.add_argument(
        "--keep-days",
        type=int,
        help="Keep backups from last N days",
    )
    prune_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be deleted without deleting",
    )

    # Verify subcommand
    verify_parser = subparsers.add_parser("verify", help="Verify a backup")
    verify_parser.add_argument("backup_file", help="Backup file to verify")

    # Common arguments
    parser.add_argument(
        "-o",
        "--output",
        choices=["json", "human"],
        default="json",
        help="Output format (default: json)",
    )

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return EXIT_ERROR

    output_format = OutputFormat(args.output)

    if args.command == "create":
        source = Path(args.source)
        backup_dir = Path(args.backup_dir)

        if not source.exists():
            emit_error(EXIT_FILE_NOT_FOUND, f"Source not found: {source}")
            return EXIT_FILE_NOT_FOUND

        emit_info(f"Creating backup of {source}...")
        result = cmd_create(source, backup_dir, args.exclude, args.label)
        output(result, output_format)

        if result["success"]:
            emit_info(f"Backup created: {result['backup']['name']}")
        else:
            emit_error(EXIT_ERROR, result["message"])
            return EXIT_ERROR

    elif args.command == "list":
        backup_dir = Path(args.backup_dir)

        if not backup_dir.exists():
            emit_error(EXIT_FILE_NOT_FOUND, f"Directory not found: {backup_dir}")
            return EXIT_FILE_NOT_FOUND

        emit_info(f"Listing backups in {backup_dir}...")
        result = cmd_list(backup_dir, args.sort_by, args.limit)
        output(result, output_format)

        emit_info(f"Found {result['count']} backups")

    elif args.command == "prune":
        backup_dir = Path(args.backup_dir)

        if not backup_dir.exists():
            emit_error(EXIT_FILE_NOT_FOUND, f"Directory not found: {backup_dir}")
            return EXIT_FILE_NOT_FOUND

        if args.keep_count is None and args.keep_days is None:
            emit_error(EXIT_ERROR, "Must specify --keep-count or --keep-days")
            return EXIT_ERROR

        action = "Would prune" if args.dry_run else "Pruning"
        emit_info(f"{action} backups in {backup_dir}...")

        result = cmd_prune(backup_dir, args.keep_count, args.keep_days, args.dry_run)
        output(result, output_format)

        if result["success"]:
            emit_info(result["message"])
        else:
            emit_error(EXIT_ERROR, result["message"])
            return EXIT_ERROR

    elif args.command == "verify":
        backup_file = Path(args.backup_file)

        if not backup_file.exists():
            emit_error(EXIT_FILE_NOT_FOUND, f"Backup not found: {backup_file}")
            return EXIT_FILE_NOT_FOUND

        emit_info(f"Verifying {backup_file}...")
        result = cmd_verify(backup_file)
        output(result, output_format)

        if result["success"]:
            emit_info("Backup verified successfully")
        else:
            emit_error(EXIT_ERROR, result["message"])
            return EXIT_ERROR

    return EXIT_SUCCESS


if __name__ == "__main__":
    sys.exit(main())
