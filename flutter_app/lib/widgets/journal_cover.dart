import 'package:flutter/material.dart';
import '../models/journal.dart';

/// Simplified Flutter port of `src/components/library/JournalCover.tsx` — a
/// book cover built from shapes rather than images, so it recolours
/// instantly. The full version's per-journal seeded tilt and page-edge detail
/// are left for a later pass; this establishes the shape and proportions.
class JournalCover extends StatelessWidget {
  const JournalCover({super.key, required this.journal, this.width = 150});

  final Journal journal;
  final double width;

  @override
  Widget build(BuildContext context) {
    final height = width * 1.38;
    final color = _parseColor(journal.color);
    final titleSize = width < 110 ? 12.0 : width < 150 ? 14.0 : 17.0;

    return SizedBox(
      width: width,
      height: height,
      child: Stack(
        children: [
          Container(
            decoration: BoxDecoration(
              color: Color.lerp(color, Colors.black, 0.08),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(4), bottomLeft: Radius.circular(4),
                topRight: Radius.circular(8), bottomRight: Radius.circular(8),
              ),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.22), blurRadius: 14, offset: const Offset(0, 8)),
              ],
            ),
          ),
          Positioned(
            left: 0, top: 0, bottom: 0,
            width: (width * 0.075).clamp(9, double.infinity),
            child: Container(color: Color.lerp(color, Colors.black, 0.28)),
          ),
          Positioned(
            left: 0, right: 0, bottom: 14,
            child: Padding(
              padding: EdgeInsets.only(left: (width * 0.14).clamp(16, double.infinity), right: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    journal.title,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontFamily: 'Georgia', fontWeight: FontWeight.w600,
                      fontSize: titleSize, color: _coverInk(color), height: 1.15,
                    ),
                  ),
                  if (width >= 130) ...[
                    const SizedBox(height: 4),
                    Text(
                      '${journal.pageIds.length} ${journal.pageIds.length == 1 ? 'page' : 'pages'}',
                      style: TextStyle(fontSize: 11, color: _coverInk(color).withValues(alpha: 0.68)),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _coverInk(Color background) =>
      background.computeLuminance() > 0.42 ? const Color(0xFF2B2A28) : Colors.white;

  Color _parseColor(String hex) {
    final clean = hex.replaceFirst('#', '');
    final value = int.parse(clean.length == 3
        ? clean.split('').map((c) => '$c$c').join()
        : clean, radix: 16);
    return Color(0xFF000000 | value);
  }
}
