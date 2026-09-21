# CLAUDE.md — OPS Engineering & Product Rules

> This file defines the permanent engineering, architecture, UX, workflow, and
> agent-behavior rules for the OPS project.
>
> The repository itself is the source of truth for implementation details.
> When this document and the actual code disagree, inspect and report the
> discrepancy rather than inventing behavior.

---

# 1. NON-NEGOTIABLE AGENT BEHAVIOR

Before every task:

1. Read this `CLAUDE.md`.
2. Inspect the current implementation.
3. Search before creating anything.
4. Identify the source of truth.
5. Determine the task scope.
6. Preserve existing working behavior.
7. Make the smallest complete change.
8. Validate the result.
9. Report exactly what changed and what was verified.

Core rule:

> Make the smallest safe change that solves the requested problem completely.

Do not introduce unnecessary:

- Architecture
- Abstractions
- Dependencies
- UI complexity
- Refactors
- Routes
- Stores
- Data models

If existing code conflicts with an assumption in this document:

- Trust the actual repository implementation.
- Investigate the discrepancy.
- Do not invent behavior.
- Report the discrepancy when relevant.

---

# 2. DECISION MAKING

Do not ask the user questions that can be answered by inspecting the repository.

Before asking a question:

1. Search the codebase.
2. Inspect the existing pattern.
3. Check related types/stores/routes/components.
4. Determine whether the intended behavior is already implied.

If the architecture clearly indicates the intended implementation:

> Proceed.

Ask the user only when:

- Two or more valid implementations materially change product behavior, or
- Required business behavior cannot be determined from the repository/product context.

Prefer an architecture-consistent decision over unnecessary interruption.

---

# 3. TOKEN / SPEED EFFICIENCY

Claude Code should work efficiently.

## Prefer

Targeted searches:

```bash
rg "keyword" .
rg "ComponentName" .
rg "storeName" .
rg "routeName" .
```

Inspect relevant sections rather than dumping entire large files.

Use:

```bash
sed -n '1,220p' path/to/file
```

Search before reading large directories.

Follow imports and references to understand architecture.

Reuse findings already discovered during the current task.

After the relevant architecture is understood:

> Stop exploring and implement.

## Avoid

- Repeated repository-wide scans
- Re-reading unchanged files unnecessarily
- Inspecting unrelated modules
- Broad searches when targeted searches are sufficient
- Multiple speculative implementations
- Unnecessary package installation
- Rewriting working systems because another architecture looks theoretically better

---

# 4. TASK SCOPE CONTROL

Classify every task as one of:

- Bug fix
- Small enhancement
- Feature implementation
- Cross-module change
- Architecture change
- Cleanup
- Read-only audit
- UI/UX refinement

Only perform work required for that classification.

## Audit / Review

If the user asks for an audit/review:

> DO NOT MODIFY FILES.

Audit means:

- Inspect
- Trace
- Analyze
- Report

It does not mean:

- Fix
- Refactor
- Rename
- Delete

## Implementation

If the user asks to implement:

- Make the requested changes.
- Do not stop at analysis.
- Modify only files required for the task.
- Validate the result.

## Unrelated issues

If unrelated problems are discovered:

- Do not silently fix them.
- Mention them if relevant.
- Fix them only if they block the requested task or the user explicitly asks.

---

# 5. IMPLEMENTATION WORKFLOW

Use this workflow for normal implementation tasks.

## Phase 1 — DISCOVER

- Read `CLAUDE.md`
- Inspect relevant routes
- Inspect relevant components
- Inspect types
- Inspect stores
- Inspect module registration
- Search existing patterns
- Identify source of truth
- Check whether the feature already exists partially

Never assume something is missing because it is not visible in the UI.

A module may be:

- Disabled
- Hidden
- Gated
- Unlinked from navigation
- Using another route
- Controlled by entitlements
- Implemented under an older name

## Phase 2 — PLAN

Determine:

- What needs to change?
- Which files are actually required?
- What existing behavior must remain unchanged?
- What cross-module dependencies exist?
- What could break?

Keep the plan small.

## Phase 3 — IMPLEMENT

Implement the smallest complete solution.

Reuse:

- Existing components
- Existing stores
- Existing utilities
- Existing design system
- Existing route patterns
- Existing types

Do not duplicate functionality that already exists.

## Phase 4 — VERIFY

Run appropriate validation.

At minimum for meaningful code changes:

```bash
npm run lint
npx tsc --noEmit
```

Run relevant tests if they exist.

For significant changes, run the project's build command when appropriate:

```bash
npm run build
```

