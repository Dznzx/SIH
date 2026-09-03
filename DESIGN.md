# CivicSetu — Design System

Two personalities, one product. The citizen app is warm and low-literacy-friendly.
The authority dashboard is dense and technical. This split is deliberate and is part
of the pitch — do not homogenise them.

---

## Shared tokens

```css
:root{
  /* citizen palette — warm civic green + saffron action */
  --c-green:      #1a6b3c;
  --c-green-dk:   #12502c;
  --c-green-lt:   #e8f3ec;
  --c-saffron:    #d94f18;
  --c-saffron-lt: #fdeee8;

  /* authority palette — neutral slate, state colours only */
  --a-ink:        #191c1e;
  --a-ink-soft:   #45464d;
  --a-line:       #d8dadc;   /* hairline borders — the whole grid */
  --a-surface:    #f7f9fb;
  --a-card:       #ffffff;
  --a-hover:      #f2f4f6;

  /* functional state — identical on both sides, never decorative */
  --s-critical:   #ba1a1a;
  --s-critical-bg:#ffdad6;
  --s-warn:       #a86800;
  --s-warn-bg:    #fff2d6;
  --s-ok:         #248b57;
  --s-ok-bg:      #e4f4ec;
  --s-idle:       #76777d;
  --s-idle-bg:    #eceef0;

  --sp: 4px;   /* every spacing value is a multiple of this */
}
```

**Font stacks — no CDN dependency.** Venue wifi fails. Load webfonts if you like, but
every stack must end in a system font that renders identically offline.

```css
--font-ui:   "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
```

**Icons: inline SVG only.** No Material Symbols font, no icon CDN. When the font fails
to load, `<span class="material-symbols-outlined">photo_camera</span>` renders as the
literal text "photo_camera" on screen. This already happens. 1.5px stroke, 20px box,
`currentColor`.

---

## Citizen side — "approachable government"

Reference: the Gram Sevak screenshots.

- **Corners:** 12px on cards, 999px on buttons and chips. Soft, tappable.
- **Type:** `--font-ui` throughout. Hero 40px/700. Body 16px minimum — never below 16px
  anywhere on this side; assume outdoor light and older eyes.
- **Touch targets:** 48px minimum height. Category chips are large and thumb-reachable.
- **Bilingual pattern:** English then Devanagari, separated by a forward slash, in the
  same weight — `Report Submitted / रिपोर्ट दर्ज की गई`. Never make Hindi secondary
  through smaller size or lighter colour.
- **Depth:** soft shadow `0 1px 3px rgba(0,0,0,.08)`. Cards float slightly.
- **Primary action:** saffron fill, white text. Green is for status and brand, saffron
  is for "do the thing". One saffron button per screen.
- **Imagery:** photographs of real issues on report cards. Empty states get an
  illustration, not a grey box.

## Authority side — "diagnostic instrument"

Reference: the Stitch `Civic Precision Logic` system.

- **Corners:** 0px. Everything. Buttons, cards, inputs, badges.
- **Depth:** none. No shadows. Hierarchy comes from 1px `--a-line` borders and tonal
  fill only. A modal is white with a 2px `--a-ink` border.
- **Type:** `--font-ui` for structural text, `--font-mono` for all machine data — ticket
  IDs, GPS coordinates, timestamps, severity scores, ward codes, SLA countdowns.
  Section headers use 10px/700 mono, uppercase, `0.08em` letter-spacing.
- **Density:** 12–16px padding. Pack it. The dashboard should look like a spreadsheet
  that knows what it's doing.
- **Tables:** hairline border on every cell. `--a-hover` on row hover. Numeric columns
  right-aligned in mono.
- **Queue cards:** 4px vertical status strip on the left edge carrying the priority
  colour. This is the one permitted edge accent — it is functional, not decoration.
- **Badges:** 10px mono, desaturated background + matching border + dark text.
  Critical = `--s-critical-bg` bg, `--s-critical` text.
- **Buttons:** primary is `--a-ink` fill / white text, square. Utility actions are ghost
  buttons in mono brackets — `[ EXPORT ]`, `[ REASSIGN ]`.

---

## Rules that apply to both

- Colour carries state and nothing else. Never decorate with it.
- No gradient except the single citizen hero panel.
- No emoji as UI iconography. Emoji in seeded user comments is fine and realistic.
- Never rely on colour alone — every status has a text label beside it.
- Contrast floor 4.5:1 for body text, 3:1 for large text and icons.
- Motion: 150ms ease-out, opacity and transform only. Nothing bounces.

## Responsive

Citizen views must survive 375px width — that is the demo device. Authority dashboard
is desktop-first at 1280px and may simply stack below 900px; nobody triages a ward
queue on a phone.
