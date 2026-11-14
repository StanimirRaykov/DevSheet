title: Map canonical skills to the ESCO taxonomy
labels: feature
milestone: M2 Later
---
**Branch:** `09-esco-taxonomy`  |  **Depends on:** 01, 05

## Context
ESCO is the EU skills classification used by Europass. Mapping our canonical list to ESCO concept URIs aligns the CV export with Europass and gives a defensible taxonomy for the thesis.

## Scope
Fill `Skill.EscoUri` for canonical skills (script or seed file with a documented source and version of the ESCO dataset); keep a developer-alias table for terms ESCO lacks (frameworks). Include the ESCO license/attribution in the README.

## Tests
Every seeded canonical skill either has a URI or is explicitly listed as "no ESCO equivalent"; URIs are unique where present.
