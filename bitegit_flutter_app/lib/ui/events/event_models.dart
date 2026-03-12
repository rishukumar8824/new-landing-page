class ExchangeEvent {
  const ExchangeEvent({
    required this.id,
    required this.title,
    required this.description,
    required this.image,
    required this.link,
  });

  final String id;
  final String title;
  final String description;
  final String image;
  final String link;

  factory ExchangeEvent.fromMap(Map<String, dynamic> map, {required int index}) {
    final id = (map['id'] ?? '').toString().trim();
    return ExchangeEvent(
      id: id.isEmpty ? 'event_$index' : id,
      title: (map['title'] ?? 'Untitled event').toString().trim(),
      description: (map['description'] ?? '').toString().trim(),
      image: (map['image'] ?? map['imageUrl'] ?? '').toString().trim(),
      link: (map['link'] ?? '/events/$index').toString().trim(),
    );
  }
}
