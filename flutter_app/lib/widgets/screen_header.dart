import 'package:flutter/material.dart';
import '../theme/tokens.dart';

/// Flutter port of `src/components/ui/ScreenHeader.tsx` — the technical
/// masthead ("record sleeve" register: mono eyebrow, tabular meta, a hairline
/// tick rule) shared by every top-level screen.
class ScreenHeader extends StatelessWidget {
  const ScreenHeader({
    super.key,
    required this.eyebrow,
    required this.title,
    this.subtitle,
    this.meta,
    this.trailing,
  });

  final String eyebrow;
  final String title;
  final String? subtitle;
  final String? meta;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final signal = Theme.of(context).colorScheme.secondary;
    final inkFaint = Theme.of(context).brightness == Brightness.dark
        ? PageboundColors.inkSoftOnDark
        : PageboundColors.inkFaint;

    return Padding(
      padding: const EdgeInsets.only(bottom: 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(eyebrow, style: PagebandType.techLabel.copyWith(color: signal)),
              if (meta != null)
                Text(meta!, style: PagebandType.techLabel.copyWith(color: inkFaint)),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            height: 1,
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [signal.withValues(alpha: 0.5), Colors.transparent]),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: Theme.of(context).textTheme.headlineLarge?.copyWith(fontSize: 32)),
                    if (subtitle != null) ...[
                      const SizedBox(height: 4),
                      Text(subtitle!, style: Theme.of(context).textTheme.bodyMedium),
                    ],
                  ],
                ),
              ),
              if (trailing != null) trailing!,
            ],
          ),
        ],
      ),
    );
  }
}
