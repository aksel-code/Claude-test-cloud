import 'package:flutter/material.dart';
import '../data/local_store.dart';
import '../models/journal.dart';
import '../theme/tokens.dart';
import '../widgets/dot_matrix.dart';
import '../widgets/journal_cover.dart';
import '../widgets/screen_header.dart';

/// Flutter port of `src/components/library/LibraryScreen.tsx` — the shelf,
/// and the app's primary landing screen, so it carries the fullest version of
/// the new experimental chrome: a dark "signal" hero with an ambient
/// dot-matrix field and a technical masthead, then the familiar warm content
/// grid underneath, unchanged from the web app's palette.
class LibraryScreen extends StatefulWidget {
  const LibraryScreen({super.key});

  @override
  State<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends State<LibraryScreen> {
  late List<Journal> _journals;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    final store = LocalStore.instance;
    _journals = store.journals().where((j) => !j.archived).toList();
    // Recent-pages strip (the web app's RecentStrip) is deferred — see README.
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(child: _Hero(journalCount: _journals.length)),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ScreenHeader(
                    eyebrow: 'PAGEBOUND — YOUR SHELF',
                    title: 'Journals',
                    meta: '${_journals.length.toString().padLeft(2, '0')} TOTAL',
                  ),
                  if (_journals.isEmpty)
                    const _EmptyShelf()
                  else
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        mainAxisSpacing: 28,
                        crossAxisSpacing: 16,
                        childAspectRatio: 0.62,
                      ),
                      itemCount: _journals.length,
                      itemBuilder: (context, index) {
                        final journal = _journals[index];
                        return Center(child: JournalCover(journal: journal, width: 150));
                      },
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({required this.journalCount});
  final int journalCount;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final stamp = '${now.year}.${now.month.toString().padLeft(2, '0')}.${now.day.toString().padLeft(2, '0')}';

    return Container(
      height: 220,
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [PageboundColors.chrome, Color(0xFF1C1E2C)],
        ),
      ),
      child: Stack(
        children: [
          Positioned.fill(
            child: Opacity(
              opacity: 0.5,
              child: DotMatrix(
                variant: DotMatrixVariant.ambient,
                color: PageboundColors.signalGlow,
                spacing: 20,
                radius: 1.4,
              ),
            ),
          ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: const Alignment(-0.6, -1.1),
                  radius: 1.3,
                  colors: [PageboundColors.signalGlow.withValues(alpha: 0.45), Colors.transparent],
                ),
              ),
            ),
          ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: const Alignment(1.1, 0.2),
                  radius: 1.1,
                  colors: [PageboundColors.signalEmber.withValues(alpha: 0.3), Colors.transparent],
                ),
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'PRACTISE — SCRAPBOOK RECORD',
                        style: PagebandType.techLabel.copyWith(color: PageboundColors.chromeInk.withValues(alpha: 0.7)),
                      ),
                      Text(stamp, style: PagebandType.techLabel.copyWith(color: PageboundColors.signalGlow)),
                    ],
                  ),
                  const Spacer(),
                  Text(
                    'Pagebound',
                    style: TextStyle(
                      fontFamily: 'Georgia',
                      fontSize: 40,
                      fontWeight: FontWeight.w600,
                      color: PageboundColors.chromeInk,
                      height: 1,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'A private, tactile scrapbook. ${journalCount.toString().padLeft(2, '0')} on the shelf.',
                    style: TextStyle(color: PageboundColors.chromeInk.withValues(alpha: 0.65), fontSize: 14),
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      FilledButton.icon(
                        onPressed: () {},
                        style: FilledButton.styleFrom(
                          backgroundColor: PageboundColors.terracottaDeep,
                          foregroundColor: Colors.white,
                          shape: const StadiumBorder(),
                        ),
                        icon: const Icon(Icons.add, size: 18),
                        label: const Text("Today's page"),
                      ),
                      const SizedBox(width: 10),
                      OutlinedButton.icon(
                        onPressed: () {},
                        style: OutlinedButton.styleFrom(
                          foregroundColor: PageboundColors.chromeInk,
                          side: BorderSide(color: PageboundColors.chromeInk.withValues(alpha: 0.35)),
                          shape: const StadiumBorder(),
                        ),
                        icon: const Icon(Icons.camera_alt_outlined, size: 16),
                        label: const Text('Quick capture'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyShelf extends StatelessWidget {
  const _EmptyShelf();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48),
      child: Center(
        child: Column(
          children: [
            Text('Nothing on the shelf yet', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            const Text('A journal is just a place to keep pages.', textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
