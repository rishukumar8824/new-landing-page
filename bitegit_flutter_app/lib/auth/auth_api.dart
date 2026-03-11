import 'dart:convert';
import 'dart:io';

class GeetestValidatePayload {
  const GeetestValidatePayload.geetest({
    required this.lotNumber,
    required this.captchaOutput,
    required this.passToken,
    required this.genTime,
  }) : fallbackType = '',
       challengeId = '',
       position = 0,
       token = '';

  const GeetestValidatePayload.slider({
    required this.challengeId,
    required this.position,
    required this.token,
  }) : fallbackType = 'slider',
       lotNumber = '',
       captchaOutput = '',
       passToken = '',
       genTime = '';

  const GeetestValidatePayload.offlineSlider({required this.position})
    : fallbackType = 'slider_local',
      lotNumber = '',
      captchaOutput = '',
      passToken = '',
      genTime = '',
      challengeId = '',
      token = '';

  final String lotNumber;
  final String captchaOutput;
  final String passToken;
  final String genTime;

  final String fallbackType;
  final String challengeId;
  final int position;
  final String token;

  Map<String, dynamic> toJson() {
    if (fallbackType == 'slider') {
      return {
        'fallback_type': 'slider',
        'challenge_id': challengeId,
        'position': position,
        'token': token,
      };
    }

    if (fallbackType == 'slider_local') {
      return {'fallback_type': 'slider_local', 'position': position};
    }

    return {
      'lot_number': lotNumber,
      'captcha_output': captchaOutput,
      'pass_token': passToken,
      'gen_time': genTime,
    };
  }
}

class GeetestRuntimeConfig {
  const GeetestRuntimeConfig({
    required this.captchaId,
    required this.isConfigured,
    required this.sliderFallbackEnabled,
  });

  final String captchaId;
  final bool isConfigured;
  final bool sliderFallbackEnabled;
}

class SliderCaptchaChallenge {
  const SliderCaptchaChallenge({
    required this.challengeId,
    required this.token,
    required this.minPosition,
    required this.maxPosition,
    required this.targetPosition,
    required this.tolerance,
  });

  final String challengeId;
  final String token;
  final int minPosition;
  final int maxPosition;
  final int targetPosition;
  final int tolerance;
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

  static int _toInt(dynamic value, int fallback) {
    if (value is int) {
      return value;
    }
    final parsed = int.tryParse(value?.toString() ?? '');
    return parsed ?? fallback;
  }

  static bool _toBool(dynamic value, bool fallback) {
    if (value is bool) {
      return value;
    }
    final normalized = (value ?? '').toString().trim().toLowerCase();
    if (normalized == 'true' || normalized == '1' || normalized == 'yes') {
      return true;
    }
    if (normalized == 'false' || normalized == '0' || normalized == 'no') {
      return false;
    }
    return fallback;
  }

