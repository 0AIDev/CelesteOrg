# Celeste HQ — Complete Icon Specification

**Brand:** Celeste HQ (Internal Company Workspace)
**Style:** Ultra-minimal, premium, luxury-grade — inspired by ElevenLabs, Arc, and Apple
**Design System:** 1.5px stroke weight, 18×18 viewBox, rounded joins, no fills (outline only), monochrome black/gray
**Grid:** 18×18px, 1.5px stroke, 1px padding from edges
**Stroke:** `currentColor`, `stroke-width="1.5"`, `stroke-linecap="round"`, `stroke-linejoin="round"`
**Fill:** None (outline icons only) — unless explicitly noted
**Export:** SVG (inline), React component, PNG @1x/@2x/@3x

---

## Design Principles

1. **Minimal** — no decorative elements, no gradients, no shadows
2. **Consistent** — every icon uses the same stroke weight, corner radius, and optical weight
3. **Geometric** — based on simple shapes (circles, rectangles, lines)
4. **Readable** — recognizable at 16px, clear at 14px, legible at 12px
5. **Premium** — feels like it belongs in a luxury SaaS product

---

## SECTION 1: Navigation Icons (Sidebar)

These are the primary navigation icons shown in the left sidebar.

### 01. Home
- **Phosphor name:** `House`
- **Description:** Simple house silhouette — roof + door
- **Visual:** A triangular roof (2 lines meeting at top center) over a square body with a centered door cutout
- **Notes:** No chimney, no windows. Pure geometric house shape.

### 02. Org Chart
- **Phosphor name:** `TreeStructure`
- **Description:** Vertical hierarchy tree with connected nodes
- **Visual:** A top node (circle) connected by a vertical line to a horizontal line, which connects to 2-3 nodes below
- **Notes:** Like a typical org chart flow. 3 levels max.

### 03. Teams
- **Phosphor name:** `UsersThree`
- **Description:** Three people silhouettes (head + shoulders)
- **Visual:** One centered person slightly larger, two flanking slightly behind and smaller
- **Notes:** Simple circles for heads, curved lines for shoulders. No detail.

### 04. Chat
- **Phosphor name:** `ChatCircleText`
- **Description:** Circular speech bubble with horizontal lines inside
- **Visual:** Circle with a small tail/pointer at bottom-left, 2-3 horizontal lines inside
- **Notes:** Tail should be subtle — just a small triangle notch.

### 05. Documents
- **Phosphor name:** `FileText`
- **Description:** Document page with folded corner and horizontal lines
- **Visual:** Rectangle with top-right corner folded down (like a dog-ear), 2-3 horizontal lines inside
- **Notes:** Classic file icon. Clean lines.

### 06. Calendar
- **Phosphor name:** `CalendarBlank`
- **Description:** Calendar grid with two hooks on top
- **Visual:** Rectangle with two small vertical lines (hooks) on top edge, horizontal line separating header from body
- **Notes:** No numbers inside. Just the grid lines.

### 07. Ideas
- **Phosphor name:** `Lightbulb`
- **Description:** Classic lightbulb silhouette
- **Visual:** Bulb shape (rounded top, narrower neck) with small base
- **Notes:** No rays/lines around it. Just the bulb outline.

### 08. Reports
- **Phosphor name:** `ClipboardText`
- **Description:** Clipboard with horizontal lines
- **Visual:** Rectangle with a clip/clamp at top center, 2-3 horizontal lines inside
- **Notes:** Similar to FileText but with the clip element at top.

### 09. Approvals
- **Phosphor name:** `ShieldCheck`
- **Description:** Shield shape with a checkmark inside
- **Visual:** Shield outline (pointed bottom, curved top) with a checkmark centered inside
- **Notes:** The check should be bold and clear. Shield should feel protective.

