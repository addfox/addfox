#!/usr/bin/env python3
"""
README Validation Script

Validates README.md files for:
- Required sections present
- Working links (basic check)
- Valid badge URLs
- Proper markdown formatting
- Common issues

Usage:
    python validate-readme.py [path/to/README.md]

Output:
    Validation report with score and recommendations
"""

import re
import sys
from pathlib import Path
from typing import List, Tuple, Dict
from urllib.parse import urlparse

def check_required_sections(content: str) -> Tuple[List[str], List[str]]:
    """Check for required README sections."""
    required = [
        'overview',
        'getting started',
        'license',
        'contact'
    ]

    recommended = [
        'installation',
        'usage',
        'contributing',
        'acknowledgements',
        'issues'
    ]

    found_required = []
    found_recommended = []
    missing_required = []
    missing_recommended = []

    content_lower = content.lower()

    for section in required:
        if section in content_lower or section.replace(' ', '-') in content_lower:
            found_required.append(section)
        else:
            missing_required.append(section)

    for section in recommended:
        if section in content_lower or section.replace(' ', '-') in content_lower:
            found_recommended.append(section)
        else:
            missing_recommended.append(section)

    return (found_required, missing_required, found_recommended, missing_recommended)

def extract_links(content: str) -> List[Tuple[str, str]]:
    """Extract all markdown links from content."""
    # Match [text](url) format
    links = re.findall(r'\[([^\]]+)\]\(([^\)]+)\)', content)
    return links

def validate_url_format(url: str) -> bool:
    """Validate URL format (basic check)."""
    try:
        result = urlparse(url)
        # Check if it's a web URL or relative path
        return bool(result.scheme in ['http', 'https'] or url.startswith('/') or url.startswith('.'))
    except:
        return False

def extract_badges(content: str) -> List[str]:
    """Extract badge URLs from content."""
    badges = []
    # Find badge patterns like [![...](badge-url)](link-url)
    badge_pattern = r'\[!\[([^\]]*)\]\(([^\)]+)\)\]\(([^\)]+)\)'
    matches = re.findall(badge_pattern, content)
    for match in matches:
        badges.append(match[1])  # badge URL
    return badges

def check_markdown_formatting(content: str) -> List[str]:
    """Check for common markdown formatting issues."""
    issues = []

    lines = content.split('\n')

    # Check for lists without preceding blank line
    for i, line in enumerate(lines[1:], start=1):
        if re.match(r'^\s*[-*+]\s+', line) or re.match(r'^\s*\d+\.\s+', line):
            if i > 0 and lines[i-1].strip() and not re.match(r'^#+\s+', lines[i-1]):
                # Previous line is not blank and not a header
                if not (re.match(r'^\s*[-*+]\s+', lines[i-1]) or re.match(r'^\s*\d+\.\s+', lines[i-1])):
                    issues.append(f"Line {i+1}: List item should have blank line before it")

    # Check for code blocks without language specification
    code_blocks = re.findall(r'```(\w*)\n', content)
    unnamed_blocks = sum(1 for lang in code_blocks if not lang)
    if unnamed_blocks > 0:
        issues.append(f"Found {unnamed_blocks} code block(s) without language specification")

    # Check for very long lines (> 120 chars, excluding URLs)
    for i, line in enumerate(lines, start=1):
        if len(line) > 120 and 'http' not in line:
            issues.append(f"Line {i}: Very long line ({len(line)} chars) - consider breaking")

    return issues

def check_header_structure(content: str) -> List[str]:
    """Check header structure and hierarchy."""
    issues = []
    lines = content.split('\n')

    h1_count = 0
    prev_level = 0

    for i, line in enumerate(lines, start=1):
        match = re.match(r'^(#+)\s+', line)
        if match:
            level = len(match.group(1))

            if level == 1:
                h1_count += 1

            # Check for skipped levels
            if prev_level > 0 and level > prev_level + 1:
                issues.append(f"Line {i}: Skipped header level (#{prev_level} to #{level})")

            prev_level = level

    if h1_count == 0:
        issues.append("No H1 header found (should have repository name)")
    elif h1_count > 1:
        issues.append(f"Multiple H1 headers found ({h1_count}) - should have only one")

    return issues

