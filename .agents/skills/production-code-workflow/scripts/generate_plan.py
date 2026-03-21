#!/usr/bin/env python3
"""
Multi-Language Implementation Plan Generator

Usage:
    python generate_plan.py --feature "User Auth" --type api --language java
    python generate_plan.py --interactive

Examples:
    generate_plan.py --feature "Login API" --type api --language python
    generate_plan.py --feature "Payment Service" --type service -o json
    generate_plan.py -i
"""

import argparse
import sys
from dataclasses import asdict, dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any

# Add shared library to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "_shared" / "python"))

from layer0 import EXIT_INVALID_ARGS, EXIT_SUCCESS
from layer1 import OutputFormat, emit_error, emit_info, output


class ComponentType(Enum):
    API = "api"
    SERVICE = "service"
    DATABASE = "database"
    WORKER = "worker"
    CLI = "cli"


@dataclass
class Component:
    name: str
    type: ComponentType
    responsibilities: list[str]
    dependencies: list[str]
    interfaces: list[str]


@dataclass
class ErrorScenario:
    name: str
    trigger: str
    handling: str
    user_message: str


@dataclass
class TestCase:
    name: str
    type: str
    description: str
    expected_outcome: str


@dataclass
class Requirement:
    description: str
    priority: str = "must"
    clarification_needed: bool = False
    clarification_question: str | None = None


@dataclass
class ImplementationPlan:
    feature_name: str
    language: str = "unknown"
    created_at: str = ""
    component_type: str = ""
    estimated_complexity: str = "medium"
    functional_requirements: list[Requirement] = field(default_factory=list)
    non_functional_requirements: list[Requirement] = field(default_factory=list)
    components: list[Component] = field(default_factory=list)
    external_dependencies: list[str] = field(default_factory=list)
    error_scenarios: list[ErrorScenario] = field(default_factory=list)
    test_cases: list[TestCase] = field(default_factory=list)
    implementation_steps: list[str] = field(default_factory=list)
    blocking_questions: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        result = asdict(self)
        for comp in result["components"]:
            comp["type"] = (
                comp["type"].value if isinstance(comp["type"], ComponentType) else comp["type"]
            )
        return result

    def to_markdown(self) -> str:
        lines = [
            f"# Implementation Plan: {self.feature_name}",
            "",
            f"**Created**: {self.created_at}",
            f"**Language**: {self.language}",
            f"**Type**: {self.component_type}",
            f"**Complexity**: {self.estimated_complexity}",
            "",
        ]

        if self.blocking_questions:
            lines.extend(["## Blocking Questions", "", "*Answer before implementation:*", ""])
            for q in self.blocking_questions:
                lines.append(f"- [ ] {q}")
            lines.append("")

        lines.extend(["## Requirements", "", "### Functional", ""])
        for req in self.functional_requirements:
            status = "?" if req.clarification_needed else " "
            lines.append(f"- [{status}] **[{req.priority.upper()}]** {req.description}")
            if req.clarification_question:
                lines.append(f"  - ? {req.clarification_question}")
        lines.append("")

        if self.non_functional_requirements:
            lines.extend(["### Non-Functional", ""])
            for req in self.non_functional_requirements:
                lines.append(f"- **[{req.priority.upper()}]** {req.description}")
            lines.append("")

        lines.extend(["## Architecture", ""])
        for comp in self.components:
            comp_type = comp.type.value if isinstance(comp.type, ComponentType) else comp.type
            lines.extend([f"### {comp.name} ({comp_type})", "", "**Responsibilities:**"])
            for resp in comp.responsibilities:
                lines.append(f"- {resp}")
            lines.extend(["", "**Dependencies:**"])
            for dep in comp.dependencies:
                lines.append(f"- {dep}")
            lines.append("")

        lines.extend(["## Error Handling", ""])
        for err in self.error_scenarios:
            lines.extend(
                [
                    f"### {err.name}",
                    f"- **Trigger**: {err.trigger}",
                    f"- **Handling**: {err.handling}",
                    f"- **User Message**: {err.user_message}",
                    "",
                ]
            )

        lines.extend(["## Implementation Steps", ""])
        for i, step in enumerate(self.implementation_steps, 1):
            lines.append(f"{i}. {step}")

        return "\n".join(lines)


