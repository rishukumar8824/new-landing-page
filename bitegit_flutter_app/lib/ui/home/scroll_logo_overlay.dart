import 'package:flutter/material.dart';

class ScrollLogoOverlay extends StatelessWidget {
  const ScrollLogoOverlay({
    super.key,
    required this.visible,
    required this.child,
  });

  final bool visible;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: IgnorePointer(
        child: Center(
          child: AnimatedOpacity(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeOut,
            opacity: visible ? 1 : 0,
            child: AnimatedScale(
              duration: const Duration(milliseconds: 240),
              curve: Curves.easeOutBack,
              scale: visible ? 1 : 0.86,
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}
