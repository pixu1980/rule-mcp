---
name: rule-mcp-backend-nestjs
description: >-
  Use when building NestJS 10+ applications. Covers modular architecture, decorators, dependency injection, guards, interceptors, GraphQL, and microservices.
tags:
  - "nestjs"
  - "decorators"
  - "di"
  - "typescript"
  - "backend"
  - "framework"
  - "api"
  - "graphql"
  - "microservices"
  - "modular"
frameworks: [all]
inherits: [rule-mcp-backend]
---

# rule-mcp-backend-nestjs - NestJS Best Practices

## NestJS Architecture

- **Modular by default** - one module per domain. Never create a single monolithic module
- Feature modules with: `Module`, `Controller`, `Service`, `Dto`, `Entity/Model`
- Shared modules for cross-cutting concerns (auth, logger, database)
- Use `@Global()` sparingly - prefer explicit imports

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([UserRepository])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

## NestJS Controllers

- Lean controllers - route + validate + delegate to service. No business logic
- Use `@Body()`, `@Param()`, `@Query()` DTOs with `class-validator`
- Consistent REST endpoint naming: `/api/v1/resources`
- Version APIs via URL prefix or header

## NestJS Providers & Services

- Single responsibility per service - inject repositories, not other services directly
- Use `@Injectable()` for all providers
- Avoid circular dependencies - restructure modules if detected
- Use `OnModuleInit` / `OnModuleDestroy` for lifecycle hooks

## NestJS Guards & Interceptors

- Global `AuthGuard` for authentication
- `@Roles()` decorator + `RolesGuard` for authorization (RBAC)
- `LoggingInterceptor` for request/response logging
- `TransformInterceptor` for consistent API response shape

```typescript
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(map((data) => ({ success: true, data, timestamp: new Date() })));
  }
}
```

## NestJS Database Integration

- Prefer `TypeORM` or `MikroORM` for relational databases
- `@Entity()` with explicit table names in plural
- Migrations for schema changes - never `synchronize: true` in production
- Use transactions with `@Transactional()` or `QueryRunner`

## NestJS GraphQL Integration

- Code-first approach over schema-first (type-safe by nature)
- `@ObjectType()`, `@Field()`, `@InputType()` for DTOs
- Use DataLoader for N+1 query prevention
- Federation for distributed GraphQL microservices

## NestJS Testing

- Unit: `Test.createTestingModule()` with mocked providers
- E2E: `supertest` + in-memory database
- Coverage targets: unit 80%, integration 60%, e2e critical paths only

## See also

- [rule-mcp](../rule-mcp/SKILL.md) - Central skill index and dispatcher
- [rule-mcp-backend](../rule-mcp-backend/SKILL.md) - Backend umbrella
- [rule-mcp-data-postgresql](../rule-mcp-data-postgresql/SKILL.md) - PostgreSQL
