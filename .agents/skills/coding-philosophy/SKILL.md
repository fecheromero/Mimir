---
name: coding-philosophy
description: Core coding principles emphasizing clean abstractions, OOP alignment, minimal comments, isolation, and expressive design patterns. Use for all development work - backend (class-based models with parse/unparse stages) and frontend (functional components with service/model layers).
---

# Coding Philosophy

Personal coding principles applied across all projects, emphasizing clarity through abstraction over comments.

## Core Principles

### 1. Self-Documenting Code Over Comments

```python
# ❌ Bad: Comments explaining what code does
# Check if user has admin role
if user.role == 'admin':
    # Allow access
    return True

# ✅ Good: Code that explains itself
def has_admin_privileges(user: User) -> bool:
    return user.is_admin()
```

**Guidelines:**
- Use expressive names (functions, variables, classes)
- Extract complex logic into named functions
- Comments only for **why**, never **what**
- Keep comments for business rules, non-obvious decisions, or gotchas

### 2. Strong Abstractions and Isolation

**Separation of Concerns:**
- Each module/class has a single, clear responsibility
- No God objects or classes that do everything
- Layers communicate through well-defined interfaces

```python
# ❌ Bad: Mixed concerns
class UserHandler:
    def save_user(self, data):
        # Validation
        if not data.get('email'):
            raise ValueError()
        # Database logic
        db.execute("INSERT INTO users...")
        # Email notification
        send_email(data['email'])

# ✅ Good: Separated concerns
class UserValidator:
    def validate(self, data: dict) -> None:
        if not data.get('email'):
            raise ValidationError("Email required")

class UserRepository:
    def save(self, user: User) -> User:
        # Pure database logic
        return self._db.insert(user)

class UserNotifier:
    def notify_registration(self, user: User) -> None:
        self._email_service.send(user.email, "Welcome!")
```

### 3. OOP Alignment - Class-Based Models

**Philosophy:** Objects = State + Behavior in the same place

```python
# ❌ Bad: Anemic domain model (data class with external logic)
@dataclass
class Order:
    items: list[dict]
    total: float

def calculate_total(order: Order) -> float:
    return sum(item['price'] * item['qty'] for item in order.items)

# ✅ Good: Rich domain model (behavior with state)
class Order:
    def __init__(self, items: list[OrderItem]):
        self._items = items

    def calculate_total(self) -> float:
        return sum(item.subtotal() for item in self._items)

    def add_item(self, item: OrderItem) -> None:
        self._items.append(item)

    def is_eligible_for_discount(self) -> bool:
        return self.calculate_total() > 100
```

**File Structure:**
- One class per file (except small related classes)
- Filename matches class name: `user_repository.py` → `class UserRepository`
- Group related classes in same directory/module

### 4. Parse/Unparse Stages - Data Transformation Layer

**Critical Pattern:** Explicit boundaries between external data and domain models

```python
# Parse: External → Domain
class User:
    def __init__(self, id: int, email: str, name: str):
        self.id = id
        self.email = email
        self.name = name

    @classmethod
    def from_json(cls, data: dict) -> 'User':
        """Parse: JSON → Domain Object"""
        return cls(
            id=data['id'],
            email=data['email'],
            name=data['name']
        )

    @classmethod
    def from_db_row(cls, row: dict) -> 'User':
        """Parse: Database → Domain Object"""
        return cls(
            id=row['user_id'],
            email=row['user_email'],
            name=row['full_name']
        )

    def to_json(self) -> dict:
        """Unparse: Domain Object → JSON"""
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name
        }

    def to_db_row(self) -> dict:
        """Unparse: Domain Object → Database"""
        return {
            'user_id': self.id,
            'user_email': self.email,
            'full_name': self.name
        }
```

**Benefits:**
- Domain models stay pure and isolated
- Easy to change external schemas without breaking domain logic
- Clear transformation points for validation
- Explicit control over what gets exposed

