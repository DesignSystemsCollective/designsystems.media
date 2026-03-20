# ADR 0002: Split smoke coverage from visual regression coverage

## Status

Accepted

## Context

The test surface previously leaned on one broad Playwright layer. That made it harder to distinguish route/link integrity failures from UI regressions, and it did not provide curated screenshot baselines for layout or styling drift.

At the same time, some routes such as `/all/` and `/podcast/` are intentionally data-driven, so naive full-page screenshots would churn whenever the latest content changed.

## Decision

We split Playwright coverage into two explicit suites with explicit npm scripts:

- `npm run test:smoke` for generated-page and internal-link integrity
- `npm run test:visual` for curated screenshot baselines
- `npm run test:visual:update` for baseline refreshes

The visual suite targets a small set of representative routes and runs in fixed Chromium desktop and mobile viewports. To keep screenshots deterministic, the suite forces reduced motion, waits for page chrome and fonts, masks animated homepage counters, and masks dynamic content regions on listing pages that change with new media.

## Consequences

Failures are easier to interpret because broken routes and UI regressions now fail in different suites.

The visual suite is intentionally curated rather than exhaustive, so not every route has screenshot coverage. That keeps maintenance manageable but means broad route integrity still depends on the smoke suite.

Visual changes to shared UI now require either zero screenshot diffs or an intentional baseline update with `npm run test:visual:update`.
