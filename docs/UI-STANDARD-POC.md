# vNext UI Standard Trial

This document records the Microsoft Credentials Tracker trial of the candidate Web App Foundation design standard selected after v0.6.0. It is implementation evidence, not a claim that the candidate has already shipped as a Foundation release.

## Trial scope

The product information architecture and visual direction remain unchanged. The trial validates infrastructure decisions underneath the existing product-specific composition:

- Tailwind CSS 4.3.x remains the styling infrastructure.
- Runtime semantic values are defined as CSS custom properties and exposed to Tailwind through `@theme inline` aliases.
- New/normalized product colors use absolute `oklch()` values while remaining visually equivalent to the established sRGB palette.
- Native HTML remains the first choice for simple controls.
- The shared Dialog primitive is migrated from Radix Dialog to Base UI 1.8.x as one representative complex-control proof.
- Product components continue to import the application-owned `src/components/ui/dialog.tsx` wrapper rather than Base UI directly.
- Dialog enter/exit feedback uses CSS transitions and Base UI state attributes. No Motion dependency is introduced.
- `prefers-reduced-motion: reduce` removes non-essential dialog motion and smooth scrolling.

## Token contract exercised here

The implementation separates two responsibilities:

1. `--app-*` custom properties hold product-owned runtime values and semantic decisions.
2. Tailwind theme aliases such as `--color-background`, `--color-focus`, and `--shadow-popover` expose the subset needed by utilities and generic UI.

The product may map several semantic roles to the same current color value without merging their meanings. For example, accent, action, and focus currently share the established Azure-blue value but remain independently named roles so they can diverge later without changing component semantics.

Existing `primary` and `slate-status` aliases are retained only where required by current product code. New generic code should prefer the more explicit `action`, `focus`, and `status-neutral` roles when those meanings apply. This trial does not broaden scope by rewriting every existing class name.

## Primitive migration boundary

Only Dialog changes primitive family. Button continues to use the existing source-owned shadcn-style implementation and Radix Slot because replacing stable controls solely for conformity would contradict the migration policy being tested.

The wrapper should preserve the product-facing API for:

- controlled `open` / `onOpenChange`,
- portal + backdrop + popup composition,
- title and description semantics,
- close controls,
- Escape/outside dismissal,
- focus management and return,
- narrow-viewport scrolling and sizing.

Base UI's package internals remain a normal npm dependency. "Source-owned" means the application owns and reviews its generic UI wrapper and acquired component source; it does not mean copying Base UI internals into this repository.

## Motion contract exercised here

Base UI exposes `data-starting-style` and `data-ending-style` for cancellable CSS transitions. The Dialog wrapper uses those state attributes for a restrained opacity/scale transition. Animation is presentation only: closing, focus restoration, persistence, and other application behavior do not depend on an animation completing.

Reduced-motion behavior is part of the product quality contract even though not every motion-related WCAG criterion is AA. The reduced-motion path must leave state and controls fully available.

## Rendered validation required

The existing Foundation-derived review loop remains authoritative. This trial must be checked at approximately 1440px, 390px, and 320px and must retain:

- no new page-level horizontal overflow,
- readable Japanese/CJK wrapping,
- keyboard-operable dialogs,
- visible focus,
- text alongside required status meaning,
- usable dialog sizing on narrow screens.

The dedicated Playwright proof additionally checks focus return after Escape, outside dismissal, reduced-motion CSS, and resolution of the new runtime semantic token layer.

## Candidate Foundation feedback

If this trial passes, the following are appropriate to generalize into the next Foundation minor release:

1. New React consumers use native HTML first and Base UI as the default complex primitive family.
2. shadcn remains a source-acquisition/component-architecture model rather than a product visual skin.
3. Tailwind's theme namespace should alias product-owned semantic CSS custom properties rather than being the sole storage location for runtime design values.
4. Foundation examples should distinguish semantic focus/action/status roles even when a product initially maps them to the same literal value.
5. CSS transitions should be the default motion mechanism for routine primitive state changes, with explicit reduced-motion behavior.
6. Existing consumers should migrate primitives only when there is a concrete objective or when a bounded trial provides useful evidence.

The following remain product-specific and should not be generalized from this application:

- the Azure-blue palette and exact OKLCH values,
- Segoe/CJK font choices,
- the 90-day timeline implementation,
- credential state vocabulary,
- page composition, density, spacing, radius, and layout decisions.