### 10. Equity
- **Phosphor name:** `Coins`
- **Description:** Stack of coins
- **Visual:** 2-3 overlapping circles (coins) with a slight offset showing depth
- **Notes:** Simple overlapping circles, no dollar signs.

### 11. GitHub
- **Phosphor name:** `GithubLogo`
- **Description:** GitHub octocat logo (official mark)
- **Visual:** The standard GitHub logo — circle with tentacles
- **Notes:** Use the official GitHub mark, not a custom interpretation.

### 12. Prompt Vault
- **Phosphor name:** `Lightning`
- **Description:** Lightning bolt
- **Visual:** Zigzag bolt shape, sharp angles
- **Notes:** Clean, single bolt. No glow effects.

### 13. Tasks
- **Phosphor name:** `Kanban`
- **Description:** Kanban board with 3 columns
- **Visual:** 3 vertical rectangles side by side with rounded corners
- **Notes:** Columns should be equal width. Simple dividers.

### 14. Issues
- **Phosphor name:** `Warning`
- **Description:** Triangle with exclamation mark
- **Visual:** Triangle outline with "!" centered inside
- **Notes:** Classic warning shape. Equilateral triangle.

### 15. Recordings
- **Phosphor name:** `VideoCamera`
- **Description:** Video camera / camcorder
- **Visual:** Rectangle body with a trapezoid lens on one side
- **Notes:** Side profile view. Minimal.

### 16. Social Planner
- **Phosphor name:** `RocketLaunch`
- **Description:** Rocket taking off
- **Visual:** Rocket body (elongated oval) with fins and a small flame/exhaust at bottom
- **Notes:** Angled slightly upward. No stars.

### 17. Standups
- **Phosphor name:** `Sparkle`
- **Description:** Four-pointed star / sparkle
- **Visual:** 4-pointed star shape (like a diamond with concave sides)
- **Notes:** Used for AI features. Should feel magical but minimal.

### 18. Realtime AI Usage
- **Phosphor name:** `Gauge`
- **Description:** Speedometer / gauge
- **Visual:** Semicircle arc with a needle pointing to one side
- **Notes:** No numbers. Just the arc and needle.

### 19. Developers
- **Phosphor name:** `Plugs`
- **Description:** Two plugs connecting
- **Visual:** Two plug shapes facing each other with prongs
- **Notes:** Like electrical plugs about to connect.

### 20. Settings
- **Phosphor name:** `GearSix`
- **Description:** Gear / cog with 6 teeth
- **Visual:** Circle with 6 rectangular teeth around the perimeter, small circle in center
- **Notes:** Classic settings gear. Not too many teeth.

---

## SECTION 2: Action Icons (UI Controls)

These are used for buttons, actions, and interactions.

### 21. Close / Dismiss
- **Phosphor name:** `X`
- **Description:** Simple X mark
- **Visual:** Two diagonal lines crossing
- **Notes:** Used in modals, alerts, tags. Clean and clear.

### 22. Check / Success
- **Phosphor name:** `Check`
- **Description:** Checkmark
- **Visual:** Two lines forming a check shape
- **Notes:** Used for confirmations, selections. Slightly weighted.

### 23. Loading Spinner
- **Phosphor name:** `Spinner`
- **Description:** Partial circle arc (loading animation)
- **Visual:** Incomplete circle (about 270° arc)
- **Notes:** Should rotate via CSS animation. No arrow tip.

### 24. Plus / Add
- **Phosphor name:** `Plus`
- **Description:** Plus sign
- **Visual:** Horizontal and vertical lines crossing at center
- **Notes:** Used for create/add buttons. Bold and centered.

### 25. Trash / Delete
- **Phosphor name:** `Trash`
- **Description:** Trash can
- **Visual:** Rectangle body with lid and small handle on top
- **Notes:** No crumpled paper inside. Clean outline.

### 26. Edit
- **Phosphor name:** `PencilSimple`
- **Description:** Simple pencil
- **Visual:** Diagonal pencil with tip and eraser end
- **Notes:** No ruler marks. Just the pencil shape.

