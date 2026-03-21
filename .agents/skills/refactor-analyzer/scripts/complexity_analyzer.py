#!/usr/bin/env python3
"""
Code complexity analyzer.

Calculates cyclomatic complexity and other metrics for Python code.
Helps identify functions that need refactoring.

Usage:
    python complexity_analyzer.py <file_or_directory>
"""

import argparse
import ast
import sys
from pathlib import Path


class ComplexityVisitor(ast.NodeVisitor):
    """Calculate cyclomatic complexity for functions."""

    def __init__(self):
        self.functions: list[tuple[str, int, int]] = []  # (name, line, complexity)
        self.current_complexity = 1
        self.current_function = None
        self.current_line = 0

    def visit_FunctionDef(self, node: ast.FunctionDef):
        """Visit function definition."""
        parent_function = self.current_function
        parent_complexity = self.current_complexity

        self.current_function = node.name
        self.current_line = node.lineno
        self.current_complexity = 1

        self.generic_visit(node)

        self.functions.append((node.name, node.lineno, self.current_complexity))

        self.current_function = parent_function
        self.current_complexity = parent_complexity

    def visit_If(self, node: ast.If):
        """Count if statements."""
        self.current_complexity += 1
        self.generic_visit(node)

    def visit_For(self, node: ast.For):
        """Count for loops."""
        self.current_complexity += 1
        self.generic_visit(node)

    def visit_While(self, node: ast.While):
        """Count while loops."""
        self.current_complexity += 1
        self.generic_visit(node)

    def visit_ExceptHandler(self, node: ast.ExceptHandler):
        """Count except handlers."""
        self.current_complexity += 1
        self.generic_visit(node)

    def visit_BoolOp(self, node: ast.BoolOp):
        """Count boolean operators (and/or)."""
        self.current_complexity += len(node.values) - 1
        self.generic_visit(node)


def analyze_file(file_path: Path) -> list[tuple[str, int, int]]:
    """Analyze complexity of a Python file.

    Args:
        file_path: Path to Python file.

    Returns:
        List of (function_name, line_number, complexity).
    """
    try:
        with open(file_path, encoding="utf-8") as f:
            tree = ast.parse(f.read(), filename=str(file_path))

        visitor = ComplexityVisitor()
        visitor.visit(tree)
        return visitor.functions
    except SyntaxError as e:
        print(f"Syntax error in {file_path}: {e}", file=sys.stderr)
        return []
    except Exception as e:
        print(f"Error analyzing {file_path}: {e}", file=sys.stderr)
        return []


def print_report(file_path: Path, functions: list[tuple[str, int, int]], threshold: int):
    """Print complexity report.

    Args:
        file_path: Path to analyzed file.
        functions: List of (name, line, complexity) tuples.
        threshold: Complexity threshold for warnings.
    """
    if not functions:
        return

    high_complexity = [(n, line, c) for n, line, c in functions if c > threshold]

    print(f"\n{file_path}:")
    print(f"  Functions: {len(functions)}")
    print(f"  High complexity (>{threshold}): {len(high_complexity)}")

    if high_complexity:
        print("\n  Refactoring candidates:")
        for name, line, complexity in sorted(high_complexity, key=lambda x: x[2], reverse=True):
            icon = "🔴" if complexity > threshold * 2 else "🟡"
            print(f"    {icon} {name} (line {line}): complexity {complexity}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Analyze code complexity")
    parser.add_argument("path", type=Path, help="File or directory to analyze")
    parser.add_argument(
        "-t", "--threshold", type=int, default=10, help="Complexity threshold (default: 10)"
    )
    args = parser.parse_args()

    if not args.path.exists():
        print(f"Error: {args.path} not found", file=sys.stderr)
        sys.exit(1)

    files = []
    files = [args.path] if args.path.is_file() else list(args.path.rglob("*.py"))

    total_functions = 0
    total_high_complexity = 0

    for file_path in files:
        functions = analyze_file(file_path)
        total_functions += len(functions)
        high = len([c for _, _, c in functions if c > args.threshold])
        total_high_complexity += high

        if functions:
            print_report(file_path, functions, args.threshold)

    print(f"\n{'=' * 60}")
    print(f"Total: {total_functions} functions, {total_high_complexity} need refactoring")

    sys.exit(0 if total_high_complexity == 0 else 1)


if __name__ == "__main__":
    main()
