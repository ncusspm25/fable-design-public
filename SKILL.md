---
name: fable-design
description: "Explicit craft and polish workflow for original websites, motion, films, screen recordings, and 3D models, with or without external references. Establish the intended finish from the brief, build a representative slice, refine composition, materials, motion, and interaction states from rendered evidence, and verify the actual deliverable. Invoke with /fable-design or $fable-design."
---

# Fable Design

Use this skill to carry the same care through a visual project's composition, materials, motion, interaction, and delivery. Start from the brief, audience, medium and existing project conventions. References are optional evidence. The workflow uses the selected model and existing project tools.

## Invocation and scope

- `/fable-design` or `$fable-design` alone activates the workflow. Acknowledge activation and state what project brief would be useful. A supplied task authorizes work within its scope.
- Follow the requested deliverable and applicable `AGENTS.md` routing. Open the relevant parts of [craft and medium workflows](references/workflows.md) and any medium skills authorized for the task. Keep their existing acceptance gates.
- Reference access, asset licensing, installations, publishing, uploads, and external review follow their own authorization.

## Workflow

1. **Define the intended finish.** Identify the main subject or action, audience, intended emotion, and one detail people should remember. Pick a few observable qualities appropriate to the work, such as clean silhouette, legible type during motion, or credible material at the actual viewing distance. Declare the applicable visual direction before implementation.
2. **Build one representative slice.** Use real content and intended lighting, materials, type and interaction. For motion, build one complete transition with readable before, action and result. For a static design or model, render the signature view and the detail or narrow view most likely to expose a weakness.
3. **Refine in order of impact.** Resolve composition and hierarchy first, then shape, spacing, typography, lighting, materials and motion as applicable. Tune small highlights, texture and feedback after the main form reads. Keep details that improve reading, material, meaning or feedback.
4. **Compare the actual result.** Use an earlier render or a controlled alternative at equivalent framing. When a reference is useful, record what is visible, what is inferred, and what the project will make its own. Fix the largest visible gap and re-render the affected views. For authored motion, use the [event ledger](references/event-ledger.md) when shared markers help implementation and review.
5. **Inspect the delivered form.** Exercise representative real inputs, playback or asset reimport as applicable. Include relevant loading, transition, resting and responsive states. Use the existing review requirements. Record the version, viewport, device or host actually inspected and any material verification limits.

## References and harness

- [Craft checks, AOAWA example, and medium workflows](references/workflows.md)
- [Event ledger and Playwright integration](references/event-ledger.md)
- [Original-brief event example](templates/events.example.json)
- [Event ledger helper](scripts/event-ledger.mjs) for validation and FFmpeg frame extraction