def validate_readme(file_path: str) -> Dict:
    """Validate a README.md file and return detailed report."""
    path = Path(file_path)

    if not path.exists():
        return {
            'valid': False,
            'error': f"File not found: {file_path}",
            'score': 0
        }

    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return {
            'valid': False,
            'error': f"Error reading file: {e}",
            'score': 0
        }

    report = {
        'valid': True,
        'file': str(path),
        'size': len(content),
        'sections': {},
        'links': {},
        'badges': {},
        'formatting': {},
        'headers': {},
        'recommendations': [],
        'score': 0
    }

    # Check sections
    found_req, missing_req, found_rec, missing_rec = check_required_sections(content)
    report['sections'] = {
        'required_found': found_req,
        'required_missing': missing_req,
        'recommended_found': found_rec,
        'recommended_missing': missing_rec
    }

    # Extract and validate links
    links = extract_links(content)
    invalid_links = [url for text, url in links if not validate_url_format(url)]
    report['links'] = {
        'total': len(links),
        'invalid': invalid_links,
        'invalid_count': len(invalid_links)
    }

    # Extract badges
    badges = extract_badges(content)
    report['badges'] = {
        'count': len(badges),
        'urls': badges
    }

    # Check markdown formatting
    formatting_issues = check_markdown_formatting(content)
    report['formatting'] = {
        'issues': formatting_issues,
        'issue_count': len(formatting_issues)
    }

    # Check header structure
    header_issues = check_header_structure(content)
    report['headers'] = {
        'issues': header_issues,
        'issue_count': len(header_issues)
    }

    # Generate recommendations
    if missing_req:
        report['recommendations'].append(f"Add missing required sections: {', '.join(missing_req)}")

    if missing_rec:
        report['recommendations'].append(f"Consider adding recommended sections: {', '.join(missing_rec)}")

    if invalid_links:
        report['recommendations'].append(f"Fix {len(invalid_links)} invalid link(s)")

    if len(badges) == 0:
        report['recommendations'].append("Add badges for technologies used")

    if formatting_issues:
        report['recommendations'].append(f"Fix {len(formatting_issues)} formatting issue(s)")

    if header_issues:
        report['recommendations'].append(f"Fix {len(header_issues)} header structure issue(s)")

    # Calculate score (0-100)
    score = 100

    # Deduct for missing required sections (10 points each)
    score -= len(missing_req) * 10

    # Deduct for missing recommended sections (5 points each, max 20)
    score -= min(len(missing_rec) * 5, 20)

    # Deduct for invalid links (5 points each, max 15)
    score -= min(len(invalid_links) * 5, 15)

    # Deduct for no badges (10 points)
    if len(badges) == 0:
        score -= 10

    # Deduct for formatting issues (2 points each, max 15)
    score -= min(len(formatting_issues) * 2, 15)

    # Deduct for header issues (3 points each, max 10)
    score -= min(len(header_issues) * 3, 10)

    report['score'] = max(0, score)

    return report

def format_report(report: Dict) -> str:
    """Format validation report as readable text."""
    if not report.get('valid', False):
        return f"ERROR: {report.get('error', 'Unknown error')}"

    output = []
    output.append("=" * 60)
    output.append("README VALIDATION REPORT")
    output.append("=" * 60)
    output.append(f"\nFile: {report['file']}")
    output.append(f"Size: {report['size']:,} bytes")
    output.append(f"\nOVERALL SCORE: {report['score']}/100")

    # Score interpretation
    if report['score'] >= 90:
        output.append("Status: EXCELLENT ✓")
    elif report['score'] >= 75:
        output.append("Status: GOOD ✓")
    elif report['score'] >= 60:
        output.append("Status: ADEQUATE")
    else:
        output.append("Status: NEEDS IMPROVEMENT")

    # Sections
    output.append("\n" + "-" * 60)
    output.append("SECTIONS")
    output.append("-" * 60)

    sections = report['sections']
    output.append(f"Required sections: {len(sections['required_found'])}/{len(sections['required_found']) + len(sections['required_missing'])}")
    if sections['required_missing']:
        output.append(f"  Missing: {', '.join(sections['required_missing'])}")

    output.append(f"Recommended sections: {len(sections['recommended_found'])}/{len(sections['recommended_found']) + len(sections['recommended_missing'])}")
    if sections['recommended_missing']:
        output.append(f"  Missing: {', '.join(sections['recommended_missing'])}")

    # Links
    output.append("\n" + "-" * 60)
    output.append("LINKS")
    output.append("-" * 60)
    output.append(f"Total links: {report['links']['total']}")
    output.append(f"Invalid links: {report['links']['invalid_count']}")
    if report['links']['invalid']:
        for link in report['links']['invalid'][:5]:  # Show first 5
            output.append(f"  - {link}")
        if len(report['links']['invalid']) > 5:
            output.append(f"  ... and {len(report['links']['invalid']) - 5} more")

    # Badges
    output.append("\n" + "-" * 60)
    output.append("BADGES")
    output.append("-" * 60)
    output.append(f"Badge count: {report['badges']['count']}")

    # Formatting
    output.append("\n" + "-" * 60)
    output.append("FORMATTING")
    output.append("-" * 60)
    output.append(f"Issues found: {report['formatting']['issue_count']}")
    if report['formatting']['issues']:
        for issue in report['formatting']['issues'][:5]:  # Show first 5
            output.append(f"  - {issue}")
        if len(report['formatting']['issues']) > 5:
            output.append(f"  ... and {len(report['formatting']['issues']) - 5} more")

    # Headers
    output.append("\n" + "-" * 60)
    output.append("HEADER STRUCTURE")
    output.append("-" * 60)
    output.append(f"Issues found: {report['headers']['issue_count']}")
    if report['headers']['issues']:
        for issue in report['headers']['issues']:
            output.append(f"  - {issue}")

    # Recommendations
    if report['recommendations']:
        output.append("\n" + "-" * 60)
        output.append("RECOMMENDATIONS")
        output.append("-" * 60)
        for i, rec in enumerate(report['recommendations'], start=1):
            output.append(f"{i}. {rec}")

    output.append("\n" + "=" * 60)

    return "\n".join(output)

def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python validate-readme.py <path/to/README.md>", file=sys.stderr)
        sys.exit(1)

    readme_path = sys.argv[1]

    report = validate_readme(readme_path)
    print(format_report(report))

    # Exit with error code if score is below 60
    if report['score'] < 60:
        sys.exit(1)

if __name__ == '__main__':
    main()