**Real-world example:**

```python
# API receives GitHub PR data
class PullRequest:
    def __init__(self, number: int, title: str, author: str, branch: str):
        self.number = number
        self.title = title
        self.author = author
        self.branch = branch

    @classmethod
    def from_github_api(cls, gh_data: dict) -> 'PullRequest':
        """Parse: GitHub API → Domain"""
        return cls(
            number=gh_data['number'],
            title=gh_data['title'],
            author=gh_data['user']['login'],
            branch=gh_data['head']['ref']
        )

    @classmethod
    def from_redis(cls, redis_data: dict) -> 'PullRequest':
        """Parse: Redis → Domain"""
        return cls(
            number=int(redis_data['pr_number']),
            title=redis_data['pr_title'],
            author=redis_data['pr_author'],
            branch=redis_data['pr_branch']
        )

    def to_redis(self) -> dict:
        """Unparse: Domain → Redis storage"""
        return {
            'pr_number': str(self.number),
            'pr_title': self.title,
            'pr_author': self.author,
            'pr_branch': self.branch
        }
```

### 5. Expressive Design Patterns

Use patterns to communicate intent, not for the sake of patterns.

#### Strategy Pattern

```python
# Payment processing with different strategies
class PaymentStrategy(ABC):
    @abstractmethod
    def process(self, amount: float) -> PaymentResult:
        pass

class CreditCardPayment(PaymentStrategy):
    def process(self, amount: float) -> PaymentResult:
        # Credit card specific logic
        pass

class PayPalPayment(PaymentStrategy):
    def process(self, amount: float) -> PaymentResult:
        # PayPal specific logic
        pass

class PaymentProcessor:
    def __init__(self, strategy: PaymentStrategy):
        self._strategy = strategy

    def execute(self, amount: float) -> PaymentResult:
        return self._strategy.process(amount)
```

#### Observer Pattern

```python
class EventPublisher:
    def __init__(self):
        self._observers: list[Observer] = []

    def subscribe(self, observer: Observer) -> None:
        self._observers.append(observer)

    def notify(self, event: Event) -> None:
        for observer in self._observers:
            observer.on_event(event)

class UserCreatedObserver(Observer):
    def on_event(self, event: Event) -> None:
        if isinstance(event, UserCreatedEvent):
            self._send_welcome_email(event.user)
```

#### Chain of Responsibility

```python
class ValidationHandler(ABC):
    def __init__(self, next_handler: Optional['ValidationHandler'] = None):
        self._next = next_handler

    def handle(self, data: dict) -> None:
        self._validate(data)
        if self._next:
            self._next.handle(data)

    @abstractmethod
    def _validate(self, data: dict) -> None:
        pass

class EmailValidator(ValidationHandler):
    def _validate(self, data: dict) -> None:
        if not is_valid_email(data.get('email')):
            raise ValidationError("Invalid email")

class PasswordValidator(ValidationHandler):
    def _validate(self, data: dict) -> None:
        if len(data.get('password', '')) < 8:
            raise ValidationError("Password too short")

# Usage
validator = EmailValidator(
    next_handler=PasswordValidator()
)
validator.handle(user_data)
```

#### Decorator Pattern

```python
# Logging decorator
class LoggedRepository:
    def __init__(self, repository: Repository, logger: Logger):
        self._repo = repository
        self._logger = logger

    def save(self, entity: Entity) -> Entity:
        self._logger.info(f"Saving {entity}")
        result = self._repo.save(entity)
        self._logger.info(f"Saved {result.id}")
        return result

# Caching decorator
class CachedRepository:
    def __init__(self, repository: Repository, cache: Cache):
        self._repo = repository
        self._cache = cache

    def get_by_id(self, id: int) -> Optional[Entity]:
        cached = self._cache.get(f"entity:{id}")
        if cached:
            return Entity.from_json(cached)

        entity = self._repo.get_by_id(id)
        if entity:
            self._cache.set(f"entity:{id}", entity.to_json())
        return entity
```

