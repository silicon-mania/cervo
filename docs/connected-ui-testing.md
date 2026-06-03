# Connected UI testing

Use this document whenever an AI agent needs to test Cervo UI flows that require a signed-in user.

This is a project-specific testing workflow, not production authentication guidance.

## Clerk test credentials

Clerk provides deterministic test identifiers for development/staging.

Use these credentials only in local development or approved staging environments:

```txt
Existing default test user: default+clerk_test@example.com
Fresh test user pattern: <scenario-name>+clerk_test@example.com
OTP code: 424242
Fallback phone number: +15555550100
```

Examples of fresh test users:

```txt
onboarding-001+clerk_test@example.com
daily-note-test+clerk_test@example.com
settings-workspace-test+clerk_test@example.com
```

Use `default+clerk_test@example.com` when the test does not need a brand-new user.

Use a fresh `<scenario-name>+clerk_test@example.com` address when the test needs first-time signup, onboarding, or a clean organization state.

## When to use this flow

Use connected UI testing when:

- A feature is behind Clerk auth.
- A feature depends on an active Clerk organization/workspace.
- A feature changes behavior based on the current user or organization.
- A UI change touches onboarding, settings, organization switching, daily notes, boxes, tasks, search, or AI context inside the app shell.

Do not create automated test files unless explicitly requested. This document is for manual/browser verification by AI agents.

## Standard connected test workflow

1. Start the app locally:

   ```bash
   npm run dev
   ```

2. Open `http://localhost:3000`.

3. Sign in or sign up through Clerk using the test email.

4. Enter the OTP code:

   ```txt
   424242
   ```

5. If the user has no active organization, complete onboarding by creating a test workspace.

6. After onboarding or organization switching, ensure the app reaches `/today`.

7. Test the feature workflow from the app shell.

8. For UI work, inspect the affected screen in the browser and check at least:
   - Page renders without runtime errors.
   - Main interactive controls are visible and clickable.
   - Loading, empty, error, disabled, and success states are present when relevant.
   - Text fits without overlap or overflow.
   - Workspace-scoped data does not rely on client-provided `workspaceId`.

## Organization testing

Clerk is the source of truth for organizations, memberships, invitations, roles, rename, and delete.

Rules:

- Use Clerk prebuilt UI for organization management.
- Do not build or test custom Cervo organization management forms unless explicitly requested.
- Use `/settings` for organization profile management, because it embeds Clerk `OrganizationProfile`.
- Do not expect organization management controls in the left sidebar; the sidebar should stay minimal.
- After creating or switching organizations, verify that `/onboarding/sync` resolves and redirects back into the app.

Test workspace naming:

```txt
Test <short-feature-name>
```

Examples:

```txt
Test Daily Notes
Test Settings Profile
Test Boxes Flow
```

Only delete organizations or memberships that are clearly test-owned and created during the current verification.

## Safety rules

- Never use real user credentials for AI-driven testing.
- Never use this test workflow against production unless the developer explicitly approves it.
- Do not expose real `.env.local` secrets in logs or final answers.
- Do not delete non-test organizations, users, or app data.
- Keep screenshots focused on the UI being tested and avoid capturing sensitive secrets.
- If a connected test mutates data, mention what test data was created.

## Reporting

When reporting connected UI verification, include:

- Test user email used.
- Whether the user was existing or fresh.
- Workspace/organization used or created.
- Routes tested.
- What passed.
- What could not be verified.
