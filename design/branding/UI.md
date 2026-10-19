# UI — Media Extensions

## Storefront vs staff

| Surface | Panels | Background |
|---------|--------|------------|
| **Storefront** (shop, checkout, track, info) | Translucent glass on carousel (`--surface-glass`, `.panel` on media) | Full-viewport carousel + veil |
| **Staff** (`.staff-shell`) | Opaque cards, dense tables | No carousel; readable contrast first |

When adding CSS, avoid re-enabling `backdrop-filter` on generic `.panel` inside `.staff-shell`.

## Shared components

- `EmptyState` — empty lists and catalog
- `PageHeader` — eyebrow + title + lede
- `StatusChip` — order/repair status labels
- `CopyButton` — clipboard + toast
- `PageMeta` — title, description, Open Graph (home, product, and layout-driven routes)

## Motion

Respect `prefers-reduced-motion`: carousel auto-advance pauses when set; avoid essential info in motion-only UI.

## Screenshots

Portfolio captures live in [screenshots/README.md](./screenshots/README.md).