## Essential Patterns for This Project

These patterns are particularly valuable for projects integrating multiple external services (APIs, databases, caches).

### 1. Repository Pattern ⭐⭐

**Purpose:** Abstract data access layer - isolate domain logic from storage details

```python
# repository/pr_repository.py
from abc import ABC, abstractmethod

class PRRepository(ABC):
    """Abstract repository - domain doesn't know about Redis/DB"""

    @abstractmethod
    def find_by_id(self, pr_id: str) -> Optional[PullRequest]:
        pass

    @abstractmethod
    def save(self, pr: PullRequest) -> None:
        pass

    @abstractmethod
    def find_all_watched(self) -> list[PullRequest]:
        pass

class RedisPRRepository(PRRepository):
    """Concrete implementation using Redis"""

    def __init__(self, redis_client: Redis):
        self._redis = redis_client

    def find_by_id(self, pr_id: str) -> Optional[PullRequest]:
        data = self._redis.hgetall(f"pr:{pr_id}")
        if not data:
            return None
        return PullRequest.from_redis(data)

    def save(self, pr: PullRequest) -> None:
        self._redis.hset(
            f"pr:{pr.id}",
            mapping=pr.to_redis()
        )

    def find_all_watched(self) -> list[PullRequest]:
        keys = self._redis.keys("pr:*")
        return [self.find_by_id(key.decode()) for key in keys]

# Usage in service layer
class PRReviewService:
    def __init__(self, pr_repo: PRRepository):  # Depends on abstraction
        self._pr_repo = pr_repo

    def review_pr(self, pr_id: str) -> Review:
        pr = self._pr_repo.find_by_id(pr_id)
        if not pr:
            raise PRNotFoundError(pr_id)
        # Business logic here...
```

**Benefits:**
- Swap Redis → PostgreSQL without changing business logic
- Easy to test with FakeRepository
- Single place to manage queries/storage logic

### 2. Factory Pattern ⭐⭐

**Purpose:** Centralize complex object creation - perfect for parse stages

```python
# factories/pr_factory.py
class PullRequestFactory:
    """Handles complex PR creation from different sources"""

    @staticmethod
    def from_github_api(gh_data: dict) -> PullRequest:
        """Parse GitHub API response → Domain model"""
        return PullRequest(
            id=f"{gh_data['base']['repo']['full_name']}/{gh_data['number']}",
            number=gh_data['number'],
            title=gh_data['title'],
            author=gh_data['user']['login'],
            repo=gh_data['base']['repo']['full_name'],
            state=gh_data['state'],
            base_branch=gh_data['base']['ref'],
            head_branch=gh_data['head']['ref'],
            url=gh_data['html_url'],
            additions=gh_data.get('additions', 0),
            deletions=gh_data.get('deletions', 0),
            changed_files=gh_data.get('changed_files', 0),
            body=gh_data.get('body', ''),
            created_at=datetime.fromisoformat(gh_data['created_at'].replace('Z', '+00:00'))
        )

    @staticmethod
    def from_redis(redis_data: dict) -> PullRequest:
        """Parse Redis hash → Domain model"""
        return PullRequest(
            id=redis_data['pr_id'],
            number=int(redis_data['pr_number']),
            title=redis_data['pr_title'],
            author=redis_data['pr_author'],
            repo=redis_data['pr_repo'],
            state=redis_data['pr_state'],
            base_branch=redis_data.get('base_branch', 'main'),
            head_branch=redis_data.get('head_branch', ''),
            url=redis_data.get('pr_url', ''),
            additions=int(redis_data.get('additions', 0)),
            deletions=int(redis_data.get('deletions', 0)),
            changed_files=int(redis_data.get('changed_files', 0)),
            body=redis_data.get('body', ''),
            created_at=datetime.fromisoformat(redis_data['created_at'])
        )

    @staticmethod
    def create_minimal(repo: str, number: int, title: str) -> PullRequest:
        """Create PR with minimal data (for testing)"""
        return PullRequest(
            id=f"{repo}/{number}",
            number=number,
            title=title,
            author="unknown",
            repo=repo,
            state="open",
            base_branch="main",
            head_branch="feature",
            url="",
            additions=0,
            deletions=0,
            changed_files=0,
            body="",
            created_at=datetime.now()
        )

# Usage
pr = PullRequestFactory.from_github_api(github_response)
pr_cached = PullRequestFactory.from_redis(redis_data)
pr_test = PullRequestFactory.create_minimal("owner/repo", 123, "Fix bug")
```

