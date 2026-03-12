import 'package:flutter/material.dart';

class GateBalanceSection extends StatelessWidget {
  const GateBalanceSection({
    super.key,
    required this.totalAssets,
    required this.pnlText,
    required this.onDeposit,
    required this.onP2P,
  });

  final double totalAssets;
  final String pnlText;
  final VoidCallback onDeposit;
  final VoidCallback onP2P;

  @override
  Widget build(BuildContext context) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final primary = isLight ? const Color(0xFF111827) : Colors.white;
    final secondary = isLight ? const Color(0xFF5D687E) : Colors.white60;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'Total Assets',
              style: TextStyle(
                color: secondary,
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(width: 6),
            Icon(Icons.remove_red_eye_outlined, size: 19, color: secondary),
            const Spacer(),
            _pillButton('Deposit', onDeposit),
            const SizedBox(width: 10),
            _pillButton('P2P', onP2P),
          ],
        ),
        const SizedBox(height: 6),
        RichText(
          text: TextSpan(
            children: [
              TextSpan(
                text: totalAssets.toStringAsFixed(2),
                style: TextStyle(
                  fontSize: 56 / 1.6,
                  fontWeight: FontWeight.w800,
                  color: primary,
                ),
              ),
              TextSpan(
                text: ' USD',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: primary,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 3),
        Text(
          "Today's PnL  $pnlText",
          style: TextStyle(
            color: secondary,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _pillButton(String label, VoidCallback onTap) {
    return FilledButton(
      onPressed: onTap,
      style: FilledButton.styleFrom(
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF121620),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 13),
      ),
      child: Text(
        label,
        style: const TextStyle(fontSize: 18 / 1.2, fontWeight: FontWeight.w800),
      ),
    );
  }
}
