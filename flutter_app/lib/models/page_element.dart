/// Page element model, ported from `src/lib/types.ts` (`PageElement` and its
/// per-type `Props` interfaces). Dart 3 sealed classes stand in for the
/// TypeScript discriminated union: exhaustive `switch` at every call site,
/// same guarantee the original gets from `element.type`.
library;

sealed class PageElement {
  const PageElement({
    required this.id,
    required this.x,
    required this.y,
    required this.width,
    required this.height,
    required this.rotation,
    required this.zIndex,
    required this.locked,
    required this.opacity,
  });

  final String id;
  final double x;
  final double y;
  final double width;
  final double height;
  final double rotation;
  final int zIndex;
  final bool locked;
  final double opacity;

  String get type;

  Map<String, dynamic> toJson();

  static PageElement fromJson(Map<String, dynamic> json) {
    final base = (
      id: json['id'] as String,
      x: (json['x'] as num).toDouble(),
      y: (json['y'] as num).toDouble(),
      width: (json['width'] as num).toDouble(),
      height: (json['height'] as num).toDouble(),
      rotation: (json['rotation'] as num).toDouble(),
      zIndex: json['zIndex'] as int,
      locked: json['locked'] as bool,
      opacity: (json['opacity'] as num).toDouble(),
    );
    final props = (json['props'] as Map).cast<String, dynamic>();

    return switch (json['type'] as String) {
      'text' => TextElement(
          base: base,
          text: props['text'] as String,
          font: props['font'] as String,
          fontSize: (props['fontSize'] as num).toDouble(),
          color: props['color'] as String,
          align: props['align'] as String,
          lineHeight: (props['lineHeight'] as num).toDouble(),
          letterSpacing: (props['letterSpacing'] as num).toDouble(),
        ),
      'photo' => PhotoElement(
          base: base,
          assetId: props['assetId'] as String,
          frame: props['frame'] as String,
          alt: props['alt'] as String,
          caption: props['caption'] as String,
          warmth: (props['warmth'] as num).toDouble(),
        ),
      'sticker' => StickerElement(
          base: base,
          packId: props['packId'] as String,
          stickerId: props['stickerId'] as String,
          tint: props['tint'] as String?,
        ),
      'tape' => TapeElement(
          base: base,
          patternId: props['patternId'] as String,
          color: props['color'] as String,
        ),
      'doodle' => DoodleElement(
          base: base,
          tool: props['tool'] as String,
          color: props['color'] as String,
          size: (props['size'] as num).toDouble(),
          points: (props['points'] as List).map((e) => (e as num).toDouble()).toList(),
        ),
      'note' => NoteElement(
          base: base,
          style: props['style'] as String,
          text: props['text'] as String,
          font: props['font'] as String,
          fontSize: (props['fontSize'] as num).toDouble(),
          color: props['color'] as String,
          paper: props['paper'] as String,
        ),
      'shape' => ShapeElement(
          base: base,
          shape: props['shape'] as String,
          color: props['color'] as String,
          strokeWidth: (props['strokeWidth'] as num).toDouble(),
        ),
      final other => throw FormatException('Unknown element type: $other'),
    };
  }
}

typedef ElementBase = ({
  String id,
  double x,
  double y,
  double width,
  double height,
  double rotation,
  int zIndex,
  bool locked,
  double opacity,
});

Map<String, dynamic> elementBaseJson(ElementBase b) => {
      'id': b.id,
      'x': b.x,
      'y': b.y,
      'width': b.width,
      'height': b.height,
      'rotation': b.rotation,
      'zIndex': b.zIndex,
      'locked': b.locked,
      'opacity': b.opacity,
    };

final class TextElement extends PageElement {
  TextElement({
    required ElementBase base,
    required this.text,
    required this.font,
    required this.fontSize,
    required this.color,
    required this.align,
    required this.lineHeight,
    required this.letterSpacing,
  }) : super(
          id: base.id, x: base.x, y: base.y, width: base.width, height: base.height,
          rotation: base.rotation, zIndex: base.zIndex, locked: base.locked, opacity: base.opacity,
        );

  final String text;
  final String font;
  final double fontSize;
  final String color;
  final String align;
  final double lineHeight;
  final double letterSpacing;

  @override
  String get type => 'text';

  @override
  Map<String, dynamic> toJson() => {
        ...elementBaseJson((
          id: id, x: x, y: y, width: width, height: height,
          rotation: rotation, zIndex: zIndex, locked: locked, opacity: opacity,
        )),
        'type': type,
        'props': {
          'text': text, 'font': font, 'fontSize': fontSize, 'color': color,
          'align': align, 'lineHeight': lineHeight, 'letterSpacing': letterSpacing,
        },
      };
}