**Benefits:**
- Complex creation logic isolated from domain model
- Easy to add new sources (from_database, from_webhook)
- Domain model stays clean

### 3. Adapter Pattern ⭐⭐⭐

**Purpose:** Translate external API interfaces to your domain interface

```python
# adapters/github_adapter.py
class GitHubAdapter:
    """Adapts GitHub API to our domain interface"""

    def __init__(self, token: str):
        self._client = Github(token)

    def get_pull_request(self, repo: str, number: int) -> PullRequest:
        """GitHub API → Our PullRequest model"""
        try:
            gh_repo = self._client.get_repo(repo)
            gh_pr = gh_repo.get_pull(number)

            # Adapt GitHub's PR object to our domain model
            return PullRequestFactory.from_github_api(gh_pr.raw_data)
        except GithubException as e:
            raise PRFetchError(f"Failed to fetch PR: {e}")

    def get_pr_diff(self, repo: str, number: int) -> str:
        """Get PR diff content"""
        gh_repo = self._client.get_repo(repo)
        gh_pr = gh_repo.get_pull(number)
        return gh_pr.diff_url  # Or fetch actual diff

# adapters/anthropic_adapter.py
class AnthropicAdapter:
    """Adapts Anthropic API to our LLM interface"""

    def __init__(self, api_key: str):
        self._client = anthropic.Anthropic(api_key=api_key)

    def generate_review(
        self,
        pr: PullRequest,
        diff: str,
        rules: str,
        model: str = "claude-sonnet-4-5-20250929"
    ) -> Review:
        """Generate PR review using Claude"""

        prompt = self._build_prompt(pr, diff, rules)

        response = self._client.messages.create(
            model=model,
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}]
        )

        review_text = response.content[0].text

        # Adapt Anthropic response to our Review model
        return Review(
            id=str(uuid.uuid4()),
            pr_id=pr.id,
            review_text=review_text,
            created_at=datetime.now(),
            status="completed"
        )

    def _build_prompt(self, pr: PullRequest, diff: str, rules: str) -> str:
        return f"""Review this pull request:

Title: {pr.title}
Author: {pr.author}
Changes: +{pr.additions} -{pr.deletions}

Rules:
{rules}

Diff:
{diff}

Provide a detailed review."""

# Usage with dependency injection
class PRReviewService:
    def __init__(
        self,
        github: GitHubAdapter,
        llm: AnthropicAdapter,
        pr_repo: PRRepository
    ):
        self._github = github
        self._llm = llm
        self._pr_repo = pr_repo

    def review(self, pr_id: str) -> Review:
        # Easy to swap GitHub → GitLab, Anthropic → OpenAI
        pr = self._pr_repo.find_by_id(pr_id)
        diff = self._github.get_pr_diff(pr.repo, pr.number)
        rules = self._load_rules()
        return self._llm.generate_review(pr, diff, rules)
```

**Benefits:**
- External APIs isolated from domain
- Easy to swap providers (GitHub → GitLab, Claude → GPT)
- Mock adapters for testing

### 4. Dependency Injection ⭐⭐⭐

