# Automation Planning — Portal de Chamados

> **Last updated:** March 8, 2026
> **Author:** QA Team

---

## Overview

This document tracks what we are building, why, and the current state of our end-to-end and API automation for the **Portal de Chamados** application. It is meant to keep the whole team aligned — developers, QA, and stakeholders — without anyone needing to dig into the code.

- **Framework:** [Playwright](https://playwright.dev/) v1.42+
- **Language:** JavaScript (Node.js)
- **Environments:** Chromium · Firefox · WebKit (parallel execution)
- **Target app:** Portal de Chamados (dev environment)
  - Frontend: `https://portal-chamados-dev.t-upsolucoes.net.br`
  - API: `https://api-portal-chamados-dev.t-upsolucoes.net.br`
- **API contract reference:** `json-swagger-portal-de-chamados.json` (OpenAPI 3.1.0)

---

## Goals

1. Guarantee stable login/logout flows work across all browsers before every release.
2. Validate the REST API authentication cycle (login → JWT → protected endpoints → refresh → logout).
3. Produce audit-ready evidence (screenshots + HD video recordings) automatically on every run.
4. Enable any team member — including non-QA — to run the full suite locally with a single command.

---

## Tests Implemented

### `tests/portal-chamados/portal-auth.spec.js` — UI Tests

| # | Scenario | Type | Status |
|---|----------|------|--------|
| 1 | Login with valid MASTER credentials | HAPPY | ✅ Done |
| 2 | Error displayed with incorrect password | ERROR | ✅ Done |
| 3 | Required fields block empty submission | VALIDATION | ✅ Done |
| 4 | Logout ends session and redirects to /login | HAPPY | ✅ Done |

**Evidence generated per run:**
- Full-page screenshots attached inline to the HTML report
- Saved screenshots under `screenshots/<browser>/`
- HD video recordings (`.webm`) under `videos/<browser>/`

---

### `tests/portal-chamados/portal-api.spec.js` — API Tests

| # | Scenario | Type | Status |
|---|----------|------|--------|
| 1 | `POST /auth/login` — MASTER credentials | HAPPY | ✅ Done |
| 2 | `POST /auth/login` — rejects wrong password | ERROR | ✅ Done |
| 3 | `POST /auth/login` — rejects malformed e-mail | ERROR | ✅ Done |
| 4 | `GET /users` — authenticated request | HAPPY | ✅ Done |
| 5 | `GET /tickets` — authenticated request | HAPPY | ✅ Done |
| 6 | `GET /companies` — authenticated request | HAPPY | ✅ Done |
| 7 | `GET /roles` — authenticated request | HAPPY | ✅ Done |
| 8 | `GET /users` — blocked without token (401) | ERROR | ✅ Done |
| 9 | `GET /tickets` — blocked without token (401) | ERROR | ✅ Done |
| 10 | `POST /auth/refresh` — renew JWT via refresh_token | HAPPY | ✅ Done |
| 11 | `POST /auth/logout` — terminate session | HAPPY | ✅ Done |

---

## How Authentication Works

```
POST /auth/login
  → server sets JWT via Set-Cookie: access_token=<jwt>
  → server sets Set-Cookie: refresh_token=<token>

Protected requests
  → send Authorization: Bearer <access_token>

POST /auth/refresh
  → send Cookie: refresh_token=<token>
  → server issues a new access_token

POST /auth/logout
  → send Authorization: Bearer <access_token>
  → session terminated
```

---

## Running the Tests

### Prerequisites

```bash
# Install dependencies (first time only)
npm install
npx playwright install
```

### Environment Variables

Credentials are read from environment variables. Copy `.env.example` and fill it in:

```bash
cp .env.example .env
# then edit .env with real credentials
```

| Variable | Description | Default (dev) |
|----------|-------------|---------------|
| `API_BASE` | REST API base URL | `https://api-portal-chamados-dev.t-upsolucoes.net.br` |
| `MASTER_EMAIL` | Login e-mail for MASTER profile | `master@t-upsolucoes.com.br` |
| `MASTER_PASSWORD` | Password for MASTER profile | *(set in .env)* |

### Commands

```bash
# Run all tests (all browsers, headless)
npm test

# Run with browser UI visible
npm run test:headed

# Interactive debug mode
npm run test:debug

# Open Playwright UI mode
npm run test:ui

# Open last HTML report
npm run report

# Clean all evidence (screenshots, videos, reports)
npm run clean
```

---

## Project Structure

```
.
├── .env.example                    # Environment variable template
├── .github/
│   └── AUTOMATION_PLANNING.md      # This file — team planning & progress
├── global-setup.js                 # Cleans evidence folders before each run
├── playwright.config.js            # Playwright configuration (browsers, reporters, etc.)
├── package.json
├── tests/
│   └── 04-advanced/
│       ├── portal-login.spec.js    # UI login/logout flows
│       └── api-testing.spec.js     # REST API auth & endpoint tests
├── screenshots/                    # Auto-generated (git-ignored)
│   ├── chromium/
│   ├── firefox/
│   └── webkit/
├── videos/                         # Auto-generated (git-ignored)
│   ├── chromium/
│   ├── firefox/
│   └── webkit/
├── playwright-report/              # HTML report (git-ignored)
└── test-results/                   # JUnit XML per browser (git-ignored)
```

---

## Roadmap / Next Steps

> Items not yet implemented. Update this table as work progresses.

| Priority | Feature | Notes |
|----------|---------|-------|
| 🔴 High | Ticket creation flow (UI) | CRUD happy + error paths |
| 🔴 High | `POST /tickets` — API | Create, validate required fields |
| 🟡 Medium | `PATCH /tickets/:id` — API | Update ticket status |
| 🟡 Medium | `DELETE /tickets/:id` — API | Soft-delete validation |
| 🟡 Medium | Role-based access control tests | Non-MASTER profiles |
| 🟢 Low | CI/CD pipeline (GitHub Actions) | Run on every PR |
| 🟢 Low | Slack/email notification on failure | Integrate with report |
| 🟢 Low | Cross-browser screenshot diff | Detect visual regressions |

---

## Naming Conventions

| Element | Pattern | Example |
|---------|---------|---------|
| Test title | `[TYPE] description` | `[HAPPY] login com credenciais válidas` |
| Screenshot file | `{type}__{slug}__{step}__{label}.png` | `happy__login__03__dashboard.png` |
| Video file | `{type}__{slug}.webm` | `happy__login-com-credenciais-validas.webm` |
| Test type tags | `HAPPY` · `ERROR` · `VALIDATION` | — |

---

## Contacts

| Role | Name | Responsibility |
|------|------|---------------|
| QA Lead | *(your name)* | Test strategy, framework ownership |
| Dev Lead | *(dev name)* | API contract reviews |
| PO | *(po name)* | Acceptance criteria sign-off |