### 27. Eye (Show)
- **Phosphor name:** `Eye`
- **Description:** Open eye
- **Visual:** Almond/eye shape with a circle (pupil) inside
- **Notes:** Used for password visibility toggle.

### 28. Eye Slash (Hide)
- **Phosphor name:** `EyeSlash`
- **Description:** Eye with a diagonal line through it
- **Visual:** Same as Eye but with a diagonal slash across
- **Notes:** Used for password hide toggle.

### 29. Copy
- **Phosphor name:** `Copy`
- **Description:** Two overlapping rectangles
- **Visual:** One rectangle slightly offset behind another
- **Notes:** Classic copy-to-clipboard icon.

### 30. Refresh
- **Phosphor name:** `ArrowClockwise`
- **Description:** Circular arrow (clockwise)
- **Visual:** Circle arc with an arrowhead at one end
- **Notes:** Used for refresh/reload actions.

### 31. Send
- **Phosphor name:** (custom — from Lucide `ArrowUp`)
- **Description:** Arrow pointing up (for send button)
- **Visual:** Simple upward arrow with shaft
- **Notes:** Used in chat composer. Alternative: paper plane.

### 32. Stop
- **Phosphor name:** (custom — from Lucide `Square`)
- **Description:** Filled square
- **Visual:** Small filled square
- **Notes:** Used to stop AI generation.

### 33. Filter
- **Phosphor name:** `Funnel`
- **Description:** Funnel / filter shape
- **Visual:** Inverted triangle with a short tube at bottom
- **Notes:** Used in filter bars and search.

---

## SECTION 3: Navigation Controls

### 34. Caret Left (Previous)
- **Phosphor name:** `CaretLeft`
- **Description:** Left-pointing chevron
- **Visual:** Two lines meeting at a point on the left
- **Notes:** For pagination, calendar navigation.

### 35. Caret Right (Next)
- **Phosphor name:** `CaretRight`
- **Description:** Right-pointing chevron
- **Visual:** Two lines meeting at a point on the right
- **Notes:** For pagination, calendar navigation.

### 36. Caret Down (Dropdown)
- **Phosphor name:** `CaretDown`
- **Description:** Down-pointing chevron
- **Visual:** Two lines meeting at a point on the bottom
- **Notes:** For dropdown menus, expandable sections.

### 37. Chevron Down
- **Phosphor name:** (Lucide `ChevronDown`)
- **Description:** Down-pointing chevron (slightly different angle)
- **Visual:** Two lines meeting at a point on the bottom
- **Notes:** Used for expand/collapse. Slightly wider than CaretDown.

### 38. Chevron Up
- **Phosphor name:** (Lucide `ChevronUp`)
- **Description:** Up-pointing chevron
- **Visual:** Two lines meeting at a point on the top
- **Notes:** Used for collapse sections.

---

## SECTION 4: Data & Status Icons

### 39. Trend Up
- **Phosphor name:** `TrendUp`
- **Description:** Upward trending line chart
- **Visual:** Diagonal line going up from left to right with a small arrow
- **Notes:** Used in equity/metrics. Clean and minimal.

### 40. Lock
- **Phosphor name:** `Lock`
- **Description:** Padlock
- **Visual:** Rectangle body with a U-shaped shackle on top
- **Notes:** Used for locked/private items.

### 41. Coin
- **Phosphor name:** `Coin`
- **Description:** Single coin circle
- **Visual:** Circle with a smaller circle inside (donut)
- **Notes:** Used in equity. Single coin vs Coins (stack).

### 42. Inbox / Tray
- **Phosphor name:** `Tray`
- **Description:** Inbox tray
- **Visual:** Rectangle with an open top and a small arrow pointing down into it
- **Notes:** Used for pending items.

