# Project documentation

All project documentation is written in English so coding agents can use one consistent source of truth.

Project name: `cervo`.

App/repository path: `/Users/hugobayoud/prog/silicon-mania/cervo`.

## Reading order

1. `product-context.md` — product goal, problem, MVP scope, and success criteria.
2. `technical-foundation.md` — stack, architecture, data direction, and technical decisions.
3. `design-system.md` — UX/UI principles and visual rules.
4. `ai-rules.md` — rules that AI coding agents must follow when editing the project.
5. `connected-ui-testing.md` — authenticated UI testing workflow for local/staging Clerk test users.
6. `memory-regression-coverage.md` — Memory refactor regression coverage and connected verification checklist.

## Documentation roles

- `product-context.md` answers what we are building and why.
- `technical-foundation.md` answers how the app should be built.
- `design-system.md` answers how the app should feel and look.
- `ai-rules.md` answers how AI agents must behave while coding.
- `connected-ui-testing.md` answers how AI agents can test connected UI flows without asking for real credentials.
- `memory-regression-coverage.md` answers how to verify Memory refactor behavior stays intact.

## Rule

If a future technical or product decision becomes important, update the relevant document before implementing it.
