#!/usr/bin/env python3
"""
Function Discoverer - Discovers function definitions in Python files.

Extracts function metadata including names, signatures, docstrings, and decorators.

Usage:
    function_discoverer.py [-o json|human] [--include GLOB] [--exclude GLOB] TARGET_DIR

Examples:
    function_discoverer.py .
    function_discoverer.py --include "*.py" src/
    function_discoverer.py -o human --exclude "*test*" lib/
"""

import argparse
import ast
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# Add shared library to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "_shared" / "python"))

from layer0 import EXIT_ERROR, EXIT_FILE_NOT_FOUND, EXIT_SUCCESS
from layer1 import OutputFormat, emit_error, emit_info, glob_files, output


@dataclass
class ParameterInfo:
    """Information about a function parameter."""

    name: str
    annotation: str | None = None
    default: str | None = None
    kind: str = "positional_or_keyword"

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        result: dict[str, Any] = {"name": self.name}
        if self.annotation:
            result["annotation"] = self.annotation
        if self.default:
            result["default"] = self.default
        if self.kind != "positional_or_keyword":
            result["kind"] = self.kind
        return result


@dataclass
class SignatureInfo:
    """Information about a function signature."""

    parameters: list[ParameterInfo] = field(default_factory=list)
    return_type: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "parameters": [p.to_dict() for p in self.parameters],
            "return_type": self.return_type,
        }


@dataclass
class FunctionInfo:
    """Information about a function definition."""

    name: str
    file: str
    line: int
    signature: SignatureInfo
    docstring: str | None = None
    decorators: list[str] = field(default_factory=list)
    is_async: bool = False
    is_method: bool = False
    class_name: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        result = {
            "name": self.name,
            "file": self.file,
            "line": self.line,
            "signature": self.signature.to_dict(),
            "is_async": self.is_async,
        }
        if self.docstring:
            result["docstring"] = self.docstring
        if self.decorators:
            result["decorators"] = self.decorators
        if self.is_method:
            result["is_method"] = True
            result["class_name"] = self.class_name
        return result


@dataclass
class DiscoveryReport:
    """Report containing all discovered functions."""

    target: str
    functions: list[FunctionInfo] = field(default_factory=list)
    by_file: dict[str, int] = field(default_factory=dict)
    by_module: dict[str, list[str]] = field(default_factory=dict)
    statistics: dict[str, Any] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        # Calculate statistics
        total = len(self.functions)
        async_count = sum(1 for f in self.functions if f.is_async)
        method_count = sum(1 for f in self.functions if f.is_method)
        with_docstring = sum(1 for f in self.functions if f.docstring)
        with_decorators = sum(1 for f in self.functions if f.decorators)
        with_return_type = sum(1 for f in self.functions if f.signature.return_type)

        return {
            "target": self.target,
            "statistics": {
                "total_functions": total,
                "async_functions": async_count,
                "methods": method_count,
                "standalone_functions": total - method_count,
                "with_docstring": with_docstring,
                "with_decorators": with_decorators,
                "with_return_type": with_return_type,
                "files_scanned": len(self.by_file),
            },
            "functions": [f.to_dict() for f in self.functions],
            "by_file": self.by_file,
            "by_module": self.by_module,
            "errors": self.errors if self.errors else None,
        }


def parse_signature(node: ast.FunctionDef | ast.AsyncFunctionDef) -> SignatureInfo:
    """
    Parse function signature from AST node.

    Args:
        node: AST function definition node

    Returns:
        SignatureInfo with parameters and return type
    """
    signature = SignatureInfo()

    # Parse parameters
    args = node.args

    # Process positional-only params (Python 3.8+)
    for _i, arg in enumerate(args.posonlyargs):
        param = ParameterInfo(
            name=arg.arg,
            annotation=_get_annotation(arg.annotation),
            kind="positional_only",
        )
        signature.parameters.append(param)

    # Process regular args
    num_defaults = len(args.defaults)
    num_args = len(args.args)
    for i, arg in enumerate(args.args):
        default_idx = i - (num_args - num_defaults)
        default = None
        if default_idx >= 0:
            default = _get_value_repr(args.defaults[default_idx])

        param = ParameterInfo(
            name=arg.arg,
            annotation=_get_annotation(arg.annotation),
            default=default,
        )
        signature.parameters.append(param)

    # Process *args
    if args.vararg:
        param = ParameterInfo(
            name=f"*{args.vararg.arg}",
            annotation=_get_annotation(args.vararg.annotation),
            kind="var_positional",
        )
        signature.parameters.append(param)

    # Process keyword-only args
    for i, arg in enumerate(args.kwonlyargs):
        default = None
        if i < len(args.kw_defaults) and args.kw_defaults[i] is not None:
            default = _get_value_repr(args.kw_defaults[i])

        param = ParameterInfo(
            name=arg.arg,
            annotation=_get_annotation(arg.annotation),
            default=default,
            kind="keyword_only",
        )
        signature.parameters.append(param)

    # Process **kwargs
    if args.kwarg:
        param = ParameterInfo(
            name=f"**{args.kwarg.arg}",
            annotation=_get_annotation(args.kwarg.annotation),
            kind="var_keyword",
        )
        signature.parameters.append(param)

    # Get return type
    signature.return_type = _get_annotation(node.returns)

    return signature


