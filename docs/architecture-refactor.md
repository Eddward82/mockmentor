# Architecture Refactor Plan

This branch introduces an initial architecture refactor planning document to guide future implementation.

## Goals

- Improve separation of concerns across UI components and services.
- Reduce direct coupling between components and persistence/payment providers.
- Create clearer module boundaries to simplify testing and maintenance.

## Proposed Module Boundaries

1. **Domain Layer (`core/`)**
   - Pure business logic and domain types.
   - No framework or API provider dependencies.

2. **Application Layer (`application/`)**
   - Use-case orchestration (interview lifecycle, plan selection, session recovery).
   - Depends on domain abstractions and interfaces.

3. **Infrastructure Layer (`infrastructure/`)**
   - Concrete adapters for Firebase, Gemini, payment providers, and local persistence.
   - Implements interfaces defined in domain/application layers.

4. **Presentation Layer (`components/`, `App.tsx`)**
   - React views and interaction wiring.
   - Delegates business actions to application services.

## Suggested First Steps

- Define service interfaces for AI generation, persistence, and billing.
- Introduce dependency injection via a lightweight composition root.
- Move interview flow orchestration out of components into application services.
- Keep current public APIs stable while migrating incrementally.

## Migration Strategy

- Adopt a strangler pattern: migrate one flow at a time.
- Add tests around existing behavior before moving logic.
- Replace direct imports of infrastructure services with interface-based dependencies.

