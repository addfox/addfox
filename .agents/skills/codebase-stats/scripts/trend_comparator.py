#!/usr/bin/env python3
"""
Trend Comparator - Compares codebase metric snapshots over time.

Calculates changes and trends between baseline and current metrics.

Usage:
    trend_comparator.py [-o json|human|table] [--threshold PCT] BASELINE CURRENT

Examples:
    trend_comparator.py metrics_jan.json metrics_feb.json
    trend_comparator.py --threshold 10 old.json new.json
    trend_comparator.py -o table baseline.json current.json
"""

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# Add shared library to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "_shared" / "python"))

from layer0 import EXIT_ERROR, EXIT_FILE_NOT_FOUND, EXIT_SUCCESS
from layer1 import OutputFormat, emit_error, emit_info, emit_warning, output


@dataclass
class MetricChange:
    """Change in a single metric."""

    name: str
    baseline: float
    current: float
    change: float
    change_percent: float
    status: str  # improved, degraded, unchanged

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "name": self.name,
            "baseline": self.baseline,
            "current": self.current,
            "change": self.change,
            "change_percent": round(self.change_percent, 2),
            "status": self.status,
        }


@dataclass
class TrendReport:
    """Report comparing two metric snapshots."""

    baseline_file: str
    current_file: str
    threshold: float
    changes: list[MetricChange] = field(default_factory=list)
    summary: dict = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        improved = sum(1 for c in self.changes if c.status == "improved")
        degraded = sum(1 for c in self.changes if c.status == "degraded")
        unchanged = sum(1 for c in self.changes if c.status == "unchanged")

        return {
            "baseline_file": self.baseline_file,
            "current_file": self.current_file,
            "threshold": self.threshold,
            "summary": {
                "total_metrics": len(self.changes),
                "improved": improved,
                "degraded": degraded,
                "unchanged": unchanged,
                "overall_status": "improved"
                if improved > degraded
                else ("degraded" if degraded > 0 else "unchanged"),
            },
            "changes": [c.to_dict() for c in self.changes],
            "errors": self.errors if self.errors else None,
        }


# Metrics where higher is better
HIGHER_IS_BETTER = {
    "lines_covered",
    "line_coverage_percent",
    "branch_coverage_percent",
    "functions_covered",
    "test_count",
}

# Metrics where lower is better
LOWER_IS_BETTER = {
    "lines_missed",
    "debt_items",
    "vulnerabilities",
    "complexity",
    "errors",
}


def compare_values(
    name: str, baseline: float, current: float, threshold: float = 5.0
) -> MetricChange:
    """
    Compare two values and determine status.

    Args:
        name: Metric name
        baseline: Baseline value
        current: Current value
        threshold: Percentage threshold for unchanged

    Returns:
        MetricChange with comparison result
    """
    change = current - baseline
    change_percent = (change / baseline * 100) if baseline != 0 else (100 if change > 0 else 0)

    # Determine if change is improvement or degradation
    if abs(change_percent) < threshold:
        status = "unchanged"
    elif name in HIGHER_IS_BETTER:
        status = "improved" if change > 0 else "degraded"
    elif name in LOWER_IS_BETTER:
        status = "improved" if change < 0 else "degraded"
    else:
        # Default: assume higher is worse for growth metrics
        status = "degraded" if change > 0 else "improved" if change < 0 else "unchanged"

    return MetricChange(
        name=name,
        baseline=baseline,
        current=current,
        change=change,
        change_percent=change_percent,
        status=status,
    )


def extract_metrics(data: dict, prefix: str = "") -> dict[str, float]:
    """
    Recursively extract numeric metrics from nested dict.

    Args:
        data: Dictionary to extract from
        prefix: Key prefix for nested values

    Returns:
        Flat dictionary of metric_name -> value
    """
    metrics = {}

    for key, value in data.items():
        full_key = f"{prefix}.{key}" if prefix else key

        if isinstance(value, (int, float)):
            metrics[full_key] = float(value)
        elif isinstance(value, dict):
            metrics.update(extract_metrics(value, full_key))

    return metrics


def compare_metrics(baseline: dict, current: dict, threshold: float = 5.0) -> TrendReport:
    """
    Compare two metric snapshots.

    Args:
        baseline: Baseline metrics dict
        current: Current metrics dict
        threshold: Percentage threshold for unchanged status

    Returns:
        TrendReport with all changes
    """
    report = TrendReport(
        baseline_file="",
        current_file="",
        threshold=threshold,
    )

    baseline_flat = extract_metrics(baseline)
    current_flat = extract_metrics(current)

    # Compare all metrics that exist in both
    all_keys = set(baseline_flat.keys()) | set(current_flat.keys())

    for key in sorted(all_keys):
        baseline_val = baseline_flat.get(key, 0.0)
        current_val = current_flat.get(key, 0.0)

        change = compare_values(key, baseline_val, current_val, threshold)
        report.changes.append(change)

    return report


def load_metrics_file(path: Path) -> dict:
    """
    Load metrics from JSON file.

    Args:
        path: Path to metrics JSON file

    Returns:
        Parsed metrics dictionary
    """
    return json.loads(path.read_text())


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Compare codebase metric snapshots over time",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  trend_comparator.py metrics_jan.json metrics_feb.json
  trend_comparator.py --threshold 10 old.json new.json
  trend_comparator.py -o table baseline.json current.json
        """,
    )
    parser.add_argument(
        "baseline",
        help="Baseline metrics JSON file",
    )
    parser.add_argument(
        "current",
        help="Current metrics JSON file",
    )
    parser.add_argument(
        "-o",
        "--output",
        choices=["json", "human", "table"],
        default="json",
        help="Output format (default: json)",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=5.0,
        help="Percentage change threshold for unchanged status (default: 5)",
    )

    args = parser.parse_args()

    baseline_path = Path(args.baseline)
    current_path = Path(args.current)

    for path in [baseline_path, current_path]:
        if not path.exists():
            emit_error(EXIT_FILE_NOT_FOUND, f"File not found: {path}")
            return EXIT_FILE_NOT_FOUND

    emit_info(f"Comparing {baseline_path} vs {current_path}...")

    try:
        baseline_data = load_metrics_file(baseline_path)
        current_data = load_metrics_file(current_path)
    except json.JSONDecodeError as e:
        emit_error(EXIT_ERROR, f"Failed to parse JSON: {e}")
        return EXIT_ERROR

    report = compare_metrics(baseline_data, current_data, args.threshold)
    report.baseline_file = str(baseline_path)
    report.current_file = str(current_path)

    output_format = OutputFormat(args.output)
    output(report.to_dict(), output_format)

    summary = report.to_dict()["summary"]
    emit_info(
        f"Compared {summary['total_metrics']} metrics: "
        f"{summary['improved']} improved, "
        f"{summary['degraded']} degraded, "
        f"{summary['unchanged']} unchanged"
    )

    if summary["degraded"] > 0:
        emit_warning(f"Overall status: {summary['overall_status']}")

    return EXIT_SUCCESS


if __name__ == "__main__":
    sys.exit(main())
