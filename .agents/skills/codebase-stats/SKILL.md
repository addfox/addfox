---
name: codebase-stats
description: Codebase statistics and technical debt tracking agent.
triggers:
  - codebase stats
  - technical debt report
  - code metrics
  - line count
  - complexity analysis
  - code health
  - project stats
---

# Codebase Stats Skill

Generate comprehensive codebase statistics and track technical debt indicators over time.

## Capabilities

- **Line Counting** — Lines per file, directory, and type
- **Function Analysis** — Count, complexity, documentation coverage
- **Dependency Metrics** — Source statements, coupling
- **Debt Indicators** — TODO/FIXME/HACK tracking with severity and age
- **Trend Tracking** — Compare against previous snapshots

---

## Quick Start

```bash
# Collect metrics
python scripts/metric_collector.py -o json src/ > baseline.json

# Compare snapshots
python scripts/metric_collector.py -o json src/ > current.json
python scripts/trend_comparator.py current.json baseline.json -o human

# Scan for technical debt
python scripts/debt_scanner.py -o json --severity high .
```

| Script                 | Purpose                          |
| ---------------------- | -------------------------------- |
| `metric_collector.py`  | Collect LOC, functions, classes  |
| `trend_comparator.py`  | Compare metric snapshots         |
| `debt_scanner.py`      | Detect TODO/FIXME/HACK comments  |

---

## Thresholds

```json
{
  "lines_per_file":    { "warning": 500,  "critical": 1000 },
  "functions_per_file": { "warning": 25,  "critical": 40 },
  "complexity":        { "warning": 10,   "critical": 15 },
  "debt_age_days":     { "warning": 30,   "critical": 90 }
}
```

### Debt Severity

| Indicator | Pattern    | Severity |
| --------- | ---------- | -------- |
| TODO      | `# TODO:`  | Low      |
| FIXME     | `# FIXME:` | Medium   |
| HACK/XXX  | `# HACK:`  | High     |

---

## Analysis Workflow

### 1. Collect Raw Data

```bash
# Lines by file type
find . -name "*.sh" -exec wc -l {} + | sort -n

# Function count per file
for f in lib/*.sh; do
    echo "$f: $(grep -c '^[[:space:]]*[a-z_][a-z0-9_]*()' "$f")"
done

# Debt item count
grep -rn 'TODO\|FIXME\|HACK\|XXX' lib/*.sh scripts/*.sh | wc -l

# Source statement count
grep -rn '^[[:space:]]*source' lib/*.sh | wc -l
```

### 2. Calculate Derived Metrics

Average lines/file, average functions/file, test-to-code ratio, documentation coverage.

### 3. Identify Hotspots

Flag files with **multiple co-occurring issues**: large + complex, many TODOs + stale, high coupling + low coverage.

### 4. Generate Report

Output a markdown report with summary dashboard, breakdowns, debt inventory, trends, and recommendations.

---

## Report Template

```markdown
# Codebase Statistics Report

**Generated**: {{DATE}}  |  **Commit**: {{GIT_SHA}}

## Summary

| Metric              | Value  | Status  |
| ------------------- | ------ | ------- |
| Total Lines         | 12,450 | —       |
| Total Files         | 45     | —       |
| Total Functions     | 287    | —       |
| Test Coverage       | 78%    | OK      |
| Technical Debt Items| 23     | Warning |

## Size Breakdown

| Directory | Files | Lines | Avg Lines/File |
| --------- | ----- | ----- | -------------- |
| lib/      | 18    | 6,230 | 346            |
| scripts/  | 22    | 4,120 | 187            |
| tests/    | 15    | 2,100 | 140            |

## Largest Files (Top 10)

| File               | Lines | Functions | Status   |
| ------------------ | ----- | --------- | -------- |
| lib/task-ops.sh    | 1,245 | 42        | CRITICAL |
| lib/validation.sh  | 890   | 31        | WARNING  |

## Most Complex Functions

| Function             | File           | Complexity | Action                       |
| -------------------- | -------------- | ---------- | ---------------------------- |
| `process_task_tree`  | task-ops.sh    | 23         | Split into smaller functions |
| `validate_all`       | validation.sh  | 18         | Extract validation helpers   |

## Technical Debt

| Type  | Count | Files Affected |
| ----- | ----- | -------------- |
| TODO  | 15    | 8              |
| FIXME | 6     | 4              |
| HACK  | 2     | 2              |

## Trends (vs Previous)

| Metric      | Previous | Current | Change |
| ----------- | -------- | ------- | ------ |
| Total Lines | 11,800   | 12,450  | +5.5%  |
| Functions   | 275      | 287     | +4.4%  |
| Debt Items  | 20       | 23      | +15%   |
| Coverage    | 75%      | 78%     | +3%    |

## Recommendations

1. **Split task-ops.sh** — Over 1,000 lines; extract to modules
2. **Address FIXME items** — 6 items older than 30 days
3. **Reduce complexity** — 4 functions exceed threshold
4. **Improve coverage** — 22% of functions untested
```

---

## Context Variables

| Token                | Description          | Example                        |
| -------------------- | -------------------- | ------------------------------ |
| `{{TARGET_DIRS}}`    | Directories to scan  | `lib/ scripts/`               |
| `{{PREVIOUS_REPORT}}`| Prior report path    | `research/stats_2026-01-01.md` |
| `{{THRESHOLDS}}`     | Custom thresholds    | JSON object                    |
| `{{SLUG}}`           | URL-safe topic name  | `codebase-stats`               |

---

## Skill Chaining

This is a **producer skill** — it gathers data independently.

### Outputs

| Output            | Format        | Description                                  |
| ----------------- | ------------- | -------------------------------------------- |
| `metrics`         | JSON          | File size, complexity, and function metrics   |
| `hotspots`        | JSON array    | Files with multiple co-occurring issues       |
| `debt-inventory`  | JSON/Markdown | Cataloged debt items with severity and age    |

### Downstream Consumers

`refactor-analyzer` · `test-gap-analyzer` · `security-auditor` · `dependency-analyzer`

---

## Anti-Patterns

| Pattern                | Problem                | Fix                              |
| ---------------------- | ---------------------- | -------------------------------- |
| Metrics without action | Numbers for numbers' sake | Always include recommendations |
| Too many metrics       | Information overload   | Focus on actionable indicators   |
| One-time analysis      | No trend visibility    | Store and compare reports        |
| Ignoring thresholds    | Debt accumulates       | Alert on threshold breaches      |

---

## Checklist

- [ ] Line counts collected by file/directory
- [ ] Function counts calculated
- [ ] Complexity metrics computed
- [ ] Technical debt items cataloged
- [ ] Hotspots identified
- [ ] Trends calculated (if previous report exists)
- [ ] Recommendations generated