**Purpose:** Inject dependencies instead of creating them - enables testing & flexibility

```python
# ❌ Bad: Hard-coded dependencies
class PRReviewService:
    def __init__(self):
        self._github = Github(os.getenv("GITHUB_TOKEN"))  # Hard to test
        self._redis = Redis.from_url(os.getenv("REDIS_URL"))  # Hard to test
        self._llm = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))  # Hard to test

    def review(self, pr_id: str) -> Review:
        # Service is coupled to specific implementations
        pass

# ✅ Good: Dependencies injected
class PRReviewService:
    def __init__(
        self,
        github_adapter: GitHubAdapter,
        llm_adapter: AnthropicAdapter,
        pr_repository: PRRepository,
        storage_service: StorageService
    ):
        self._github = github_adapter
        self._llm = llm_adapter
        self._pr_repo = pr_repository
        self._storage = storage_service

    def review(self, pr_id: str) -> Review:
        pr = self._pr_repo.find_by_id(pr_id)
        diff = self._github.get_pr_diff(pr.repo, pr.number)
        review = self._llm.generate_review(pr, diff, self._load_rules())
        self._storage.save_review(review)
        return review

# Dependency container (manual or use library like dependency-injector)
class Container:
    def __init__(self, config: Settings):
        self._config = config

        # Create adapters
        self._github = GitHubAdapter(config.github_token)
        self._anthropic = AnthropicAdapter(config.anthropic_api_key)

        # Create repositories
        redis_client = Redis.from_url(config.redis_url)
        self._pr_repo = RedisPRRepository(redis_client)

        # Create services
        self._storage = StorageService(base_path=config.storage_path)

    def get_pr_review_service(self) -> PRReviewService:
        return PRReviewService(
            github_adapter=self._github,
            llm_adapter=self._anthropic,
            pr_repository=self._pr_repo,
            storage_service=self._storage
        )

# FastAPI integration
@app.post("/api/pr-reviews/{pr_id:path}/review")
async def trigger_review(pr_id: str, container: Container = Depends(get_container)):
    service = container.get_pr_review_service()
    review = service.review(pr_id)
    return {"review_id": review.id}

# Testing becomes easy
def test_pr_review_service():
    # Mock dependencies
    mock_github = MockGitHubAdapter()
    mock_llm = MockAnthropicAdapter()
    mock_repo = FakePRRepository()
    mock_storage = FakeStorageService()

    # Inject mocks
    service = PRReviewService(
        github_adapter=mock_github,
        llm_adapter=mock_llm,
        pr_repository=mock_repo,
        storage_service=mock_storage
    )

    # Test with full control
    review = service.review("test-pr")
    assert review.status == "completed"
```

**Benefits:**
- Easy to test with mocks
- Easy to swap implementations
- Clear dependencies visible in constructor
- Supports composition over inheritance

### 5. Custom Hooks Pattern (React) ⭐⭐⭐

**Purpose:** Extract and reuse stateful logic across components

