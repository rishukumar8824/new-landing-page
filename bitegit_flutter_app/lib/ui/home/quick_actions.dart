import 'package:flutter/material.dart';

class HomeQuickActionItem {
  const HomeQuickActionItem({
    required this.label,
    required this.icon,
    required this.onTap,
    this.badge,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;
  final String? badge;
}

class GateQuickActions extends StatelessWidget {
  const GateQuickActions({super.key, required this.actions});

  final List<HomeQuickActionItem> actions;

  @override
  Widget build(BuildContext context) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final fg = isLight ? const Color(0xFF111827) : Colors.white;
    final accent = const Color(0xFF1F7CFF);

    return Row(
      children: actions.map((item) {
        return Expanded(
          child: InkWell(
            onTap: item.onTap,
            borderRadius: BorderRadius.circular(14),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Column(
                children: [
                  Stack(
                    clipBehavior: Clip.none,
                    alignment: Alignment.center,
                    children: [
                      Icon(
                        item.icon,
                        size: 36,
                        color: item.label == 'More' || item.label == 'Deposit'
                            ? accent
                            : fg,
                      ),
                      if (item.badge != null)
                        Positioned(
                          bottom: -8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 7,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFA4F054),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              item.badge!,
                              style: const TextStyle(
                                color: Color(0xFF0A1600),
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    item.label,
                    style: TextStyle(
                      color: fg,
                      fontSize: 17 / 1.15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(growable: false),
    );
  }
}