  static String _buildOtpFallbackPassword(String email) {
    final compact = email.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '').toLowerCase();
    final seed = '${compact}bitegitotp'.padRight(10, '0');
    return 'Btg@${seed.substring(0, 10)}#26';
  }

  static OtpVerifyResult _buildVerifySuccess(
    _HttpJsonResponse response,
    String normalizedEmail,
  ) {
    final user = response.bodyMap?['user'];
    final userMap = user is Map<String, dynamic>
        ? user
        : const <String, dynamic>{};
    final accessToken =
        (response.bodyMap?['accessToken'] ?? response.bodyMap?['token'] ?? '')
            .toString();
    final refreshToken = (response.bodyMap?['refreshToken'] ?? '').toString();
    return OtpVerifyResult(
      success: true,
      message: _messageFrom(response, 'Authentication successful.'),
      accessToken: accessToken,
      refreshToken: refreshToken,
      userId: (userMap['id'] ?? userMap['userId'] ?? '').toString().trim(),
      email: (userMap['email'] ?? normalizedEmail)
          .toString()
          .trim()
          .toLowerCase(),
      kycStatus: (userMap['kycStatus'] ?? '').toString().trim().toLowerCase(),
    );
  }

  static Future<OtpSendResult> sendOtp({
    required String email,
    required GeetestValidatePayload geetest,
    String? referralCode,
  }) async {
    final normalizedEmail = email.trim().toLowerCase();
    final referral = (referralCode ?? '').toString().trim();
    final baseUrls = _baseUrls();

    final requests = <Map<String, dynamic>>[
      {
        'path': '/auth/send-otp',
        'payload': <String, dynamic>{
          'email': normalizedEmail,
          'referralCode': referral,
          'geetest': geetest.toJson(),
        },
      },
      {
        'path': '/auth/signup/send-otp',
        'payload': <String, dynamic>{'email': normalizedEmail},
      },
      {
        'path': '/api/signup/send-code',
        'payload': <String, dynamic>{'contact': normalizedEmail},
      },
    ];

    String firstFailureMessage = '';

    for (final base in baseUrls) {
      for (final request in requests) {
        final response = await _postJson(
          _uri(base, request['path'].toString()),
          request['payload'] as Map<String, dynamic>,
        );

        if (_looksSuccessful(response)) {
          return OtpSendResult(
            success: true,
            message: _messageFrom(
              response,
              'Verification code sent to your email.',
            ),
          );
        }

        final status = response.statusCode;
        if (status == 404 || status == 405) {
          continue;
        }

        if (firstFailureMessage.isEmpty) {
          firstFailureMessage = _messageFrom(response, '');
        }
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
    final fallbackPassword = _buildOtpFallbackPassword(normalizedEmail);

    String firstFailureMessage = '';

    for (final base in baseUrls) {
      final primaryResponse = await _postJson(
        _uri(base, '/auth/verify-otp'),
        <String, dynamic>{'email': normalizedEmail, 'otp': trimmedOtp},
      );
      if (_looksSuccessful(primaryResponse)) {
        return _buildVerifySuccess(primaryResponse, normalizedEmail);
      }
      if (primaryResponse.statusCode != 404 && firstFailureMessage.isEmpty) {
        firstFailureMessage = _messageFrom(primaryResponse, '');
      }

      final registerResponse = await _postJson(
        _uri(base, '/auth/register'),
        <String, dynamic>{
          'email': normalizedEmail,
          'password': fallbackPassword,
          'otpCode': trimmedOtp,
        },
      );
      if (_looksSuccessful(registerResponse)) {
        return _buildVerifySuccess(registerResponse, normalizedEmail);
      }

      final registerMessage = _messageFrom(registerResponse, '');
      final shouldTryLogin =
          registerResponse.statusCode == 409 ||
          registerMessage.toLowerCase().contains('already exists');

      if (shouldTryLogin) {
        final loginResponse = await _postJson(
          _uri(base, '/auth/login'),
          <String, dynamic>{
            'email': normalizedEmail,
            'password': fallbackPassword,
          },
        );

        if (_looksSuccessful(loginResponse)) {
          return _buildVerifySuccess(loginResponse, normalizedEmail);
        }

        if (firstFailureMessage.isEmpty) {
          firstFailureMessage = _messageFrom(loginResponse, '');
        }
      } else if (firstFailureMessage.isEmpty) {
        firstFailureMessage = registerMessage;
      }
    }

    return OtpVerifyResult(
      success: false,
      message: firstFailureMessage.isNotEmpty
          ? firstFailureMessage
          : 'OTP verification failed.',
    );
  }

  static Future<GeetestRuntimeConfig> resolveCaptchaRuntimeConfig() async {
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
      final isConfigured = _toBool(geetest['isConfigured'], false);
      final sliderFallbackEnabled = _toBool(
        geetest['sliderFallbackEnabled'],
        true,
      );

      return GeetestRuntimeConfig(
        captchaId: captchaId,
        isConfigured: isConfigured,
        sliderFallbackEnabled: sliderFallbackEnabled,
      );
    }

    return const GeetestRuntimeConfig(
      captchaId: '',
      isConfigured: false,
      sliderFallbackEnabled: true,
    );
  }

  static Future<String> resolveGeetestCaptchaId() async {
    final runtime = await resolveCaptchaRuntimeConfig();
    if (!runtime.isConfigured) {
      return '';
    }
    return runtime.captchaId;
  }

  static Future<SliderCaptchaChallenge?> startSliderCaptcha({
    String? email,
  }) async {
    final normalizedEmail = (email ?? '').trim().toLowerCase();

    for (final base in _baseUrls()) {
      final response = await _postJson(
        _uri(base, '/auth/captcha/slider/start'),
        <String, dynamic>{'email': normalizedEmail},
      );
      if (!_looksSuccessful(response)) {
        continue;
      }

      final captcha = response.bodyMap?['captcha'];
      if (captcha is! Map<String, dynamic>) {
        continue;
      }

      final challengeId = (captcha['challengeId'] ?? '').toString().trim();
      final token = (captcha['token'] ?? '').toString().trim();

      if (challengeId.isEmpty || token.isEmpty) {
        continue;
      }

      return SliderCaptchaChallenge(
        challengeId: challengeId,
        token: token,
        minPosition: _toInt(captcha['minPosition'], 0),
        maxPosition: _toInt(captcha['maxPosition'], 100),
        targetPosition: _toInt(captcha['targetPosition'], 50),
        tolerance: _toInt(captcha['tolerance'], 4),
      );
    }

    return null;
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
