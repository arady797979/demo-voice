# HR Grievance Manager Instructions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace generic Aria prompts with a policy-neutral HR grievance-manager intake policy for safe, empathetic text and voice conversations.

**Architecture:** Keep the implementation in `system_instructions.ts`. Export typed policy, state, and risk metadata, then derive both prompts and memory guidance from the same baseline. Prompt guidance must never claim an escalation, emergency contact, case creation, or human notification occurred without a real tool.

**Tech Stack:** TypeScript 5.7, Next.js 15, Azure OpenAI prompt configuration.

---

## File structure

- Modify: `system_instructions.ts` — HR configuration, state machine metadata, risk protocol, text/voice prompts, and memory summarization.
- Verify: `package.json` — run the existing `npm run typecheck`; this repository has no test runner.

### Task 1: Add typed policy, state, and risk declarations

**Files:**
- Modify: `system_instructions.ts`

- [ ] **Step 1: Define the safe configuration surface**

Add `GrievanceConversationState` with: `greeting`, `identity_and_preference`, `scope_and_consent`, `open_narrative`, `reflect_and_classify`, `fact_finding`, `impact_and_risk`, `desired_resolution`, `evidence`, `summary_confirmation`, and `next_steps_and_closure`. Add `GrievancePriority` with `critical`, `high`, `medium`, and `low`.

Add `GRIEVANCE_POLICY_CONFIG` with `organizationName`, `anonymousReportingAvailable`, `authorizedReviewersDescription`, `emergencyContactGuidance`, `crisisSupportGuidance`, `ethicsRoute`, `privacyContact`, `dataRetentionNotice`, and `jurisdictionNotice`. Use `null` for unverified organization-specific values.

- [ ] **Step 2: Define the state machine metadata**

Export `GRIEVANCE_CONVERSATION_STATES` as a `Record<GrievanceConversationState, { objective: string; requiredInformation: string[]; transition: string }>` with all eleven states from the approved design. Each entry must state that employees can pause, skip, correct, request a human, or end; risk can interrupt any state.

- [ ] **Step 3: Define the risk protocol metadata**

Export `GRIEVANCE_RISK_PROTOCOL` as a `Record<GrievancePriority, { signals: string[]; response: string }>`.

`critical` covers imminent violence, self-harm, medical emergency, and immediate threats; it pauses intake and encourages immediate local emergency/crisis support. `high` covers sexual misconduct, serious safety, safeguarding, credible criminal conduct, privacy/security incidents, discrimination, harassment, retaliation, whistleblowing, fraud, and ethics concerns. `medium` and `low` cover normal workplace concerns without minimizing them.

- [ ] **Step 4: Verify the declarations compile**

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add system_instructions.ts
git commit -m "feat: add grievance policy configuration"
```

### Task 2: Implement the complete conversation prompts

**Files:**
- Modify: `system_instructions.ts`

- [ ] **Step 1: Replace generic identity and text-chat instructions**

Set the tagline to `HR Grievance Intake Assistant` and the tone to `warm, calm, neutral, and trauma-informed`. Replace `CHAT_SYSTEM_PROMPT` with the approved state order, role limits, consent language, confidentiality limitations, empathetic-but-neutral response patterns, one-question rule, employee-led narrative, internal-only classification, targeted fact finding, impact/risk detection, desired resolution, evidence invitation, neutral summary, and closure.

The prompt must require these safeguards:

```text
Ask one substantive question at a time.
Treat every report as unverified; do not decide facts, credibility, fault, policy violation, legal status, or outcome.
Never promise absolute confidentiality, non-retaliation, investigation, emergency action, case creation, or a particular outcome.
Do not claim that you contacted anyone or submitted anything unless a real tool confirms it.
```

- [ ] **Step 2: Replace voice instructions with equivalent spoken behavior**

Keep voice turns brief, natural, and interruption-friendly with no markdown or lists. Add the same consent, confidentiality, neutrality, one-question, safety interruption, and no-promises/no-claims rules as chat.

- [ ] **Step 3: Replace the memory summary instructions**

Retain only preferred name/pronouns, unverified allegations, people/roles, timeline, locations, witnesses, evidence, impact, previous reporting, desired outcome, risk indicators, corrections, consent, and unanswered questions. Require factual wording such as `Employee reports`; prohibit diagnoses, credibility assessments, legal conclusions, unsupported labels, and irrelevant personal data.

- [ ] **Step 4: Verify compilation**

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add system_instructions.ts
git commit -m "feat: add HR grievance intake prompts"
```

### Task 3: Validate shipped policy safeguards

**Files:**
- Verify: `system_instructions.ts`

- [ ] **Step 1: Run complete TypeScript verification**

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 2: Check required safeguards**

Run:

```bash
rg -n "one substantive question|unverified|absolute confidentiality|emergency action|self-harm|retaliation|desired outcome|factual summary" system_instructions.ts
```

Expected: matching lines for all safeguards.

- [ ] **Step 3: Inspect the finished diff**

Run: `git diff --check HEAD~2..HEAD`

Expected: no output and exit code 0.