def _get_annotation(node: ast.expr | None) -> str | None:
    """Get string representation of type annotation."""
    if node is None:
        return None
    return ast.unparse(node)


def _get_value_repr(node: ast.expr) -> str:
    """Get string representation of default value."""
    return ast.unparse(node)


def extract_docstring(node: ast.FunctionDef | ast.AsyncFunctionDef) -> str | None:
    """
    Extract docstring from function node.

    Args:
        node: AST function definition node

    Returns:
        Docstring or None
    """
    return ast.get_docstring(node)


def extract_decorators(node: ast.FunctionDef | ast.AsyncFunctionDef) -> list[str]:
    """
    Extract decorator names from function node.

    Args:
        node: AST function definition node

    Returns:
        List of decorator strings
    """
    decorators = []
    for decorator in node.decorator_list:
        decorators.append(ast.unparse(decorator))
    return decorators


def extract_functions_from_file(path: Path) -> list[FunctionInfo]:
    """
    Extract all function definitions from a Python file.

    Args:
        path: Path to Python file

    Returns:
        List of FunctionInfo for each function found
    """
    try:
        content = path.read_text(encoding="utf-8", errors="ignore")
        tree = ast.parse(content, filename=str(path))
    except SyntaxError:
        return []
    except Exception:
        return []

    functions: list[FunctionInfo] = []

    for node in ast.walk(tree):
        # Handle class methods
        if isinstance(node, ast.ClassDef):
            class_name = node.name
            for item in node.body:
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    func_info = _extract_function_info(item, path, class_name)
                    functions.append(func_info)

        # Handle standalone functions
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            # Skip if this is a method (will be handled by ClassDef)
            for parent in ast.walk(tree):
                if isinstance(parent, ast.ClassDef) and node in ast.walk(parent):
                    break
            else:
                func_info = _extract_function_info(node, path, None)
                functions.append(func_info)

    return functions


def _extract_function_info(
    node: ast.FunctionDef | ast.AsyncFunctionDef, path: Path, class_name: str | None
) -> FunctionInfo:
    """Extract FunctionInfo from AST node."""
    return FunctionInfo(
        name=node.name,
        file=str(path),
        line=node.lineno,
        signature=parse_signature(node),
        docstring=extract_docstring(node),
        decorators=extract_decorators(node),
        is_async=isinstance(node, ast.AsyncFunctionDef),
        is_method=class_name is not None,
        class_name=class_name,
    )


def discover_all(target: Path, include: list[str], exclude: list[str]) -> DiscoveryReport:
    """
    Discover all functions in target directory.

    Args:
        target: Target directory
        include: Include patterns
        exclude: Exclude patterns

    Returns:
        DiscoveryReport with all functions
    """
    report = DiscoveryReport(target=str(target))

    # Default to Python files
    if not include:
        include = ["*.py"]

    for file_path in glob_files(target, "*", recursive=True):
        # Check include patterns
        if not any(file_path.match(p) for p in include):
            continue
        # Check exclude patterns
        if any(file_path.match(p) for p in exclude):
            continue

        try:
            functions = extract_functions_from_file(file_path)
            report.functions.extend(functions)

            # Update by_file counts
            if functions:
                report.by_file[str(file_path)] = len(functions)

            # Update by_module
            module_name = file_path.stem
            if module_name not in report.by_module:
                report.by_module[module_name] = []
            for func in functions:
                report.by_module[module_name].append(func.name)

        except Exception as e:
            report.errors.append(f"{file_path}: {e}")

    return report


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Discover function definitions in Python files",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  function_discoverer.py .
  function_discoverer.py --include "*.py" src/
  function_discoverer.py -o human --exclude "*test*" lib/
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
        "--include",
        action="append",
        default=[],
        help="Include file patterns (can be repeated)",
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

    emit_info(f"Discovering functions in {target}...")

    report = discover_all(target, args.include, args.exclude)

    output_format = OutputFormat(args.output)
    output(report.to_dict(), output_format)

    stats = report.to_dict()["statistics"]
    emit_info(
        f"Found {stats['total_functions']} functions in {stats['files_scanned']} files "
        f"({stats['methods']} methods, {stats['async_functions']} async)"
    )

    return EXIT_SUCCESS


if __name__ == "__main__":
    sys.exit(main())