For UI tasks, perform runtime/browser verification when available.

## Phase 5 — REPORT

Report:

### Done
What changed.

### Files changed
Important files.

### Validation
Commands actually run and their results.

### Notes
Remaining limitations or genuinely relevant follow-ups.

Never claim verification that was not performed.

---

# 6. CURRENT OPS PRODUCT

OPS is an Operational Excellence platform being developed for real client/partner demonstrations and eventual production use.

The application should feel:

- Professional
- Stable
- Enterprise-ready
- Simple to understand
- Fast to use
- Visually polished
- Consistent across modules
- Operationally realistic
- Easy to extend

Current priority:

> Partner/client demonstration readiness without sacrificing architectural integrity.

---

# 7. CURRENT OPS MODULE STRUCTURE

| Module | Purpose |
|---|---|
| Dashboard | Operational overview |
| Gemba | Observe |
| Red Flag | Identify |
| Continuous Improvement | Improve |
| Audit | Sustain |
| Actions | Execution |
| Visual Management | Visualize |
| Reports | Analytics |
| Settings | System |
| Profile | User profile |

Preferred terminology:

- Dashboard
- Gemba
- Red Flag
- Continuous Improvement
- Audit
- Actions
- Visual Management
- Reports
- Settings
- Profile

Do not casually rename modules.

When terminology changes, search:

- Sidebar
- Routes
- Entitlements
- Registry entries
- Create menus
- Analytics
- Reports
- Breadcrumbs
- Page titles
- Empty states
- Help text
- Types
- Store keys
- Deep links
- Permissions

A UI rename is not complete until the underlying architecture is consistent.

---

# 8. CURRENT OPS ARCHITECTURE

The repository is the final source of truth, but the current intended architecture includes the following canonical concepts.

## Canonical Action model

```text
MyAction
```

Expected location:

```text
features/five-s/types/my-actions.ts
```

## Canonical Action store

```text
lib/actions/action-store.ts
```

Do not create another independent Action model/store unless explicitly required.

## Canonical Action Center

The Action Center is the cross-module Action aggregation view.

Expected implementation area:

```text
features/actions/action-center-page.tsx
```

## Primary Action routes

```text
/actions
/actions/[actionId]
```

If legacy/compatibility routes exist, inspect them before changing or deleting them.

## Current persistence model

The current application may use:

- `useSyncExternalStore`
- Module-level stores
- `localStorage`

This is browser/local persistence, not a production multi-user backend.

Do not claim cross-device or multi-user synchronization unless a backend implementation actually exists.

---

# 9. ACTIONS — CORE ARCHITECTURE

Actions are the cross-module connective layer.

Current Action source modules may include:

```text
audit
continuousImprovement
redFlag
visualManagement
visualImprovement
gemba
manual
```

Use the existing source-module architecture.

Do not create parallel Action systems.

---

# 10. ACTION SOURCE LINKING

A linked Action should have explicit source information.

Preferred fields:

```text
sourceModule
sourceId
sourceTitle
sourceLabel
```

Where relevant, preserve existing source metadata such as location, observation, ownership, and evidence.

When creating an Action from a module:

1. Identify the source module.
2. Identify the source record.
3. Store the source ID.
4. Store the source module.
5. Store enough information for reverse navigation.
6. Ensure Action Center can display the origin.
7. Ensure the source record can navigate back to the Action where appropriate.

Do not rely on fragile inference when explicit source fields can be provided.

---

# 11. ACTION CREATION

There should be one canonical Action creation architecture.

Prefer the existing shared Action creation dialog/component.

Do not create a custom Action creation workflow for an individual module unless there is a genuine business requirement.

If a module currently creates Actions differently:

1. Inspect why.
2. Preserve required business behavior.
3. Migrate toward canonical fields where safe.
4. Do not blindly rewrite the workflow.

---

# 12. ACTION LIFECYCLE

Existing Action statuses include:

```text
Awaiting Assignment
Assigned
Open
In Progress
Overdue
Pending Review
Pending Auditor Review
Awaiting Review
Rework Required
Completed
```

Do not invent new statuses casually.

Do not rename statuses without checking:

- Filters
- Dashboard
- Reports
- Analytics
- Stores
- Detail pages
- Workflow functions
- Existing records

When modifying Action workflow, inspect:

- `createAction`
- `assignAction`
- `startAction`
- Submit-for-review behavior
- Send-back/rework behavior
- Close/verify behavior
- Generic update functions

Workflow transitions should be controlled by appropriate lifecycle functions.

---

