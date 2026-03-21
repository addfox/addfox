# Research Queries Reference

## Effective Search Strategies

### Query Construction Patterns

**For Error Messages:**
```
Pattern: "[exact error message]" [language/framework]
Example: "TypeError: Cannot read property 'map' of undefined" React
Example: "ConnectionRefusedError: [Errno 111]" Python PostgreSQL
```

**For Implementation Guidance:**
```
Pattern: [language] [task] best practices [year]
Example: Python async database connection pooling best practices 2024
Example: TypeScript error handling patterns production
```

**For API/Library Documentation:**
```
Pattern: [library name] [specific feature] docs
Example: SQLAlchemy relationship lazy loading docs
Example: React useEffect cleanup function docs
```

**For Debugging:**
```
Pattern: [framework] [symptom] cause
Example: Next.js hydration mismatch cause
Example: FastAPI slow response time cause
```

**For Comparisons:**
```
Pattern: [option A] vs [option B] [use case]
Example: Pydantic vs dataclasses validation
Example: PostgreSQL vs MySQL JSON performance
```

### Source Priority Matrix

| Source Type | Reliability | Use For |
|-------------|-------------|---------|
| Official Docs | 5/5 | API reference, configuration, best practices |
| GitHub Issues | 4/5 | Bug workarounds, edge cases, version-specific issues |
| GitHub Source | 5/5 | Understanding actual behavior, finding undocumented features |
| Stack Overflow | 3/5 | Quick solutions (verify vote count & date) |
| Engineering Blogs | 4/5 | Architecture patterns, lessons learned |
| Medium/Dev.to | 2/5 | Tutorial starting points (always verify) |
| Random Forums | 1/5 | Last resort, cross-reference required |

### Query Refinement Strategies

**If no relevant results:**
1. Remove version numbers, try generic terms
2. Search for the parent concept, not specific implementation
3. Try alternative terminology (e.g., "pool" -> "connection management")
4. Search in official docs site specifically

**If too many irrelevant results:**
1. Add language/framework qualifier
2. Add year for recent information
3. Add "production" or "enterprise" for serious implementations
4. Exclude beginner content: add "advanced" or "in-depth"

**If results are outdated:**
1. Add current year
2. Search for "[topic] [framework version]"
3. Check GitHub releases/changelog for breaking changes
4. Look for migration guides

## Common Research Scenarios

### Scenario 1: Unknown Error Message

**Research Flow:**
```
1. Search exact error message in quotes
2. If no results: remove dynamic parts (IDs, paths, specific values)
3. Add framework/language context
4. Look for GitHub issues in the relevant repository
5. Check if error relates to version mismatch
```

**Example Search Progression:**
```
1. "ECONNREFUSED 127.0.0.1:5432"
2. "ECONNREFUSED" PostgreSQL Node.js
3. PostgreSQL connection refused Node.js
4. site:github.com/brianc/node-postgres ECONNREFUSED
```

### Scenario 2: Performance Problem

**Research Flow:**
```
1. Identify the specific bottleneck (CPU, memory, I/O, network)
2. Search "[framework] [bottleneck type] optimization"
3. Look for profiling guides
4. Search for common pitfalls
5. Look for benchmark comparisons if choosing alternatives
```

**Example Queries:**
```
- Python asyncio slow response time profiling
- SQLAlchemy N+1 query problem solution
- React component re-render performance optimization
- Node.js memory leak detection production
```

### Scenario 3: Security Implementation

**Research Flow:**
```
1. ALWAYS start with official OWASP guidelines
2. Check framework-specific security docs
3. Look for CVE/security advisories
4. Search for security audit checklists
5. Verify with multiple authoritative sources
```

**Example Queries:**
```
- OWASP [vulnerability type] prevention
- [framework] security best practices official
- [library] CVE security vulnerabilities
- site:cheatsheetseries.owasp.org [topic]
```

### Scenario 4: Architecture Decision

**Research Flow:**
```
1. Search for pattern comparisons
2. Look for case studies from similar scale/domain
3. Find official recommendations from framework authors
4. Look for "lessons learned" posts
5. Check for performance benchmarks
```

**Example Queries:**
```
- Microservices vs monolith [specific use case]
- [pattern] real world example production
- [architect name] [pattern] recommendations
- "[company]" engineering blog [pattern]
```