LANGUAGE_SPECIFICS = {
    "java": {
        "logging": "SLF4J + Logback",
        "validation": "Bean Validation",
        "testing": "JUnit 5 + Mockito",
        "build": "Maven/Gradle",
    },
    "scala": {
        "logging": "scala-logging/log4cats",
        "validation": "Cats Validated",
        "testing": "ScalaTest",
        "build": "sbt",
    },
    "kotlin": {
        "logging": "kotlin-logging",
        "validation": "Bean Validation",
        "testing": "JUnit 5 + MockK",
        "build": "Gradle",
    },
    "csharp": {
        "logging": "ILogger<T>/Serilog",
        "validation": "FluentValidation",
        "testing": "xUnit + Moq",
        "build": "dotnet",
    },
    "python": {
        "logging": "logging/structlog",
        "validation": "Pydantic",
        "testing": "pytest",
        "build": "pip",
    },
    "typescript": {
        "logging": "winston/pino",
        "validation": "Zod",
        "testing": "Jest/Vitest",
        "build": "npm",
    },
    "go": {
        "logging": "zap/zerolog",
        "validation": "validator",
        "testing": "testing + testify",
        "build": "go",
    },
    "rust": {
        "logging": "tracing",
        "validation": "validator",
        "testing": "cargo test",
        "build": "cargo",
    },
}


TEMPLATES: dict[str, dict[str, Any]] = {
    "api": {
        "components": [
            Component(
                "API Layer",
                ComponentType.API,
                ["Request validation", "Authentication", "Route handling", "Response formatting"],
                ["Service layer", "Validator", "Logger"],
                ["REST/GraphQL endpoints"],
            ),
            Component(
                "Service Layer",
                ComponentType.SERVICE,
                ["Business logic", "Data transformation", "External coordination"],
                ["Repository", "Config", "Logger"],
                ["Service interface"],
            ),
            Component(
                "Repository Layer",
                ComponentType.DATABASE,
                ["Data persistence", "Query implementation"],
                ["Database client", "Logger"],
                ["Repository interface"],
            ),
        ],
        "error_scenarios": [
            ErrorScenario(
                "Validation Error", "Invalid input", "Return 400", "Please check your input"
            ),
            ErrorScenario("Unauthorized", "Missing auth", "Return 401", "Please log in"),
            ErrorScenario("Not Found", "Resource missing", "Return 404", "Resource not found"),
            ErrorScenario("Server Error", "Unhandled exception", "Log + 500", "An error occurred"),
        ],
        "test_cases": [
            TestCase("Happy Path", "integration", "Successful flow", "Returns 200 with data"),
            TestCase("Validation", "unit", "Input validation", "Rejects invalid input"),
            TestCase("Auth", "integration", "Auth requirements", "Returns 401/403 correctly"),
        ],
        "non_functional": [
            Requirement("Response time < 200ms p95", "should"),
            Requirement("Structured logging", "must"),
        ],
    },
    "service": {
        "components": [
            Component(
                "Service",
                ComponentType.SERVICE,
                ["Business logic", "Validation", "Coordination"],
                ["Repository", "Logger", "Config"],
                ["Service interface"],
            ),
        ],
        "error_scenarios": [
            ErrorScenario(
                "Business Rule Violation",
                "Rule violated",
                "Return domain error",
                "Operation not allowed",
            ),
            ErrorScenario(
                "External Failure",
                "Dependency down",
                "Retry + fail gracefully",
                "Service unavailable",
            ),
        ],
        "test_cases": [
            TestCase("Business Logic", "unit", "Core rules", "Rules enforced"),
            TestCase("Error Paths", "unit", "Failures", "Errors handled"),
        ],
        "non_functional": [Requirement("Idempotent operations", "should")],
    },
    "worker": {
        "components": [
            Component(
                "Background Worker",
                ComponentType.WORKER,
                ["Message processing", "Graceful shutdown", "Health reporting"],
                ["Queue/Scheduler", "Service", "Logger"],
                ["Worker interface"],
            ),
        ],
        "error_scenarios": [
            ErrorScenario("Processing Failure", "Job throws", "Log, continue", "N/A"),
            ErrorScenario("Shutdown", "Signal received", "Complete current, exit", "N/A"),
        ],
        "test_cases": [
            TestCase("Processing", "unit", "Message handling", "Messages processed"),
            TestCase("Shutdown", "integration", "Graceful stop", "Clean shutdown"),
        ],
        "non_functional": [
            Requirement("Health check endpoint", "must"),
            Requirement("Graceful shutdown < 30s", "must"),
        ],
    },
}