# 13. ACTION STATUS CONSISTENCY

Source records and linked Actions must not silently contradict each other.

Examples of problematic states:

```text
Continuous Improvement = Completed
Action = In Progress
```

```text
Visual Improvement = Completed
Action = Open
```

```text
Escalation = Resolved
Action = In Progress
```

Module-specific statuses do not need to be identical.

However:

> Terminal source states and Action states must not create misleading operational information.

If synchronization is required, implement explicit reconciliation rather than ad-hoc UI patches.

---

# 14. ACTION CENTER

Action Center is a cross-module aggregation/read/filter view.

It should not maintain a second Action database.

It should read from the canonical Action store.

Typical filters may include:

- Search
- Source module
- Status
- Priority
- Plant
- Zone
- Assigned user
- Due date

Do not duplicate Action records to support filters.

---

# 15. ACTION EVIDENCE

Existing Action evidence concepts may include:

- Issue evidence
- Progress evidence
- Closure evidence
- Attachments
- Photos
- Remarks

Reuse the existing evidence architecture.

Do not create another unrelated evidence model unless required.

Preserve existing evidence semantics.

---

# 16. ACTION REVERSE LINKS

Actions should navigate back to their source where applicable.

Expected relationships may include:

```text
Action → Gemba observation
Action → Red Flag
Action → Audit
Action → Continuous Improvement
Action → Visual Management
Action → Visual Improvement
```

When adding a source module:

- Update the central source-to-route mapping.
- Prefer an exhaustive helper such as `getActionSourceHref(...)` or the existing project equivalent.
- Do not scatter source routing logic across many components.

When changing routes, verify both directions:

```text
Source → Action
Action → Source
```

---

# 17. VISUAL MANAGEMENT

Visual Management is a real OPS module.

It is not simply a renamed Visual Improvement module.

It conceptually supports:

- Visual boards
- Meetings
- KPI updates
- Topics
- Actions
- Escalations
- Completion
- Meeting history
- Follow-up

Maintain the distinction between:

```text
Visual Management
```

and:

```text
Visual Improvement
```

Do not merge them unless explicitly requested.

## Visual Management Action integration

If a Visual Management entity creates an Action, the relationship must be explicit.

For example:

```text
VisualManagementTopic
    → linkedActionId

VisualManagementEscalation
    → actionId
```

Do not create an Action that becomes disconnected from its source entity.

If an escalation intentionally remains unlinked, remove misleading Action UI rather than creating a fake relationship.

---

# 18. RED FLAG

Red Flag is a genuine operational concept.

It may contain:

- Severity
- SLA
- Ownership
- Escalation
- Resolution

Do not automatically merge Red Flag with Red Tag.

If legacy Red Tag code is encountered:

1. Determine whether it is referenced.
2. Determine whether it represents a different business concept.
3. Avoid silently deleting it.

Delete legacy code only when:

- Confirmed unused
- In task scope
- Safe to remove
- Validation passes

---

# 19. AUDIT

Audit is a core OPS module.

Audit may have specialized workflows and does not need to behave identically to Gemba, CI, or VM.

However:

- Actions created from Audit should use canonical Action concepts.
- Source linkage should be explicit.
- Do not extend legacy fields unnecessarily.
- Avoid new inference mechanisms.

Audit functionality may include:

- Audit execution
- Questions
- Findings
- Corrective actions
- Review
- Completion
- Reporting

Respect existing audit workflow and status semantics.

---

# 20. CUSTOM AUDIT QUESTIONS

Custom Audit questions are intended to be managed through Settings.

Do not hardcode new questions into audit execution unless explicitly requested.

Before implementing custom questions, search:

- Existing question types
- Existing question stores
- Settings
- Audit configuration
- Existing fixed question definitions

Reuse existing architecture.

---

# 21. GEMBA

Gemba represents operational observation.

Typical flow:

```text
Observe
→ Identify issue
→ Create Action
→ Assign
→ Execute
→ Evidence
→ Review
→ Complete
```

Preserve:

- Observation history
- Evidence
- Source linkage
- Existing Action behavior

If Gemba appears hidden, inspect module registration/entitlements before assuming it is missing.

---

# 22. CONTINUOUS IMPROVEMENT

Continuous Improvement is an improvement/proposal workflow.

Do not replace it with Actions.

The relationship is:

```text
Continuous Improvement
        ↓
      Action
```

not:

```text
Continuous Improvement = Action
```

The source record and Action can have different purposes and statuses.

Ensure terminal states do not become misleading.

---

# 23. DASHBOARD RULES

OPS must have:

