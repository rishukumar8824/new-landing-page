import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'ticker_models.dart';

class MarketTickerService {
  MarketTickerService();

  static final List<String> _baseUrls = _resolveBaseUrls();
  static List<MarketTickerItem>? _cache;
  static DateTime? _cacheAt;

  Future<List<MarketTickerItem>> fetchTickers({bool forceRefresh = false}) async {
    final now = DateTime.now();
    if (!forceRefresh &&
        _cache != null &&
        _cacheAt != null &&
        now.difference(_cacheAt!) < const Duration(seconds: 35)) {
      return List<MarketTickerItem>.from(_cache!);
    }

    final client = HttpClient()..connectionTimeout = const Duration(seconds: 10);
    try {
      for (final base in _baseUrls) {
        final uri = Uri.parse('$base/api/market/tickers');
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
            final rows = <MarketTickerItem>[];
            for (final item in parsed) {
              if (item is! Map) continue;
              rows.add(MarketTickerItem.fromMap(Map<String, dynamic>.from(item)));
            }
            if (rows.isNotEmpty) {
              final normalized = rows.map(_withSyntheticSparkline).toList(growable: false);
              _cache = normalized;
              _cacheAt = now;
              return List<MarketTickerItem>.from(normalized);
            }
          }
        } catch (_) {
          continue;
        }
      }
    } finally {
      client.close(force: true);
    }

    final fallback = _fallback();
    _cache = fallback;
    _cacheAt = now;
    return fallback;
  }

  MarketTickerItem _withSyntheticSparkline(MarketTickerItem input) {
    if (input.sparkline.length >= 8) {
      return input;
    }
    final seed = input.symbol.hashCode.abs() % 100;
    final points = <double>[];
    final baseline = input.price == 0 ? seed.toDouble() : input.price;
    final trend = input.changePercent / 100;
    for (var i = 0; i < 20; i++) {
      final x = i / 19;
      final wave = sin((x * 6.2) + seed / 8) * 0.0028;
      final drift = trend * x * 0.012;
      points.add(baseline * (1 + wave + drift));
    }
    return MarketTickerItem(
      symbol: input.symbol,
      price: input.price,
      changePercent: input.changePercent,
      sparkline: points,
    );
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

  List<MarketTickerItem> _fallback() {
    const seeds = <Map<String, dynamic>>[
      {'symbol': 'GT', 'price': 7.01, 'changePercent': -0.5},
      {'symbol': 'BTC', 'price': 69872.8, 'changePercent': -1.1},
      {'symbol': 'ETH', 'price': 2050.4, 'changePercent': -1.2},
      {'symbol': 'SOL', 'price': 142.3, 'changePercent': 0.8},
      {'symbol': 'XRP', 'price': 0.61, 'changePercent': -0.3},
    ];

    return seeds
        .map((row) => _withSyntheticSparkline(MarketTickerItem.fromMap(row)))
        .toList(growable: false);
  }
}
