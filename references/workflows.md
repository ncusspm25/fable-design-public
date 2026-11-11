# Visual craft and workflows by deliverable

Start with the brief and the artifact people will actually use. Select the checks that matter for that deliverable and use the existing `AGENTS.md` routing for medium-specific requirements.

## Establish a representative slice

- Define the subject, viewer, viewing conditions, and what the viewer should notice first. Describe the desired feel using visible cues such as scale, negative space, contrast, edge softness, text rhythm or the pace of a reveal.
- Pick a signature view or complete short action. Use final-intent content and assets in this slice. It should reveal the most important relationship, such as text beside a moving subject, a material at close range, or one shot passing attention to the next.
- Inspect the slice before expanding production. Start with a prior render or one controlled alternative when working from an original brief. Keep the view, scale, event phase and unrelated settings comparable. Choose the next change from the largest visible weakness.
- If using a reference, record the source, what is visible, what is inferred, and the principle to transfer. Identify the project's own creative decisions. Record provenance and usage rights for included external assets.

## Refine the details people can see

| Area | What to make and inspect |
| --- | --- |
| Composition and hierarchy | Give each state a focal subject. Check its silhouette, relative size, alignment, negative space and reading order. Inspect crops in the actual aspect ratios. Let a narrow view recompose around the subject and text. |
| Typography and layout | Set hierarchy with scale, weight and spacing. Check real copy, line breaks, baselines, contrast and touch targets at the delivery size. Keep readable space when nearby imagery or motion changes. |
| Shape and materials | Put important seams, wall thickness and edges in geometry when they affect silhouette or close-ups. Use light, roughness, reflections and contact shadows to explain the material. Scale texture to the object and inspect it at the intended distance. |
| Motion and continuity | Give the action a readable starting state, change, consequence and settled state. Preserve a shared object, screen position, shape or light cue across a handoff when that serves the story. Tune pace and easing around weight, causality and readability. |
| Interaction and boundaries | Inspect first paint, the change from loading to ready, transitions, interruption and the final hold where applicable. Give controls deliberate feedback and provide equivalent reading or navigation in the reduced-motion or failure paths the project supports. |

Use brief-specific rejection conditions. For example, a transparent vessel should still read as glass against the darkest scene, the first action should be readable while the scene loads, or a falling object should land inside its target at the tested viewport. Compare the changed render at the same view and event phase.

## What changed the finish in AOAWA

- **Material separation.** Thin, warm bamboo tines with curved tips made the whisk read more clearly. Lower texture contrast and continuous normals let the bowl's glaze follow its shape. Use silhouette, reflectance and fine detail together to distinguish materials.
- **Composition during use.** The mobile view puts the utensils above the copy. The tablet view uses a shorter picture area to reduce unused vertical space while keeping the bowl in frame. Recompose the image and text at the delivery sizes.
- **Physical continuity.** A visible stream ends in a ripple at the tea surface. The same bowl stays in view as the whisk moves and fine foam accumulates. Let each action have a visible consequence and keep the shared subject through the transition.
- **First and in-between states.** A rendered still displays while the 3D scene initializes. Chapter stills also support a WebGL fallback. Inspect how the fallback gives way to the scene and how each chapter settles.

## Interactive website

1. Apply the existing art-direction, frontend and visual QA workflow. Use real content. Refine type, spacing, imagery and controls in the representative viewport before extending the experience.
2. For a scroll-driven sequence, give chapter targets, scene state and text timing one progress source where practical. Use named [event markers](event-ledger.md) to inspect relevant before/action/after states. Exercise actual scroll, reverse, interruption, replay and resizing as applicable.
3. Inspect the required responsive widths and any light or dark scenes in the actual browser. Include relevant focus, touch, loading, reduced motion and WebGL or asset failure behavior. For a hosted delivery, record packaged and authenticated production checks separately where access differs.

## Screen recording of an existing experience

1. Capture the actual site or application in the intended viewport, orientation and access state. Plan a readable opening, a deliberate input pace and a settled ending. Keep unrelated UI and private content out of the capture.
2. Review the encoded clip at its intended speed where available. Inspect the first and last useful frames, full interaction sequence, captions and audio when present. Use available FFmpeg/ffprobe checks for duration, dimensions, codec, frame rate and decode integrity.

## Authored film or motion graphics

1. Establish the story beats, subject, camera and sound cues. Use one timeline for actors, overlays, camera and sound. Define the intended reaction and visible consequence of each essential action.
2. Render a short representative sample before expanding production. Check cuts, holds, silhouette, material detail, text and sound at the delivery scale. Compare before/action/after frames and watch the complete result at normal speed.
3. Reuse the authorized film harness, including `qa-video.mjs`, `playback.mjs` and `contact-sheet.mjs` where applicable. For cinematic 3D and film-quality frames, follow `claude-like-3d` look-development, independent review, signed receipt and executable gate requirements.

## Standalone 3D model

1. Define the target host, purpose, scale and units when relevant, axis, origin or pivot, camera distance, output format and performance budget. Test the silhouette and contact surfaces before adding small detail.
2. Use a consistent light setup to compare material revisions. Inspect the expected viewing distance and a close-up, including geometry, edge thickness, normals, UVs, material response, texture color spaces and transparency where applicable.
3. Export and reimport in the intended host or an appropriate available validator. Verify dimensions, transforms, pivots, materials, textures and any requested rig or animation. Inspect the rendered import and report verification limits.

## AGENTS.md integration

Keep `/fable-design` and `$fable-design` as explicit triggers. The general visual completion guidance in `AGENTS.md` also supports a representative slice and rendered refinement for substantial visual work. Use this skill for the detailed craft workflow and the existing visual routing for medium-specific acceptance.
