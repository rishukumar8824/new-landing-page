import 'package:flutter/material.dart';

import '../events/event_models.dart';
import '../events/events_service.dart';

class GateEventSlider extends StatefulWidget {
  const GateEventSlider({super.key, required this.onOpenEvent});

  final ValueChanged<ExchangeEvent> onOpenEvent;

  @override
  State<GateEventSlider> createState() => GateEventSliderState();
}

class GateEventSliderState extends State<GateEventSlider> {
  final EventsService _eventsService = EventsService();
  final PageController _pageController = PageController(viewportFraction: 0.9);

  bool _loading = true;
  int _active = 0;
  List<ExchangeEvent> _events = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> refreshFromParent() async {
    await _load(forceRefresh: true);
  }

  Future<void> _load({bool forceRefresh = false}) async {
    if (!mounted) return;
    setState(() => _loading = true);
    final rows = await _eventsService.fetchEvents(forceRefresh: forceRefresh);
    if (!mounted) return;
    setState(() {
      _events = rows;
      _loading = false;
      if (_active >= _events.length) {
        _active = 0;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const SizedBox(
        height: 244,
        child: Center(
          child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF3B82F6)),
        ),
      );
    }

    if (_events.isEmpty) {
      return const SizedBox.shrink();
    }

    return SizedBox(
      height: 244,
      child: PageView.builder(
        controller: _pageController,
        itemCount: _events.length,
        onPageChanged: (index) => setState(() => _active = index),
        itemBuilder: (context, index) {
          final event = _events[index];
          final palette = _paletteFor(event.title);
          return Padding(
            padding: const EdgeInsets.only(right: 10),
            child: InkWell(
              borderRadius: BorderRadius.circular(20),
              onTap: () => widget.onOpenEvent(event),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF080C12),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFF202839)),
                ),
                child: Stack(
                  children: [
                    Positioned(
                      right: -20,
                      bottom: -14,
                      child: _eventShape(palette, event.title),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Text(
                              'Event',
                              style: TextStyle(
                                color: Color(0xFFAAB4C8),
                                fontSize: 12.2,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: const Color(0x1A7AB1FF),
                                borderRadius: BorderRadius.circular(30),
                              ),
                              child: Text(
                                '${_active + 1}/${_events.length}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 11.8,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          event.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 33 / 1.6,
                            fontWeight: FontWeight.w800,
                            height: 1.12,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          event.description,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Color(0xFFAAB4C8),
                            fontSize: 20 / 1.6,
                            fontWeight: FontWeight.w600,
                            height: 1.22,
                          ),
                        ),
                        const Spacer(),
                        const Text(
                          'Tap to view details',
                          style: TextStyle(
                            color: Color(0xFF80A3FF),
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _eventShape(List<Color> palette, String seed) {
    final icon = _iconFor(seed);
    return Container(
      width: 110,
      height: 110,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: palette,
        ),
      ),
      child: Icon(icon, color: Colors.white, size: 46),
    );
  }

  IconData _iconFor(String title) {
    final lower = title.toLowerCase();
    if (lower.contains('doge')) return Icons.pets_rounded;
    if (lower.contains('vip')) return Icons.workspace_premium_rounded;
    if (lower.contains('futures')) return Icons.candlestick_chart_rounded;
    if (lower.contains('airdrop')) return Icons.card_giftcard_rounded;
    if (lower.contains('alpha')) return Icons.auto_awesome_rounded;
    return Icons.bolt_rounded;
  }

  List<Color> _paletteFor(String seed) {
    final hash = seed.codeUnits.fold<int>(0, (prev, e) => prev + e);
    final palettes = <List<Color>>[
      [const Color(0xFF2368FF), const Color(0xFF2EC5FF)],
      [const Color(0xFF13A76A), const Color(0xFF5ED98A)],
      [const Color(0xFF7E3AF2), const Color(0xFFB46BFF)],
      [const Color(0xFFDC2626), const Color(0xFFFB7185)],
      [const Color(0xFFF59E0B), const Color(0xFFFDE047)],
    ];
    return palettes[hash % palettes.length];
  }
}
