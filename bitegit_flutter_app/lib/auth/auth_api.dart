import 'dart:convert';
import 'dart:io';

class GeetestValidatePayload {
  const GeetestValidatePayload({
    required this.lotNumber,
    required this.captchaOutput,
    required this.passToken,
    required this.genTime,
  });

  final String lotNumber;
  final String captchaOutput;
  final String passToken;
  final String genTime;

  Map<String, String> toJson() {
    return {
      'lot_number': lotNumber,
      'captcha_output': captchaOutput,
      'pass_token': passToken,
      'gen_time': genTime,
    };
  }
}

class OtpSendResult {
  const OtpSendResult({required this.success, required this.message});

  final bool success;
  final String message;
}

class OtpVerifyResult {
  const OtpVerifyResult({
    required this.success,
    required this.message,
    this.accessToken,
    this.refreshToken,
    this.userId,
    this.email,
    this.kycStatus,
  });

  final bool success;
  final String message;
  final String? accessToken;
  final String? refreshToken;
  final String? userId;
  final String? email;
  final String? kycStatus;
}

class AuthApiService {
  static List<String> _baseUrls() {
    final fromEnv = _normalizeBase(
      const String.fromEnvironment('BITEGIT_API_BASE', defaultValue: ''),
    );
    const defaults = <String>['https://www.bitegit.com', 'https://bitegit.com'];

    final ordered = <String>[if (fromEnv.isNotEmpty) fromEnv, ...defaults];

    final unique = <String>[];
    for (final base in ordered) {
      if (base.isEmpty || unique.contains(base)) {
        continue;
      }
      unique.add(base);
    }
    return unique;
  }

  static String _normalizeBase(String raw) {
    final normalized = raw.trim();
    if (normalized.isEmpty) {
      return '';
    }
    if (normalized.endsWith('/')) {
      return normalized.substring(0, normalized.length - 1);
    }
    return normalized;
  }

  static Uri _uri(String base, String path) => Uri.parse('$base$path');

  static bool _is2xx(int statusCode) => statusCode >= 200 && statusCode < 300;

  static bool _isExplicitFailure(Map<String, dynamic>? map) {
    if (map == null) {
      return false;
    }
    if (map['success'] == false) {
      return true;
    }
    final status = (map['status'] ?? '').toString().trim().toLowerCase();
    return status == 'error' || status == 'failed' || status == 'failure';
  }

  static bool _looksSuccessful(_HttpJsonResponse response) {
    return _is2xx(response.statusCode) && !_isExplicitFailure(response.bodyMap);
  }

  static String _messageFrom(_HttpJsonResponse response, String fallback) {
    final message = (response.bodyMap?['message'] ?? '').toString().trim();
    if (message.isNotEmpty) {
      return message;
    }
    return fallback;
  }

  static Future<OtpSendResult> sendOtp({
    required String email,
    required GeetestValidatePayload geetest,
    String? referralCode,
  }) async {
    final normalizedEmail = email.trim().toLowerCase();
    final referral = (referralCode ?? '').toString().trim();
    final baseUrls = _baseUrls();

    final payload = <String, dynamic>{
      'email': normalizedEmail,
      'referralCode': referral,
      'geetest': geetest.toJson(),
    };

    String firstFailureMessage = '';
    for (final base in baseUrls) {
      final response = await _postJson(_uri(base, '/auth/send-otp'), payload);
      if (_looksSuccessful(response)) {
        return OtpSendResult(
          success: true,
          message: _messageFrom(
            response,
            'Verification code sent to your email.',
          ),
        );
      }
      if (firstFailureMessage.isEmpty) {
        firstFailureMessage = _messageFrom(response, '');
      }
    }

    return OtpSendResult(
      success: false,
      message: firstFailureMessage.isNotEmpty
          ? firstFailureMessage
          : 'Unable to send verification code. Please try again.',
    );
  }

