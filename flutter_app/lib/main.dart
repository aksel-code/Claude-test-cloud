import 'package:flutter/material.dart';
import 'data/local_store.dart';
import 'screens/library_screen.dart';
import 'theme/pagebound_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await LocalStore.instance.init();
  runApp(const PageboundApp());
}

class PageboundApp extends StatelessWidget {
  const PageboundApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Pagebound',
      debugShowCheckedModeBanner: false,
      theme: PageboundTheme.light(),
      darkTheme: PageboundTheme.dark(),
      home: const LibraryScreen(),
    );
  }
}
