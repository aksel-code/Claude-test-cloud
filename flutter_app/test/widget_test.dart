// Smoke test: the app boots, the local store seeds a demo journal, and the
// Library screen's hero wordmark renders.
//
// Runs with animations disabled (MediaQuery.disableAnimations): DotMatrix's
// 'ambient' variant tickers forever by design (see widgets/dot_matrix.dart),
// which is fine in a real app but means `pumpAndSettle()` never terminates —
// it waits for every animation to finish, and this one never does. Disabling
// animations exercises the same "respect reduced motion" code path the
// widget already has to support, and keeps the test deterministic and fast.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:pagebound/main.dart';
import 'package:pagebound/data/local_store.dart';

void main() {
  testWidgets('Library screen shows the wordmark and the seeded journal', (WidgetTester tester) async {
    await LocalStore.instance.init();
    await tester.pumpWidget(
      const MediaQuery(
        data: MediaQueryData(disableAnimations: true),
        child: PageboundApp(),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('Pagebound'), findsOneWidget);
    expect(find.text('A sample journal'), findsOneWidget);
  });
}
