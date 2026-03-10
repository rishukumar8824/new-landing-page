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

  static Future<OtpSendResult> sendOtp({
    required String email,
    required GeetestValidatePayload geetest,
    String? referralCode,
  }) async {
    final payload = <String, dynamic>{
      'email': email.trim().toLowerCase(),
      'referralCode': (referralCode ?? '').toString().trim(),
      'geetest': geetest.toJson(),
    };

    final response = await _postJson(_sendOtpUri, payload);
    final ok = response.statusCode >= 200 && response.statusCode < 300;
    final message =
        (response.bodyMap?['message'] ?? 'Unable to send verification code.')
            .toString();

    return OtpSendResult(success: ok, message: message);
  }

  static Future<OtpVerifyResult> verifyOtp({
    required String email,
    required String otp,
  }) async {
    final payload = <String, dynamic>{
      'email': email.trim().toLowerCase(),
      'otp': otp.trim(),
    };

    final response = await _postJson(_verifyOtpUri, payload);
    final ok = response.statusCode >= 200 && response.statusCode < 300;
    final message = (response.bodyMap?['message'] ?? 'OTP verification failed.')
        .toString();

    return OtpVerifyResult(
      success: ok,
      message: message,
      accessToken: response.bodyMap?['accessToken']?.toString(),
      refreshToken: response.bodyMap?['refreshToken']?.toString(),
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