```typescript
// hooks/usePRReview.ts
interface UsePRReviewResult {
  review: Review | null
  loading: boolean
  error: Error | null
  generateReview: () => Promise<void>
  deleteReview: (reviewId: string) => Promise<void>
}

export function usePRReview(prId: string): UsePRReviewResult {
  const [review, setReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const generateReview = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await prReviewService.triggerReview(prId)

      // Poll for completion
      const finalReview = await pollUntilComplete(prId, result.review_id)
      setReview(finalReview)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [prId])

  const deleteReview = useCallback(async (reviewId: string) => {
    try {
      await prReviewService.deleteReview(prId, reviewId)
      if (review?.id === reviewId) {
        setReview(null)
      }
    } catch (err) {
      setError(err as Error)
    }
  }, [prId, review])

  return { review, loading, error, generateReview, deleteReview }
}

// hooks/usePRList.ts
export function usePRList() {
  const [prs, setPRs] = useState<PullRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    prReviewService.getWatchedPRs().then((data) => {
      setPRs(data.map(pr => PullRequest.fromJson(pr)))
      setLoading(false)
    })
  }, [])

  const watchPR = useCallback(async (prUrl: string) => {
    const newPR = await prReviewService.watchPR(prUrl)
    setPRs(prev => [...prev, PullRequest.fromJson(newPR)])
  }, [])

  const unwatchPR = useCallback(async (prId: string) => {
    await prReviewService.unwatchPR(prId)
    setPRs(prev => prev.filter(pr => pr.id !== prId))
  }, [])

  return { prs, loading, watchPR, unwatchPR }
}

// hooks/useStructuredReview.ts
export function useStructuredReview(reviewData: ReviewData) {
  const [selectedImprovements, setSelectedImprovements] = useState<string[]>([])
  const [expandedSections, setExpandedSections] = useState({
    dummy: true,
    medium: false,
    experimental: false
  })

  const toggleImprovement = useCallback((id: string, checked: boolean) => {
    setSelectedImprovements(prev =>
      checked ? [...prev, id] : prev.filter(i => i !== id)
    )
  }, [])

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }, [])

  const applySelected = useCallback(async () => {
    // Future: Apply dummy improvements to PR
    const improvements = reviewData.dummy_improvements.filter(imp =>
      selectedImprovements.includes(imp.id)
    )
    await prReviewService.applyImprovements(improvements)
  }, [selectedImprovements, reviewData])

  return {
    selectedImprovements,
    expandedSections,
    toggleImprovement,
    toggleSection,
    applySelected
  }
}

// Component usage - clean and reusable
function PRDetail({ prId }: Props) {
  const { review, loading, generateReview, deleteReview } = usePRReview(prId)

  if (loading) return <Spinner />

  return (
    <div>
      <button onClick={generateReview}>Generate Review</button>
      {review && (
        <>
          <StructuredReview data={review.data} />
          <button onClick={() => deleteReview(review.id)}>Delete</button>
        </>
      )}
    </div>
  )
}

function PRReviewer() {
  const { prs, loading, watchPR, unwatchPR } = usePRList()

  return (
    <div>
      <PRWatchForm onWatch={watchPR} />
      <PRList prs={prs} onUnwatch={unwatchPR} />
    </div>
  )
}
```

**Benefits:**
- Logic reused across components
- Easier to test hooks in isolation
- Components stay focused on UI
- Share stateful behavior without HOCs or render props

## Frontend Principles

### 1. Functional Components Only

```tsx
// ✅ Good: Functional component with hooks
function UserProfile({ userId }: Props) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser(userId)
  }, [userId])

  if (loading) return <Skeleton />
  if (!user) return <NotFound />

  return <ProfileCard user={user} />
}

// ❌ Avoid: Class components (legacy pattern)
class UserProfile extends React.Component {
  // ...
}
```

### 2. Service Objects for API Calls

**Pattern:** Separate API communication from components

```typescript
// services/user_service.ts
class UserService {
  constructor(private apiClient: ApiClient) {}

  async getUser(id: number): Promise<User> {
    const response = await this.apiClient.get(`/users/${id}`)
    return User.fromJson(response.data)
  }

  async updateUser(user: User): Promise<User> {
    const response = await this.apiClient.put(
      `/users/${user.id}`,
      user.toJson()
    )
    return User.fromJson(response.data)
  }

  async deleteUser(id: number): Promise<void> {
    await this.apiClient.delete(`/users/${id}`)
  }
}

// Export singleton
export const userService = new UserService(apiClient)
```

**Component usage:**

```tsx
function UserEditor({ userId }: Props) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    userService.getUser(userId).then(setUser)
  }, [userId])

  const handleSave = async () => {
    if (!user) return
    const updated = await userService.updateUser(user)
    setUser(updated)
  }

  // ...
}
```

