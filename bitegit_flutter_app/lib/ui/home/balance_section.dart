import 'package:flutter/material.dart';

class GateBalanceSection extends StatelessWidget {
  const GateBalanceSection({
    super.key,
    required this.totalAssets,
    required this.hiddenAssets,
    required this.pnlText,
    required this.onToggleVisibility,
    required this.onDeposit,
    required this.onP2P,
  });

  final double totalAssets;
  final bool hiddenAssets;
  final String pnlText;
  final VoidCallback onToggleVisibility;
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
            InkWell(
              borderRadius: BorderRadius.circular(20),
              onTap: onToggleVisibility,
              child: Padding(
                padding: const EdgeInsets.all(3),
                child: Icon(
                  hiddenAssets
                      ? Icons.visibility_off_outlined
                      : Icons.remove_red_eye_outlined,
                  size: 19,
                  color: secondary,
                ),
              ),
            ),
            const Spacer(),
            _depositButton(onDeposit),
            const SizedBox(width: 10),
            _p2pButton(onP2P),
          ],
        ),
        const SizedBox(height: 6),
        RichText(
          text: TextSpan(
            children: [
              TextSpan(
                text: hiddenAssets ? '******' : totalAssets.toStringAsFixed(2),
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

  Widget _depositButton(VoidCallback onTap) {
    return FilledButton(
      onPressed: onTap,
      style: FilledButton.styleFrom(
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF121620),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 13),
      ),
      child: const Text(
        'Deposit',
        style: TextStyle(fontSize: 18 / 1.2, fontWeight: FontWeight.w800),
      ),
    );
  }

  Widget _p2pButton(VoidCallback onTap) {
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: const Color(0x26FFFFFF), width: 0.9),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1AFFFFFF),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: FilledButton(
        onPressed: onTap,
        style: FilledButton.styleFrom(
          elevation: 0,
          backgroundColor: const Color(0xFFF3F5F9),
          foregroundColor: const Color(0xFF121620),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(30),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 13),
        ),
        child: const Text(
          'P2P',
          style: TextStyle(fontSize: 18 / 1.2, fontWeight: FontWeight.w800),
        ),
      ),
    );
  }
}
