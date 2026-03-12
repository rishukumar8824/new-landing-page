import 'dart:convert';
import 'dart:io';

import 'event_models.dart';

class EventsService {
  EventsService();

  static final List<String> _baseUrls = _resolveBaseUrls();
  static List<ExchangeEvent>? _memoryCache;
  static DateTime? _cacheAt;

  Future<List<ExchangeEvent>> fetchEvents({bool forceRefresh = false}) async {
    final now = DateTime.now();
    if (!forceRefresh &&
        _memoryCache != null &&
        _cacheAt != null &&
        now.difference(_cacheAt!) < const Duration(minutes: 2)) {
      return List<ExchangeEvent>.from(_memoryCache!);
    }

    final client = HttpClient()..connectionTimeout = const Duration(seconds: 10);
    try {
      for (final base in _baseUrls) {
        final uri = Uri.parse('$base/api/events');
        try {
          final request = await client.getUrl(uri);
          request.headers.set(HttpHeaders.acceptHeader, 'application/json');
          final response = await request.close();
          if (response.statusCode < 200 || response.statusCode >= 300) {
            continue;
          }

          final body = await response.transform(utf8.decoder).join();
          final parsed = jsonDecode(body);
          if (parsed is List) {
            final events = <ExchangeEvent>[];
            for (var i = 0; i < parsed.length; i++) {
              final item = parsed[i];
              if (item is! Map) continue;
              events.add(
                ExchangeEvent.fromMap(
                  Map<String, dynamic>.from(item),
                  index: i,
                ),
              );
            }
            if (events.isNotEmpty) {
              _memoryCache = events;
              _cacheAt = now;
              return List<ExchangeEvent>.from(events);
            }
          }
        } catch (_) {
          continue;
        }
      }
    } finally {
      client.close(force: true);
    }

    final fallback = _fallbackEvents();
    _memoryCache = fallback;
    _cacheAt = now;
    return fallback;
  }

  static List<String> _resolveBaseUrls() {
    final env = const String.fromEnvironment('BITEGIT_API_BASE').trim();
    const defaults = <String>['https://new-landing-page-rlv6.onrender.com'];
    final candidates = <String>[if (env.isNotEmpty) env, ...defaults];
    final unique = <String>[];
    for (final item in candidates) {
      final normalized = item.endsWith('/')
          ? item.substring(0, item.length - 1)
          : item;
      if (normalized.isEmpty || unique.contains(normalized)) continue;
      unique.add(normalized);
    }
    return unique;
  }

  List<ExchangeEvent> _fallbackEvents() {
    const source = <Map<String, String>>[
      {
        'title': 'Crazy Wednesday',
        'description': 'Trade \$1 to win rewards and gift cards',
        'link': '/events/crazy-wednesday',
      },
      {
        'title': 'VIP Futures Challenge',
        'description': 'Share 50,000 USDT rewards',
        'link': '/events/vip-futures',
      },
      {
        'title': 'Alpha Hot Coin Competition',
        'description': 'Trade hot listings and win ranking prizes',
        'link': '/events/alpha-hot-coin',
      },
      {
        'title': 'DOGE Airdrop',
        'description': 'Daily check-in airdrop for active traders',
        'link': '/events/doge-airdrop',
      },
      {
        'title': 'Futures Mall',
        'description': 'Complete missions and redeem merch',
        'link': '/events/futures-mall',
      },
      {
        'title': 'Gate Futures Points Airdrop',
        'description': 'Claim up to 100 USDT and bonus points',
        'link': '/events/futures-points-airdrop',
      },
      {
        'title': 'Spring Gold Rush Campaign',
        'description': 'Invite friends and earn XAUT rewards',
        'link': '/events/spring-gold-rush',
      },
      {
        'title': 'TradFi Gold Lucky Bag',
        'description': 'Trade daily to win limited lucky-bag rewards',
        'link': '/events/tradfi-gold-lucky-bag',
      },
      {
        'title': 'Featured Coins Spotlight',
        'description': 'Discover trending listings with bonus tasks',
        'link': '/events/featured-coins-spotlight',
      },
    ];

    return List<ExchangeEvent>.generate(source.length, (index) {
      final item = source[index];
      return ExchangeEvent(
        id: 'fallback_$index',
        title: item['title']!,
        description: item['description']!,
        image: '',
        link: item['link']!,
      );
    });
  }
}
