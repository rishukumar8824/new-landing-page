import 'dart:async';

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
  static const Duration _autoScrollInterval = Duration(seconds: 4);

  final EventsService _eventsService = EventsService();

  bool _loading = true;
  int _cursor = 0;
  List<ExchangeEvent> _events = const <ExchangeEvent>[];
  Timer? _autoScrollTimer;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _autoScrollTimer?.cancel();
    super.dispose();
  }

  Future<void> refreshFromParent() async {
    await _load(forceRefresh: true);
  }

  Future<void> _load({bool forceRefresh = false}) async {
    if (!mounted) {
      return;
    }
    setState(() => _loading = true);
    final rows = await _eventsService.fetchEvents(forceRefresh: forceRefresh);
    if (!mounted) {
      return;
    }
    setState(() {
      _events = rows;
      _loading = false;
      if (_cursor >= _events.length) {
        _cursor = 0;
      }
    });
    _restartAutoScroll();
  }

  void _restartAutoScroll() {
    _autoScrollTimer?.cancel();
    if (_events.length <= 1) {
      return;
    }
    _autoScrollTimer = Timer.periodic(_autoScrollInterval, (_) {
      if (!mounted || _events.length <= 1) {
        return;
      }
      setState(() {
        _cursor = (_cursor + 1) % _events.length;
      });
    });
  }

  ExchangeEvent _eventAt(int offset) {
    if (_events.isEmpty) {
      return const ExchangeEvent(
        id: 'event-fallback',
        title: 'Market Update',
        description: 'Latest promotions',
        image: '',
        link: '/events',
      );
    }
    return _events[(_cursor + offset) % _events.length];
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const SizedBox(
        height: 322,
        child: Center(
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: Color(0xFF3B82F6),
          ),
        ),
      );
    }

    if (_events.isEmpty) {
      return const SizedBox.shrink();
    }

    final lead = _eventAt(0);
    final topRight = _eventAt(1);
    final bottomRight = _eventAt(2);

    return SizedBox(
      height: 322,
      child: Row(
        children: [
          Expanded(
            flex: 11,
            child: _AnimatedEventCard(
              event: lead,
              child: _LeadEventCard(
                event: lead,
                rank: '${(_cursor % _events.length) + 1}/${_events.length}',
                onTap: () => widget.onOpenEvent(lead),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            flex: 10,
            child: Column(
              children: [
                Expanded(
                  child: _AnimatedEventCard(
                    event: topRight,
                    child: _SideEventCard(
                      event: topRight,
                      rank:
                          '${((_cursor + 1) % _events.length) + 1}/${_events.length}',
                      onTap: () => widget.onOpenEvent(topRight),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Expanded(
                  child: _AnimatedEventCard(
                    event: bottomRight,
                    child: _SideEventCard(
                      event: bottomRight,
                      rank:
                          '${((_cursor + 2) % _events.length) + 1}/${_events.length}',
                      onTap: () => widget.onOpenEvent(bottomRight),
                    ),
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

class _AnimatedEventCard extends StatelessWidget {
  const _AnimatedEventCard({required this.event, required this.child});

  final ExchangeEvent event;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 560),
      reverseDuration: const Duration(milliseconds: 360),
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      layoutBuilder: (currentChild, previousChildren) {
        return Stack(
          fit: StackFit.expand,
          children: <Widget>[
            ...previousChildren,
            if (currentChild != null) currentChild,
          ],
        );
      },
      transitionBuilder: (child, animation) {
        final slide = Tween<Offset>(
          begin: const Offset(0.08, 0),
          end: Offset.zero,
        ).animate(animation);
        return FadeTransition(
          opacity: animation,
          child: SlideTransition(position: slide, child: child),
        );
      },
      child: KeyedSubtree(key: ValueKey<String>(event.id), child: child),
    );
  }
}

class _LeadEventCard extends StatelessWidget {
  const _LeadEventCard({
    required this.event,
    required this.rank,
    required this.onTap,
  });

  final ExchangeEvent event;
  final String rank;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final palette = _paletteFor(event.title);
    return InkWell(
      borderRadius: BorderRadius.circular(22),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
        decoration: BoxDecoration(
          color: const Color(0xFF080C12),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFF1E2638)),
          boxShadow: const <BoxShadow>[
            BoxShadow(
              color: Color(0x2C04070E),
              blurRadius: 22,
              spreadRadius: 1,
              offset: Offset(0, 10),
            ),
          ],
        ),
        child: Stack(
          children: [
            Positioned(
              right: -16,
              bottom: -16,
              child: _EventArtwork(
                event: event,
                size: 122,
                borderRadius: BorderRadius.circular(26),
                iconSize: 48,
                palette: palette,
              ),
            ),
            Positioned(right: 0, top: 0, child: _RankPill(rank: rank)),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0x141E80FF),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: const Color(0x221E80FF)),
                  ),
                  child: const Text(
                    'Featured Event',
                    style: TextStyle(
                      color: Color(0xFFB8C4D9),
                      fontSize: 11.4,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  event.title,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 21,
                    fontWeight: FontWeight.w800,
                    height: 1.14,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  event.description,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFFAAB4C8),
                    fontSize: 13.2,
                    fontWeight: FontWeight.w600,
                    height: 1.28,
                  ),
                ),
                const Spacer(),
                Row(
                  children: const [
                    Text(
                      'Tap to view details',
                      style: TextStyle(
                        color: Color(0xFF8EB0FF),
                        fontSize: 12.2,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    SizedBox(width: 6),
                    Icon(
                      Icons.arrow_forward_rounded,
                      color: Color(0xFF8EB0FF),
                      size: 16,
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SideEventCard extends StatelessWidget {
  const _SideEventCard({
    required this.event,
    required this.rank,
    required this.onTap,
  });

  final ExchangeEvent event;
  final String rank;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final palette = _paletteFor(event.title);
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
        decoration: BoxDecoration(
          color: const Color(0xFF080C12),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFF1E2638)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _EventArtwork(
                  event: event,
                  size: 34,
                  borderRadius: BorderRadius.circular(12),
                  iconSize: 18,
                  palette: palette,
                ),
                const Spacer(),
                _RankPill(rank: rank, compact: true),
              ],
            ),
            const SizedBox(height: 9),
            Text(
              event.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 15,
                fontWeight: FontWeight.w800,
                height: 1.16,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              event.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Color(0xFFAAB4C8),
                fontSize: 11.8,
                fontWeight: FontWeight.w600,
                height: 1.24,
              ),
            ),
            const Spacer(),
            const Text(
              'Tap to view details',
              style: TextStyle(
                color: Color(0xFF8EB0FF),
                fontSize: 11.3,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RankPill extends StatelessWidget {
  const _RankPill({required this.rank, this.compact = false});

  final String rank;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 8 : 10,
        vertical: compact ? 4 : 5,
      ),
      decoration: BoxDecoration(
        color: const Color(0x141E80FF),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0x221E80FF)),
      ),
      child: Text(
        rank,
        style: TextStyle(
          color: Colors.white,
          fontSize: compact ? 10.6 : 11.6,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _EventArtwork extends StatelessWidget {
  const _EventArtwork({
    required this.event,
    required this.size,
    required this.borderRadius,
    required this.iconSize,
    required this.palette,
  });

  final ExchangeEvent event;
  final double size;
  final BorderRadius borderRadius;
  final double iconSize;
  final List<Color> palette;

  @override
  Widget build(BuildContext context) {
    final image = event.image.trim();
    final hasRemoteImage =
        image.startsWith('http://') || image.startsWith('https://');

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: borderRadius,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: palette,
        ),
      ),
      child: ClipRRect(
        borderRadius: borderRadius,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (hasRemoteImage)
              Image.network(
                image,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const SizedBox.shrink(),
              ),
            if (hasRemoteImage)
              DecoratedBox(
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.24),
                ),
              ),
            if (!hasRemoteImage)
              Align(
                alignment: Alignment.center,
                child: Icon(
                  _iconFor(event.title),
                  color: Colors.white,
                  size: iconSize,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

IconData _iconFor(String title) {
  final lower = title.toLowerCase();
  if (lower.contains('doge')) {
    return Icons.pets_rounded;
  }
  if (lower.contains('vip')) {
    return Icons.workspace_premium_rounded;
  }
  if (lower.contains('futures')) {
    return Icons.candlestick_chart_rounded;
  }
  if (lower.contains('airdrop')) {
    return Icons.card_giftcard_rounded;
  }
  if (lower.contains('alpha')) {
    return Icons.auto_awesome_rounded;
  }
  return Icons.bolt_rounded;
}

List<Color> _paletteFor(String seed) {
  final hash = seed.codeUnits.fold<int>(0, (prev, e) => prev + e);
  const palettes = <List<Color>>[
    [Color(0xFF2368FF), Color(0xFF2EC5FF)],
    [Color(0xFF13A76A), Color(0xFF5ED98A)],
    [Color(0xFF7E3AF2), Color(0xFFB46BFF)],
    [Color(0xFFDC2626), Color(0xFFFB7185)],
    [Color(0xFFF59E0B), Color(0xFFFDE047)],
  ];
  return palettes[hash % palettes.length];
}
