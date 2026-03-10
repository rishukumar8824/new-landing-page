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
  });

  final bool success;
  final String message;
  final String? accessToken;
  final String? refreshToken;
}

class AuthApiService {
  static final Uri _sendOtpUri = Uri.parse('${_baseUrl()}/auth/send-otp');
  static final Uri _verifyOtpUri = Uri.parse('${_baseUrl()}/auth/verify-otp');
  static final Uri _geetestConfigUri = Uri.parse(
    '${_baseUrl()}/auth/geetest/config',
  );

  static String _baseUrl() {
    final fromEnv = const String.fromEnvironment(
      'BITEGIT_API_BASE',
      defaultValue: 'https://bitegit.com',
    ).trim();
    return fromEnv.endsWith('/')
        ? fromEnv.substring(0, fromEnv.length - 1)
        : fromEnv;
  }

  static Uri _uri(String path) => Uri.parse('${_baseUrl()}$path');

  static List<Uri> _legacySendOtpUris() => <Uri>[
    _uri('/api/signup/send-code'),
    _uri('/auth/signup/send-otp'),
    _uri('/api/auth/otp/request'),
  ];

  static List<Uri> _legacyVerifyOtpUris() => <Uri>[
    _uri('/api/signup/verify-code'),
    _uri('/api/auth/otp/verify'),
  ];

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
    return (response.bodyMap?['message'] ?? fallback).toString();
  }

  static Future<OtpSendResult> sendOtp({
    required String email,
    required GeetestValidatePayload geetest,
    String? referralCode,
  }) async {
    final normalizedEmail = email.trim().toLowerCase();
    final referral = (referralCode ?? '').toString().trim();

    final payload = <String, dynamic>{
      'email': normalizedEmail,
      'referralCode': referral,
      'geetest': geetest.toJson(),
    };

    final primary = await _postJson(_sendOtpUri, payload);
    if (_looksSuccessful(primary)) {
      return OtpSendResult(
        success: true,
        message: _messageFrom(primary, 'Verification code sent to your email.'),
      );
    }

    for (final uri in _legacySendOtpUris()) {
      final fallbackResponse = await _postJson(uri, <String, dynamic>{
        'contact': normalizedEmail,
        'identity': normalizedEmail,
        'email': normalizedEmail,
        'channel': 'email',
        if (referral.isNotEmpty) 'referralCode': referral,
      });
      if (_looksSuccessful(fallbackResponse)) {
        return OtpSendResult(
          success: true,
          message: _messageFrom(
            fallbackResponse,
            'Verification code sent to your email.',
          ),
        );
      }
    }

    return OtpSendResult(
      success: false,
      message: _messageFrom(
        primary,
        'Unable to send verification code. Please try again.',
      ),
    );
  }

  static Future<OtpVerifyResult> verifyOtp({
    required String email,
    required String otp,
  }) async {
    final normalizedEmail = email.trim().toLowerCase();
    final trimmedOtp = otp.trim();

    final payload = <String, dynamic>{
      'email': normalizedEmail,
      'otp': trimmedOtp,
    };

    final primary = await _postJson(_verifyOtpUri, payload);
    if (_looksSuccessful(primary)) {
      final accessToken =
          (primary.bodyMap?['accessToken'] ?? primary.bodyMap?['token'] ?? '')
              .toString();
      final refreshToken = (primary.bodyMap?['refreshToken'] ?? '').toString();
      return OtpVerifyResult(
        success: true,
        message: _messageFrom(primary, 'Authentication successful.'),
        accessToken: accessToken,
        refreshToken: refreshToken,
      );
    }

    for (final uri in _legacyVerifyOtpUris()) {
      final fallbackResponse = await _postJson(uri, <String, dynamic>{
        'contact': normalizedEmail,
        'identity': normalizedEmail,
        'email': normalizedEmail,
        'otp': trimmedOtp,
        'code': trimmedOtp,
      });
      if (_looksSuccessful(fallbackResponse)) {
        final accessToken =
            (fallbackResponse.bodyMap?['accessToken'] ??
                    fallbackResponse.bodyMap?['token'] ??
                    fallbackResponse.bodyMap?['jwt'] ??
                    'legacy-${DateTime.now().millisecondsSinceEpoch}')
                .toString();
        final refreshToken = (fallbackResponse.bodyMap?['refreshToken'] ?? '')
            .toString();
        return OtpVerifyResult(
          success: true,
          message: _messageFrom(fallbackResponse, 'Authentication successful.'),
          accessToken: accessToken,
          refreshToken: refreshToken,
        );
      }
    }

    return OtpVerifyResult(
      success: false,
      message: _messageFrom(primary, 'OTP verification failed.'),
    );
  }

  static Future<String> resolveGeetestCaptchaId() async {
    final client = HttpClient()
      ..connectionTimeout = const Duration(seconds: 12);
    try {
      final req = await client.getUrl(_geetestConfigUri);
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

      if (resp.statusCode < 200 || resp.statusCode >= 300) {
        return '';
      }
      final geetest = decodedMap?['geetest'];
      if (geetest is! Map<String, dynamic>) {
        return '';
      }
      final isConfigured = geetest['isConfigured'] == true;
      final captchaId = (geetest['captchaId'] ?? '').toString().trim();
      if (!isConfigured) {
        return '';
      }
      return captchaId;
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
