import 'package:flutter/material.dart';

import 'event_models.dart';

class EventDetailPage extends StatelessWidget {
  const EventDetailPage({super.key, required this.event});

  final ExchangeEvent event;

  @override
  Widget build(BuildContext context) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final bg = isLight ? const Color(0xFFF3F6FC) : const Color(0xFF05070B);
    final card = isLight ? Colors.white : const Color(0xFF0F131C);
    final border = isLight ? const Color(0xFFD4DCEB) : const Color(0xFF222A3A);

    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Event Details'),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(14, 8, 14, 18),
        children: [
          Container(
            height: 180,
            decoration: BoxDecoration(
              color: card,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: border),
            ),
            alignment: Alignment.center,
            child: Text(
              event.title,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: card,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  event.title,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                Text(
                  event.description,
                  style: const TextStyle(fontSize: 14.2, height: 1.35),
                ),
                const SizedBox(height: 12),
                Text(
                  'Link: ${event.link}',
                  style: TextStyle(
                    color: isLight ? const Color(0xFF4B5A74) : Colors.white60,
                    fontSize: 12.6,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
