import 'package:flutter/material.dart';
import 'tokens.dart';

/// Light and dark ThemeData built from [PageboundColors]. Mirrors the web
/// app's `:root` / `[data-theme='dark']` CSS variable split in
/// `src/styles/index.css`.
class PageboundTheme {
  const PageboundTheme._();

  static ThemeData light() {
    const scheme = ColorScheme.light(
      surface: PageboundColors.creamPage,
      onSurface: PageboundColors.ink,
      primary: PageboundColors.terracottaDeep,
      onPrimary: Colors.white,
      secondary: PageboundColors.signal,
      onSecondary: Colors.white,
      error: PageboundColors.terracottaDeep,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: PageboundColors.creamPage,
      fontFamily: 'Georgia',
      textTheme: _textTheme(PageboundColors.ink, PageboundColors.inkSoft),
      appBarTheme: const AppBarTheme(
        backgroundColor: PageboundColors.creamPage,
        foregroundColor: PageboundColors.ink,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      cardColor: PageboundColors.creamSurface,
      dividerColor: PageboundColors.rule,
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: PageboundColors.terracottaDeep,
          foregroundColor: Colors.white,
          shape: const StadiumBorder(),
          minimumSize: const Size(0, PagebandMetrics.touchTarget),
          padding: const EdgeInsets.symmetric(horizontal: 20),
        ),
      ),
    );
  }

  static ThemeData dark() {
    const scheme = ColorScheme.dark(
      surface: PageboundColors.charcoalPage,
      onSurface: PageboundColors.inkOnDark,
      primary: PageboundColors.terracotta,
      onPrimary: PageboundColors.charcoalPage,
      secondary: PageboundColors.signalDark,
      onSecondary: PageboundColors.charcoalPage,
      error: PageboundColors.terracotta,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: PageboundColors.charcoalPage,
      fontFamily: 'Georgia',
      textTheme: _textTheme(PageboundColors.inkOnDark, PageboundColors.inkSoftOnDark),
      appBarTheme: const AppBarTheme(
        backgroundColor: PageboundColors.charcoalPage,
        foregroundColor: PageboundColors.inkOnDark,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      cardColor: PageboundColors.charcoalSurface,
      dividerColor: PageboundColors.ruleOnDark,
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: PageboundColors.terracotta,
          foregroundColor: PageboundColors.charcoalPage,
          shape: const StadiumBorder(),
          minimumSize: const Size(0, PagebandMetrics.touchTarget),
          padding: const EdgeInsets.symmetric(horizontal: 20),
        ),
      ),
    );
  }

  static TextTheme _textTheme(Color ink, Color inkSoft) {
    // `.apply` first: ThemeData.light().textTheme bakes in "Roboto" by name
    // on every style, and a lone top-level `fontFamily:` on ThemeData doesn't
    // retroactively override an explicitly-supplied textTheme. Left alone,
    // any un-copyWith'd style below keeps asking for "Roboto" specifically,
    // which isn't a bundled asset — on web that sends CanvasKit out to fetch
    // it from Google Fonts at runtime, the one network call this scaffold
    // was supposed to avoid (see flutter_app/README.md).
    final base = ThemeData.light().textTheme.apply(fontFamily: 'Georgia');
    return base.copyWith(
      headlineLarge: base.headlineLarge?.copyWith(
        fontFamily: 'Georgia', fontWeight: FontWeight.w600, color: ink, letterSpacing: -0.3,
      ),
      headlineMedium: base.headlineMedium?.copyWith(
        fontFamily: 'Georgia', fontWeight: FontWeight.w600, color: ink,
      ),
      titleLarge: base.titleLarge?.copyWith(color: ink, fontWeight: FontWeight.w600),
      bodyLarge: base.bodyLarge?.copyWith(color: ink),
      bodyMedium: base.bodyMedium?.copyWith(color: inkSoft),
    );
  }
}
