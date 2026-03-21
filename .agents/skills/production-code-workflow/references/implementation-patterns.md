# Multi-Language Implementation Patterns

## Error Handling Patterns

### Java

```java
// Custom exception hierarchy
public abstract class DomainException extends RuntimeException {
    private final String code;

    protected DomainException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() { return code; }
}

public class NotFoundException extends DomainException {
    public NotFoundException(String resourceType, String id) {
        super("NOT_FOUND", resourceType + " with id '" + id + "' not found");
    }
}

// Service with proper error handling
@Service
@Slf4j
public class UserService {
    private final UserRepository repository;

    public UserService(UserRepository repository) {
        this.repository = Objects.requireNonNull(repository);
    }

    public User getUser(String userId) {
        if (userId == null || userId.isBlank()) {
            throw new ValidationException("userId", "User ID is required");
        }

        log.info("Retrieving user: {}", userId);

        return repository.findById(userId)
            .orElseThrow(() -> new NotFoundException("User", userId));
    }
}
```

### Scala

```scala
// Error handling with Either
sealed trait DomainError
case class NotFound(resource: String, id: String) extends DomainError
case class ValidationError(field: String, message: String) extends DomainError

// Service with proper error handling
class UserService(repository: UserRepository)(implicit ec: ExecutionContext) {
  private val logger = LoggerFactory.getLogger(getClass)

  def getUser(userId: String): Future[Either[DomainError, User]] = {
    if (userId.isBlank) {
      Future.successful(Left(ValidationError("userId", "User ID is required")))
    } else {
      logger.info(s"Retrieving user: $userId")
      repository.findById(userId).map {
        case Some(user) => Right(user)
        case None => Left(NotFound("User", userId))
      }
    }
  }
}

// With ZIO
def getUser(userId: String): ZIO[UserRepository, DomainError, User] =
  for {
    _ <- ZIO.when(userId.isBlank)(ZIO.fail(ValidationError("userId", "required")))
    _ <- ZIO.logInfo(s"Retrieving user: $userId")
    user <- UserRepository.findById(userId)
      .someOrFail(NotFound("User", userId))
  } yield user
```

### C#

```csharp
// Exception hierarchy
public abstract class DomainException : Exception
{
    public string Code { get; }

    protected DomainException(string code, string message) : base(message)
    {
        Code = code;
    }
}

public class NotFoundException : DomainException
{
    public NotFoundException(string resourceType, string id)
        : base("NOT_FOUND", $"{resourceType} with id '{id}' not found") { }
}

// Service with proper error handling
public class UserService : IUserService
{
    private readonly IUserRepository _repository;
    private readonly ILogger<UserService> _logger;

    public UserService(IUserRepository repository, ILogger<UserService> logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<User> GetUserAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ValidationException("userId", "User ID is required");

        _logger.LogInformation("Retrieving user: {UserId}", userId);

        var user = await _repository.GetByIdAsync(userId, ct);
        return user ?? throw new NotFoundException("User", userId);
    }
}
```

### Python

```python
from dataclasses import dataclass
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Exception hierarchy
class DomainError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        super().__init__(message)

class NotFoundError(DomainError):
    def __init__(self, resource_type: str, resource_id: str):
        super().__init__("NOT_FOUND", f"{resource_type} with id '{resource_id}' not found")

class ValidationError(DomainError):
    def __init__(self, field: str, message: str):
        super().__init__("VALIDATION_ERROR", f"Validation failed for '{field}': {message}")

# Service with proper error handling
class UserService:
    def __init__(self, repository: UserRepository):
        self._repository = repository

    async def get_user(self, user_id: str) -> User:
        if not user_id or not user_id.strip():
            raise ValidationError("user_id", "User ID is required")

        logger.info("Retrieving user: %s", user_id)

        user = await self._repository.get_by_id(user_id)
        if user is None:
            raise NotFoundError("User", user_id)
        return user
```

### TypeScript

```typescript
// Error classes
export class DomainError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends DomainError {
  constructor(resourceType: string, id: string) {
    super('NOT_FOUND', `${resourceType} with id '${id}' not found`);
  }
}

// Service with proper error handling
export class UserService {
  constructor(
    private readonly repository: UserRepository,
    private readonly logger: Logger
  ) {}

  async getUser(userId: string): Promise<User> {
    if (!userId?.trim()) {
      throw new ValidationError('userId', 'User ID is required');
    }

    this.logger.info('Retrieving user', { userId });

    const user = await this.repository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }
    return user;
  }
}
```

