---
name: architect
description: "Sketch types, signatures, and module boundaries before implementation. Use for $architect, design decisions, or changes where ownership affects callers."
---

# Architect

Trace the systems the change touches. Sketch two plausible designs, including their types, signatures, and module boundaries. Pick the one that gives each piece of state one owner, each task one entry point, and callers the least they need to know. Explain the tradeoff in terms of actual callers. Revisit the design if the same workaround keeps appearing.

For a large or contested design, run the [Arena skill](../arena/SKILL.md) with the caller constraints and compare its alternatives. If the user requested a design checkpoint or sketch only, present the design and stop there. Otherwise continue within the scope the user gave.