> ONE PRIMARY DASHBOARD.

Do not create a duplicate dashboard inside Analytics.

Analytics/Reports may provide:

- Trends
- Analysis
- Operational metrics
- Reports
- Exportable information

but should not create a competing dashboard.

## Dashboard data integrity

Dashboard metrics must come from canonical data sources.

Do not silently mix:

- Real computed data
- Hardcoded fixture values
- Demo-only values

Avoid adding fixture counts to live counts.

If demo data is required:

- Keep it coherent.
- Keep it clearly separated.
- Ensure it does not distort live/computed metrics.

---

# 24. ANALYTICS / REPORTS

Analytics and Reports must represent canonical data.

Do not create a second independent data model.

Reports should consume the same underlying data used by:

- Dashboard
- Action Center
- Module pages

If a metric differs:

1. Identify the source.
2. Determine whether the difference is intentional.
3. Fix the data source rather than masking the discrepancy.

---

# 25. SETTINGS

Settings is the system administration area.

Current conceptual responsibilities include:

- User Management
- Custom Audit Questions
- Action configuration
- System configuration
- Organization/module settings where appropriate

Avoid creating duplicate settings systems.

If duplicate routes exist:

```text
settings/action/*
settings/actions/*
```

or similar:

1. Determine the canonical route.
2. Do not create a third pattern.
3. Remove duplicates only when explicitly in cleanup scope.

---

# 26. SUPER ADMIN / MODULE ENTITLEMENTS

Module visibility should be controlled centrally.

Inspect the module registry and entitlement/gating system before changing module visibility.

Expected central area may include:

```text
lib/modules.ts
```

Do not hardcode module visibility separately in:

- Sidebar
- Dashboard
- Create menu
- Routes
- Settings

Use centralized module registration/entitlement architecture.

Super Admin controls may currently be demo/browser-local behavior.

Do not describe client-side module controls as production authorization.

---

# 27. AUTHORIZATION / SECURITY

Client-side guards are not true security boundaries.

Examples may include:

- `SuperAdminGuard`
- `ModuleGate`
- Role selectors
- Client-side permissions

These are UX/demo controls unless backed by server-side authorization.

Do not describe them as secure authorization.

When real backend authorization is introduced:

- Centralize permission checks.
- Enforce authorization server-side.
- Keep UI guards for UX.

Do not implement fake security.

---

# 28. DATA / STATE MANAGEMENT

Respect the existing state architecture.

Current patterns may include:

- `useSyncExternalStore`
- Module-level stores
- `localStorage`

Do not introduce Zustand, Redux, or another state library simply for convenience.

Do not create multiple stores for the same entity.

Before creating a store:

```bash
rg "createAction|useActions|action-store" .
```

Search first.

---

# 29. LOCALSTORAGE

Current local/demo persistence is browser-local.

Therefore:

- Same-browser state may be shared where implemented.
- Different browsers/devices are not automatically synchronized.
- Multiple real users are not represented by a backend.

Do not claim otherwise.

When modifying localStorage:

- Preserve existing keys.
- Avoid accidental resets.
- Check fixture/version migration logic.
- Avoid unnecessary storage-format changes.

---

# 30. BACKEND

Do not introduce backend migration work during an unrelated feature task.

Backend migration is a separate architecture phase.

A future backend phase must deliberately address:

- Authentication
- Authorization
- Organizations
- Users
- Roles
- Module entitlements
- Actions
- Source records
- Audit data
- Gemba
- Red Flags
- Continuous Improvement
- Visual Management
- Reporting
- Audit trail
- Evidence/files

Do not partially introduce backend persistence into one module without a deliberate architecture.

---

# 31. UI/UX PRINCIPLES

OPS should feel like a serious modern enterprise SaaS product.

Target qualities:

- Clean
- Minimal
- Calm
- Structured
- Spacious
- Fast
- Clear
- Professional
- Modern

Design inspiration may include:

- Linear
- Vercel
- Notion
- Apple
- Modern enterprise SaaS

Do not copy another product's UI.

Use inspiration for interaction quality and design principles only.

---

# 32. AVOID "BOX INSIDE BOX"

Do not create unnecessary nested cards.

Avoid:

```text
Card
 └── Card
      └── Card
           └── Card
```

Prefer:

- Page hierarchy
- Sections
- Dividers
- Whitespace
- Typography
- Subtle backgrounds
- Clear grouping

Cards should represent meaningful objects.

Do not wrap every piece of information in a card.

---

# 33. SPACING / BREATHING ROOM

Prioritize:

