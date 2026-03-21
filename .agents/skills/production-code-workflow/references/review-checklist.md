# Multi-Language Code Review Checklist

## Placeholder Detection Patterns by Language

### Universal Patterns (All Languages)

```
// CRITICAL - TODO/FIXME Comments
// TODO: implement this
# TODO: implement this
// FIXME: fix this
// HACK: workaround
// XXX: needs attention

// CRITICAL - Deferred Implementation
// In production, this should...
// For now, we just...
// Temporary solution
// Full implementation requires...
// Implement this later

// CRITICAL - Mock/Stub Classes
class MockUserService { }
class FakeRepository { }
class StubClient { }

// BLOCKER - Hardcoded Secrets
password = "secret123"
apiKey = "sk-1234567890"
connectionString = "Server=localhost;Password=admin"
```

### Java

```java
// CRITICAL - Not Implemented
throw new UnsupportedOperationException();
throw new UnsupportedOperationException("Not yet implemented");
throw new RuntimeException("TODO");
throw new RuntimeException("Not implemented");

// CRITICAL - Empty Implementations
public void doSomething() { }
catch (Exception e) { }

// MAJOR - Debug Logging
System.out.println("debug");
System.err.println("error");
e.printStackTrace();

// MAJOR - Code Quality
@SuppressWarnings("unchecked")  // without justification
return null;  // verify intentional
```

### Scala

```scala
// CRITICAL - Placeholders
???                                    // Triple question mark
throw new NotImplementedError()
throw new NotImplementedError("TODO")
sys.error("TODO")
sys.error("not implemented")

// MAJOR - Debug/Style
println("debug")                       // Use proper logging
null                                   // Prefer Option[T]
var x = ...                            // Prefer val

// MINOR - Type Safety
: Any                                  // Use specific type
: AnyRef                               // Use specific type
```

### Kotlin

```kotlin
// CRITICAL - Placeholders
TODO()
TODO("Not yet implemented")
throw NotImplementedError()

// MAJOR - Debug Logging
println("debug")                       // Use proper logging
```

### C#

```csharp
// CRITICAL - Not Implemented
throw new NotImplementedException();
throw new NotImplementedException("TODO");
=> throw new NotImplementedException();
throw new NotSupportedException();

// CRITICAL - Empty/Placeholder
public void DoSomething() { }
catch (Exception) { }
return default;
return null;  // without nullable context

// MAJOR - Debug Logging
Console.WriteLine("debug");
Debug.WriteLine("debug");
Trace.WriteLine("debug");

// MAJOR - Async Issues
.Wait();
.Result;
.GetAwaiter().GetResult();
Thread.Sleep(1000);

// MAJOR - Suppression
#pragma warning disable              // without justification
[SuppressMessage(...)]               // without justification
```

### Python

```python
# CRITICAL - Not Implemented
raise NotImplementedError()
raise NotImplementedError("TODO")
pass                                   # Empty function body
...                                    # Ellipsis placeholder

# MAJOR - Debug/Quality
print("debug")                         # Use logging module
except:                                # Bare except
except Exception: pass                 # Swallowed exception
# type: ignore                         # without specific code

# MAJOR - Debug Tools
breakpoint()
pdb.set_trace()
ipdb.set_trace()
```

### TypeScript / JavaScript

```typescript
// CRITICAL - Not Implemented
throw new Error("Not implemented");
throw new Error("TODO");

// MAJOR - Debug
console.log("debug");
console.debug("debug");
debugger;
alert("message");

// MAJOR - Type Safety (TypeScript)
// @ts-ignore                          // without justification
// @ts-expect-error                    // without justification
: any                                  // Avoid any type

// MAJOR - Suppression
// eslint-disable                      // without justification
```

### Go

```go
// CRITICAL - Placeholders
panic("not implemented")
panic("TODO")
panic("unimplemented")

// MAJOR - Debug Logging
fmt.Println("debug")                   // Use structured logging
fmt.Printf("debug")
log.Println("debug")                   // Use zap/zerolog

// MAJOR - Error Handling
_ = someFunction()                     // Ignored error
```

### Rust

```rust
// CRITICAL - Placeholders
todo!()
todo!("implement this")
unimplemented!()
panic!("not implemented")
panic!("TODO")

// MAJOR - Debug/Quality
println!("debug");                     // Use tracing/log crate
.unwrap()                              // Use ? operator
.expect("TODO")                        // Placeholder expect

// MAJOR - Suppression
#[allow(...)]                          // without justification
```

## Production Readiness Checklist

### 1. Error Handling

```
[ ] All external calls wrapped in try/catch (or equivalent)
[ ] Specific exception types used (not generic catch-all)
[ ] Errors logged with context before re-throwing
[ ] User-facing errors have sanitized messages
[ ] No swallowed exceptions (empty catch blocks)
[ ] Retry logic for transient failures where appropriate
```

**Language-Specific:**

| Language | Anti-Pattern | Correct Pattern |
|----------|--------------|-----------------|
| Java | `catch (Exception e) { }` | Log + handle or rethrow |
| Scala | `Try { }.getOrElse(default)` without logging | Log failures |
| C# | `catch { }` | Use `ILogger` |
| Python | `except: pass` | Catch specific, log |
| Go | `_ = err` | Always handle errors |
| Rust | `.unwrap()` | Use `?` operator |

