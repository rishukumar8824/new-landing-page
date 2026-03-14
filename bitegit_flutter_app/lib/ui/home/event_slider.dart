import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart' show ScrollDirection;

import '../events/event_models.dart';
import '../events/event_visuals.dart';
import '../events/events_service.dart';

class GateEventSlider extends StatefulWidget {
  const GateEventSlider({super.key, required this.onOpenEvent});

  final ValueChanged<ExchangeEvent> onOpenEvent;

  @override
  State<GateEventSlider> createState() => GateEventSliderState();
}

class GateEventSliderState extends State<GateEventSlider> {
  static const Duration _autoScrollInterval = Duration(seconds: 5);
  static const Duration _pageAnimationDuration = Duration(milliseconds: 620);
  static const int _initialPage = 1000;

  final EventsService _eventsService = EventsService();
  final PageController _pageController = PageController(
    initialPage: _initialPage,
  );

  bool _loading = true;
  bool _userScrolling = false;
  int _currentPage = _initialPage;
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
    _pageController.dispose();
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
    });
    _restartAutoScroll();
  }

  void _restartAutoScroll() {
    _autoScrollTimer?.cancel();
    if (_events.length <= 1) {
      return;
    }
    _autoScrollTimer = Timer.periodic(_autoScrollInterval, (_) {
      if (!mounted || _userScrolling || !_pageController.hasClients) {
        return;
      }
      final nextPage = _currentPage + 1;
      _pageController.animateToPage(
        nextPage,
        duration: _pageAnimationDuration,
        curve: Curves.easeOutCubic,
      );
    });
  }

  ExchangeEvent _eventAt(int virtualIndex) {
    if (_events.isEmpty) {
      return const ExchangeEvent(
        id: 'event-fallback',
        title: 'Market Update',
        description: 'Latest promotions',
        image: '',
        link: '/events',
      );
    }
    return _events[virtualIndex % _events.length];
  }

  bool _handleScrollNotification(ScrollNotification notification) {
    if (notification is ScrollStartNotification) {
      _userScrolling = true;
      _autoScrollTimer?.cancel();
    } else if (notification is ScrollEndNotification) {
      _userScrolling = false;
      _restartAutoScroll();
    } else if (notification is UserScrollNotification &&
        notification.direction == ScrollDirection.idle) {
      _userScrolling = false;
      _restartAutoScroll();
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const SizedBox(
        height: 398,
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

    if (_events.length == 1) {
      final event = _events.first;
      return SizedBox(
        height: 382,
        child: _LeadEventCard(
          event: event,
          rank: '1/1',
          onTap: () => widget.onOpenEvent(event),
          fullWidth: true,
        ),
      );
    }

    final visiblePage = _currentPage % _events.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: 382,
          child: NotificationListener<ScrollNotification>(
            onNotification: _handleScrollNotification,
            child: PageView.builder(
              controller: _pageController,
              physics: const BouncingScrollPhysics(),
              onPageChanged: (value) {
                if (!mounted) {
                  return;
                }
                setState(() => _currentPage = value);
              },
              itemBuilder: (context, virtualIndex) {
                final lead = _eventAt(virtualIndex);
                final topRight = _eventAt(virtualIndex + 1);
                final bottomRight = _eventAt(virtualIndex + 2);

                return Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    children: [
                      Expanded(
                        flex: 11,
                        child: _LeadEventCard(
                          event: lead,
                          rank:
                              '${(virtualIndex % _events.length) + 1}/${_events.length}',
                          onTap: () => widget.onOpenEvent(lead),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        flex: 9,
                        child: Column(
                          children: [
                            Expanded(
                              child: _SideEventCard(
                                event: topRight,
                                rank:
                                    '${((virtualIndex + 1) % _events.length) + 1}/${_events.length}',
                                onTap: () => widget.onOpenEvent(topRight),
                              ),
                            ),
                            const SizedBox(height: 12),
                            Expanded(
                              child: _SideEventCard(
                                event: bottomRight,
                                rank:
                                    '${((virtualIndex + 2) % _events.length) + 1}/${_events.length}',
                                onTap: () => widget.onOpenEvent(bottomRight),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            const Text(
              'Swipe left or right to browse promotions',
              style: TextStyle(
                color: Color(0xFF8F9BB1),
                fontSize: 12.4,
                fontWeight: FontWeight.w600,
              ),
            ),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFF0E141E),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: const Color(0xFF1E293B)),
              ),
              child: Text(
                '${visiblePage + 1}/${_events.length}',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _LeadEventCard extends StatelessWidget {
  const _LeadEventCard({
    required this.event,
    required this.rank,
    required this.onTap,
    this.fullWidth = false,
  });

  final ExchangeEvent event;
  final String rank;
  final VoidCallback onTap;
  final bool fullWidth;

  @override
  Widget build(BuildContext context) {
    final spec = eventVisualSpecFor(event);
    return InkWell(
      borderRadius: BorderRadius.circular(26),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
        decoration: BoxDecoration(
          color: const Color(0xFF080C12),
          borderRadius: BorderRadius.circular(26),
          border: Border.all(color: const Color(0xFF1B2434)),
          boxShadow: const <BoxShadow>[
            BoxShadow(
              color: Color(0x22050911),
              blurRadius: 24,
              spreadRadius: 1,
              offset: Offset(0, 14),
            ),
          ],
        ),
        child: Stack(
          children: [
            Positioned(
              left: -42,
              top: -56,
              child: _GlowBlob(color: spec.palette.first),
            ),
            Positioned(
              right: -34,
              bottom: -28,
              child: _EventArtwork(
                event: event,
                spec: spec,
                size: fullWidth ? 160 : 136,
                borderRadius: BorderRadius.circular(30),
                iconSize: 54,
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _AccentPill(
                      label: spec.label,
                      icon: spec.icon,
                      colors: spec.palette,
                    ),
                    const Spacer(),
                    _RankPill(rank: rank),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  event.title,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 25,
                    fontWeight: FontWeight.w800,
                    height: 1.1,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  event.description,
                  maxLines: 4,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF9DA8BC),
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    height: 1.35,
                  ),
                ),
                const Spacer(),
                _MessageStrip(
                  icon: spec.icon,
                  label: spec.banner,
                  colors: spec.palette,
                ),
                const SizedBox(height: 12),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: _MetricPanel(
                        value: spec.metric,
                        caption: spec.metricCaption,
                        emphasized: true,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 12,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            spec.action,
                            style: const TextStyle(
                              color: Color(0xFF0B1018),
                              fontSize: 13.2,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Icon(
                            Icons.arrow_outward_rounded,
                            color: Color(0xFF0B1018),
                            size: 18,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: spec.tags
                      .map(
                        (tag) => Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0E151F),
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(color: const Color(0xFF243041)),
                          ),
                          child: Text(
                            tag,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11.4,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      )
                      .toList(),
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
    final spec = eventVisualSpecFor(event);
    return InkWell(
      borderRadius: BorderRadius.circular(22),
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
        decoration: BoxDecoration(
          color: const Color(0xFF080C12),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFF1B2434)),
        ),
        child: Stack(
          children: [
            Positioned(
              right: -18,
              bottom: -14,
              child: _EventArtwork(
                event: event,
                spec: spec,
                size: 82,
                borderRadius: BorderRadius.circular(22),
                iconSize: 30,
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _AccentPill(
                      label: spec.label,
                      icon: spec.icon,
                      colors: spec.palette,
                      compact: true,
                    ),
                    const Spacer(),
                    _RankPill(rank: rank, compact: true),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  event.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16.8,
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
                    color: Color(0xFF9DA8BC),
                    fontSize: 12.4,
                    fontWeight: FontWeight.w600,
                    height: 1.3,
                  ),
                ),
                const Spacer(),
                _MetricPanel(value: spec.metric, caption: spec.metricCaption),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _MetricPanel extends StatelessWidget {
  const _MetricPanel({
    required this.value,
    required this.caption,
    this.emphasized = false,
  });

  final String value;
  final String caption;
  final bool emphasized;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: emphasized ? 12 : 0,
        vertical: emphasized ? 10 : 0,
      ),
      decoration: emphasized
          ? BoxDecoration(
              color: const Color(0xFF0E151F),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFF243041)),
            )
          : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: Colors.white,
              fontSize: emphasized ? 20 : 18,
              fontWeight: FontWeight.w800,
              height: 1,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            caption,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Color(0xFF8A95A9),
              fontSize: 11.6,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _MessageStrip extends StatelessWidget {
  const _MessageStrip({
    required this.icon,
    required this.label,
    required this.colors,
  });

  final IconData icon;
  final String label;
  final List<Color> colors;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF0E151F),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF243041)),
      ),
      child: Row(
        children: [
          Container(
            width: 26,
            height: 26,
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: colors),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: Colors.white, size: 15),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Color(0xFFC8D2E5),
                fontSize: 12.2,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AccentPill extends StatelessWidget {
  const _AccentPill({
    required this.label,
    required this.icon,
    required this.colors,
    this.compact = false,
  });

  final String label;
  final IconData icon;
  final List<Color> colors;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 8 : 10,
        vertical: compact ? 5 : 6,
      ),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: colors),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: compact ? 12 : 14),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: Colors.white,
              fontSize: compact ? 10.8 : 11.8,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
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
        color: const Color(0xFF0E151F),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0xFF243041)),
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

class _GlowBlob extends StatelessWidget {
  const _GlowBlob({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 150,
      height: 150,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: <Color>[
            color.withOpacity(0.28),
            color.withOpacity(0.05),
            Colors.transparent,
          ],
        ),
      ),
    );
  }
}

class _EventArtwork extends StatelessWidget {
  const _EventArtwork({
    required this.event,
    required this.spec,
    required this.size,
    required this.borderRadius,
    required this.iconSize,
  });

  final ExchangeEvent event;
  final EventVisualSpec spec;
  final double size;
  final BorderRadius borderRadius;
  final double iconSize;

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
          colors: spec.palette,
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
                  color: Colors.black.withOpacity(0.28),
                ),
              )
            else ...[
              Positioned(
                left: size * 0.18,
                top: size * 0.16,
                child: Container(
                  width: size * 0.56,
                  height: size * 0.56,
                  decoration: const BoxDecoration(
                    color: Color(0x22000000),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
              Positioned(
                right: size * 0.12,
                top: size * 0.12,
                child: Container(
                  width: size * 0.16,
                  height: size * 0.16,
                  decoration: const BoxDecoration(
                    color: Color(0xBFF6FF8B),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
              Positioned(
                left: size * 0.1,
                bottom: size * 0.12,
                child: Container(
                  width: size * 0.24,
                  height: size * 0.24,
                  decoration: const BoxDecoration(
                    color: Color(0x40FFFFFF),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ],
            Center(
              child: Container(
                width: size * 0.38,
                height: size * 0.38,
                decoration: BoxDecoration(
                  color: const Color(0x1AFFFFFF),
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0x38FFFFFF)),
                ),
                child: Icon(spec.icon, color: Colors.white, size: iconSize),
              ),
            ),
            Positioned(
              right: size * 0.08,
              bottom: size * 0.08,
              child: Container(
                padding: EdgeInsets.symmetric(
                  horizontal: size * 0.08,
                  vertical: size * 0.05,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xE6070A11),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  spec.tags.first,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: size * 0.09,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
