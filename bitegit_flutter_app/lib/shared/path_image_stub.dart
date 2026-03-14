import 'package:flutter/widgets.dart';

ImageProvider<Object>? imageProviderForPath(String path) => null;

Widget imageWidgetForPath(
  String path, {
  double? width,
  double? height,
  BoxFit fit = BoxFit.cover,
  Widget? fallback,
  ImageErrorWidgetBuilder? errorBuilder,
}) {
  return fallback ?? const SizedBox.shrink();
}
