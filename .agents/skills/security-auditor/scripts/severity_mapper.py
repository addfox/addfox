#!/usr/bin/env python3
"""
Severity Mapper - Maps security findings to CVSS scores and priorities.

Calculates severity, priority scores, and generates remediation plans.

Usage:
    severity_mapper.py [-o json|human|table] [--min-score SCORE] [--group-by severity|category|file] FINDINGS_FILE

Examples:
    severity_mapper.py findings.json
    severity_mapper.py --min-score 7.0 security_report.json
    severity_mapper.py --group-by severity findings.json
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
from layer1 import OutputFormat, emit_error, emit_info, output


@dataclass
class MappedFinding:
    """A finding with CVSS score and priority."""

    original: dict
    cvss_score: float
    cvss_severity: str
    priority: int
    effort: str
    recommendation: str

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            **self.original,
            "cvss_score": self.cvss_score,
            "cvss_severity": self.cvss_severity,
            "priority": self.priority,
            "effort": self.effort,
            "recommendation": self.recommendation,
        }


@dataclass
class RemediationPlan:
    """Remediation plan with prioritized findings."""

    source_file: str
    findings: list[MappedFinding] = field(default_factory=list)
    quick_wins: list[MappedFinding] = field(default_factory=list)
    by_priority: dict = field(default_factory=dict)
    by_severity: dict = field(default_factory=dict)
    by_category: dict = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "source_file": self.source_file,
            "summary": {
                "total_findings": len(self.findings),
                "quick_wins_count": len(self.quick_wins),
                "by_severity": {k: len(v) for k, v in self.by_severity.items()},
                "by_priority": {k: len(v) for k, v in self.by_priority.items()},
            },
            "quick_wins": [f.to_dict() for f in self.quick_wins],
            "findings_by_priority": {
                k: [f.to_dict() for f in v] for k, v in sorted(self.by_priority.items())
            },
            "findings_by_severity": {
                k: [f.to_dict() for f in v] for k, v in self.by_severity.items()
            },
            "findings_by_category": {
                k: [f.to_dict() for f in v] for k, v in self.by_category.items()
            },
            "errors": self.errors if self.errors else None,
        }


# CVSS base scores by severity
SEVERITY_CVSS = {
    "critical": 9.5,
    "high": 7.5,
    "medium": 5.0,
    "low": 2.5,
    "info": 0.0,
    "unknown": 5.0,
}

# Category impact multipliers
CATEGORY_IMPACT = {
    "secrets": 1.2,  # Secrets are high impact
    "code_injection": 1.1,
    "command_injection": 1.1,
    "sql_injection": 1.1,
    "deserialization": 1.0,
    "cryptography": 0.9,
    "configuration": 0.8,
    "network": 0.9,
}

# Effort estimates by pattern
EFFORT_ESTIMATES = {
    "secrets": "low",  # Usually just remove/rotate
    "code_injection": "medium",
    "command_injection": "medium",
    "sql_injection": "medium",
    "deserialization": "medium",
    "cryptography": "low",  # Usually just change function
    "configuration": "low",
    "network": "low",
}

# Recommendations by category
RECOMMENDATIONS = {
    "secrets": "Remove hardcoded secret and use environment variables or secret management",
    "code_injection": "Replace eval/exec with safe alternatives or strict input validation",
    "command_injection": "Use subprocess with shell=False and pass arguments as list",
    "sql_injection": "Use parameterized queries or ORM instead of string formatting",
    "deserialization": "Use safe deserialization (json) or validate input before unpickling",
    "cryptography": "Use modern cryptographic algorithms (SHA-256+, bcrypt, argon2)",
    "configuration": "Ensure debug settings are disabled in production",
    "network": "Enable SSL verification unless in controlled environment",
}


def calculate_cvss(finding: dict) -> tuple[float, str]:
    """
    Calculate CVSS score for a finding.

    Args:
        finding: Finding dictionary

    Returns:
        Tuple of (cvss_score, cvss_severity)
    """
    severity = finding.get("severity", "unknown").lower()
    category = finding.get("category", "unknown").lower()

    # Get base score
    base_score = SEVERITY_CVSS.get(severity, 5.0)

    # Apply category multiplier
    multiplier = CATEGORY_IMPACT.get(category, 1.0)
    adjusted_score = min(10.0, base_score * multiplier)

    # Determine CVSS severity
    if adjusted_score >= 9.0:
        cvss_severity = "critical"
    elif adjusted_score >= 7.0:
        cvss_severity = "high"
    elif adjusted_score >= 4.0:
        cvss_severity = "medium"
    elif adjusted_score >= 0.1:
        cvss_severity = "low"
    else:
        cvss_severity = "none"

    return (round(adjusted_score, 1), cvss_severity)


def calculate_priority(cvss: float, category: str) -> int:
    """
    Calculate priority score (1 = highest priority).

    Args:
        cvss: CVSS score
        category: Finding category

    Returns:
        Priority number (1-5)
    """
    # Priority based on CVSS and category
    if cvss >= 9.0:
        return 1
    elif cvss >= 7.0:
        return 2
    elif cvss >= 4.0:
        return 3
    elif cvss >= 2.0:
        return 4
    else:
        return 5


def estimate_effort(finding: dict) -> str:
    """
    Estimate remediation effort.

    Args:
        finding: Finding dictionary

    Returns:
        Effort estimate (low, medium, high)
    """
    category = finding.get("category", "unknown").lower()
    return EFFORT_ESTIMATES.get(category, "medium")


def get_recommendation(finding: dict) -> str:
    """
    Get remediation recommendation.

    Args:
        finding: Finding dictionary

    Returns:
        Recommendation string
    """
    category = finding.get("category", "unknown").lower()
    return RECOMMENDATIONS.get(category, "Review and remediate the security finding")


def create_remediation_plan(findings: list[dict], min_score: float = 0.0) -> RemediationPlan:
    """
    Create a prioritized remediation plan.

    Args:
        findings: List of finding dictionaries
        min_score: Minimum CVSS score to include

    Returns:
        RemediationPlan
    """
    plan = RemediationPlan(source_file="")

    for finding in findings:
        cvss_score, cvss_severity = calculate_cvss(finding)

        if cvss_score < min_score:
            continue

        category = finding.get("category", "unknown")
        priority = calculate_priority(cvss_score, category)
        effort = estimate_effort(finding)
        recommendation = get_recommendation(finding)

        mapped = MappedFinding(
            original=finding,
            cvss_score=cvss_score,
            cvss_severity=cvss_severity,
            priority=priority,
            effort=effort,
            recommendation=recommendation,
        )

        plan.findings.append(mapped)

        # Group by priority
        if priority not in plan.by_priority:
            plan.by_priority[priority] = []
        plan.by_priority[priority].append(mapped)

        # Group by severity
        if cvss_severity not in plan.by_severity:
            plan.by_severity[cvss_severity] = []
        plan.by_severity[cvss_severity].append(mapped)

        # Group by category
        if category not in plan.by_category:
            plan.by_category[category] = []
        plan.by_category[category].append(mapped)

        # Quick wins: high priority + low effort
        if priority <= 2 and effort == "low":
            plan.quick_wins.append(mapped)

    # Sort findings by priority
    plan.findings.sort(key=lambda f: (f.priority, -f.cvss_score))

    return plan


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Map security findings to CVSS scores and priorities",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  severity_mapper.py findings.json
  severity_mapper.py --min-score 7.0 security_report.json
  severity_mapper.py --group-by severity findings.json
        """,
    )
    parser.add_argument(
        "findings_file",
        help="Findings JSON file (from pattern_detector or vulnerability_scanner)",
    )
    parser.add_argument(
        "-o",
        "--output",
        choices=["json", "human", "table"],
        default="json",
        help="Output format (default: json)",
    )
    parser.add_argument(
        "--min-score",
        type=float,
        default=0.0,
        help="Minimum CVSS score to include (default: 0)",
    )
    parser.add_argument(
        "--group-by",
        choices=["severity", "category", "file", "priority"],
        default="priority",
        help="Grouping for output (default: priority)",
    )

    args = parser.parse_args()

    path = Path(args.findings_file)
    if not path.exists():
        emit_error(EXIT_FILE_NOT_FOUND, f"File not found: {path}")
        return EXIT_FILE_NOT_FOUND

    emit_info(f"Processing findings from {path}...")

    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError as e:
        emit_error(EXIT_ERROR, f"Failed to parse JSON: {e}")
        return EXIT_ERROR

    # Extract findings from various formats
    if "findings" in data:
        findings = data["findings"]
    elif "vulnerabilities" in data:
        findings = data["vulnerabilities"]
    elif isinstance(data, list):
        findings = data
    else:
        emit_error(EXIT_ERROR, "Could not find findings in input file")
        return EXIT_ERROR

    plan = create_remediation_plan(findings, args.min_score)
    plan.source_file = str(path)

    output_format = OutputFormat(args.output)
    output(plan.to_dict(), output_format)

    emit_info(
        f"Processed {len(plan.findings)} findings, {len(plan.quick_wins)} quick wins identified"
    )

    return EXIT_SUCCESS


if __name__ == "__main__":
    sys.exit(main())
