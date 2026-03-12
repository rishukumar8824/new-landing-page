class MarketTickerItem {
  const MarketTickerItem({
    required this.symbol,
    required this.price,
    required this.changePercent,
    required this.sparkline,
  });

  final String symbol;
  final double price;
  final double changePercent;
  final List<double> sparkline;

  factory MarketTickerItem.fromMap(Map<String, dynamic> map) {
    final rawSpark = map['sparkline'] ?? map['sparklineData'] ?? map['points'];
    final points = <double>[];
    if (rawSpark is List) {
      for (final item in rawSpark) {
        if (item is num) {
          points.add(item.toDouble());
        } else {
          final parsed = double.tryParse(item.toString());
          if (parsed != null) points.add(parsed);
        }
      }
    }

    final symbol = (map['symbol'] ?? map['coin'] ?? map['pair'] ?? 'BTC')
        .toString()
        .trim();
    final price = _toDouble(map['price'] ?? map['lastPrice']);
    final change = _toDouble(
      map['changePercent'] ?? map['change'] ?? map['percent'] ?? map['dailyChange'],
    );

    return MarketTickerItem(
      symbol: symbol,
      price: price,
      changePercent: change,
      sparkline: points,
    );
  }
}

double _toDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? 0;
}
