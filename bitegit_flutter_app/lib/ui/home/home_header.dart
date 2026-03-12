import 'package:flutter/material.dart';

class GateHomeHeader extends StatelessWidget {
  const GateHomeHeader({
    super.key,
    required this.avatarText,
    required this.onOpenProfile,
    required this.onOpenSupport,
    required this.onOpenNotifications,
  });

  final String avatarText;
  final VoidCallback onOpenProfile;
  final VoidCallback onOpenSupport;
  final VoidCallback onOpenNotifications;

  @override
  Widget build(BuildContext context) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final chipBg = isLight ? const Color(0xFFE7EBF3) : const Color(0xFF171C27);
    final fg = isLight ? const Color(0xFF131722) : Colors.white;

    return Row(
      children: [
        InkWell(
          onTap: onOpenProfile,
          borderRadius: BorderRadius.circular(22),
          child: CircleAvatar(
            radius: 22,
            backgroundColor: const Color(0xFF2762FF),
            child: Text(
              avatarText,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 16,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Container(
            height: 52,
            decoration: BoxDecoration(
              color: chipBg,
              borderRadius: BorderRadius.circular(30),
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(30),
              onTap: () {},
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Exchange',
                    style: TextStyle(
                      color: fg,
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(Icons.keyboard_arrow_down_rounded, color: fg),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        IconButton(
          onPressed: onOpenSupport,
          icon: Icon(Icons.headset_mic_outlined, color: fg, size: 25),
        ),
        Stack(
          clipBehavior: Clip.none,
          children: [
            IconButton(
              onPressed: onOpenNotifications,
              icon: Icon(Icons.notifications_none_rounded, color: fg, size: 25),
            ),
            Positioned(
              right: 9,
              top: 9,
              child: Container(
                width: 9,
                height: 9,
                decoration: const BoxDecoration(
                  color: Color(0xFFFF5A6C),
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
