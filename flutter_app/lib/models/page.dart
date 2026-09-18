import 'page_element.dart';

/// Mirrors `BackgroundKind` in `src/lib/types.ts`.
enum BackgroundKind { cream, dotted, lined, grid, kraft, watercolor, custom }

class PageBackground {
  const PageBackground({required this.kind, required this.color, this.patternColor});

  final BackgroundKind kind;
  final String color;
  final String? patternColor;

  factory PageBackground.fromJson(Map<String, dynamic> json) => PageBackground(
        kind: BackgroundKind.values.byName(json['kind'] as String),
        color: json['color'] as String,
        patternColor: json['patternColor'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'kind': kind.name,
        'color': color,
        if (patternColor != null) 'patternColor': patternColor,
      };
}

/// Mirrors `MoodId` in `src/lib/types.ts`.
enum MoodId { bright, calm, meh, heavy, stormy }

/// Mirrors `Page` in `src/lib/types.ts`.
class JournalPage {
  const JournalPage({
    required this.id,
    required this.journalId,
    required this.date,
    required this.title,
    required this.background,
    required this.mood,
    required this.tags,
    required this.elements,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String journalId;
  /// Local calendar day, `YYYY-MM-DD` — the page's identity in the calendar.
  final String date;
  final String title;
  final PageBackground background;
  final MoodId? mood;
  final List<String> tags;
  final List<PageElement> elements;
  final int createdAt;
  final int updatedAt;

  factory JournalPage.fromJson(Map<String, dynamic> json) => JournalPage(
        id: json['id'] as String,
        journalId: json['journalId'] as String,
        date: json['date'] as String,
        title: json['title'] as String,
        background: PageBackground.fromJson((json['background'] as Map).cast()),
        mood: json['mood'] == null ? null : MoodId.values.byName(json['mood'] as String),
        tags: (json['tags'] as List).cast<String>(),
        elements: (json['elements'] as List)
            .map((e) => PageElement.fromJson((e as Map).cast()))
            .toList(),
        createdAt: json['createdAt'] as int,
        updatedAt: json['updatedAt'] as int,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'journalId': journalId,
        'date': date,
        'title': title,
        'background': background.toJson(),
        'mood': mood?.name,
        'tags': tags,
        'elements': elements.map((e) => e.toJson()).toList(),
        'createdAt': createdAt,
        'updatedAt': updatedAt,
      };
}
