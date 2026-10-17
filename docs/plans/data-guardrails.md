# rule-data guardrails execution plan

Scope: extend the four guardrails the data area already owns and add
engine-specific rules, each against a citable public source. Implementation
happens in a dedicated session: this document is the plan only.

Companion plans: `docs/plans/devops-guardrails.md`, `docs/plans/backend-guardrails.md`.
Enforcement and delivery follow the devops decisions (advisory first, then
blocking; fixtures, unit tests, inheritance test; census, ADR, changelog,
per-rule source).

## Evidence base

Audited in this session (read-only):

- `skills/rule-data/SKILL.md` and `guardrails/` (connection-pool,
  migration-safety, parameterized-queries, transaction-safety)
- `skills/rule-data-postgresql/SKILL.md` (736 lines)
- `skills/rule-data-mysql/SKILL.md` (633 lines)
- `skills/rule-data-mongodb/SKILL.md` (735 lines)
- `skills/rule-data-sql/SKILL.md` (821 lines)
- `skills/rule-data-sqlite/SKILL.md` (243 lines)
- `skills/rule-data-{duckdb,indexed-db}/SKILL.md` (no guardrails)

Current state: 4 rules, all owned by `rule-data` and inherited by the seven
children through `inherits: [rule-data]`.

Sources fetched and used:

- PostgreSQL indexes, https://www.postgresql.org/docs/current/indexes.html
- Use The Index, Luke, https://use-the-index-luke.com/
- MongoDB indexing strategies, https://www.mongodb.com/docs/manual/applications/indexes/
- MongoDB ESR guideline, https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/
- SQLite WAL, https://sqlite.org/wal.html
- OWASP SQL Injection Prevention, https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
- OWASP API4 Unrestricted Resource Consumption, https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/

## Decisions from the interview

| Question      | Decision                                                              |
| ------------- | --------------------------------------------------------------------- |
| Target skills | `rule-data` shared plus postgres, mongodb, mysql, sqlite, sql           |
| Scope         | High-signal selection (5-7)                                            |
| Candidates    | All nine selected                                                      |
| Trigger       | Devops default: target file or content heuristic                       |
| Severity      | Devops default: advisory, then blocking after corpus proof             |
| Corpus/tests  | Devops default: fixtures, unit tests, inheritance test                 |
| Artifacts     | Devops default: frontmatter, census, ADR, changelog, per-rule source    |
| Phasing       | Plan only now; implementation in a dedicated session                   |

### Open item 1: MySQL has no verified source

`dev.mysql.com` answers HTTP 403 to the fetch used for this plan, so every
MySQL-specific candidate is currently unsourced. Options: cite Use The Index,
Luke (it covers MySQL and is accessible) for the indexing claims, find another
accessible MySQL source, or drop the MySQL-specific rules and keep only the
shared ones on that skill.

### Open item 2: where each rule lives

| Rule id              | Owner                 | Why                                                |
| -------------------- | --------------------- | -------------------------------------------------- |
| `index-on-fk`        | rule-data-postgresql   | PostgreSQL does not auto-index foreign keys        |
| `no-select-star`     | rule-data              | Shared SQL hygiene                                 |
| `query-limit`        | rule-data              | Shared, API4 resource consumption                  |
| `query-timeout`      | rule-data              | Shared driver concern                              |
| `mongo-projection`   | rule-data-mongodb      | MongoDB cursor concern                             |
| `mongo-esr-index`    | rule-data-mongodb      | MongoDB ESR guideline                              |
| `sqlite-wal`         | rule-data-sqlite       | SQLite connection pragmas                          |
| `db-least-privilege` | rule-data              | Shared, applies to every engine                    |
| `migration-down`     | rule-data              | Extends the existing `migration-safety`            |

`rule-data-sql` and `rule-data-mysql` inherit the shared rules and get no rule of
their own in this pass; `rule-data-duckdb` and `rule-data-indexed-db` were not
selected and stay narrative.

### Tiering: nine rules against a 5-7 budget

Tier A: `index-on-fk`, `no-select-star`, `query-limit`, `query-timeout`,
`mongo-projection`, `sqlite-wal`.

Tier B: `mongo-esr-index`, `db-least-privilege`, `migration-down`.

## Accepted rules

| Rule id              | Rejects                                                    | Tier | Source                          |
| -------------------- | ---------------------------------------------------------- | ---- | ------------------------------- |
| `index-on-fk`        | foreign key column with no index                           | A    | PostgreSQL indexes              |
| `no-select-star`     | `SELECT *` in an application query                         | A    | Use The Index, Luke             |
| `query-limit`        | application `SELECT` with no `LIMIT`                       | A    | API4 resource consumption       |
| `query-timeout`      | connection or query with no statement timeout              | A    | PostgreSQL indexes; driver docs |
| `mongo-projection`   | `find()` without a projection                              | A    | MongoDB indexing strategies     |
| `sqlite-wal`         | SQLite connection without WAL and busy timeout             | A    | SQLite WAL                      |
| `mongo-esr-index`    | compound index not ordered Equality, Sort, Range           | B    | MongoDB ESR guideline           |
| `db-least-privilege` | application connecting as owner or superuser               | B    | OWASP SQL Injection Prevention  |
| `migration-down`     | migration with no down path and no irreversible marker     | B    | Existing `migration-safety`     |

## Enforcement model

1. **Owner**: `rule-data` keeps its `guardrails/index.js` and gains the shared
   ids; `rule-data-postgresql`, `rule-data-mongodb` and `rule-data-sqlite` gain
   their own `guardrails/index.js`.
2. **Triggers**: SQL and DDL rules run on files that contain queries or DDL;
   engine rules run when the file imports that engine's client.
3. **Advisory first**, promoted to blocking after 100% precision and recall.
4. **Tests**: a `good` and a `bad` entry per rule, one unit test per rule, and
   an inheritance test that asserts the rule reaches the right child.

## Phases

### Phase 0 - Decisions and scaffolding

- [x] Audit the eight skills and the four rules.
- [x] Fetch and record the public sources.
- [x] Interview the owner and record the decisions.
- [ ] Resolve the MySQL source (open item 1).
- [ ] Confirm the ownership table (open item 2).
- [ ] Create the ADR for the data guardrail family.

### Phase 1 - Shared rules in rule-data

- [ ] Implement `no-select-star`, `query-limit`, `query-timeout`.
- [ ] Implement `db-least-privilege` and `migration-down` as Tier B.
- [ ] Add corpus fixtures and unit tests.

### Phase 2 - Postgres and SQLite

- [ ] Implement `index-on-fk` in rule-data-postgresql.
- [ ] Implement `sqlite-wal` in rule-data-sqlite.
- [ ] Add fixtures and the inheritance test.

### Phase 3 - MongoDB

- [ ] Implement `mongo-projection` and `mongo-esr-index`.
- [ ] Add fixtures for a `find()` call and a schema/index declaration.

### Phase 4 - Promotion and documentation

- [ ] Promote the Tier A rules after the corpus gate reports 100%.
- [ ] Regenerate `docs/14-guardrails.md` with `pnpm census`.
- [ ] Run the gates below and add the changelog entry.

## Verification gates

```bash
pnpm test tests/core/guardrails-precision-recall.test.mjs
pnpm test tests/core/self-guardrails.test.mjs
pnpm lint
pnpm census
pnpm test
```

## See also

- `docs/plans/devops-guardrails.md` - the enforcement model this plan follows
- `docs/plans/backend-guardrails.md` - the sibling plan for the backend area