### 2. Input Validation

```
[ ] All public API inputs validated
[ ] Validation at system boundaries
[ ] Clear error messages for invalid input
[ ] Type checking enforced
[ ] Range/bounds checking for numerics
[ ] Size limits for strings, arrays, files
```

**Validation Frameworks:**

| Language | Framework |
|----------|-----------|
| Java | Bean Validation (JSR-380) |
| Scala | Cats Validated, Refined |
| C# | FluentValidation, DataAnnotations |
| Python | Pydantic, marshmallow |
| TypeScript | Zod, Yup, class-validator |
| Go | go-playground/validator |

### 3. Security

```
[ ] No hardcoded credentials/secrets
[ ] Secrets from environment/config/vault
[ ] SQL injection prevented (parameterized queries)
[ ] XSS prevention (output encoding)
[ ] Input sanitization
[ ] Authentication on protected routes
[ ] Authorization checks for resources
[ ] HTTPS enforced
[ ] Sensitive data not logged
```

**Parameterized Query Examples:**

| Language | Wrong | Right |
|----------|-------|-------|
| Java | `"SELECT * FROM users WHERE id = '" + id + "'"` | `PreparedStatement` with `?` |
| Scala | String interpolation in SQL | Doobie/Slick parameterized |
| C# | `ExecuteSqlRaw($"... {id}")` | `ExecuteSqlInterpolated` or parameters |
| Python | `f"SELECT ... {id}"` | `cursor.execute(sql, (id,))` |
| Go | `fmt.Sprintf` in SQL | `db.Query(sql, id)` |

### 4. Resource Management

```
[ ] Connections properly pooled and released
[ ] Files/streams closed (try-with-resources, using, defer, etc.)
[ ] Network connections have timeouts
[ ] Background tasks can be cancelled
[ ] Memory usage bounded
[ ] Temporary resources cleaned up
```

**Resource Cleanup Patterns:**

| Language | Pattern |
|----------|---------|
| Java | try-with-resources |
| Scala | `Using`, `Resource`, bracket |
| C# | `using` / `await using` |
| Python | `with` / `async with` |
| Go | `defer` |
| Rust | RAII / `Drop` trait |

### 5. Logging

```
[ ] Proper logging framework (not print/console)
[ ] Appropriate log levels used
[ ] Structured logging with context
[ ] Correlation IDs for tracing
[ ] Sensitive data NOT logged
[ ] Exceptions logged with stack traces
```

**Logging Frameworks:**

| Language | Framework |
|----------|-----------|
| Java | SLF4J + Logback |
| Scala | scala-logging, log4cats |
| C# | ILogger<T>, Serilog |
| Python | logging module |
| TypeScript | winston, pino |
| Go | zap, zerolog |
| Rust | tracing, log |

### 6. Async/Concurrency

```
[ ] Async operations use proper patterns (not blocking)
[ ] Cancellation tokens/contexts propagated
[ ] Thread-safe collections for shared state
[ ] No race conditions in critical sections
[ ] Deadlock potential analyzed
[ ] Proper synchronization primitives
```

**Anti-Patterns:**

| Language | Anti-Pattern | Correct |
|----------|--------------|---------|
| Java | `future.get()` blocking | `CompletableFuture` composition |
| Scala | `Await.result()` | `flatMap`, for-comprehension |
| C# | `.Wait()`, `.Result` | `await` |
| Python | Blocking in async | `await` |
| Go | Unbuffered channel deadlock | Proper channel patterns |

### 7. Documentation

```
[ ] Public APIs documented
[ ] Complex algorithms explained
[ ] Non-obvious behavior documented
[ ] Configuration options documented
[ ] README with setup instructions
```

**Documentation Formats:**

| Language | Format |
|----------|--------|
| Java | Javadoc |
| Scala | Scaladoc |
| C# | XML comments (`///`) |
| Python | Docstrings (Google/NumPy style) |
| TypeScript | TSDoc / JSDoc |
| Go | GoDoc |
| Rust | rustdoc (`///`) |

## Issue Severity Classification

| Severity | Criteria | Examples |
|----------|----------|----------|
| **BLOCKER** | Security vulnerability, data loss | Hardcoded secrets, SQL injection |
| **CRITICAL** | Placeholder code, incomplete | `???`, `NotImplementedException`, empty methods |
| **MAJOR** | Quality issues, debug artifacts | `println`, missing error handling |
| **MINOR** | Style, minor improvements | Magic numbers, missing docs |

## Review Verdict Rules

| Verdict | Condition |
|---------|-----------|
| **BLOCKED** | Any BLOCKER issues |
| **NEEDS_FIXES** | Any CRITICAL issues, or >3 MAJOR |
| **APPROVED** | No BLOCKER/CRITICAL, ≤3 MAJOR |

## Review Output Template

```markdown
## Code Review Report

### Summary
- **Language**: [detected]
- **Files Reviewed**: [count]
- **Review Status**: [APPROVED | NEEDS_FIXES | BLOCKED]

### Issues Found

#### BLOCKER (n)
[List or "None"]

#### CRITICAL (n)
[List or "None"]

#### MAJOR (n)
[List or "None"]

#### MINOR (n)
[List or "None"]

### Recommendations
[Specific fixes required, ordered by priority]
```
