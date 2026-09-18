/// Mirrors `ThemeSetting` and `Settings` in `src/lib/types.ts`.
enum ThemeSetting { light, dark, system }

class PageboundSettings {
  const PageboundSettings({
    this.theme = ThemeSetting.system,
    this.snapEnabled = true,
    this.showSnapGuides = true,
    this.reduceMotion,
    this.hapticsEnabled = true,
    this.weatherEnabled = false,
    this.promptsEnabled = true,
    this.lastPromptIndex = 0,
    this.lastEntryDate,
    this.streak = 0,
    this.bestStreak = 0,
    this.seedVersion = 0,
    this.onboarded = false,
  });

  final ThemeSetting theme;
  final bool snapEnabled;
  final bool showSnapGuides;
  /// null = follow the OS, matching the web app's tri-state convention.
  final bool? reduceMotion;
  final bool hapticsEnabled;
  final bool weatherEnabled;
  final bool promptsEnabled;
  final int lastPromptIndex;
  final String? lastEntryDate;
  final int streak;
  final int bestStreak;
  final int seedVersion;
  final bool onboarded;

  PageboundSettings copyWith({int? streak, int? bestStreak, String? lastEntryDate}) =>
      PageboundSettings(
        theme: theme,
        snapEnabled: snapEnabled,
        showSnapGuides: showSnapGuides,
        reduceMotion: reduceMotion,
        hapticsEnabled: hapticsEnabled,
        weatherEnabled: weatherEnabled,
        promptsEnabled: promptsEnabled,
        lastPromptIndex: lastPromptIndex,
        lastEntryDate: lastEntryDate ?? this.lastEntryDate,
        streak: streak ?? this.streak,
        bestStreak: bestStreak ?? this.bestStreak,
        seedVersion: seedVersion,
        onboarded: onboarded,
      );
}
