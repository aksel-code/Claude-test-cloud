import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

enum DotMatrixVariant { assemble, ambient }

/// Flutter port of `src/components/ui/DotMatrix.tsx` — a synthesized
/// halftone/dot-matrix field, drawn with a [CustomPainter] instead of Canvas2D
/// but the same idea: a grid of dots that either assembles once on mount
/// (fading + growing into place, staggered by distance from the top-left) or
/// breathes forever at low amplitude ('ambient', safe to run behind text).
///
/// Respects `MediaQuery.disableAnimations` (Flutter's equivalent of the web
/// app's `prefersReducedMotion()` check in lib/motion.ts) by painting the
/// settled frame directly instead of animating.
class DotMatrix extends StatefulWidget {
  const DotMatrix({
    super.key,
    this.variant = DotMatrixVariant.ambient,
    this.spacing = 22,
    this.radius = 1.6,
    this.color,
  });

  final DotMatrixVariant variant;
  final double spacing;
  final double radius;
  final Color? color;

  @override
  State<DotMatrix> createState() => _DotMatrixState();
}

class _DotMatrixState extends State<DotMatrix> with SingleTickerProviderStateMixin {
  late final Ticker _ticker;
  Duration _elapsed = Duration.zero;

  @override
  void initState() {
    super.initState();
    _ticker = createTicker((elapsed) {
      setState(() => _elapsed = elapsed);
      if (widget.variant == DotMatrixVariant.assemble && elapsed.inMilliseconds > 1400) {
        _ticker.stop();
      }
    })..start();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduced = MediaQuery.of(context).disableAnimations;
    if (reduced && _ticker.isTicking) _ticker.stop();
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduced = MediaQuery.of(context).disableAnimations;
    final color = widget.color ?? Theme.of(context).colorScheme.secondary;
    return CustomPaint(
      painter: _DotMatrixPainter(
        t: reduced ? 0 : _elapsed.inMilliseconds.toDouble(),
        variant: widget.variant,
        spacing: widget.spacing,
        radius: widget.radius,
        color: color,
        reduced: reduced,
      ),
      size: Size.infinite,
    );
  }
}

class _DotMatrixPainter extends CustomPainter {
  _DotMatrixPainter({
    required this.t,
    required this.variant,
    required this.spacing,
    required this.radius,
    required this.color,
    required this.reduced,
  });

  final double t;
  final DotMatrixVariant variant;
  final double spacing;
  final double radius;
  final Color color;
  final bool reduced;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    final cols = (size.width / spacing).ceil() + 1;
    final rows = (size.height / spacing).ceil() + 1;
    final maxDist = math.sqrt(cols * cols + rows * rows.toDouble());

    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        final seed = (math.sin(col * 12.9898 + row * 78.233) * 43758.5453) % 1;
        final delay = math.sqrt(col * col + row * row.toDouble()) / maxDist;

        double r;
        double a;

        if (variant == DotMatrixVariant.assemble && !reduced) {
          final local = ((t - delay * 500) / 500).clamp(0.0, 1.0);
          final eased = _springEase(local);
          r = radius * eased;
          a = eased;
        } else if (variant == DotMatrixVariant.ambient && !reduced) {
          final phase = (t / 2600) + seed * math.pi * 2;
          final wave = 0.55 + 0.45 * math.sin(phase);
          r = radius * wave;
          a = 0.35 + 0.65 * wave;
        } else {
          r = radius;
          a = 0.7;
        }

        if (r <= 0.05) continue;
        paint.color = color.withValues(alpha: a.clamp(0.0, 1.0));
        canvas.drawCircle(Offset(col * spacing, row * spacing), r, paint);
      }
    }
  }

  /// Same spring curve as `springEase` in `src/lib/motion.ts`, so an
  /// 'assemble' field feels identical on web and here.
  double _springEase(double x) =>
      1 - math.pow(2, -10 * x).toDouble() * math.cos(((x * 10 - 0.75) * (2 * math.pi)) / 3);

  @override
  bool shouldRepaint(covariant _DotMatrixPainter oldDelegate) =>
      oldDelegate.t != t || oldDelegate.color != color;
}
