# Mobile UI Spec

## Purpose

This document defines the default visual and ergonomic system for the BandFan mobile companion app. It is intentionally more precise than the broader migration docs so the next agent can implement a real UI without inventing a new design language.

## Reference direction

The mobile app should preserve BandFan's tactile, hard-edged identity while simplifying it for a narrower fan-focused product.

The attached reference screenshot is important for two reasons:

- it keeps the UI square, bold, and physically obvious
- it uses a right-thumb-friendly control layout for playback and bottom navigation

The mobile app does not need to copy that screenshot literally, but it should preserve the same ergonomic logic.

## Core color palette

Use these colors as the default mobile palette unless the migration docs are intentionally updated.

- ink / main border / primary text: `#222220`
- app background / warm paper: `#FFF9EF`
- grouped surface / warm beige: `#F5E6D3`
- raised card surface: `#FFFFFF`
- accent ocher: `#E4C87E`
- light ocher: `#F1DFAD`
- muted dark text: `#4A4A44`
- light neutral gray: `#F4F4F4`
- mid neutral gray: `#D3D3D3`
- success green: `#6EA06E`
- soft player green: `#A2BAA2`
- player hover green: `#B6C9B6`
- info blue: `#86ABD6`
- deep cool blue: `#586BA4`
- destructive red: `#EF4343`
- saved / liked pink: `#ED9E97`

## Semantic mapping

- root app background: `#FFF9EF`
- section background or grouped strip: `#F5E6D3`
- primary card surface: `#FFFFFF`
- primary text: `#222220`
- secondary text: `#4A4A44`
- standard border: `#222220`
- primary accent fill: `#E4C87E`
- passive neutral fill: `#D3D3D3` or `#F5E6D3`
- liked state accent: `#ED9E97`
- success or playback accent: `#6EA06E` or `#A2BAA2`
- destructive fill: `#EF4343`

## Theme architecture

Use a two-layer token model in the mobile app.

- layer one is the raw palette: named color values such as black, white, bone, sand, gold, rose, green, and blue
- layer two is the semantic layer: UI meanings such as app background, card surface, grouped surface, primary text, danger button, like-active fill, and tab-active fill
- components should read only semantic tokens, not raw palette values
- when a raw palette value changes, every semantic token pointing at it should update automatically without component edits
- when a new UI pattern appears, add a new semantic token first instead of hardcoding a color in that component
- dark mode should reuse the same semantic names with a different raw palette mapping, not a second set of component styles

Current implementation note:

- the mobile app now keeps theme definitions in a global theme module, persists the selected light or dark mode, exposes theme switching from the Discovery logo tap, the shared sidebar, and the Account screen, and keeps component style reads on semantic colors only

Current token taxonomy in the mobile app:

- palette: raw named colors such as black, white, bone, sand, gold, green, rose, blue, and red
- tonal semantic colors with `light`, `neutral`, and `dark` variants for:
  - border
  - shadow
  - card fill
  - background fill
  - text
- single semantic colors for:
  - ghost button
  - button fill
  - destroy or delete button fill
  - destroy or delete button text
  - input field fill
  - input field hint text
  - icon fill
  - vote toggle
  - like toggle
  - song status badges for demo, recorded, mixed, mastered, sent to stores, and released
  - table header
  - table row fill
  - horizontal divider line
  - vertical divider line
  - seekbar background
  - seekbar progress
  - seekbar thumb
  - menu bar icon active
  - menu bar icon inactive
  - menu bar button fill active
  - menu bar button fill inactive
- image slots for `logo-dark` and `logo-light`
- interval groups with `light`, `neutral`, and `dark` variants for:
  - horizontal
  - vertical
  - indent
- border widths with `light`, `neutral`, and `dark` variants
- shadow sizes with `light`, `neutral`, and `dark` variants
- shadow transparency with `light`, `neutral`, and `dark` variants

Editing rule:

- if the visual change is really a color-family shift, edit the raw palette value
- if the visual change is role-specific, edit or add a semantic token
- if the visual change is layout rhythm or page breathing room, edit the semantic interval tokens rather than changing per-component spacing ad hoc
- do not patch component styles with one-off hex values unless the theme contract is intentionally being extended

Current implementation note for layout spacing:

