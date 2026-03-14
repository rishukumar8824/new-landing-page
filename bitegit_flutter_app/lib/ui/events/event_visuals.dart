import 'package:flutter/material.dart';

import 'event_models.dart';

class EventVisualSpec {
  const EventVisualSpec({
    required this.label,
    required this.action,
    required this.banner,
    required this.metric,
    required this.metricCaption,
    required this.icon,
    required this.palette,
    required this.tags,
    required this.detailPoints,
    required this.steps,
  });

  final String label;
  final String action;
  final String banner;
  final String metric;
  final String metricCaption;
  final IconData icon;
  final List<Color> palette;
  final List<String> tags;
  final List<String> detailPoints;
  final List<String> steps;
}

EventVisualSpec eventVisualSpecFor(ExchangeEvent event) {
  final lower = '${event.title} ${event.description}'.toLowerCase();
  final metric = _extractMetric(event);

  if (lower.contains('vip')) {
    return EventVisualSpec(
      label: 'VIP Spotlight',
      action: 'Check Elite Rewards',
      banner: 'Leaderboard-based rewards with premium campaign styling.',
      metric: metric,
      metricCaption: 'headline reward signal',
      icon: Icons.workspace_premium_rounded,
      palette: const <Color>[Color(0xFFF59E0B), Color(0xFFEAB308)],
      tags: const <String>['Elite', 'Leaderboard', 'Priority'],
      detailPoints: const <String>[
        'A stronger premium look keeps VIP campaigns visually separate from regular promos.',
        'Reward-focused labels and stat chips surface the headline offer quickly.',
        'Compact supporting badges make the card readable even while auto-rotating.',
      ],
      steps: const <String>[
        'Open the campaign and review the active VIP requirement.',
        'Check the visible reward tiers and leaderboard cues.',
        'Use the highlighted CTA to continue into the event flow.',
      ],
    );
  }

  if (lower.contains('airdrop') || lower.contains('lucky bag')) {
    return EventVisualSpec(
      label: 'Reward Drop',
      action: 'Open Reward Details',
      banner:
          'Reward cards benefit from richer graphics and stronger promo copy.',
      metric: metric,
      metricCaption: 'campaign reward hook',
      icon: Icons.card_giftcard_rounded,
      palette: const <Color>[Color(0xFF2368FF), Color(0xFF8B5CF6)],
      tags: const <String>['Airdrop', 'Limited', 'Fast Entry'],
      detailPoints: const <String>[
        'Large promo cards now highlight the reward story first, then the explanation.',
        'Badge rows help users identify whether the drop is limited, timed, or leaderboard-based.',
        'Tap targets stay broad so users can enter from anywhere on the card.',
      ],
      steps: const <String>[
        'Open the campaign card to see the expanded reward summary.',
        'Review the visible requirement chips and promo focus.',
        'Continue into the event path when you are ready to participate.',
      ],
    );
  }

  if (lower.contains('mint') ||
      lower.contains('earn') ||
      lower.contains('apr')) {
    return EventVisualSpec(
      label: 'Earn Flow',
      action: 'View Yield Details',
      banner:
          'Yield offers now surface the key return signal before the description.',
      metric: metric,
      metricCaption: 'estimated reward signal',
      icon: Icons.savings_rounded,
      palette: const <Color>[Color(0xFF0EA5E9), Color(0xFF22C55E)],
      tags: const <String>['APR', 'Yield', 'Flexible'],
      detailPoints: const <String>[
        'APR-style campaigns now expose the headline figure in the card footer.',
        'Soft gradients and lighter chips make earn content feel less dense.',
        'The detail view keeps the explanation structured instead of showing plain text only.',
      ],
      steps: const <String>[
        'Open the earn card to review the product summary.',
        'Check the visible return metric and the supporting notes.',
        'Move into the product flow from the action area once confirmed.',
      ],
    );
  }

  if (lower.contains('future') ||
      lower.contains('tradfi') ||
      lower.contains('trade')) {
    return EventVisualSpec(
      label: 'Trade Event',
      action: 'Open Trade Campaign',
      banner:
          'Trading campaigns use stronger hierarchy so the main reward is readable at a glance.',
      metric: metric,
      metricCaption: 'live campaign signal',
      icon: Icons.candlestick_chart_rounded,
      palette: const <Color>[Color(0xFF2563EB), Color(0xFF06B6D4)],
      tags: const <String>['Trade', 'Competition', 'Live'],
      detailPoints: const <String>[
        'The updated card layout mirrors exchange-style promo tiles with a stronger lead card.',
        'Users can swipe the full carousel while still tapping any individual campaign quickly.',
        'The detail page breaks the campaign into overview, highlights, and action flow.',
      ],
      steps: const <String>[
        'Swipe to the campaign and tap the card to open its dedicated view.',
        'Read the headline reward and the supporting campaign notes.',
        'Use the campaign CTA path once you are ready to continue.',
      ],
    );
  }

  if (lower.contains('ai') || lower.contains('alpha')) {
    return EventVisualSpec(
      label: 'Discovery',
      action: 'Explore Event',
      banner:
          'AI and discovery promos now use clearer accent tagging and compact summaries.',
      metric: metric,
      metricCaption: 'discovery signal',
      icon: Icons.auto_awesome_rounded,
      palette: const <Color>[Color(0xFF7C3AED), Color(0xFFEC4899)],
      tags: const <String>['AI', 'Discovery', 'Featured'],
      detailPoints: const <String>[
        'Discovery cards now feel more editorial and less like plain text blocks.',
        'A dedicated banner line helps these promos stand apart inside the carousel.',
        'The detail page keeps the same palette so users feel continuity after tapping.',
      ],
      steps: const <String>[
        'Open the discovery card to read the focused campaign summary.',
        'Scan the highlight pills and benefit notes.',
        'Continue through the event flow when you want more detail.',
      ],
    );
  }

  return EventVisualSpec(
    label: 'Featured Event',
    action: 'View Event',
    banner:
        'Featured cards now use clearer sizing, swiping, and content grouping.',
    metric: metric,
    metricCaption: 'highlighted event signal',
    icon: Icons.bolt_rounded,
    palette: const <Color>[Color(0xFF1D4ED8), Color(0xFF38BDF8)],
    tags: const <String>['Featured', 'Swipe', 'Details'],
    detailPoints: const <String>[
      'The pamphlet layout now follows a stronger left-focus composition like the reference screens.',
      'Each card reveals its own graphic treatment, tags, and CTA language.',
      'Users can move naturally with both auto-rotation and manual horizontal swiping.',
    ],
    steps: const <String>[
      'Swipe across the event deck to browse more promotions.',
      'Tap any pamphlet to open the structured detail page.',
      'Review the overview and highlight cards before continuing.',
    ],
  );
}

String _extractMetric(ExchangeEvent event) {
  final source = '${event.title} ${event.description}';

  final percent = RegExp(r'[+-]?\d+(?:\.\d+)?%').firstMatch(source)?.group(0);
  if (percent != null) {
    return percent;
  }

  final amount = RegExp(
    r'\$?\d[\d,]*(?:\.\d+)?\s?(?:USDT|GT|DOGE|BTC|ETH|SOL|PI|XAUT|USD)',
    caseSensitive: false,
  ).firstMatch(source)?.group(0);
  if (amount != null) {
    return amount.toUpperCase();
  }

  final duration = RegExp(
    r'\d+\s?(?:day|days|hour|hours)',
    caseSensitive: false,
  ).firstMatch(source)?.group(0);
  if (duration != null) {
    return duration.toUpperCase();
  }

  return 'LIVE NOW';
}