### 43. History / Undo
- **Phosphor name:** `ClockCounterClockwise`
- **Description:** Clock with counter-clockwise arrow
- **Visual:** Circle with hands and an arrow going backward
- **Notes:** Used for history/audit log.

### 44. Time / Clock
- **Phosphor name:** `Clock`
- **Description:** Simple clock face
- **Visual:** Circle with two hands (hour + minute)
- **Notes:** Used in time pickers.

### 45. Warning / Alert
- **Phosphor name:** `Warning`
- **Description:** Triangle with exclamation mark
- **Visual:** Triangle outline with "!" centered inside
- **Notes:** Used for errors, warnings, issues.

---

## SECTION 5: People & Communication Icons

### 46. Envelope / Email
- **Phosphor name:** `Envelope`
- **Description:** Email envelope
- **Visual:** Rectangle with a V-shaped flap on top
- **Notes:** Used for email-related actions.

### 47. User Plus / Invite
- **Phosphor name:** `UserPlus`
- **Description:** Person silhouette with a plus sign
- **Visual:** Head + shoulders circle with a small "+" on the side
- **Notes:** Used for invite/add team member.

### 48. Crown / Admin
- **Phosphor name:** `Crown`
- **Description:** Crown shape
- **Visual:** Zigzag crown with 3-5 points
- **Notes:** Used for owner/admin badge.

### 49. Prohibit / Block
- **Phosphor name:** `Prohibit`
- **Description:** Circle with diagonal line through it
- **Visual:** Circle with a "/" slash across
- **Notes:** Used for ban/block/remove actions.

### 50. Map Pin / Location
- **Phosphor name:** `MapPin`
- **Description:** Location pin
- **Visual:** Teardrop/pin shape with a dot inside
- **Notes:** Used for location fields.

---

## SECTION 6: Theme Icons

### 51. Sun (Light Mode)
- **Phosphor name:** `Sun`
- **Description:** Sun with rays
- **Visual:** Circle with short lines radiating outward
- **Notes:** Used for light theme toggle.

### 52. Moon (Dark Mode)
- **Phosphor name:** `MoonStars`
- **Description:** Crescent moon with small stars
- **Visual:** Crescent shape with 1-2 small star dots
- **Notes:** Used for dark theme toggle.

---

## SECTION 7: Status Icons

### 53. Check Circle
- **Phosphor name:** `CheckCircle`
- **Description:** Circle with checkmark inside
- **Visual:** Circle outline with a checkmark centered inside
- **Notes:** Used for success states.

### 54. Shield (Protection)
- **Phosphor name:** `ShieldCheck`
- **Description:** Shield with checkmark
- **Visual:** Shield shape (pointed bottom) with checkmark inside
- **Notes:** Used for approvals, security.

---

## SECTION 8: Special / Custom Icons

### 55. Ask Celeste AI (Chat Button)
- **Custom design**
- **Description:** Sparkle/star burst for AI features
- **Visual:** Four-pointed star with slight glow effect (optional)
- **Notes:** Used in the floating "Ask Celeste" button. Should feel magical.

### 56. Clipboard / Paste
- **Custom design**
- **Description:** Clipboard with paper
- **Visual:** Rectangle with clip at top, paper slightly emerging from top
- **Notes:** Used for paste actions.

### 57. Arrow Up (Send)
- **Custom design**
- **Description:** Simple upward arrow
- **Visual:** Vertical line with arrowhead pointing up
- **Notes:** Used in chat send button. Centered in circle.

### 58. Square (Stop)
- **Custom design**
- **Description:** Small filled square
- **Visual:** Centered filled square
- **Notes:** Used to stop AI generation. Should feel "solid."

---

## Technical Specifications

### SVG Template
```svg
<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M..." stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

### React Component Template
```tsx
import { type IconProps } from "@phosphor-icons/react";