### 3. Model Objects to Enrich JSON

**Philosophy:** Don't work with raw JSON - use typed model objects

```typescript
// models/user.ts
export class User {
  constructor(
    public id: number,
    public email: string,
    public firstName: string,
    public lastName: string,
    public createdAt: Date
  ) {}

  // Parse: JSON → Model
  static fromJson(data: any): User {
    return new User(
      data.id,
      data.email,
      data.first_name,
      data.last_name,
      new Date(data.created_at)
    )
  }

  // Unparse: Model → JSON
  toJson(): Record<string, any> {
    return {
      id: this.id,
      email: this.email,
      first_name: this.firstName,
      last_name: this.lastName,
      created_at: this.createdAt.toISOString()
    }
  }

  // Domain logic (behavior + state)
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`
  }

  get initials(): string {
    return `${this.firstName[0]}${this.lastName[0]}`.toUpperCase()
  }

  isRegisteredBefore(date: Date): boolean {
    return this.createdAt < date
  }
}
```

**Component usage:**

```tsx
function UserCard({ user }: { user: User }) {
  return (
    <div className="card">
      <div className="avatar">{user.initials}</div>
      <h3>{user.fullName}</h3>
      <p>{user.email}</p>
      {user.isRegisteredBefore(new Date('2024-01-01')) && (
        <Badge>Early Adopter</Badge>
      )}
    </div>
  )
}
```

### 4. Styling Abstractions

**Prefer component-level abstractions over scattered Tailwind:**

```tsx
// ❌ Bad: Tailwind classes scattered everywhere
function Button({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:bg-gray-600"
    >
      {children}
    </button>
  )
}

// ✅ Good: Reusable component with variants
type ButtonVariant = 'primary' | 'secondary' | 'danger'

const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white'
}

function Button({ variant = 'primary', onClick, children }: Props) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${buttonStyles[variant]}`}
    >
      {children}
    </button>
  )
}
```

**Theme abstraction:**

```typescript
// theme.ts
export const theme = {
  colors: {
    primary: '#2563eb',
    secondary: '#64748b',
    success: '#10b981',
    danger: '#ef4444'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  },
  typography: {
    h1: 'text-3xl font-bold',
    h2: 'text-2xl font-bold',
    body: 'text-base',
    small: 'text-sm text-gray-500'
  }
}
```

## Anti-Patterns to Avoid

### ❌ Commenting Obvious Code

```python
# Bad
# Increment counter
counter += 1

# Get user from database
user = db.get_user(id)
```

### ❌ Mixing Concerns

```python
# Bad: API route doing validation + business logic + email
@app.post('/users')
def create_user(data: dict):
    if not data.get('email'):
        return {'error': 'Invalid'}, 400
    user = User(**data)
    db.save(user)
    send_email(user.email)
    return {'id': user.id}
```

### ❌ Anemic Models

```python
# Bad: Data class with no behavior
@dataclass
class Order:
    total: float
    items: list

# Logic lives elsewhere
def is_eligible_for_discount(order: Order) -> bool:
    return order.total > 100
```

### ❌ Direct JSON Access in Components

```tsx
// Bad: Working with raw API response
function UserProfile({ userData }: { userData: any }) {
  return (
    <div>
      <h1>{userData.first_name} {userData.last_name}</h1>
      <p>Registered: {new Date(userData.created_at).toLocaleDateString()}</p>
    </div>
  )
}

// Good: Using model object
function UserProfile({ user }: { user: User }) {
  return (
    <div>
      <h1>{user.fullName}</h1>
      <p>Registered: {user.createdAt.toLocaleDateString()}</p>
    </div>
  )
}
```

## Checklist for Code Review

**General:**
- [ ] Code is self-documenting (no "what" comments)
- [ ] Each class/module has single responsibility
- [ ] Abstractions hide complexity appropriately
- [ ] Design patterns used where they add clarity

