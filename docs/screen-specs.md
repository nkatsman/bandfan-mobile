# Screen Specs

## Purpose

This document defines what each v1 mobile screen is responsible for, what must appear on it, what actions matter most, and what should stay off the screen.

This is not a device-dimension spec. It does not replace `docs/mobile-ui-spec.md`.

Use it to answer:

- what belongs on each screen
- which actions are primary
- how the screen supports the user flow
- which backend data it needs

Use `docs/mobile-ui-spec.md` for:

- colors
- borders and shadows
- shape language
- button feel
- thumb-zone layout rules

## Global screen rules

- every screen should respect the bottom navigation model
- high-frequency actions should stay visible and reachable
- do not overload any screen with web-only workflows
- keep interactions fan-focused and music-first

## Login

### Purpose

Get the user into the app quickly.

### Must include

- app identity and clear title
- login form or sign-in actions
- one obvious primary action
- basic error handling

### Primary action

- sign in

### Secondary actions

- password recovery or equivalent auth helper if supported

### Should not include

- large onboarding flow
- band-management messaging
- admin or creator-oriented routing

### Backend needs

- Firebase Auth client setup

## Discovery

### Purpose

Serve as the default post-login music-browsing screen.

### Must include

- song list with artwork, title, and artist
- clear play action
- clear like/save action
- clear vote action
- light filter or sort controls if needed

### Primary actions

- play
- like/save
- vote

### Secondary actions

- open song details if the app includes a detail view

### Layout notes

- song quick actions should remain immediately visible
- action cluster should favor the right side or lower-right interaction zone
- filters should stay light and not dominate the top of the screen

### Should not include

- deep metadata blocks
- complex playlist editing
- creator tools

### Backend needs

- discovery feed endpoint
- saved/liked state
- voted state

## Liked / Favorites

### Purpose

Give the user a personal listening space built from saved songs.

### Must include

- list of liked or saved songs
- immediate playback access
- clear save state
- optional vote visibility if the product keeps votes visible outside Discovery

### Primary actions

- play
- remove from liked or toggle liked state

### Secondary actions

- vote if applicable
- open player

### Layout notes

- should visually echo Discovery for continuity
- should feel slightly calmer and more personal

### Should not include

- excessive management UI
- broad social or editorial modules

### Backend needs

- liked songs read endpoint or equivalent bootstrap payload

## Playlists

### Purpose

Provide lightweight listening collections without expanding into a full music-library manager.

### Must include

- built-in playlist entries for Discovery and Liked
- playlist entry points into playback
- simple list of tracks within a playlist view

### Primary actions

- open playlist
- play playlist
- play track

### Secondary actions

- like/save from inside playlist context

### Layout notes

- keep structure simple and obvious
- avoid dense editing affordances in v1

### Should not include

- advanced playlist collaboration
- heavy ordering tools
- nested management flows

### Backend needs

- built-in playlist contract or mobile bootstrap data that can define Discovery and Liked collections

## Player

### Purpose

Provide a simple, focused listening surface for fans.

### Must include

- artwork
- track title
- artist name
- progress display
- play/pause
- previous
- next

### Primary action

- play/pause

### Secondary actions

- previous
- next
- scrub or seek if implemented
- optional source label such as Discovery or Liked

### Layout notes

- primary play/pause button must be the largest button in the transport cluster
- transport cluster should sit lower-center or slightly right-weighted for thumb comfort
- secondary transport buttons should stay visually grouped with the primary control
- any extra quick action such as like/save should stay on the right edge or lower-right zone

### Should not include

- advanced queue management
- loop and normalization systems by default
- full parity with the current web player

### Backend needs

- playable media URL handling
- play event tracking endpoint

## Account Settings

### Purpose

Expose only the account and listening settings relevant to the mobile app.

### Must include

- core account identity information
- any lightweight listening preferences the mobile app supports
- sign-out path

### Primary actions

- save account changes
- sign out

### Secondary actions

- adjust listening preferences if supported in v1

### Layout notes

- quieter than Discovery and Player
- use stacked cards or grouped sections
- keep actions easy to scan and easy to hit

### Should not include

- admin functions
- creator access workflows
- web-specific settings that do not matter in the mobile app

### Backend needs

- account settings read and write contract
