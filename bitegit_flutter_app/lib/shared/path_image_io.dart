import 'dart:io';

import 'package:flutter/widgets.dart';

ImageProvider<Object>? imageProviderForPath(String path) {
  final normalized = path.trim();
  if (normalized.isEmpty) {
    return null;
  }

  final file = File(normalized);
  if (!file.existsSync()) {
    return null;
  }

  return FileImage(file);
}

Widget imageWidgetForPath(
  String path, {
  double? width,
  double? height,
  BoxFit fit = BoxFit.cover,
  Widget? fallback,
  ImageErrorWidgetBuilder? errorBuilder,
}) {
  final normalized = path.trim();
  if (normalized.isEmpty) {
    return fallback ?? const SizedBox.shrink();
  }

  final file = File(normalized);
  if (!file.existsSync()) {
    return fallback ?? const SizedBox.shrink();
  }

  return Image.file(
    file,
    width: width,
    height: height,
    fit: fit,
    errorBuilder:
        errorBuilder ?? (_, __, ___) => fallback ?? const SizedBox.shrink(),
  );
}