  static Future<OtpVerifyResult> verifyOtp({
    required String email,
    required String otp,
  }) async {
    final normalizedEmail = email.trim().toLowerCase();
    final trimmedOtp = otp.trim();
    final baseUrls = _baseUrls();

    String firstFailureMessage = '';

    for (final base in baseUrls) {
      final response = await _postJson(
        _uri(base, '/auth/verify-otp'),
        <String, dynamic>{'email': normalizedEmail, 'otp': trimmedOtp},
      );
      if (_looksSuccessful(response)) {
        final user = response.bodyMap?['user'];
        final userMap = user is Map<String, dynamic> ? user : const <String, dynamic>{};
        final accessToken =
            (response.bodyMap?['accessToken'] ??
                    response.bodyMap?['token'] ??
                    '')
                .toString();
        final refreshToken = (response.bodyMap?['refreshToken'] ?? '')
            .toString();
        return OtpVerifyResult(
          success: true,
          message: _messageFrom(response, 'Authentication successful.'),
          accessToken: accessToken,
          refreshToken: refreshToken,
          userId: (userMap['id'] ?? userMap['userId'] ?? '').toString().trim(),
          email: (userMap['email'] ?? normalizedEmail).toString().trim().toLowerCase(),
          kycStatus: (userMap['kycStatus'] ?? '').toString().trim().toLowerCase(),
        );
      }
      if (firstFailureMessage.isEmpty) {
        firstFailureMessage = _messageFrom(response, '');
      }
    }

    return OtpVerifyResult(
      success: false,
      message: firstFailureMessage.isNotEmpty
          ? firstFailureMessage
          : 'OTP verification failed.',
    );
  }

  static Future<String> resolveGeetestCaptchaId() async {
    for (final base in _baseUrls()) {
      final response = await _getJson(_uri(base, '/auth/geetest/config'));
      if (!_looksSuccessful(response)) {
        continue;
      }

      final geetest = response.bodyMap?['geetest'];
      if (geetest is! Map<String, dynamic>) {
        continue;
      }

      final captchaId = (geetest['captchaId'] ?? '').toString().trim();
      if (captchaId.isEmpty) {
        continue;
      }

      final configuredFlag = geetest['isConfigured'];
      final isConfigured = configuredFlag == null || configuredFlag == true;
      if (isConfigured) {
        return captchaId;
      }
    }

    return '';
  }

  static Future<_HttpJsonResponse> _getJson(Uri uri) async {
    final client = HttpClient()
      ..connectionTimeout = const Duration(seconds: 12);

    try {
      final req = await client.getUrl(uri);
      req.followRedirects = false;
      final resp = await req.close();
      final body = await resp.transform(utf8.decoder).join();

      Map<String, dynamic>? decodedMap;
      try {
        final decoded = jsonDecode(body);
        if (decoded is Map<String, dynamic>) {
          decodedMap = decoded;
        }
      } catch (_) {
        decodedMap = null;
      }

      return _HttpJsonResponse(
        statusCode: resp.statusCode,
        bodyMap: decodedMap,
      );
    } catch (error) {
      return _HttpJsonResponse(
        statusCode: 0,
        bodyMap: <String, dynamic>{
          'success': false,
          'message': 'Network error while reaching auth server.',
          'error': error.toString(),
        },
      );
    } finally {
      client.close(force: true);
    }
  }

  static Future<_HttpJsonResponse> _postJson(
    Uri uri,
    Map<String, dynamic> payload,
  ) async {
    final client = HttpClient()
      ..connectionTimeout = const Duration(seconds: 12);

    try {
      final req = await client.postUrl(uri);
      req.followRedirects = false;
      req.headers.contentType = ContentType.json;
      req.add(utf8.encode(jsonEncode(payload)));
      final resp = await req.close();
      final body = await resp.transform(utf8.decoder).join();

      Map<String, dynamic>? decodedMap;
      try {
        final decoded = jsonDecode(body);
        if (decoded is Map<String, dynamic>) {
          decodedMap = decoded;
        }
      } catch (_) {
        decodedMap = null;
      }

      return _HttpJsonResponse(
        statusCode: resp.statusCode,
        bodyMap: decodedMap,
      );
    } catch (error) {
      return _HttpJsonResponse(
        statusCode: 0,
        bodyMap: <String, dynamic>{
          'success': false,
          'message': 'Network error while reaching auth server.',
          'error': error.toString(),
        },
      );
    } finally {
      client.close(force: true);
    }
  }
}

class _HttpJsonResponse {
  const _HttpJsonResponse({required this.statusCode, required this.bodyMap});

  final int statusCode;
  final Map<String, dynamic>? bodyMap;
}