### Scenario 5: Library/Tool Selection

**Research Flow:**
```
1. Search for comparison articles
2. Check GitHub stars, recent commits, issue response time
3. Look for production usage examples
4. Check for breaking changes/migration difficulty
5. Verify license compatibility
```

**Example Queries:**
```
- [library A] vs [library B] 2024 comparison
- site:github.com/[org]/[repo] releases
- "[library]" production experience
- "[library]" breaking changes migration
```

## Validating Research Findings

### Credibility Checklist

```
[ ] Source is authoritative (official docs, core maintainer, known expert)
[ ] Information is recent (within 1-2 years for fast-moving tech)
[ ] Solution has been verified by others (upvotes, confirmations)
[ ] No conflicting information from equally credible sources
[ ] Solution matches the specific version/environment
[ ] Security implications considered
[ ] Performance implications considered
```

### Cross-Reference Requirements

| Finding Type | Minimum Sources to Verify |
|--------------|---------------------------|
| Security fix | 3 (must include official) |
| Architecture pattern | 2-3 |
| Bug workaround | 2 (verify with GitHub issue) |
| Configuration option | 1 (if from official docs) |
| Best practice | 2-3 |
| Third-party library choice | 3-5 |

### Red Flags in Sources

- No date or very old date (pre-2020 for most web tech)
- Author has no credentials visible
- Copy-pasted content from other sources
- Contains obvious errors in basic concepts
- Recommends disabling security features
- No error handling in code examples
- Uses deprecated APIs
- High-ranking but low-quality SEO content

## Research Output Template

```markdown
## Research Report: [Topic]

### Objective
[What problem we're trying to solve]

### Search Strategy
Queries used:
1. [query] -> [result summary]
2. [query] -> [result summary]

### Sources Consulted

| Source | Type | Reliability | Key Finding |
|--------|------|-------------|-------------|
| [URL]  | [type] | ***oo | [summary] |

### Key Findings

1. **[Finding 1]**
   - Source: [URL]
   - Details: [explanation]
   - Confidence: [HIGH/MEDIUM/LOW]

2. **[Finding 2]**
   - Source: [URL]
   - Details: [explanation]
   - Confidence: [HIGH/MEDIUM/LOW]

### Recommended Solution

[Synthesized recommendation based on findings]

### Implementation Notes

- [Specific implementation guidance]
- [Potential pitfalls to avoid]
- [Configuration requirements]

### Confidence Assessment

**Overall Confidence**: [HIGH/MEDIUM/LOW]

**Factors**:
- [x/ ] Multiple authoritative sources agree
- [x/ ] Solution tested in similar environment
- [x/ ] No significant conflicting information
- [x/ ] Recent and actively maintained

### Open Questions

- [Any remaining uncertainties]
- [Areas needing user input]
```

## Domain-Specific Query Templates

### Database/SQL
```
- [database] [operation] performance optimization
- [ORM] [relationship type] best practice
- [database] index strategy [use case]
- [database] transaction isolation level [scenario]
```

### API Development
```
- REST API [specific aspect] best practices
- GraphQL [specific feature] implementation
- API rate limiting [framework] production
- API versioning strategies [framework]
```

### Frontend
```
- [framework] state management [complexity level]
- [framework] performance optimization bundle size
- [framework] SSR hydration [issue]
- [framework] accessibility [component type]
```

### DevOps/Infrastructure
```
- [cloud provider] [service] best practices
- Kubernetes [resource type] configuration production
- Docker [optimization type] best practices
- CI/CD [tool] [pipeline type] example
```

### Security
```
- OWASP [vulnerability] [language] prevention
- [framework] authentication best practices
- [protocol] implementation security checklist
- [compliance standard] [technology] requirements
```

### JVM Languages (Java, Scala, Kotlin)
```
- Java [feature] best practices [version]
- Spring Boot [component] configuration production
- Scala [library] [pattern] example
- ZIO/Cats Effect [operation] production
- Kotlin coroutines [pattern] best practices
- JVM memory tuning [use case]
- Gradle/Maven [task] configuration
```

### .NET (C#, F#)
```
- ASP.NET Core [feature] best practices
- Entity Framework [operation] performance
- C# async/await [pattern] production
- .NET [version] [feature] migration
```