**Backend:**
- [ ] Domain models are rich (state + behavior)
- [ ] Parse/unparse methods for all external data boundaries
- [ ] One class per file (appropriate file names)
- [ ] Repository/Service pattern for data access

**Essential Patterns (Backend):**
- [ ] **Repository Pattern**: Data access abstracted behind interface
  - Abstract base class defines contract (e.g., `PRRepository`)
  - Concrete implementations are swappable (e.g., `RedisPRRepository`)
  - Services depend on abstraction, not implementation
- [ ] **Factory Pattern**: Complex object creation centralized
  - Factories handle parse logic (`from_github_api()`, `from_redis()`)
  - Domain models stay clean (just constructor + methods)
  - Easy to add new sources without changing model
- [ ] **Adapter Pattern**: External APIs isolated from domain
  - Adapters translate external interface → domain interface
  - External libraries (GitHub, Anthropic) only used in adapters
  - Domain code doesn't import third-party API clients
- [ ] **Dependency Injection**: Dependencies injected, not created
  - Services receive dependencies via constructor
  - No `os.getenv()` or direct instantiation inside classes
  - Container/factory creates and wires dependencies
  - Tests inject mocks easily

**Frontend:**
- [ ] Functional components only
- [ ] API calls in service objects
- [ ] Model classes for data enrichment
- [ ] Styling abstracted into reusable components/theme
- [ ] No raw JSON objects in component props

**Essential Patterns (Frontend):**
- [ ] **Custom Hooks**: Stateful logic extracted from components
  - Hooks named `use*` (e.g., `usePRReview`, `usePRList`)
  - Reusable across multiple components
  - Components focused on UI, hooks handle logic/state
  - Hooks return clean interface (`{ data, loading, error, actions }`)
- [ ] **Service Pattern**: API communication isolated
  - Service classes handle all HTTP requests
  - Components never import `fetch()` or API client directly
  - Services return model objects, not raw JSON
- [ ] **Model Pattern**: Domain models in frontend
  - Model classes with `fromJson()` / `toJson()` methods
  - Rich behavior (computed properties, domain methods)
  - TypeScript interfaces for type safety

**Data Transformation:**
- [ ] Parse stage: External data → Domain models (explicit)
- [ ] Unparse stage: Domain models → External format (explicit)
- [ ] No direct mapping in business logic
- [ ] Factories or static methods handle transformation

**Testing:**
- [ ] Dependencies can be mocked (DI used correctly)
- [ ] Adapters have mock/fake implementations
- [ ] Repositories have in-memory test implementations
- [ ] Hooks tested independently from components

## Related Skills

- **pydantic**: Use for backend model validation at parse stage
- **fastapi-templates**: Apply service/repository pattern in FastAPI
- **generic-react-ux-designer**: Apply to frontend component design

## Key Takeaways

### Core Philosophy
1. **Write code that explains itself** - expressive names over comments
2. **Model the domain** - objects = state + behavior together
3. **Explicit boundaries** - parse/unparse at data transformation points
4. **Strong isolation** - each layer only knows about its dependencies, not implementations

### Essential Patterns (Apply These First)
5. **Repository Pattern** - abstract data access, swap storage easily
6. **Factory Pattern** - centralize parse logic, keep models clean
7. **Adapter Pattern** - isolate external APIs from domain
8. **Dependency Injection** - inject dependencies for testability
9. **Custom Hooks (React)** - extract stateful logic, reuse everywhere

### Additional Patterns (Use When Needed)
10. **Strategy** - multiple algorithms for same operation
11. **Observer** - event-driven communication
12. **Chain of Responsibility** - sequential processing with handlers
13. **Decorator** - add behavior dynamically (logging, caching)

### Frontend Principles
14. **Service Layer** - all API calls go through service objects
15. **Model Objects** - enrich JSON with behavior and type safety
16. **Component Abstraction** - reusable components over scattered styles