final class PhotoElement extends PageElement {
  PhotoElement({
    required ElementBase base,
    required this.assetId,
    required this.frame,
    required this.alt,
    required this.caption,
    required this.warmth,
  }) : super(
          id: base.id, x: base.x, y: base.y, width: base.width, height: base.height,
          rotation: base.rotation, zIndex: base.zIndex, locked: base.locked, opacity: base.opacity,
        );

  final String assetId;
  final String frame;
  final String alt;
  final String caption;
  final double warmth;

  @override
  String get type => 'photo';

  @override
  Map<String, dynamic> toJson() => {
        ...elementBaseJson((
          id: id, x: x, y: y, width: width, height: height,
          rotation: rotation, zIndex: zIndex, locked: locked, opacity: opacity,
        )),
        'type': type,
        'props': {'assetId': assetId, 'frame': frame, 'alt': alt, 'caption': caption, 'warmth': warmth},
      };
}

final class StickerElement extends PageElement {
  StickerElement({
    required ElementBase base,
    required this.packId,
    required this.stickerId,
    this.tint,
  }) : super(
          id: base.id, x: base.x, y: base.y, width: base.width, height: base.height,
          rotation: base.rotation, zIndex: base.zIndex, locked: base.locked, opacity: base.opacity,
        );

  final String packId;
  final String stickerId;
  final String? tint;

  @override
  String get type => 'sticker';

  @override
  Map<String, dynamic> toJson() => {
        ...elementBaseJson((
          id: id, x: x, y: y, width: width, height: height,
          rotation: rotation, zIndex: zIndex, locked: locked, opacity: opacity,
        )),
        'type': type,
        'props': {'packId': packId, 'stickerId': stickerId, if (tint != null) 'tint': tint},
      };
}

final class TapeElement extends PageElement {
  TapeElement({
    required ElementBase base,
    required this.patternId,
    required this.color,
  }) : super(
          id: base.id, x: base.x, y: base.y, width: base.width, height: base.height,
          rotation: base.rotation, zIndex: base.zIndex, locked: base.locked, opacity: base.opacity,
        );

  final String patternId;
  final String color;

  @override
  String get type => 'tape';

  @override
  Map<String, dynamic> toJson() => {
        ...elementBaseJson((
          id: id, x: x, y: y, width: width, height: height,
          rotation: rotation, zIndex: zIndex, locked: locked, opacity: opacity,
        )),
        'type': type,
        'props': {'patternId': patternId, 'color': color},
      };
}

final class DoodleElement extends PageElement {
  DoodleElement({
    required ElementBase base,
    required this.tool,
    required this.color,
    required this.size,
    required this.points,
  }) : super(
          id: base.id, x: base.x, y: base.y, width: base.width, height: base.height,
          rotation: base.rotation, zIndex: base.zIndex, locked: base.locked, opacity: base.opacity,
        );

  final String tool;
  final String color;
  final double size;
  final List<double> points;

  @override
  String get type => 'doodle';

  @override
  Map<String, dynamic> toJson() => {
        ...elementBaseJson((
          id: id, x: x, y: y, width: width, height: height,
          rotation: rotation, zIndex: zIndex, locked: locked, opacity: opacity,
        )),
        'type': type,
        'props': {'tool': tool, 'color': color, 'size': size, 'points': points},
      };
}

final class NoteElement extends PageElement {
  NoteElement({
    required ElementBase base,
    required this.style,
    required this.text,
    required this.font,
    required this.fontSize,
    required this.color,
    required this.paper,
  }) : super(
          id: base.id, x: base.x, y: base.y, width: base.width, height: base.height,
          rotation: base.rotation, zIndex: base.zIndex, locked: base.locked, opacity: base.opacity,
        );

  final String style;
  final String text;
  final String font;
  final double fontSize;
  final String color;
  final String paper;

  @override
  String get type => 'note';

  @override
  Map<String, dynamic> toJson() => {
        ...elementBaseJson((
          id: id, x: x, y: y, width: width, height: height,
          rotation: rotation, zIndex: zIndex, locked: locked, opacity: opacity,
        )),
        'type': type,
        'props': {
          'style': style, 'text': text, 'font': font, 'fontSize': fontSize,
          'color': color, 'paper': paper,
        },
      };
}

final class ShapeElement extends PageElement {
  ShapeElement({
    required ElementBase base,
    required this.shape,
    required this.color,
    required this.strokeWidth,
  }) : super(
          id: base.id, x: base.x, y: base.y, width: base.width, height: base.height,
          rotation: base.rotation, zIndex: base.zIndex, locked: base.locked, opacity: base.opacity,
        );

  final String shape;
  final String color;
  final double strokeWidth;

  @override
  String get type => 'shape';

  @override
  Map<String, dynamic> toJson() => {
        ...elementBaseJson((
          id: id, x: x, y: y, width: width, height: height,
          rotation: rotation, zIndex: zIndex, locked: locked, opacity: opacity,
        )),
        'type': type,
        'props': {'shape': shape, 'color': color, 'strokeWidth': strokeWidth},
      };
}