- Breathing room
- Clear hierarchy
- Scanability
- Consistent spacing
- Strong primary action
- Quieter secondary information

Do not compress screens simply because space is available.

---

# 34. TYPOGRAPHY

Use existing typography/design tokens.

Avoid:

- Excessively tiny text
- Too many font sizes
- Excessive bolding
- Long dense paragraphs
- Inconsistent labels

Never solve information density by making fonts tiny.

Operational interfaces must remain readable.

---

# 35. RESPONSIVE DESIGN

Consider:

- Desktop
- Laptop
- Tablet where applicable
- Smaller screens

Do not use `overflow-x: hidden` as a generic responsiveness fix.

Check:

- Tables
- Filters
- Forms
- Dialogs
- Navigation
- Action details
- Dashboards

---

# 36. COMPONENT REUSE

Before creating a component:

```bash
rg "ComponentName" components features
```

Reuse existing shared UI.

Typical shared components may include:

- Button
- Dialog
- Dropdown
- Input
- Select
- Tabs
- Badge
- Tooltip
- Table
- Card

Do not create duplicate components such as:

```text
Button2
CustomButton
NewButton
SuperButton
```

when the existing design system supports the requirement.

---

# 37. BASE UI / BUTTON SEMANTICS

If the project uses Base UI, respect its component contracts.

Pay particular attention to:

```text
nativeButton
```

A component configured as a native button must render a native `<button>`.

If rendering:

- Link
- `<a>`
- Router navigation

use the existing component API correctly.

Do not ignore Base UI warnings.

---

# 38. ACCESSIBILITY

Preserve:

- Keyboard navigation
- Focus states
- Semantic controls
- Accessible labels
- Button/link semantics
- Dialog behavior
- Form labels

Do not use clickable `<div>` elements when a button or link is appropriate.

Do not remove focus indicators simply for aesthetics.

---

# 39. FORMS

Forms should have:

- Clear labels
- Required/optional states
- Validation
- Useful error messages
- Loading states
- Success feedback
- Appropriate disabled states

Do not silently fail.

Reuse existing validation patterns.

Avoid unnecessary form abstractions.

---

# 40. TABLES

Prioritize:

- Readability
- Clear headers
- Appropriate density
- Useful sorting/filtering
- Action discoverability

Do not shrink typography excessively.

If there are too many columns:

- Prioritize important fields.
- Move secondary information to detail views.
- Use responsive behavior.

---

# 41. MODALS / DIALOGS

Dialogs should have:

- Clear purpose
- Clear title
- Primary action
- Secondary/cancel action
- Loading state
- Validation
- Correct keyboard behavior

Do not put an entire page inside a modal unless the interaction genuinely benefits from it.

---

# 42. ROUTING

Before adding a route:

1. Search existing route patterns.
2. Check whether the functionality already has a route.
3. Check duplicate route families.
4. Follow existing naming conventions.

Do not create duplicate routes merely for convenience.

If multiple routes exist, determine whether they are intentionally supported.

---

# 43. DEEP LINK SAFETY

When changing routes, check:

- Sidebar
- Breadcrumbs
- Internal links
- Action source links
- Create menus
- Dashboard links
- Reports
- Empty states
- Redirects

Do not leave broken internal navigation.

---

# 44. LEGACY / DEAD CODE

Do not delete code simply because it looks old.

Before deleting:

```bash
rg "FileName|ExportName|ComponentName" .
```

Confirm usage.

Potential legacy areas may include:

- `LegacyActionsPage`
- `features/administration/**`
- Red Tag
- Duplicate settings routes
- Old Visual Improvement naming

Only remove legacy/dead code when:

1. Confirmed unused
2. In task scope
3. Safe to remove
4. Validation passes

---

# 45. DO NOT CREATE FAKE FUNCTIONALITY

Never implement UI that looks functional but is not.

Do not use empty handlers such as:

```tsx
onClick={() => {}}
```

for real product actions.

Do not fake:

- Save
- Export
- Delete
- Approve
- Assign
- Filters
- Search
- Status changes
- Notifications

If functionality cannot be implemented safely:

> Say so.

Do not pretend.

---

# 46. DEMO DATA

Demo data is acceptable while the product depends on fixtures.

However:

- Keep it realistic.
- Keep it consistent.
- Do not inflate live metrics.
- Do not create contradictory records.
- Do not introduce random data on every render.
- Do not use demo data to hide broken functionality.

When changing demo data, check:

- Dashboard
- Action Center
- Reports
- Analytics
- Module pages

---

# 47. WORKFLOW INTEGRITY

