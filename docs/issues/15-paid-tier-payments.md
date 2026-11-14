title: Paid tier and payments
labels: feature
milestone: M2 Later
---
**Branch:** `15-paid-tier-payments`  |  **Depends on:** 14

## Context
Survey (n=7): all chose freemium; 6 of 7 picked EUR 3-8/month; one-time CV fee was seen positively but is easy to replace with a generic AI prompt. Custom domains and live-demo iframes are cut (iframes rated lowest, 3.7/5).

## Scope
Plans (Free: portfolio + one basic CV; Paid: tailoring with monthly cap), a payment provider integration in test mode first, webhook handling (idempotent), entitlement checks in the API, cancellation. Decide the provider and record why.

## Tests
Entitlement checks per plan; webhook idempotency; expired subscription downgrades correctly.
