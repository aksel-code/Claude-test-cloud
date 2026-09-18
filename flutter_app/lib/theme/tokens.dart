import 'package:flutter/material.dart';

/// Design tokens ported from the web app's `src/styles/index.css` and
/// `tailwind.config.js`. Two channels, kept deliberately separate:
///
/// - The **content palette** (cream/ink/terracotta/sage/dusty/mustard) colours
///   stickers, tape, covers and page furniture — the user's actual scrapbook
///   material. It is untouched by the experimental revamp.
/// - The **signal** channel (electric indigo / cold-to-ember glow) is the new
///   experimental chrome: nav, headers, loading, transitions. It never
///   appears on journal content.
///
/// Values are the same sRGB numbers as the CSS custom properties, so a screen
/// ported from the web app keeps its exact colours.
class PageboundColors {
  const PageboundColors._();

  // ---- content palette (light) ----------------------------------------
  static const creamPage = Color(0xFFFAF6EE);
  static const creamSurface = Color(0xFFFFFDF8);
  static const creamSunk = Color(0xFFF2ECE1);
  static const ink = Color(0xFF2B2A28);
  static const inkSoft = Color(0xFF5A544C);
  static const inkFaint = Color(0xFF7C7469);
  static const rule = Color(0xFFE2D9CA);

  static const terracotta = Color(0xFFC8674A);
  static const terracottaDeep = Color(0xFFA44C32);
  static const sage = Color(0xFF8FA58A);
  static const sageDeep = Color(0xFF5A7257);
  static const dusty = Color(0xFF7D98B3);
  static const dustyDeep = Color(0xFF4A6986);
  static const mustard = Color(0xFFD9A441);
  static const mustardDeep = Color(0xFF8C6414);

  // ---- content palette (dark / "night desk") ---------------------------
  static const charcoalPage = Color(0xFF1B1814);
  static const charcoalSurface = Color(0xFF232019);
  static const charcoalSunk = Color(0xFF16140F);
  static const inkOnDark = Color(0xFFF2EADA);
  static const inkSoftOnDark = Color(0xFFB6AB98);
  static const ruleOnDark = Color(0xFF403A30);

  // ---- signal channel (experimental chrome) -----------------------------
  static const signal = Color(0xFF4C5CE0);
  static const signalDeep = Color(0xFF343EA8);
  static const signalGlow = Color(0xFF608CFF);
  static const signalEmber = Color(0xFFE07A4A);
  static const chrome = Color(0xFF14151C);
  static const chromeInk = Color(0xFFE8E8F0);

  static const signalDark = Color(0xFF7C8AFF);
  static const signalDeepDark = Color(0xFF6070F0);
  static const chromeDark = Color(0xFF0A0A0E);
}

/// Spacing / radius constants mirrored from the web app's Tailwind scale.
class PagebandMetrics {
  const PagebandMetrics._();
  static const radiusSm = 8.0;
  static const radiusMd = 12.0;
  static const radiusLg = 16.0;
  static const touchTarget = 44.0;
}

/// Type scale. The web app leans on Fraunces (display) + Inter (body) as
/// self-hosted webfonts and a system monospace stack for the new technical
/// labels. This scaffold intentionally uses each platform's native system
/// font instead of bundling TTFs — see flutter_app/README.md for why, and
/// for the follow-up to bundle Fraunces/Inter for full brand parity.
class PagebandType {
  const PagebandType._();

  static TextStyle display(BuildContext context) => const TextStyle(
        fontWeight: FontWeight.w600,
        letterSpacing: -0.2,
        height: 1.05,
      );

  /// The "record sleeve" register used by ScreenHeader: uppercase, wide
  /// tracking, tabular, monospace. Chrome only — never on journal content.
  static const TextStyle techLabel = TextStyle(
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: FontWeight.w600,
    letterSpacing: 2.0,
  );
}