When changing a workflow, inspect the complete lifecycle.

Example:

```text
Create
→ Assign
→ Start
→ Work
→ Submit
→ Review
→ Rework if required
→ Complete
```

Do not fix one transition while breaking another.

Check:

- UI
- Store
- Status
- History
- Evidence
- Notifications if applicable
- Deep links
- Dashboard metrics
- Reports

---

# 48. OVERDUE HANDLING

Be careful with:

```text
status === "Overdue"
```

versus:

```text
computed overdue based on due date
```

If changing overdue behavior:

1. Find the existing helper.
2. Reuse it.
3. Determine whether overdue is persisted or derived.
4. Keep filters and KPI calculations consistent.

Do not introduce a second overdue definition.

---

# 49. GENERIC UPDATE FUNCTIONS

Generic mutation functions such as:

```text
updateAction()
```

must not accidentally bypass workflow rules.

If changing status transitions:

- Inspect generic mutation functions.
- Inspect dedicated lifecycle functions.
- Prevent invalid transitions where appropriate.

Do not add transition guards blindly without understanding the existing workflow.

---

# 50. ERROR HANDLING

Errors should be:

- Visible
- Actionable
- Non-destructive
- Consistent

Avoid silent catches:

```ts
catch {
  // ignore
}
```

unless there is a deliberate reason.

Do not hide console errors to make a demo look clean.

Fix the underlying issue where possible.

---

# 51. PERFORMANCE

Avoid unnecessary:

- Re-renders
- Large client components
- Duplicate calculations
- Repeated localStorage reads
- Heavy dependencies
- Unnecessary animations

Do not optimize prematurely.

Inspect/measure before introducing complex performance changes.

---

# 52. ANIMATION

Animation should support understanding.

Use:

- Subtle transitions
- Meaningful state changes
- Smooth navigation
- Progressive disclosure

Avoid:

- Excessive motion
- Distracting effects
- Long delays
- Animation that blocks workflows

Enterprise software should feel fast.

---

# 53. ICONS

Use the project's existing icon library.

Do not introduce another icon library without a strong reason.

Icons should:

- Communicate meaning
- Use consistent sizing
- Not replace necessary labels
- Follow the existing visual language

---

# 54. COPY / CONTENT

Product language should be:

- Clear
- Concise
- Operational
- Professional

Avoid unnecessary marketing language inside the product.

Prefer clear labels such as:

```text
Create Action
Assign Owner
Submit for Review
Complete Action
```

over vague labels.

---

# 55. NOTIFICATION CENTER

Notification Center is intentionally postponed.

Do not implement or expand Notification Center unless explicitly requested.

If another feature appears to require notifications:

- Implement only the minimum necessary behavior.
- Do not start a notification architecture.
- Mention the dependency if relevant.

---

# 56. PROFILE

Profile is considered an existing completed area.

Do not redesign or rebuild Profile unless explicitly requested.

---

# 57. SECURITY / PRIVACY

Never expose:

- Secrets
- API keys
- Tokens
- Credentials
- Environment variables
- Private user information

Do not hardcode secrets.

Do not commit `.env` files.

Use the existing environment-variable pattern.

Never print secrets into the conversation.

---

# 58. DEPENDENCIES

Before adding a dependency:

1. Search `package.json`.
2. Search existing implementation.
3. Determine whether the functionality already exists.
4. Prefer existing dependencies.

Do not add a package for functionality that can reasonably be implemented with existing tools.

---

# 59. DATABASE / API

Do not invent API endpoints.

Before creating an API:

- Search `app/api`
- Search server actions
- Search API clients
- Search backend integrations

If no backend exists, do not pretend one exists.

---

# 60. FILE CHANGES

Keep changes focused.

Avoid touching unrelated:

- Modules
- Formatting
- Generated files
- Lock files
- Config files

unless required.

Do not perform repository-wide formatting for a small task.

---

# 61. USER WORK PROTECTION

Never overwrite, discard, reset, or revert work that was already present before the current task.

Before significant changes:

```bash
git status
```

When necessary, inspect the relevant existing diff.

Do not use destructive commands such as:

```bash
git reset --hard
git checkout -- .
git restore .
git clean -fd
```

unless explicitly instructed by the user.

If existing uncommitted changes overlap the requested task:

- Preserve them.
- Modify only what is necessary.

---

# 62. GIT SAFETY

Do not:

- Reset user changes
- Delete uncommitted work
- Force checkout
- Rewrite history
- Run destructive Git commands

unless explicitly requested.

Respect existing user work.

---

