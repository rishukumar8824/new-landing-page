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
    final muted = isLight ? const Color(0xFF5D677A) : const Color(0xFF8F9BB2);

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
            height: 44,
            decoration: BoxDecoration(
              color: chipBg,
              borderRadius: BorderRadius.circular(24),
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(24),
              onTap: () {},
              child: Row(
                children: [
                  const SizedBox(width: 12),
                  Icon(Icons.search_rounded, color: muted, size: 19),
                  const SizedBox(width: 7),
                  Expanded(
                    child: Text(
                      'Search',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: muted,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  Text(
                    'GT/USDT',
                    style: TextStyle(
                      color: fg,
                      fontSize: 13.4,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(width: 10),
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
