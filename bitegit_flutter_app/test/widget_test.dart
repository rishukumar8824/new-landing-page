import 'package:flutter_test/flutter_test.dart';

import 'package:bitegit_flutter_app/main.dart';

void main() {
  testWidgets('App shell loads', (WidgetTester tester) async {
    await tester.pumpWidget(const BitegitApp());

    expect(find.text('Welcome to Bitegit'), findsOneWidget);
    expect(find.text('Sign Up'), findsOneWidget);
    expect(find.text('Login'), findsOneWidget);
  });
}