# 63. TYPESCRIPT

Use strong typing.

Avoid `any` unless genuinely necessary.

Do not silence errors with:

```ts
// @ts-ignore
```

without a documented reason.

Prefer fixing the underlying type problem.

Remove unused imports after changes.

Do not leave dead code commented out.

---

# 64. NEXT.JS / HYDRATION

This project uses Next.js.

Be careful with:

- Server/client boundaries
- `window`
- `localStorage`
- Browser-only APIs
- `useSyncExternalStore`
- Hydration
- Dynamic rendering

Do not introduce browser-only access into server-rendered code without the appropriate boundary.

---

# 65. LOCAL STORAGE + SSR

When accessing:

```ts
window.localStorage
```

ensure it is safe in the Next.js environment.

Do not assume browser APIs exist during server rendering.

Follow existing store patterns.

---

# 66. STATE MUTATION

Respect existing immutable/update patterns.

Do not mutate shared state unexpectedly.

When modifying stores, understand:

- Subscribers
- Persistence
- Initialization
- Fixture loading
- Update notifications

---

# 67. ID GENERATION

Use the existing ID strategy.

Do not introduce a new ID format casually.

If modifying IDs, check:

- Persistence
- Deep links
- Existing demo records
- Source references
- Action references

---

# 68. DATA MIGRATION

If changing a persisted object shape:

- Consider existing localStorage data.
- Consider existing demo records.
- Preserve backwards compatibility where reasonable.
- Do not silently destroy user state.

---

# 69. CROSS-MODULE CHANGES

Any cross-module change requires extra care.

Examples:

```text
Gemba → Action
Red Flag → Action
Audit → Action
Continuous Improvement → Action
Visual Management → Action
Visual Improvement → Action
```

Check both directions:

```text
Source → Action
Action → Source
```

Also check:

- Dashboard
- Reports
- Analytics
- Filters
- Deep links
- Permissions
- Entitlements

---

# 70. SOURCE OF TRUTH

For every feature, explicitly determine:

> What is the source of truth?

Examples:

```text
Actions → action-store
Module entitlements → module registry / entitlement system
Dashboard metrics → canonical module/action data
Audit → audit store/data model
Visual Management → VM store
```

Never create a duplicate source of truth merely to make a screen easier to implement.

---

# 71. DUPLICATE CONCEPTS

Before creating a new concept, search for similar concepts.

Potential examples:

- Actions
- Red Flag / Red Tag
- Visual Improvement / Visual Management
- Administration / Settings
- Dashboard / Analytics Dashboard

Ask:

> Is this actually a new business concept or a duplicate implementation?

If duplicate:

- Reuse the existing concept where possible.
- Do not introduce parallel systems.

---

# 72. LEGACY MIGRATION

When replacing an older concept:

1. Identify references.
2. Identify routes.
3. Identify stores.
4. Identify types.
5. Identify UI labels.
6. Identify deep links.
7. Identify persisted data.
8. Identify reports/analytics.
9. Determine compatibility requirements.
10. Only then remove/rename.

Never rename only the visible label and assume migration is complete.

---

# 73. TASK COMPLETION STANDARD

A task is not complete merely because the code compiles.

## UI tasks

Verify where possible:

- Page loads
- Intended interaction works
- Navigation works
- State updates correctly
- No relevant console errors/warnings
- Existing surrounding UI remains intact
- Empty/loading/error states behave correctly

## Data/workflow tasks

Verify where applicable:

- Create/read/update/delete behavior
- Source-of-truth updates
- Related module consistency
- Persistence behavior
- Existing records are not accidentally corrupted

## Cross-module tasks

Verify where applicable:

```text
Source → Action
Action → Source
Dashboard/Reports consistency
Filters
Deep links
Permissions/entitlements
```

If verification cannot be performed, state exactly what was not verified.

---

# 74. VALIDATION PRIORITY

Preferred validation order:

1. TypeScript
2. Lint
3. Targeted tests
4. Build where appropriate
5. Runtime/browser verification

Typical commands:

```bash
npx tsc --noEmit
npm run lint
```

Use the project's actual test/build scripts.

Do not invent commands.

---

# 75. BROWSER / RUNTIME CHECKS

For UI behavior, verify where browser tooling is available:

- Page loads
- No console errors
- No important warnings
- Main interaction works
- Navigation works
- Forms submit correctly
- State updates correctly
- Back navigation works
- Empty/loading/error states work

If browser verification is unavailable, state that.

---

# 76. CONSOLE WARNINGS

Treat console warnings as real issues.

Especially investigate:

