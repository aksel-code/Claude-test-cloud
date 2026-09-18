/// Mirrors `CoverStyle` in `src/lib/types.ts`.
enum CoverStyle { fabric, kraft, leather, pastel, linen, marble, photo }

/// Mirrors `Journal` in `src/lib/types.ts`.
class Journal {
  const Journal({
    required this.id,
    required this.title,
    required this.coverStyle,
    required this.color,
    required this.coverImage,
    required this.createdAt,
    required this.updatedAt,
    required this.pageIds,
    required this.archived,
  });

  final String id;
  final String title;
  final CoverStyle coverStyle;
  /// Accent colour; drives the cover tint and the spine.
  final String color;
  /// Asset id, only meaningful when `coverStyle == CoverStyle.photo`.
  final String? coverImage;
  final int createdAt;
  final int updatedAt;
  final List<String> pageIds;
  final bool archived;

  Journal copyWith({String? title, CoverStyle? coverStyle, String? color}) => Journal(
        id: id,
        title: title ?? this.title,
        coverStyle: coverStyle ?? this.coverStyle,
        color: color ?? this.color,
        coverImage: coverImage,
        createdAt: createdAt,
        updatedAt: DateTime.now().millisecondsSinceEpoch,
        pageIds: pageIds,
        archived: archived,
      );

  factory Journal.fromJson(Map<String, dynamic> json) => Journal(
        id: json['id'] as String,
        title: json['title'] as String,
        coverStyle: CoverStyle.values.byName(json['coverStyle'] as String),
        color: json['color'] as String,
        coverImage: json['coverImage'] as String?,
        createdAt: json['createdAt'] as int,
        updatedAt: json['updatedAt'] as int,
        pageIds: (json['pageIds'] as List).cast<String>(),
        archived: json['archived'] as bool,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'coverStyle': coverStyle.name,
        'color': color,
        'coverImage': coverImage,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
        'pageIds': pageIds,
        'archived': archived,
      };
}
