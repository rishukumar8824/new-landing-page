import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ExchangeFeatureItem {
  const ExchangeFeatureItem({
    required this.id,
    required this.title,
    required this.icon,
    required this.section,
  });

  final String id;
  final String title;
  final IconData icon;
  final String section;
}

class MoreFeaturesPage extends StatefulWidget {
  const MoreFeaturesPage({super.key});

  @override
  State<MoreFeaturesPage> createState() => _MoreFeaturesPageState();
}

class _MoreFeaturesPageState extends State<MoreFeaturesPage> {
  static const String _favoritesKey = 'gate_more_favorites_v1';
  static const List<String> _sections = <String>[
    'Quick Access',
    'Popular',
    'Assets',
    'Activities',
    'Trade',
    'Earn',
  ];

  static const List<ExchangeFeatureItem> _allItems = <ExchangeFeatureItem>[
    ExchangeFeatureItem(id: 'launchpool', title: 'Launchpool', icon: Icons.rocket_launch_outlined, section: 'Popular'),
    ExchangeFeatureItem(id: 'p2p', title: 'P2P', icon: Icons.people_alt_outlined, section: 'Popular'),
    ExchangeFeatureItem(id: 'deposit', title: 'Deposit', icon: Icons.download_rounded, section: 'Assets'),
    ExchangeFeatureItem(id: 'buy_crypto', title: 'Buy Crypto', icon: Icons.credit_card_outlined, section: 'Popular'),
    ExchangeFeatureItem(id: 'convert', title: 'Convert', icon: Icons.swap_horiz_rounded, section: 'Trade'),
    ExchangeFeatureItem(id: 'futures', title: 'Futures', icon: Icons.candlestick_chart_rounded, section: 'Trade'),
    ExchangeFeatureItem(id: 'bots', title: 'Bots', icon: Icons.smart_toy_outlined, section: 'Trade'),
    ExchangeFeatureItem(id: 'copy_trading', title: 'Copy Trading', icon: Icons.copy_all_rounded, section: 'Trade'),
    ExchangeFeatureItem(id: 'withdraw', title: 'Withdraw', icon: Icons.upload_rounded, section: 'Assets'),
    ExchangeFeatureItem(id: 'gift', title: 'Gift Coins', icon: Icons.card_giftcard_rounded, section: 'Activities'),
    ExchangeFeatureItem(id: 'referral', title: 'Referral', icon: Icons.group_add_outlined, section: 'Activities'),
    ExchangeFeatureItem(id: 'airdrop', title: 'Airdrop', icon: Icons.card_membership_rounded, section: 'Activities'),
    ExchangeFeatureItem(id: 'simple_earn', title: 'Simple Earn', icon: Icons.account_balance_wallet_outlined, section: 'Earn'),
    ExchangeFeatureItem(id: 'staking', title: 'Staking', icon: Icons.savings_outlined, section: 'Earn'),
    ExchangeFeatureItem(id: 'dual_invest', title: 'Dual Invest', icon: Icons.auto_graph_rounded, section: 'Earn'),
  ];

  String _activeSection = 'Popular';
  List<String> _favoriteIds = const ['launchpool', 'p2p', 'deposit'];

  @override
  void initState() {
    super.initState();
    _loadFavorites();
  }