- shared mobile layout now exposes semantic interval aliases for screen indent, stack gaps, section gaps, inline gaps, field gaps, tab-bar insets, and shared button or panel padding
- those aliases are derived from the underlying `horizontal`, `vertical`, and `indent` triplets in the theme contract
- page design work should prefer those aliases first, then expand the interval semantics only if a truly new spacing role is needed

## Shape language

- corners should be square or nearly square
- default radius should be `0` to `6px`, never pill-heavy by default
- buttons should look like real controls, not floating text labels
- active surfaces should read as physical objects through border, fill, and shadow contrast

## Borders and shadows

- default border color: `#222220`
- standard border width: `2px`
- emphasized border width for key cards, active navigation, or player shell: `3px` to `4px`
- standard shadow: hard-edged offset, similar to `2px 2px 0 0 #222220`
- large shadow: hard-edged offset, similar to `4px 4px 0 0 #222220`
- avoid soft ambient blur as the primary elevation language

## Typography

- keep type clear, bold, and high-contrast
- titles should be assertive and readable, not elegant or delicate
- labels and tabs should use compact uppercase or strong small caps where helpful
- secondary metadata can soften toward `#4A4A44`, but should remain legible

## Layout principles

- mobile-first, one-handed, and scan-friendly
- clear vertical rhythm with strong section breaks
- favor stacked sections over dense side-by-side structures
- avoid hiding high-frequency actions behind overflow menus

## Right-thumb ergonomic rules

This is a right-thumb-biased interface by default.

- frequent controls should live in the lower half of the screen whenever practical
- the easiest-to-reach zone is lower-right, then lower-center, then lower-left
- top-left should not contain high-frequency primary actions
- discovery filters may appear near the top, but playback, like, save, and navigation actions should favor the lower zones

## Bottom navigation

Use a persistent bottom tab bar for the first mobile slice.

- tabs should be large, bordered, and easy to hit
- active tab should use a filled accent state with a stronger border and shadow treatment
- keep labels short and explicit
- default tab order:
  - Discovery
  - Liked
  - Playlists
  - Account
- keep the most likely repeated flows on the right half of the bar, especially Liked, Playlists, and Account
- avoid tiny icon-only tabs for the primary app navigation

## Song row and card behavior

- cover art should remain visually important
- title and artist text should be large enough to scan quickly
- like/save and vote actions should be immediately visible without opening a detail screen
- if action buttons sit beside song metadata, use a compact stacked or paired control block on the right side
- keep the interaction model obvious: tap to play, tap to like/save, tap to vote

## Player shell

The player should be simple, not parity with the web app.

- support artwork, title, artist, play/pause, previous, next, and progress
- optionally show a small source label such as Discovery or Liked
- do not include advanced queue, looping, normalization, or dense toolbars in v1

## Player control layout

Follow the ergonomic logic from the reference screenshot.

- the primary play or pause button should be the largest element in the transport cluster
- place the primary play control in the lower-center or slightly right-of-center zone
- group secondary transport controls around it in smaller square buttons
- keep the cluster compact enough for one-handed use
- avoid spreading transport controls across the full screen width if that harms thumb reach
- if an extra action such as like/save is present on the player screen, keep it on the right edge or lower-right region

## Recommended control sizes

- bottom tab hit target: at least `48x48`
- secondary player buttons: `44x44` to `52x52`
- primary player button: `56x56` to `72x72`
- side quick-action buttons for song cards: at least `40x40`, ideally `44x44`

## Screen-specific defaults

### Discovery

- warm paper background
- stacked list or card-row hybrid
- clearly separated song items
- visible like/save and vote actions
- light filters only

### Liked

- visually similar to Discovery for continuity
- should feel calmer and more personal
- playback access should be immediate

### Playlists

- built-in collections first
- strong bottom-nav presence because this is likely a repeated return point
- do not overcomplicate playlist editing in v1

### Account

- simpler and quieter than media surfaces
- use the same border and card system
- keep key actions easy to scan and easy to hit

## Anti-patterns

- do not default to dark-mode streaming-app chrome
- do not use glassmorphism or blurred translucent panels
- do not over-round controls into generic capsules
- do not make all controls the same weight and size
- do not place high-frequency actions in difficult top-corner positions
- do not let the mobile app drift into a generic template aesthetic
