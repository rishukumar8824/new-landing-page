import 'package:flutter/material.dart';

import '../market/ticker_models.dart';
import '../market/ticker_service.dart';

class GateMarketTickerSection extends StatefulWidget {
  const GateMarketTickerSection({super.key, required this.onTapSymbol});

  final ValueChanged<String> onTapSymbol;

  @override
  State<GateMarketTickerSection> createState() =>
      GateMarketTickerSectionState();
}

class GateMarketTickerSectionState extends State<GateMarketTickerSection> {
  final MarketTickerService _service = MarketTickerService();

  bool _loading = true;
  List<MarketTickerItem> _rows = const <MarketTickerItem>[];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> refreshFromParent() async {
    await _load(forceRefresh: true);
  }

  Future<void> _load({bool forceRefresh = false}) async {
    if (!mounted) {
      return;
    }
    setState(() => _loading = true);
    final rows = await _service.fetchTickers(forceRefresh: forceRefresh);
    if (!mounted) {
      return;
    }
    setState(() {
      _rows = rows;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const SizedBox(
        height: 176,
        child: Center(
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: Color(0xFF3B82F6),
          ),
        ),
      );
    }

    if (_rows.isEmpty) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            top: -14,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                width: 34,
                height: 22,
                decoration: BoxDecoration(
                  color: const Color(0xFF0E131D),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: const Color(0xFF222D3E)),
                ),
                child: const Icon(
                  Icons.keyboard_arrow_up_rounded,
                  color: Colors.white70,
                  size: 18,
                ),
              ),
            ),
          ),
          Container(
            height: 164,
            decoration: BoxDecoration(
              color: const Color(0xFF0A0F16),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFF1B2434)),
            ),
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
                  child: Row(
                    children: const [
                      Text(
                        'Market Pulse',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 13.4,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Spacer(),
                      Text(
                        'Swipe the strip',
                        style: TextStyle(
                          color: Color(0xFF8A95A9),
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(10, 0, 10, 12),
                    scrollDirection: Axis.horizontal,
                    physics: const BouncingScrollPhysics(),
                    itemCount: _rows.length,
                    separatorBuilder: (_, __) => Container(
                      width: 1,
                      margin: const EdgeInsets.symmetric(vertical: 8),
                      color: const Color(0xFF182132),
                    ),
                    itemBuilder: (context, index) {
                      final row = _rows[index];
                      final isDown = row.changePercent < 0;
                      final color = isDown
                          ? const Color(0xFFFB4E63)
                          : const Color(0xFF37D39A);
                      return InkWell(
                        borderRadius: BorderRadius.circular(18),
                        onTap: () => widget.onTapSymbol(row.symbol),
                        child: Container(
                          width: 116,
                          padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                row.symbol,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 15.6,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                '${row.changePercent >= 0 ? '+' : ''}${row.changePercent.toStringAsFixed(1)}%',
                                style: TextStyle(
                                  color: color,
                                  fontSize: 13.2,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                _formatPrice(row.price),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 18.2,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const Spacer(),
                              SizedBox(
                                height: 42,
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
                ),
              ],
            ),
          ),
        ],
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
    if (points.length < 2) {
      return;
    }

    double minY = points.first;
    double maxY = points.first;
    for (final value in points) {
      if (value < minY) {
        minY = value;
      }
      if (value > maxY) {
        maxY = value;
      }
    }

    final dy = (maxY - minY).abs() < 0.000001 ? 1.0 : (maxY - minY);
    final stepX = size.width / (points.length - 1);

    final path = Path();
    final fillPath = Path();
    for (var i = 0; i < points.length; i++) {
      final x = i * stepX;
      final normalized = (points[i] - minY) / dy;
      final y = size.height - (normalized * (size.height - 4));
      if (i == 0) {
        path.moveTo(x, y);
        fillPath.moveTo(x, size.height);
        fillPath.lineTo(x, y);
      } else {
        path.lineTo(x, y);
        fillPath.lineTo(x, y);
      }
    }
    fillPath.lineTo(size.width, size.height);
    fillPath.close();

    final fillPaint = Paint()
      ..style = PaintingStyle.fill
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: <Color>[color.withOpacity(0.18), color.withOpacity(0.01)],
      ).createShader(Offset.zero & size);

    final strokePaint = Paint()
      ..style = PaintingStyle.stroke
      ..color = color
      ..strokeWidth = 2.2
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    canvas.drawPath(fillPath, fillPaint);
    canvas.drawPath(path, strokePaint);
  }

  @override
  bool shouldRepaint(covariant _SparklinePainter oldDelegate) {
    return oldDelegate.points != points || oldDelegate.color != color;
  }
}