### Go

```go
// Error types
type DomainError struct {
    Code    string
    Message string
}

func (e *DomainError) Error() string {
    return e.Message
}

func NewNotFoundError(resourceType, id string) *DomainError {
    return &DomainError{
        Code:    "NOT_FOUND",
        Message: fmt.Sprintf("%s with id '%s' not found", resourceType, id),
    }
}

// Service with proper error handling
type UserService struct {
    repository UserRepository
    logger     *zap.Logger
}

func (s *UserService) GetUser(ctx context.Context, userID string) (*User, error) {
    if strings.TrimSpace(userID) == "" {
        return nil, &ValidationError{Field: "userID", Message: "required"}
    }

    s.logger.Info("Retrieving user", zap.String("userID", userID))

    user, err := s.repository.FindByID(ctx, userID)
    if err != nil {
        return nil, fmt.Errorf("failed to get user: %w", err)
    }
    if user == nil {
        return nil, NewNotFoundError("User", userID)
    }
    return user, nil
}
```

## Input Validation Patterns

### Java (Bean Validation)

```java
public record CreateUserRequest(
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    String email,

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be 3-50 characters")
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Invalid username format")
    String username,

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    String password
) {}
```

### Scala (Cats Validated)

```scala
import cats.data.ValidatedNec
import cats.syntax.all._

case class CreateUserRequest(email: String, username: String, password: String)

type ValidationResult[A] = ValidatedNec[String, A]

def validateEmail(email: String): ValidationResult[String] =
  if (email.contains("@")) email.validNec
  else "Invalid email format".invalidNec

def validateUsername(username: String): ValidationResult[String] =
  if (username.length >= 3 && username.matches("^[a-zA-Z0-9_]+$"))
    username.validNec
  else "Invalid username".invalidNec

def validateRequest(req: CreateUserRequest): ValidationResult[CreateUserRequest] =
  (validateEmail(req.email), validateUsername(req.username), req.password.validNec)
    .mapN(CreateUserRequest.apply)
```

### C# (FluentValidation)

```csharp
public class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Invalid email format");

        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("Username is required")
            .MinimumLength(3).MaximumLength(50)
            .Matches(@"^[a-zA-Z0-9_]+$").WithMessage("Invalid username format");

        RuleFor(x => x.Password)
            .NotEmpty().MinimumLength(8);
    }
}
```

### Python (Pydantic)

```python
from pydantic import BaseModel, Field, EmailStr, validator

class CreateUserRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50, pattern=r'^[a-zA-Z0-9_]+$')
    password: str = Field(..., min_length=8)

    @validator('password')
    def password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain uppercase')
        return v
```

### TypeScript (Zod)

```typescript
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string()
    .min(3, 'Username too short')
    .max(50, 'Username too long')
    .regex(/^[a-zA-Z0-9_]+$/, 'Invalid username format'),
  password: z.string().min(8, 'Password too short'),
});

type CreateUserRequest = z.infer<typeof CreateUserSchema>;
```

## Logging Patterns

### Java (SLF4J/Logback)

```java
@Slf4j
public class OrderService {
    public Order createOrder(CreateOrderRequest request) {
        log.info("Creating order for customer: {}", request.customerId());

        try {
            Order order = processOrder(request);
            log.info("Order created: {} total: {}", order.getId(), order.getTotal());
            return order;
        } catch (Exception e) {
            log.error("Failed to create order for customer: {}", request.customerId(), e);
            throw e;
        }
    }
}
```

### Scala (scala-logging)

```scala
import com.typesafe.scalalogging.LazyLogging

class OrderService extends LazyLogging {
  def createOrder(request: CreateOrderRequest): Future[Order] = {
    logger.info(s"Creating order for customer: ${request.customerId}")

    processOrder(request).map { order =>
      logger.info(s"Order created: ${order.id} total: ${order.total}")
      order
    }.recover { case e =>
      logger.error(s"Failed to create order for customer: ${request.customerId}", e)
      throw e
    }
  }
}
```

### C# (ILogger)

```csharp
public class OrderService
{
    private readonly ILogger<OrderService> _logger;

    public async Task<Order> CreateOrderAsync(CreateOrderRequest request)
    {
        _logger.LogInformation("Creating order for customer: {CustomerId}", request.CustomerId);

        try
        {
            var order = await ProcessOrderAsync(request);
            _logger.LogInformation("Order created: {OrderId} total: {Total}", order.Id, order.Total);
            return order;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create order for customer: {CustomerId}", request.CustomerId);
            throw;
        }
    }
}
```

