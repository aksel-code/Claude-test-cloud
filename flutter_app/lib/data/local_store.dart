import 'dart:convert';
import 'package:hive_flutter/hive_flutter.dart';
import '../models/journal.dart';
import '../models/page.dart';
import '../models/settings.dart';

/// Local-first persistence, mirroring the five IndexedDB object stores in
/// `src/lib/db.ts` — everything lives on this device, no account, no sync.
///
/// This scaffold ports `journals`, `pages` and `settings`. `assets` (photo
/// blobs) and `thumbs` (rendered page previews) are not yet ported: they
/// depend on an editor/renderer that doesn't exist on this platform yet — see
/// flutter_app/README.md for the phased roadmap. Records are stored as JSON
/// strings in per-store Hive boxes, the same "one store per concern" shape as
/// the web app, without needing generated TypeAdapters/build_runner.
class LocalStore {
  LocalStore._();
  static final LocalStore instance = LocalStore._();

  late Box<String> _journals;
  late Box<String> _pages;
  late Box<String> _settings;

  bool _ready = false;

  Future<void> init() async {
    if (_ready) return;
    await Hive.initFlutter('pagebound');
    _journals = await Hive.openBox<String>('journals');
    _pages = await Hive.openBox<String>('pages');
    _settings = await Hive.openBox<String>('settings');
    await _seedIfNeeded();
    _ready = true;
  }

  // ---------------------------------------------------------- journals

  List<Journal> journals() => _journals.values
      .map((raw) => Journal.fromJson(jsonDecode(raw) as Map<String, dynamic>))
      .toList()
    ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));

  Future<void> putJournal(Journal journal) =>
      _journals.put(journal.id, jsonEncode(journal.toJson()));

  // ---------------------------------------------------------- pages

  List<JournalPage> pagesForJournal(String journalId) => _pages.values
      .map((raw) => JournalPage.fromJson(jsonDecode(raw) as Map<String, dynamic>))
      .where((p) => p.journalId == journalId)
      .toList()
    ..sort((a, b) => b.date.compareTo(a.date));

  List<JournalPage> recentPages({int limit = 8}) {
    final all = _pages.values
        .map((raw) => JournalPage.fromJson(jsonDecode(raw) as Map<String, dynamic>))
        .toList()
      ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return all.take(limit).toList();
  }

  Future<void> putPage(JournalPage page) => _pages.put(page.id, jsonEncode(page.toJson()));

  // ---------------------------------------------------------- settings

  PageboundSettings settings() {
    final raw = _settings.get('settings');
    if (raw == null) return const PageboundSettings();
    final json = jsonDecode(raw) as Map<String, dynamic>;
    return PageboundSettings(
      theme: ThemeSetting.values.byName(json['theme'] as String? ?? 'system'),
      streak: json['streak'] as int? ?? 0,
      bestStreak: json['bestStreak'] as int? ?? 0,
      lastEntryDate: json['lastEntryDate'] as String?,
    );
  }

  Future<void> saveSettings(PageboundSettings settings) => _settings.put(
        'settings',
        jsonEncode({
          'theme': settings.theme.name,
          'streak': settings.streak,
          'bestStreak': settings.bestStreak,
          'lastEntryDate': settings.lastEntryDate,
        }),
      );

  // ---------------------------------------------------------- demo content

  /// Runs once on an empty database, same rule as `lib/seed.ts`: never seeds
  /// over real content, and the journal is plainly labelled as a sample.
  Future<void> _seedIfNeeded() async {
    if (_journals.isNotEmpty) return;

    final now = DateTime.now().millisecondsSinceEpoch;
    const journalId = 'seed-journal';

    await putJournal(Journal(
      id: journalId,
      title: 'A sample journal',
      coverStyle: CoverStyle.linen,
      color: '#7D98B3',
      coverImage: null,
      createdAt: now,
      updatedAt: now,
      pageIds: const ['seed-page-1', 'seed-page-2'],
      archived: false,
    ));

    final today = DateTime.now();
    final yesterday = today.subtract(const Duration(days: 1));

    await putPage(JournalPage(
      id: 'seed-page-1',
      journalId: journalId,
      date: _dateKey(today),
      title: 'Today',
      background: const PageBackground(kind: BackgroundKind.cream, color: '#FAF6EE'),
      mood: MoodId.calm,
      tags: const ['sample'],
      elements: const [],
      createdAt: now,
      updatedAt: now,
    ));

    await putPage(JournalPage(
      id: 'seed-page-2',
      journalId: journalId,
      date: _dateKey(yesterday),
      title: 'A quieter page',
      background: const PageBackground(kind: BackgroundKind.dotted, color: '#F6E7C6'),
      mood: MoodId.bright,
      tags: const ['sample'],
      elements: const [],
      createdAt: now,
      updatedAt: now,
    ));
  }

  String _dateKey(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
}