- React warnings
- Base UI warnings
- Hydration warnings
- Key warnings
- Invalid DOM nesting
- Accessibility warnings
- Unhandled promises

Do not suppress warnings without understanding them.

---

# 77. FULL FILE / CODE COMMUNICATION

When the user asks for code/files:

- Prefer complete replacement files when practical.
- Avoid ambiguous partial snippets.
- Make file locations explicit.
- Do not make the user guess where code belongs.

When working directly in the repository, make the actual repository changes rather than merely describing them.

---

# 78. NO UNREQUESTED REDESIGN

If the user asks to fix `X`, do not redesign:

- Y
- Z
- Entire navigation
- Entire dashboard
- Entire design system

unless required by the task.

A focused task should produce a focused diff.

---

# 79. NO UNREQUESTED REFACTOR

Do not:

- Rename dozens of files
- Move directories
- Rewrite stores
- Replace state management
- Replace the UI library
- Introduce new architecture

during a feature implementation unless explicitly requested.

---

# 80. WHEN A BIGGER ARCHITECTURE PROBLEM IS FOUND

If the requested task exposes a larger problem:

1. Fix the immediate issue if safe.
2. Do not automatically perform the larger refactor.
3. Document the architectural issue.
4. Treat it as a separate phase.

Example:

```text
Immediate:
Fix Visual Management Escalation → Action linkage.

Separate future phase:
Move Action persistence from localStorage to a backend.
```

---

# 81. AUDIT MODE

When explicitly asked to audit/review:

## DO

- Inspect code
- Trace data flow
- Trace imports
- Trace routes
- Identify duplicates
- Identify inconsistencies
- Identify risks
- Provide severity
- Provide recommended implementation sequence

## DO NOT

- Modify files
- Fix while auditing
- Refactor
- Rename
- Delete

Distinguish findings as:

```text
Confirmed
Likely
Not verified
```

Never present assumptions as facts.

---

# 82. IMPLEMENTATION MODE

When explicitly asked to implement:

- Make the changes.
- Validate them.
- Report what changed.

Do not return only a plan unless the user explicitly requested a plan.

---

# 83. DEMO / PARTNER READINESS

Current priority:

1. Stability
2. Correct workflows
3. Data consistency
4. Cross-module consistency
5. Clear UX
6. Error-free runtime
7. Visual polish
8. Performance
9. New features

Do not prioritize flashy features over broken core workflows.

---

# 84. DEMO FLOW QUALITY

Important flows should feel believable:

```text
Dashboard
→ Identify operational issue
→ Open source module
→ Create Action
→ Assign owner
→ Work on Action
→ Add evidence
→ Submit/review
→ Complete
→ Dashboard/Reports reflect updated state
```

Cross-module data should make sense throughout this flow.

---

# 85. NO FAKE METRICS

Never create hardcoded metrics merely to make the Dashboard look impressive.

If demo data is necessary:

- Use coherent seeded data.
- Keep it separated from computed production-like data.
- Do not silently inflate live metrics.

If a metric cannot currently be computed correctly:

> Do not fake it silently. State the limitation.

---

# 86. CURRENT PRODUCT PRIORITY

Until explicitly changed by the user, prioritize:

1. Core workflow stability
2. Action architecture consistency
3. Cross-module source/action linking
4. Dashboard data accuracy
5. Visual Management integration
6. Audit consistency
7. CI / VI status consistency
8. Navigation and deep-link correctness
9. Settings / entitlement consistency
10. UI/UX polish
11. Code cleanup
12. Backend migration as a separate future phase

Do not start Notification Center unless explicitly requested.

---

# 87. GOLDEN RULES

1. Inspect before modifying.
2. Search before creating.
3. Reuse before duplicating.
4. Fix the source of truth, not the symptom.
5. Keep cross-module data consistent.
6. Do not fake functionality.
7. Do not fake metrics.
8. Do not hide errors.
9. Do not perform unrelated refactors.
10. Do not redesign without being asked.
11. Do not introduce a second source of truth.
12. Do not create duplicate Action architecture.
13. Do not treat client-side guards as real security.
14. Do not claim verification that was not performed.
15. Prefer the smallest complete implementation.
16. Protect existing working functionality.
17. For audits: read-only.
18. For implementation: implement, validate, report.
19. Separate larger architectural improvements into future phases unless they block the current task.
20. Protect user changes and never run destructive Git operations without explicit permission.
21. Prefer repository evidence over assumptions.
22. Keep OPS coherent rather than accumulating disconnected features.

---

# END OF CLAUDE.MD