### Python (logging)

```python
import logging

logger = logging.getLogger(__name__)

class OrderService:
    async def create_order(self, request: CreateOrderRequest) -> Order:
        logger.info("Creating order for customer: %s", request.customer_id)

        try:
            order = await self._process_order(request)
            logger.info("Order created: %s total: %s", order.id, order.total)
            return order
        except Exception as e:
            logger.error("Failed to create order for customer: %s", request.customer_id, exc_info=True)
            raise
```

### Go (zap)

```go
func (s *OrderService) CreateOrder(ctx context.Context, req CreateOrderRequest) (*Order, error) {
    s.logger.Info("Creating order", zap.String("customerId", req.CustomerID))

    order, err := s.processOrder(ctx, req)
    if err != nil {
        s.logger.Error("Failed to create order",
            zap.String("customerId", req.CustomerID),
            zap.Error(err))
        return nil, err
    }

    s.logger.Info("Order created",
        zap.String("orderId", order.ID),
        zap.Float64("total", order.Total))
    return order, nil
}
```

## Repository Pattern

### Java

```java
public interface UserRepository {
    Optional<User> findById(String id);
    List<User> findAll(int page, int size);
    User save(User user);
    void deleteById(String id);
}

@Repository
public class JpaUserRepository implements UserRepository {
    private final JpaUserEntityRepository jpaRepository;
    private final UserMapper mapper;

    @Override
    public Optional<User> findById(String id) {
        return jpaRepository.findById(id).map(mapper::toDomain);
    }
}
```

### Scala

```scala
trait UserRepository[F[_]] {
  def findById(id: String): F[Option[User]]
  def findAll(page: Int, size: Int): F[List[User]]
  def save(user: User): F[User]
  def delete(id: String): F[Unit]
}

class DoobieUserRepository[F[_]: Async](xa: Transactor[F]) extends UserRepository[F] {
  def findById(id: String): F[Option[User]] =
    sql"SELECT * FROM users WHERE id = $id".query[User].option.transact(xa)
}
```

### C#

```csharp
public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<IReadOnlyList<T>> GetAllAsync(int page, int size, CancellationToken ct = default);
    Task<T> AddAsync(T entity, CancellationToken ct = default);
    Task DeleteAsync(string id, CancellationToken ct = default);
}

public class EfRepository<T> : IRepository<T> where T : class
{
    protected readonly DbContext _context;

    public virtual async Task<T?> GetByIdAsync(string id, CancellationToken ct = default)
        => await _context.Set<T>().FindAsync(new object[] { id }, ct);
}
```

### TypeScript

```typescript
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(page: number, size: number): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
}

class PrismaUserRepository implements Repository<User> {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
```

## Configuration Pattern

### Java (Spring)

```java
@Configuration
@ConfigurationProperties(prefix = "app.database")
@Validated
public class DatabaseProperties {
    @NotBlank
    private String url;

    @Min(1) @Max(100)
    private int poolSize = 10;

    // getters and setters
}
```

### Scala (PureConfig)

```scala
import pureconfig._
import pureconfig.generic.auto._

case class DatabaseConfig(url: String, poolSize: Int = 10)
case class AppConfig(database: DatabaseConfig)

val config = ConfigSource.default.loadOrThrow[AppConfig]
```

### C# (IOptions)

```csharp
public class DatabaseSettings
{
    public const string SectionName = "Database";

    [Required]
    public string ConnectionString { get; init; } = string.Empty;

    [Range(1, 100)]
    public int PoolSize { get; init; } = 10;
}

// Registration
services.AddOptions<DatabaseSettings>()
    .BindConfiguration(DatabaseSettings.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();
```

### Python (Pydantic Settings)

```python
from pydantic_settings import BaseSettings

class DatabaseSettings(BaseSettings):
    url: str
    pool_size: int = 10

    class Config:
        env_prefix = "DATABASE_"
```

### Go

```go
type DatabaseConfig struct {
    URL      string `env:"DATABASE_URL,required"`
    PoolSize int    `env:"DATABASE_POOL_SIZE" envDefault:"10"`
}

func LoadConfig() (*DatabaseConfig, error) {
    var cfg DatabaseConfig
    if err := env.Parse(&cfg); err != nil {
        return nil, fmt.Errorf("failed to parse config: %w", err)
    }
    return &cfg, nil
}
```