export function IconName(props: IconProps) {
  return (
    <svg width={props.size ?? 18} height={props.size ?? 18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M..." stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  );
}
```

### CSS Variables
```css
--icon-size: 18px;
--icon-stroke: 1.5px;
--icon-color: currentColor;
```

---

## Color Usage

| Context | Color |
|---------|-------|
| Default | `text-gray-600` (#4B5563) |
| Hover | `text-gray-900` (#111827) |
| Active/Selected | `text-gray-900` (#111827) |
| Disabled | `text-gray-300` (#D1D5DB) |
| On dark bg | `text-white` |
| Success | `text-green-600` (rare) |
| Error | `text-red-600` (rare) |

---

## Animation Specs

| Animation | Duration | Easing |
|-----------|----------|--------|
| Hover scale | 150ms | ease-out |
| Active scale | 100ms | ease-in |
| Spin (loading) | 1s linear | infinite |
| Fade in | 200ms | ease-out |

---

## File Structure for Manus AI

```
celeste-icons/
├── svg/
│   ├── navigation/
│   │   ├── house.svg
│   │   ├── tree-structure.svg
│   │   ├── users-three.svg
│   │   ├── chat-circle-text.svg
│   │   ├── file-text.svg
│   │   ├── calendar-blank.svg
│   │   ├── lightbulb.svg
│   │   ├── clipboard-text.svg
│   │   ├── shield-check.svg
│   │   ├── coins.svg
│   │   ├── github-logo.svg
│   │   ├── lightning.svg
│   │   ├── kanban.svg
│   │   ├── warning.svg
│   │   ├── video-camera.svg
│   │   ├── rocket-launch.svg
│   │   ├── sparkle.svg
│   │   ├── gauge.svg
│   │   ├── plugs.svg
│   │   └── gear-six.svg
│   ├── actions/
│   │   ├── x.svg
│   │   ├── check.svg
│   │   ├── spinner.svg
│   │   ├── plus.svg
│   │   ├── trash.svg
│   │   ├── pencil-simple.svg
│   │   ├── eye.svg
│   │   ├── eye-slash.svg
│   │   ├── copy.svg
│   │   ├── arrow-clockwise.svg
│   │   ├── arrow-up.svg
│   │   ├── square.svg
│   │   └── funnel.svg
│   ├── controls/
│   │   ├── caret-left.svg
│   │   ├── caret-right.svg
│   │   ├── caret-down.svg
│   │   ├── chevron-down.svg
│   │   └── chevron-up.svg
│   ├── data/
│   │   ├── trend-up.svg
│   │   ├── lock.svg
│   │   ├── coin.svg
│   │   ├── tray.svg
│   │   ├── clock-counter-clockwise.svg
│   │   ├── clock.svg
│   │   └── warning-triangle.svg
│   ├── people/
│   │   ├── envelope.svg
│   │   ├── user-plus.svg
│   │   ├── crown.svg
│   │   ├── prohibit.svg
│   │   └── map-pin.svg
│   ├── theme/
│   │   ├── sun.svg
│   │   └── moon-stars.svg
│   └── status/
│       ├── check-circle.svg
│       └── spinner-status.svg
├── png/
│   ├── @1x/
│   ├── @2x/
│   └── @3x/
└── README.md
```

---

## Quality Checklist

- [ ] All icons use 1.5px stroke
- [ ] All icons fit within 18×18 viewBox
- [ ] All icons are optically centered
- [ ] All icons are recognizable at 16px
- [ ] No fills (outline only)
- [ ] Consistent corner radius
- [ ] No decorative elements
- [ ] Clean, minimal, premium feel
- [ ] Works on both light and dark backgrounds
- [ ] Animated spinner icon included

---

## Reference Images

For visual reference, see the ElevenLabs icon set and Phosphor Icons (https://phosphoricons.com/). The Celeste HQ icons should feel like a premium, curated subset of Phosphor with ElevenLabs-level polish.

---

*Document generated for Celeste HQ icon recreation by Manus AI.*
*All icons must match the exact specifications above for design system consistency.*