  Future<void> _loadFavorites() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getStringList(_favoritesKey);
    if (!mounted || stored == null || stored.isEmpty) return;
    setState(() => _favoriteIds = stored);
  }

  Future<void> _saveFavorites(List<String> values) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_favoritesKey, values);
  }

  Future<void> _openEditFavorites() async {
    final temp = _favoriteIds.toSet();
    final result = await showModalBottomSheet<List<String>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0C121A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModal) {
            return SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 18),
                child: SizedBox(
                  height: MediaQuery.of(context).size.height * 0.76,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Center(
                        child: Text(
                          'Edit Quick Access',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 19,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      const Text(
                        'Select shortcuts shown in Quick Access',
                        style: TextStyle(color: Colors.white54, fontSize: 13),
                      ),
                      const SizedBox(height: 10),
                      Expanded(
                        child: ListView.builder(
                          itemCount: _allItems.length,
                          itemBuilder: (context, index) {
                            final item = _allItems[index];
                            final checked = temp.contains(item.id);
                            return CheckboxListTile(
                              value: checked,
                              onChanged: (value) {
                                setModal(() {
                                  if (value == true) {
                                    temp.add(item.id);
                                  } else {
                                    temp.remove(item.id);
                                  }
                                });
                              },
                              activeColor: const Color(0xFF377DFF),
                              title: Text(
                                item.title,
                                style: const TextStyle(color: Colors.white),
                              ),
                              subtitle: Text(
                                item.section,
                                style: const TextStyle(color: Colors.white54),
                              ),
                              secondary: Icon(item.icon, color: Colors.white70),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: () => Navigator.of(context).pop(temp.toList()),
                          style: FilledButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: const Color(0xFF101722),
                            minimumSize: const Size.fromHeight(48),
                          ),
                          child: const Text('Save'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );

    if (result == null || result.isEmpty) return;
    final unique = result.toSet().toList(growable: false);
    if (!mounted) return;
    setState(() => _favoriteIds = unique);
    await _saveFavorites(unique);
  }

  @override
  Widget build(BuildContext context) {
    final sectionItems = _allItems
        .where((item) => item.section == _activeSection)
        .toList(growable: false);
    final favoriteItems = _allItems
        .where((item) => _favoriteIds.contains(item.id))
        .toList(growable: false);

    return Scaffold(
      backgroundColor: const Color(0xFF05070B),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Quick Access'),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 14),
            child: Icon(Icons.settings),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(14, 6, 14, 16),
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
            decoration: BoxDecoration(
              color: const Color(0xFF0B1018),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF1F293B)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Wrap(
                    spacing: 14,
                    runSpacing: 10,
                    children: favoriteItems.map((item) {
                      return Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(item.icon, color: const Color(0xFF2E7BFF), size: 25),
                          const SizedBox(height: 4),
                          Text(
                            item.title,
                            style: const TextStyle(color: Colors.white, fontSize: 12),
                          ),
                        ],
                      );
                    }).toList(growable: false),
                  ),
                ),
                FilledButton(
                  onPressed: _openEditFavorites,
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(0xFF111827),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                  ),
                  child: const Text('Edit'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            height: 36,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _sections.length,
              separatorBuilder: (_, separatorIndex) => const SizedBox(width: 16),
              itemBuilder: (context, index) {
                final section = _sections[index];
                final active = section == _activeSection;
                return InkWell(
                  onTap: () => setState(() => _activeSection = section),
                  child: Column(
                    children: [
                      Text(
                        section,
                        style: TextStyle(
                          color: active ? Colors.white : Colors.white54,
                          fontSize: 17,
                          fontWeight: active ? FontWeight.w700 : FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 5),
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        width: 30,
                        height: 3,
                        decoration: BoxDecoration(
                          color: active ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(20),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 10),
          _SectionGrid(title: _activeSection, items: sectionItems),
        ],
      ),
    );
  }
}

class _SectionGrid extends StatelessWidget {
  const _SectionGrid({required this.title, required this.items});

  final String title;
  final List<ExchangeFeatureItem> items;

  @override
  Widget build(BuildContext context) {
    final rows = items;
    return Container(
      padding: const EdgeInsets.fromLTRB(8, 8, 8, 8),
      decoration: BoxDecoration(
        color: const Color(0xFF05070B),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24 / 1.2,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: rows.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 4,
              childAspectRatio: 0.86,
              mainAxisSpacing: 12,
              crossAxisSpacing: 8,
            ),
            itemBuilder: (context, index) {
              final row = rows[index];
              return Column(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: const Color(0xFF0D131D),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFF202A3B)),
                    ),
                    child: Icon(row.icon, color: const Color(0xFF2E7BFF), size: 26),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    row.title,
                    maxLines: 2,
                    textAlign: TextAlign.center,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white, fontSize: 12.2),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}
