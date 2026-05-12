# Testing Patterns

> Every module ships with tests. Every phase has a test gate. Project not done until tests pass.

## Test Layers

| Layer | Tests | Deps | Speed | When |
|-------|-------|------|-------|------|
| **Unit** | Single function/class | All mocked | ms | Every module |
| **Integration** | Request → handler → service → response | Mock services injected | ms | Every route |
| **E2E** | Full stack | Live emulators (local-dev) | s | When emulators up |

**Unit**: service abstraction methods (mock storage/DB/cache), config loading, validation schemas, error types + handler, handler logic with injected mocks, utilities.

**Integration**: HTTP request → handler → mock service → response. Verify status codes (200/201/400/404/422/500), shapes, validation rejection, error handling.

**E2E**: full DB round-trip, file upload→storage→retrieval, cache set/get, health check with live services.

---

## Test Runners

### Node.js (TypeScript)

| Runner | Setup | Config | Command |
|--------|-------|--------|---------|
| **vitest** | `npm i -D vitest` | `vitest.config.ts` | `npx vitest run` |
| **jest** | `npm i -D jest ts-jest @types/jest` | `jest.config.ts` | `npx jest` |
| **mocha+chai+sinon** | `npm i -D mocha chai sinon tsx @types/{mocha,chai,sinon}` | `.mocharc.yml` | `npx mocha` |

Mocks: vitest `vi.mock()`, jest `jest.mock()`, mocha sinon. Assertions: vitest/jest built-in `expect`, mocha chai `expect`.

**vitest config**:
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true, environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: { provider: 'v8', include: ['src/**/*.ts'], exclude: ['src/**/interfaces/**'] }
  }
});
```

Jest: `preset: 'ts-jest'`, `testEnvironment: 'node'`, `testMatch: ['**/*.test.ts']`. Mocha `.mocharc.yml`: `require: [tsx]`, `spec: 'tests/**/*.test.ts'`.

### .NET

| Runner | NuGet | Command |
|--------|-------|---------|
| **xUnit** | `xunit`, `xunit.runner.visualstudio`, `Microsoft.NET.Test.Sdk` | `dotnet test` |
| **NUnit** | `NUnit`, `NUnit3TestAdapter`, `Microsoft.NET.Test.Sdk` | `dotnet test` |

Mocks: Moq or NSubstitute. Assertions: built-in `Assert` or FluentAssertions.

---

## Mock Data

**Fixture JSON** (`tests/fixtures/items.json`): `{ "validItems": […], "invalidItems": […] }` with realistic data for happy/error paths.

**Factory functions** (`tests/fixtures/itemFactory.ts`):
```typescript
let counter = 0;
export function createMockItem(overrides?: Partial<Item>): Item {
  counter++;
  return {
    id: `item-${counter.toString().padStart(3, '0')}`,
    name: `Test Item ${counter}`, price: 9.99 + counter, category: 'test',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    ...overrides
  };
}
```

C#: static class with `CreateValidItem(string? id = null) => new Item { … }` and `CreateItemList(int count)` via `Enumerable.Range`.

## Service Mocking

### TypeScript

```typescript
// tests/mocks/mockDatabase.ts
export function createMockDatabase(initial: Item[] = []): IDatabaseService {
  const store = new Map<string, Item>(initial.map(i => [i.id, i]));
  return {
    findAll: async () => [...store.values()],
    findById: async (id) => store.get(id) ?? null,
    create: async (item) => { store.set(item.id, item); return item; },
    update: async (id, data) => {
      const existing = store.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
      store.set(id, updated); return updated;
    },
    delete: async (id) => store.delete(id),
    healthCheck: async () => true
  };
}

// vitest example
describe('getItems', () => {
  it('returns all items', async () => {
    const db = createMockDatabase([createMockItem(), createMockItem()]);
    expect(await db.findAll()).toHaveLength(2);
  });
});
```

Mocha+chai+sinon: `import { expect } from 'chai'`, `to.have.lengthOf(2)`, `afterEach(() => sinon.restore())`.

### C# (xUnit + Moq)

```csharp
public class GetItemsTests {
    [Fact]
    public async Task GetItems_ReturnsAll() {
        var db = new Mock<IDatabaseService>();
        db.Setup(d => d.FindAllAsync()).ReturnsAsync(ItemFixtures.CreateItemList(3));
        Assert.Equal(3, (await db.Object.FindAllAsync()).Count);
    }
}
```

---

## Test Gate Enforcement

1. **Run**: `npm test` / `dotnet test`
2. **Pass** → mark phase items complete in `.azure/project-plan.md` → proceed.
3. **Fail** → read output, identify code vs test bug, fix, re-run, repeat until green.

> **NEVER skip a gate.** If unfixable after reasonable effort, report failure to user.

## Coverage Guidance

No hard thresholds. Ensure:
- Every handler has happy-path + error-path test
- Every service method tested via mocks
- Every validation schema has valid + invalid input tests
- Every error type tested for correct HTTP mapping
- Edge cases (empty, null, boundary, special chars)

Goal: **meaningful coverage**, not a percentage.

## Test Naming

| Runtime | Pattern | Example |
|---------|---------|---------|
| TypeScript | `it('should {behavior} when {condition}')` | `it('should return 404 when item not found')` |
| C# | `{Method}_{Condition}_{Expected}` | `GetItemById_ItemNotFound_Returns404()` |

Good: `should return 422 when name is empty`. Bad: `test1`, `works`.

---

## Frontend Testing

> Frontend has its own gate at Step 11.

### Minimum Coverage

| Category | Test | Why |
|----------|------|-----|
| Auth flow | Login success/failure, logout, token expiry redirect | Security boundary |
| Protected routes | Unauthed user redirected to /login | Route protection works |
| Data display | List renders items from mock API | Core feature |
| Error states | Error message shown when API errors | Users see failures |
| Form validation | Invalid input feedback before submit | UX quality |
| Destructive actions | Delete shows confirmation | Data safety |

### Setup (React + Vitest)

```typescript
// tests/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';
global.fetch = vi.fn();
export const mockFetchSuccess = (body: unknown, status = 200) =>
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, status, json: async () => body });
export const mockFetchError = (status: number, error: { code: string; message: string }) =>
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, status, json: async () => ({ error: { ...error, details: null } }) });
```

### Component Test

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockFetchSuccess, mockFetchError } from '../setup';

describe('ItemListPage', () => {
  it('renders items from API', async () => {
    mockFetchSuccess({ items: [{ id: '1', name: 'Widget', price: 9.99 }], total: 1 });
    render(<MemoryRouter><ItemListPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Widget')).toBeInTheDocument());
  });

  it('shows error when API fails', async () => {
    mockFetchError(500, { code: 'INTERNAL_ERROR', message: 'Server error' });
    render(<MemoryRouter><ItemListPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/something went wrong/i)).toBeInTheDocument());
  });
});
```

### Auth Flow Test

`mockFetchSuccess({ user, token })` on login → assert token stored + user set. `mockFetchError(401, …)` on authed request → assert redirect to `/login`. Logout → assert token removed + user null.

See [frontend-patterns.md](frontend-patterns.md) for full frontend architecture.