def get_implementation_steps(component_type: str, language: str) -> list[str]:
    lang = LANGUAGE_SPECIFICS.get(language, {})
    base = [
        "Set up project structure",
        f"Add dependencies ({lang.get('build', 'package manager')})",
        "Define data models",
        "Create interfaces",
    ]

    type_steps = {
        "api": [
            "Implement repository",
            "Implement service",
            f"Add validation ({lang.get('validation', 'validation')})",
            "Implement endpoints",
            "Add auth",
            "Add error handling",
            f"Add logging ({lang.get('logging', 'logging')})",
            f"Write tests ({lang.get('testing', 'testing')})",
            "Add API docs",
        ],
        "service": [
            "Implement repository",
            "Implement service",
            f"Add validation ({lang.get('validation', 'validation')})",
            "Add error handling",
            f"Add logging ({lang.get('logging', 'logging')})",
            f"Write tests ({lang.get('testing', 'testing')})",
        ],
        "worker": [
            "Implement worker",
            "Add queue integration",
            "Add graceful shutdown",
            "Add health check",
            f"Add logging ({lang.get('logging', 'logging')})",
            f"Write tests ({lang.get('testing', 'testing')})",
        ],
    }
    return base + type_steps.get(component_type, type_steps["service"])


def generate_plan(
    feature_name: str, component_type: str, language: str = "unknown"
) -> ImplementationPlan:
    template = TEMPLATES.get(component_type, TEMPLATES["service"])
    plan = ImplementationPlan(
        feature_name=feature_name,
        language=language,
        created_at=datetime.now().isoformat(),
        component_type=component_type,
    )
    plan.components = template.get("components", [])
    plan.error_scenarios = template.get("error_scenarios", [])
    plan.test_cases = template.get("test_cases", [])
    plan.non_functional_requirements = template.get("non_functional", [])
    plan.functional_requirements = [
        Requirement(
            f"Core functionality for {feature_name}",
            "must",
            True,
            "What is the detailed specification?",
        )
    ]
    plan.implementation_steps = get_implementation_steps(component_type, language)
    return plan


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate implementation plans",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  generate_plan.py --feature "Login API" --type api --language python
  generate_plan.py --feature "Payment Service" --type service -o json
  generate_plan.py -i
        """,
    )
    parser.add_argument("--feature", "-f", help="Feature name")
    parser.add_argument("--type", "-t", choices=["api", "service", "worker"], default="api")
    parser.add_argument(
        "--language", "-l", choices=list(LANGUAGE_SPECIFICS.keys()) + ["unknown"], default="unknown"
    )
    parser.add_argument(
        "-o",
        "--output",
        choices=["json", "human", "table"],
        default="json",
        help="Output format (default: json)",
    )
    parser.add_argument("--interactive", "-i", action="store_true")
    args = parser.parse_args()

    if args.interactive:
        feature = input("Feature name: ").strip()
        if not feature:
            emit_error(EXIT_INVALID_ARGS, "Feature name is required")
            return EXIT_INVALID_ARGS
        language = input("Language [unknown]: ").strip() or "unknown"
        comp_type = input("Type (api/service/worker) [api]: ").strip() or "api"
        plan = generate_plan(feature, comp_type, language)
    elif args.feature:
        plan = generate_plan(args.feature, args.type, args.language)
    else:
        emit_error(EXIT_INVALID_ARGS, "Either --feature or --interactive required")
        return EXIT_INVALID_ARGS

    emit_info(f"Generating implementation plan for '{plan.feature_name}'...")

    output_format = OutputFormat(args.output)
    if args.output == "json":
        output(plan.to_dict(), output_format)
    else:
        # Markdown output for human/table formats (plan structure is better as markdown)
        print(plan.to_markdown())

    emit_info(f"Plan generated with {len(plan.implementation_steps)} implementation steps")

    return EXIT_SUCCESS


if __name__ == "__main__":
    sys.exit(main())
