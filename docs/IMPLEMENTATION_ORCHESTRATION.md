# BRMonitor Multi-Agent Orchestration

## Goal

Run 2 agents in parallel with zero overlap, low merge conflict risk, and deterministic integration.

## Scope

This guide is for the BRMonitor implementation split across:

- Agent A: variant/core/branding/runtime integration.
- Agent B: sports module and sports data integrations.

## Operating Model

- Single coordinator (human owner) defines scope and accepts handoffs.
- Each agent works in a dedicated `git worktree` and branch.
- File ownership is explicit before coding starts.
- Shared files are edited by one owner only.
- Integration happens through short checkpoints.

## 1. Initial Setup

Run from the main repo root:

```bash
git checkout main
git pull
git worktree add ../brmonitor-agent-a -b feat/br-variant-base
git worktree add ../brmonitor-agent-b -b feat/br-sports-module
```

Validate:

```bash
git worktree list
```

## 2. Ownership Contract

Use the ownership manifest:

- [ownership-brmonitor.yaml](/home/kxyx/projects/brmonitor-feat-1/docs/orchestration/ownership-brmonitor.yaml)

Rules:

- An agent only edits files in its ownership list.
- `shared_owner` files are edited only by the assigned owner.
- If a file outside ownership is needed, request handoff; do not edit directly.

## 3. Branch and Commit Policy

- Agent A branch: `feat/br-variant-base`
- Agent B branch: `feat/br-sports-module`
- Keep commits small and scoped.
- No repo-wide formatting/lint-only commits during parallel development.
- Rebase daily:

```bash
git fetch origin
git rebase origin/main
```

## 4. Interface-First Contract

Before implementation, freeze contracts in shared types:

- Sports canonical types: `src/types/sports.ts`
- Service interface: `src/services/sports/index.ts`

Contract policy:

- Additive changes only during active parallel phase.
- Breaking type changes require coordinator approval and synchronized update window.

## 5. Shared File Strategy

Some files are conflict-prone. Use single-writer rule:

- `src/config/panels.ts` -> Agent A owns edits.
- `src/components/index.ts` -> Agent A owns edits.
- `src/locales/pt.json` -> Agent A owns final merge edits.

Agent B integration approach:

- Create new files only (`src/components/SportsBrPanel.ts`, `src/services/sports/*`).
- Open a handoff request for Agent A to wire exports/panel registration.

## 6. Handoff Protocol

When Agent B needs Agent A changes in shared files, send:

```text
HANDOFF REQUEST
From: Agent B
To: Agent A
Reason: Register new SportsBrPanel in shared panel config
Files requested:
- src/config/panels.ts
- src/components/index.ts
Expected contract:
- panel key: esportes-br
- load function: render + refresh
Blocked by: yes
```

Handoff response format:

```text
HANDOFF DONE
Owner: Agent A
Commit: <sha>
Files changed:
- src/config/panels.ts
- src/components/index.ts
Notes:
- panel key registered
- default disabled on non-br variants
```

## 7. Checkpoints (Mandatory)

Run at each checkpoint on both worktrees:

```bash
npm run typecheck
npm run typecheck:api
npm run test:data
```

Optional smoke:

```bash
npm run dev
```

Checkpoint gates:

- CP1: skeleton compile (new files + imports resolved).
- CP2: feature complete per branch.
- CP3: integration pass after rebasing on latest main.

## 8. Merge Sequence

Recommended order:

1. Merge Agent A first (`feat/br-variant-base`).
2. Rebase Agent B onto updated `main`.
3. Resolve only contract-level adjustments.
4. Merge Agent B.

Reason:

- Agent A owns variant wiring/shared files.
- Agent B lands as modular extension on stable BR variant base.

## 9. Conflict Prevention Checklist

- Ownership manifest agreed and committed.
- Shared files have one owner.
- Contract files created before feature implementation.
- No opportunistic refactors outside scope.
- No global format/lint churn.
- Daily rebase done by both agents.

## 10. Recovery Plan

If overlap happens:

1. Stop both agents from pushing new commits.
2. Coordinator marks source-of-truth branch per file.
3. Keep one branch untouched.
4. Replay other branch changes file-by-file with `cherry-pick` or manual patch.
5. Re-run gates (`typecheck`, tests) before resuming.

## 11. Ready-to-Use Task Split (BRMonitor)

Agent A:

- Variant `br` support and runtime wiring.
- Branding, metadata, favicons, domain/runtime defaults.
- Panel registration and shared export integration.

Agent B:

- Sports module (`esportes-br`) component/service/types.
- API adapters for prioritized sports providers.
- Sports caching/fallback behavior.

## 12. Definition of Done (Parallel Phase)

- Both branches merged with no unresolved conflict artifacts.
- BR variant boots with no runtime errors.
- Sports panel integrated and visible in BR variant.
- Typecheck/tests pass on main.
