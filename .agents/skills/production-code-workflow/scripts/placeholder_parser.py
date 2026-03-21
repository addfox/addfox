#!/usr/bin/env python3
"""
Placeholder Parser Module

Defines the data types and PATTERNS list used by the placeholder detection system.
Provides Severity enum, Issue dataclass, Pattern dataclass, and the canonical PATTERNS list.

This module is a pure data/type layer — it contains no I/O or scanning logic.
Import from this module to access pattern definitions and result types.

Usage:
    from placeholder_parser import Severity, Issue, Pattern, PATTERNS
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class Severity(Enum):
    """Severity level for placeholder/non-production code issues."""

    BLOCKER = 4
    CRITICAL = 3
    MAJOR = 2
    MINOR = 1

    def __str__(self) -> str:
        return self.name


@dataclass
class Issue:
    """A single detected placeholder issue in a source file."""

    file_path: str
    line_number: int
    line_content: str
    pattern_name: str
    severity: Severity
    message: str
    language: str

    def to_dict(self) -> dict[str, Any]:
        """Serialize the issue to a JSON-compatible dictionary."""
        return {
            "file_path": self.file_path,
            "line_number": self.line_number,
            "line_content": self.line_content.strip()[:100],
            "pattern_name": self.pattern_name,
            "severity": str(self.severity),
            "message": self.message,
            "language": self.language,
        }


@dataclass
class Pattern:
    """A pattern definition for detecting a specific type of placeholder."""

    name: str
    regex: str
    severity: Severity
    message: str
    file_extensions: set[str] | None = None
    language: str = "all"


PATTERNS: list[Pattern] = [
    # BLOCKER: Security
    Pattern(
        "hardcoded_password",
        r'(?i)(password|passwd|pwd|secret)\s*[=:]\s*["\'][^"\']{3,}["\']',
        Severity.BLOCKER,
        "Hardcoded password/secret - use environment variables",
        language="all",
    ),
    Pattern(
        "hardcoded_api_key",
        r'(?i)(api[_-]?key|apikey|secret[_-]?key)\s*[=:]\s*["\'][^"\']{8,}["\']',
        Severity.BLOCKER,
        "Hardcoded API key - use environment variables",
        language="all",
    ),
    Pattern(
        "hardcoded_token",
        r'(?i)(auth[_-]?token|bearer[_-]?token|jwt[_-]?secret)\s*[=:]\s*["\'][^"\']{8,}["\']',
        Severity.BLOCKER,
        "Hardcoded token - use secure configuration",
        language="all",
    ),
    Pattern(
        "hardcoded_connection",
        r'(?i)(connection[_-]?string|jdbc[_-]?url)\s*[=:]\s*["\'][^"\']{10,}["\']',
        Severity.BLOCKER,
        "Hardcoded connection string - use configuration",
        language="all",
    ),
    # CRITICAL: Universal TODO/FIXME
    Pattern(
        "todo_comment",
        r"(?://|#|/\*)\s*TODO\s*:?",
        Severity.CRITICAL,
        "TODO comment - implement now",
        language="all",
    ),
    Pattern(
        "fixme_comment",
        r"(?://|#|/\*)\s*FIXME\s*:?",
        Severity.CRITICAL,
        "FIXME comment - fix now",
        language="all",
    ),
    Pattern(
        "hack_comment",
        r"(?://|#|/\*)\s*HACK\s*:?",
        Severity.CRITICAL,
        "HACK comment - implement proper solution",
        language="all",
    ),
    Pattern(
        "xxx_comment",
        r"(?://|#|/\*)\s*XXX\s*:?",
        Severity.CRITICAL,
        "XXX comment - resolve now",
        language="all",
    ),
    Pattern(
        "in_production_comment",
        r"(?://|#|/\*)\s*[Ii]n\s+production",
        Severity.CRITICAL,
        "'In production...' - implement production logic NOW",
        language="all",
    ),
    Pattern(
        "for_now_comment",
        r"(?://|#|/\*)\s*[Ff]or\s+now",
        Severity.CRITICAL,
        "'For now...' - implement permanent solution",
        language="all",
    ),
    Pattern(
        "temporary_comment",
        r"(?://|#|/\*)\s*[Tt]emp(?:orary)?(?:\s|:)",
        Severity.CRITICAL,
        "Temporary code - implement permanent solution",
        language="all",
    ),
    Pattern(
        "implement_later",
        r"(?://|#|/\*)\s*(?:[Ii]mplement|[Aa]dd)\s+(?:this\s+)?(?:later|eventually|soon)",
        Severity.CRITICAL,
        "Deferred implementation - implement now",
        language="all",
    ),
    Pattern(
        "mock_class",
        r"class\s+(?:Mock|Fake|Stub)\w+",
        Severity.CRITICAL,
        "Mock/Fake/Stub class - use real implementations",
        language="all",
    ),
    Pattern(
        "simulated_data",
        r"(?:simulated?|fake|mock|dummy)[_-]?(?:data|response)\s*=",
        Severity.CRITICAL,
        "Simulated data - use real data sources",
        language="all",
    ),
    # Java
    Pattern(
        "java_unsupported_operation",
        r"throw\s+new\s+UnsupportedOperationException\s*\(",
        Severity.CRITICAL,
        "UnsupportedOperationException - implement method",
        file_extensions={".java"},
        language="java",
    ),
    Pattern(
        "java_runtime_todo",
        r'throw\s+new\s+RuntimeException\s*\(\s*["\'](?:TODO|not implemented)',
        Severity.CRITICAL,
        "RuntimeException placeholder - implement fully",
        file_extensions={".java"},
        language="java",
    ),
    Pattern(
        "java_system_out",
        r"System\.out\.print(?:ln)?\s*\(",
        Severity.MAJOR,
        "System.out - use SLF4J/Logback",
        file_extensions={".java"},
        language="java",
    ),
    Pattern(
        "java_system_err",
        r"System\.err\.print(?:ln)?\s*\(",
        Severity.MAJOR,
        "System.err - use logger.error()",
        file_extensions={".java"},
        language="java",
    ),
    Pattern(
        "java_print_stack_trace",
        r"\.printStackTrace\s*\(",
        Severity.MAJOR,
        "printStackTrace() - use logger.error(msg, e)",
        file_extensions={".java"},
        language="java",
    ),
    Pattern(
        "java_empty_catch",
        r"catch\s*\([^)]+\)\s*\{\s*\}",
        Severity.CRITICAL,
        "Empty catch block - handle or log",
        file_extensions={".java"},
        language="java",
    ),
    Pattern(
        "java_suppress_warnings",
        r"@SuppressWarnings\s*\([^)]*\)(?!\s*//)",
        Severity.MAJOR,
        "@SuppressWarnings without justification",
        file_extensions={".java"},
        language="java",
    ),
    Pattern(
        "java_return_null",
        r"return\s+null\s*;",
        Severity.MAJOR,
        "return null - consider Optional<T>",
        file_extensions={".java"},
        language="java",
    ),
    # Scala
    Pattern(
        "scala_triple_question",
        r"\?\?\?",
        Severity.CRITICAL,
        "??? placeholder - implement fully",
        file_extensions={".scala", ".sc"},
        language="scala",
    ),
    Pattern(
        "scala_not_implemented_error",
        r"throw\s+new\s+NotImplementedError",
        Severity.CRITICAL,
        "NotImplementedError - implement fully",
        file_extensions={".scala", ".sc"},
        language="scala",
    ),
    Pattern(
        "scala_sys_error_todo",
        r'sys\.error\s*\(\s*["\'](?:TODO|not implemented)',
        Severity.CRITICAL,
        "sys.error placeholder - implement fully",
        file_extensions={".scala", ".sc"},
        language="scala",
    ),
    Pattern(
        "scala_println",
        r"(?<!System\.out\.)println\s*\(",
        Severity.MAJOR,
        "println - use proper logging",
        file_extensions={".scala", ".sc"},
        language="scala",
    ),
    Pattern(
        "scala_null_usage",
        r"(?:=|return)\s*null\b",
        Severity.MAJOR,
        "null usage - prefer Option[T]",
        file_extensions={".scala", ".sc"},
        language="scala",
    ),
    Pattern(
        "scala_var_declaration",
        r"\bvar\s+\w+\s*[=:]",
        Severity.MINOR,
        "var declaration - prefer val",
        file_extensions={".scala", ".sc"},
        language="scala",
    ),
    Pattern(
        "scala_any_type",
        r":\s*Any\b",
        Severity.MINOR,
        "Any type - use specific type",
        file_extensions={".scala", ".sc"},
        language="scala",
    ),
    # Kotlin
    Pattern(
        "kotlin_todo_function",
        r"TODO\s*\(",
        Severity.CRITICAL,
        "TODO() - implement fully",
        file_extensions={".kt", ".kts"},
        language="kotlin",
    ),
    Pattern(
        "kotlin_not_implemented",
        r"throw\s+NotImplementedError",
        Severity.CRITICAL,
        "NotImplementedError - implement fully",
        file_extensions={".kt", ".kts"},
        language="kotlin",
    ),
    Pattern(
        "kotlin_println",
        r"\bprintln\s*\(",
        Severity.MAJOR,
        "println - use proper logging",
        file_extensions={".kt", ".kts"},
        language="kotlin",
    ),
    # C#
    Pattern(
        "csharp_not_implemented",
        r"throw\s+new\s+NotImplementedException\s*\(",
        Severity.CRITICAL,
        "NotImplementedException - implement method",
        file_extensions={".cs"},
        language="csharp",
    ),
    Pattern(
        "csharp_not_supported",
        r"throw\s+new\s+NotSupportedException\s*\(\s*\)",
        Severity.CRITICAL,
        "NotSupportedException without message",
        file_extensions={".cs"},
        language="csharp",
    ),
    Pattern(
        "csharp_console_write",
        r"Console\.Write(?:Line)?\s*\(",
        Severity.MAJOR,
        "Console.WriteLine - use ILogger<T>",
        file_extensions={".cs"},
        language="csharp",
    ),
    Pattern(
        "csharp_debug_write",
        r"Debug\.Write(?:Line)?\s*\(",
        Severity.MAJOR,
        "Debug.WriteLine - use ILogger",
        file_extensions={".cs"},
        language="csharp",
    ),
    Pattern(
        "csharp_return_default",
        r"return\s+default\s*;",
        Severity.CRITICAL,
        "return default - verify intentional",
        file_extensions={".cs"},
        language="csharp",
    ),
    Pattern(
        "csharp_empty_catch",
        r"catch\s*(?:\([^)]*\))?\s*\{\s*\}",
        Severity.CRITICAL,
        "Empty catch block - handle or log",
        file_extensions={".cs"},
        language="csharp",
    ),
    Pattern(
        "csharp_task_wait",
        r"\.(?:Wait|Result)\s*(?:\(|;)",
        Severity.MAJOR,
        ".Wait()/.Result blocks async - use await",
        file_extensions={".cs"},
        language="csharp",
    ),
    Pattern(
        "csharp_thread_sleep",
        r"Thread\.Sleep\s*\(",
        Severity.MAJOR,
        "Thread.Sleep - use Task.Delay",
        file_extensions={".cs"},
        language="csharp",
    ),
    # Python
    Pattern(
        "python_not_implemented",
        r"raise\s+NotImplementedError",
        Severity.CRITICAL,
        "NotImplementedError - implement method",
        file_extensions={".py"},
        language="python",
    ),
    Pattern(
        "python_pass_placeholder",
        r"^\s*pass\s*$",
        Severity.CRITICAL,
        "Empty pass - implement logic",
        file_extensions={".py"},
        language="python",
    ),
    Pattern(
        "python_ellipsis",
        r"^\s*\.\.\.\s*$",
        Severity.CRITICAL,
        "Ellipsis placeholder - implement fully",
        file_extensions={".py"},
        language="python",
    ),
    Pattern(
        "python_print",
        r"^\s*print\s*\(",
        Severity.MAJOR,
        "print() - use logging module",
        file_extensions={".py"},
        language="python",
    ),
    Pattern(
        "python_bare_except",
        r"except\s*:",
        Severity.MAJOR,
        "Bare except - catch specific exceptions",
        file_extensions={".py"},
        language="python",
    ),
    Pattern(
        "python_breakpoint",
        r"breakpoint\s*\(\)|pdb\.set_trace\s*\(",
        Severity.MAJOR,
        "Debugger breakpoint - remove for production",
        file_extensions={".py"},
        language="python",
    ),
    Pattern(
        "python_type_ignore",
        r"#\s*type:\s*ignore(?!\s*\[)",
        Severity.MAJOR,
        "type: ignore - fix type error",
        file_extensions={".py"},
        language="python",
    ),
    # TypeScript/JavaScript
    Pattern(
        "ts_throw_not_implemented",
        r'throw\s+new\s+Error\s*\(\s*["\'](?:Not implemented|TODO)',
        Severity.CRITICAL,
        "Not implemented error - implement fully",
        file_extensions={".ts", ".tsx", ".js", ".jsx"},
        language="typescript",
    ),
    Pattern(
        "ts_console_log",
        r"console\.(log|debug|info)\s*\(",
        Severity.MAJOR,
        "console.log - use proper logging",
        file_extensions={".ts", ".tsx", ".js", ".jsx"},
        language="typescript",
    ),
    Pattern(
        "ts_debugger",
        r"\bdebugger\s*;?",
        Severity.MAJOR,
        "debugger statement - remove for production",
        file_extensions={".ts", ".tsx", ".js", ".jsx"},
        language="typescript",
    ),
    Pattern(
        "ts_ignore",
        r"//\s*@ts-ignore(?!\s+)",
        Severity.MAJOR,
        "@ts-ignore without justification",
        file_extensions={".ts", ".tsx"},
        language="typescript",
    ),
    Pattern(
        "ts_any_type",
        r":\s*any\b",
        Severity.MINOR,
        "any type - use specific type",
        file_extensions={".ts", ".tsx"},
        language="typescript",
    ),
    Pattern(
        "js_alert",
        r"\balert\s*\(",
        Severity.MAJOR,
        "alert() - use proper UI feedback",
        file_extensions={".ts", ".tsx", ".js", ".jsx", ".html"},
        language="javascript",
    ),
    # Go
    Pattern(
        "go_panic_not_implemented",
        r'panic\s*\(\s*["\'](?:not implemented|TODO|unimplemented)',
        Severity.CRITICAL,
        "panic placeholder - return error, implement",
        file_extensions={".go"},
        language="go",
    ),
    Pattern(
        "go_fmt_println",
        r"fmt\.Print(?:ln|f)?\s*\(",
        Severity.MAJOR,
        "fmt.Println - use structured logging",
        file_extensions={".go"},
        language="go",
    ),
    Pattern(
        "go_log_println",
        r"log\.Print(?:ln|f)?\s*\(",
        Severity.MAJOR,
        "log.Println - use structured logging",
        file_extensions={".go"},
        language="go",
    ),
    Pattern(
        "go_ignored_error",
        r"_\s*=\s*\w+\([^)]*\)(?:\s*//.*)?$",
        Severity.MAJOR,
        "Ignored error - handle the error",
        file_extensions={".go"},
        language="go",
    ),
    # Rust
    Pattern(
        "rust_todo",
        r"\btodo!\s*\(",
        Severity.CRITICAL,
        "todo!() - implement the code",
        file_extensions={".rs"},
        language="rust",
    ),
    Pattern(
        "rust_unimplemented",
        r"\bunimplemented!\s*\(",
        Severity.CRITICAL,
        "unimplemented!() - implement fully",
        file_extensions={".rs"},
        language="rust",
    ),
    Pattern(
        "rust_panic_placeholder",
        r'panic!\s*\(\s*["\'](?:not implemented|TODO)',
        Severity.CRITICAL,
        "panic placeholder - implement properly",
        file_extensions={".rs"},
        language="rust",
    ),
    Pattern(
        "rust_println",
        r"println!\s*\(",
        Severity.MAJOR,
        "println! - use tracing/log crate",
        file_extensions={".rs"},
        language="rust",
    ),
    Pattern(
        "rust_unwrap",
        r"\.unwrap\s*\(\s*\)",
        Severity.MAJOR,
        ".unwrap() - use ? operator",
        file_extensions={".rs"},
        language="rust",
    ),
    # Minor (All)
    Pattern(
        "magic_number",
        r'(?<!["\'\w])\b(?:86400|3600|1000|60000|1024|2048|4096|65535)\b(?!["\'\w])',
        Severity.MINOR,
        "Magic number - use named constant",
        language="all",
    ),
    Pattern(
        "commented_code",
        r"(?://|#)\s*(?:if|for|while|def|function|class|return|public|private)\s+",
        Severity.MINOR,
        "Commented code - remove dead code",
        language="all",
    ),
]
