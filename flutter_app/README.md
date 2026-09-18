# Pagebound (Flutter)

A native Flutter scaffold for Pagebound, targeting Android and iOS. This is
the start of a phased native port of the web app in `../src` — not a
finished app yet. Read this before assuming something works.

## Why Flutter, and why this is a scaffold

The web app (`../src`) is a mature React/Konva/IndexedDB PWA: a freeform
canvas editor with undo/redo, photo import + compression, PDF/PNG export, a
WebAuthn-backed passcode lock, and a five-store IndexedDB schema. Porting all
of that to a real native app is a multi-week project on its own, independent
of which framework is used. Flutter was chosen over SwiftUI because this
environment has no macOS/Xcode — Flutter's toolchain runs on Linux, so it can
actually be built and analyzed here, where a SwiftUI project could only be
written blind. **This container still can't produce a signed Android APK or
iOS build**: fetching the Android SDK's command-line tools from
`dl.google.com` is blocked by this sandbox's egress policy. Everything here
was verified instead with `flutter analyze`, `flutter test`, and a `flutter
build web` (Hive uses IndexedDB on web, sidestepping the native
`path_provider` platform channel that `flutter test`'s VM target can't
service) — run in the pre-installed Chromium and screenshotted. You'll need
to run `flutter build apk` / open `ios/Runner.xcworkspace` in Xcode on a
machine without that restriction to get an actual installable build.

## What's here

- **`lib/theme/`** — design tokens and `ThemeData` ported 1:1 from
  `src/styles/index.css` / `tailwind.config.js`: the warm content palette,
  the cooler "signal" chrome channel, and the type scale. See
  `tokens.dart`'s doc comment for the chrome-vs-content split this mirrors
  from the web app.
- **`lib/models/`** — `Journal`, `JournalPage`, `PageElement` (a sealed-class
  union covering all seven element types) and `PageboundSettings`, hand-ported
  field-for-field from `src/lib/types.ts`, with `fromJson`/`toJson` matching
  the web app's JSON shape.
- **`lib/data/local_store.dart`** — local-first persistence via Hive
  (IndexedDB on web, a local file store on Android/iOS), mirroring three of
  the five IndexedDB object stores in `src/lib/db.ts`: `journals`, `pages`,
  `settings`. Seeds one sample journal on an empty database, same rule as
  `src/lib/seed.ts`.
- **`lib/widgets/dot_matrix.dart`** — a `CustomPainter` port of
  `src/components/ui/DotMatrix.tsx`: the synthesized halftone/dot-matrix
  field used across the new chrome. Same 'assemble'/'ambient' variants, same
  spring easing, same reduced-motion handling (via
  `MediaQuery.disableAnimations`).
- **`lib/widgets/screen_header.dart`**, **`journal_cover.dart`** — further
  ports of the web app's `ScreenHeader` and `JournalCover`.
- **`lib/screens/library_screen.dart`** — the Library/shelf screen end to
  end, demonstrating the new visual language: the dark "signal" hero with
  the ambient dot-matrix field, the warm content grid underneath.

## What's not here yet

Everything else. In particular, in rough priority order for whoever picks
this up next:

1. **The editor.** No canvas, no elements, no toolbar. This is the biggest
   piece of work — Flutter's `CustomPainter`/`Canvas` (or a package like
   `flutter_painter`) stands in for Konva, but the undo/redo stack, snapping,
   text editing, and the seven element types' rendering all need to be
   rebuilt.
2. **Photos.** No `image_picker` integration, no compression pipeline, no
   `assets`/`thumbs` Hive boxes.
3. **The app lock.** No passcode, no `local_auth` (Face ID / Touch ID /
   biometric) integration, no secure storage of a passcode hash.
4. **Export.** No PDF/PNG rendering.
5. **The remaining screens**: Journal detail, Reader (page-flip), Calendar,
   Moods, Search, Settings.
6. **Real content**: stickers, tape, notes, papers, covers — all generated
   in the web app (`src/content/`) and none of it ported.
7. **Fonts.** This scaffold intentionally uses each platform's system font
   rather than bundling TTFs, to stay dependency-free. `../public/fonts`
   only has `.woff2` (web format) — Flutter needs `.ttf`/`.otf`. Re-fetch
   Fraunces/Inter/Caveat as TTFs (same SIL OFL sources as
   `../scripts/fetch-fonts.py`) and wire them into `pubspec.yaml`'s `fonts:`
   section for full brand parity.
8. **Android**, specifically: per the platform decision this scaffold came
   out of, iOS/this Flutter app was the immediate priority, with native
   Android (Kotlin + Jetpack Compose) planned as a *separate* later port —
   revisit that decision if you'd rather Flutter cover both from here
   instead of building a second, fully native Android app.

## Running it

```bash
flutter pub get
flutter run              # needs a connected device/emulator, or:
flutter run -d chrome     # runs on web — the one target verifiable without
                           # Xcode/Android Studio; real device fidelity for
                           # touch/haptics/native storage isn't tested this way
```

`flutter analyze` and `flutter test` both pass as of this scaffold. The
`web/` platform folder exists only as that verification target — it wasn't
asked for as a deliverable and isn't a substitute for the real iOS/Android
builds.
