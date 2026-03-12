import 'package:flutter/material.dart';

import '../market/ticker_models.dart';
import '../market/ticker_service.dart';

class GateMarketTickerSection extends StatefulWidget {
  const GateMarketTickerSection({super.key, required this.onTapSymbol});

  final ValueChanged<String> onTapSymbol;

  @override
  State<GateMarketTickerSection> createState() => GateMarketTickerSectionState();
}

class GateMarketTickerSectionState extends State<GateMarketTickerSection> {
  final MarketTickerService _service = MarketTickerService();

  bool _loading = true;
  List<MarketTickerItem> _rows = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> refreshFromParent() async {
    await _load(forceRefresh: true);
  }

  Future<void> _load({bool forceRefresh = false}) async {
    if (!mounted) return;
    setState(() => _loading = true);
    final rows = await _service.fetchTickers(forceRefresh: forceRefresh);
    if (!mounted) return;
    setState(() {
      _rows = rows;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const SizedBox(
        height: 146,
        child: Center(
          child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF3B82F6)),
        ),
      );
    }

    if (_rows.isEmpty) {
      return const SizedBox.shrink();
    }

    return SizedBox(
      height: 152,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _rows.length,
        separatorBuilder: (_, separatorIndex) => const SizedBox(width: 9),
        itemBuilder: (context, index) {
          final row = _rows[index];
          final isDown = row.changePercent < 0;
          final color = isDown ? const Color(0xFFFB4E63) : const Color(0xFF37D39A);
          return InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: () => widget.onTapSymbol(row.symbol),
            child: Container(
              width: 132,
              padding: const EdgeInsets.fromLTRB(11, 10, 11, 9),
              decoration: BoxDecoration(
                color: const Color(0xFF0B1018),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF1F293B)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          row.symbol,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18 / 1.2,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      Text(
                        '${row.changePercent >= 0 ? '+' : ''}${row.changePercent.toStringAsFixed(1)}%',
                        style: TextStyle(
                          color: color,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 5),
                  Text(
                    _formatPrice(row.price),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 33 / 1.6,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const Spacer(),
                  SizedBox(
                    height: 34,
                    child: CustomPaint(
                      painter: _SparklinePainter(
                        points: row.sparkline,
                        color: color,
                      ),
                      child: const SizedBox.expand(),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  String _formatPrice(double value) {
    if (value >= 1000) {
      return value.toStringAsFixed(1);
    }
    if (value >= 1) {
      return value.toStringAsFixed(2);
    }
    return value.toStringAsFixed(4);
  }
}

class _SparklinePainter extends CustomPainter {
  const _SparklinePainter({required this.points, required this.color});

  final List<double> points;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    if (points.length < 2) return;

    double minY = points.first;
    double maxY = points.first;
    for (final value in points) {
      if (value < minY) minY = value;
      if (value > maxY) maxY = value;
    }

    final dy = (maxY - minY).abs() < 0.000001 ? 1.0 : (maxY - minY);
    final stepX = size.width / (points.length - 1);

    final path = Path();
    for (var i = 0; i < points.length; i++) {
      final x = i * stepX;
      final normalized = (points[i] - minY) / dy;
      final y = size.height - (normalized * size.height);
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }

    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..color = color
      ..strokeWidth = 2.1
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _SparklinePainter oldDelegate) {
    return oldDelegate.points != points || oldDelegate.color != color;
  }
}
