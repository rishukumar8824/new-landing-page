import 'dart:convert';
import 'dart:io';

class UserCenterApiService {
  UserCenterApiService({required this.accessToken});

  final String accessToken;

  static String _baseUrl() {
    final fromEnv = const String.fromEnvironment(
      'BITEGIT_API_BASE',
      defaultValue: 'https://new-landing-page-rlv6.onrender.com',
    ).trim();
    return fromEnv.endsWith('/')
        ? fromEnv.substring(0, fromEnv.length - 1)
        : fromEnv;
  }

  Uri _uri(String path, [Map<String, String>? query]) {
    final uri = Uri.parse('${_baseUrl()}$path');
    if (query == null || query.isEmpty) {
      return uri;
    }
    return uri.replace(queryParameters: query);
  }

  Future<Map<String, dynamic>> getMe() =>
      _request('GET', '/api/user-center/me');
  Future<Map<String, dynamic>> getIdentity() =>
      _request('GET', '/api/user-center/identity');
  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> payload) =>
      _request('PUT', '/api/user-center/profile', body: payload);
  Future<Map<String, dynamic>> updateIdentity(Map<String, dynamic> payload) =>
      _request('PUT', '/api/user-center/identity', body: payload);

  Future<Map<String, dynamic>> changePassword(Map<String, dynamic> payload) =>
      _request('POST', '/security/change-password', body: payload);
  Future<Map<String, dynamic>> changePhone(Map<String, dynamic> payload) =>
      _request('POST', '/security/change-phone', body: payload);
  Future<Map<String, dynamic>> changeEmail(Map<String, dynamic> payload) =>
      _request('POST', '/security/change-email', body: payload);
  Future<Map<String, dynamic>> link2fa(Map<String, dynamic> payload) =>
      _request('POST', '/security/link-2fa', body: payload);
  Future<Map<String, dynamic>> setFundCode(Map<String, dynamic> payload) =>
      _request('POST', '/security/set-fund-code', body: payload);
  Future<Map<String, dynamic>> loginHistory() =>
      _request('GET', '/security/login-history');
  Future<Map<String, dynamic>> deleteAccount(Map<String, dynamic> payload) =>
      _request('POST', '/security/delete-account', body: payload);

  Future<Map<String, dynamic>> addresses() =>
      _request('GET', '/api/user-center/addresses');
  Future<Map<String, dynamic>> addAddress(Map<String, dynamic> payload) =>
      _request('POST', '/api/user-center/addresses', body: payload);
  Future<Map<String, dynamic>> removeAddress(int id) =>
      _request('DELETE', '/api/user-center/addresses/$id');

  Future<Map<String, dynamic>> getPreferences() =>
      _request('GET', '/api/user-center/preferences');
  Future<Map<String, dynamic>> updatePreferences(
    Map<String, dynamic> payload,
  ) => _request('PUT', '/api/user-center/preferences', body: payload);

  Future<Map<String, dynamic>> getFees() =>
      _request('GET', '/api/user-center/fees');

  Future<Map<String, dynamic>> createGift(Map<String, dynamic> payload) =>
      _request('POST', '/api/user-center/gifts', body: payload);
  Future<Map<String, dynamic>> claimGift(Map<String, dynamic> payload) =>
      _request('POST', '/api/user-center/gifts/claim', body: payload);
  Future<Map<String, dynamic>> listGifts() =>
      _request('GET', '/api/user-center/gifts');

  Future<Map<String, dynamic>> referral() =>
      _request('GET', '/api/user-center/referral');

  Future<Map<String, dynamic>> supportCenter() =>
      _request('GET', '/api/user-center/support/center');
  Future<Map<String, dynamic>> listTickets() =>
      _request('GET', '/api/user-center/support/tickets');
  Future<Map<String, dynamic>> createTicket(Map<String, dynamic> payload) =>
      _request('POST', '/api/user-center/support/tickets', body: payload);
  Future<Map<String, dynamic>> listTicketMessages(int ticketId) =>
      _request('GET', '/api/user-center/support/tickets/$ticketId/messages');
  Future<Map<String, dynamic>> sendTicketMessage(
    int ticketId,
    Map<String, dynamic> payload,
  ) => _request(
    'POST',
    '/api/user-center/support/tickets/$ticketId/messages',
    body: payload,
  );

  Future<Map<String, dynamic>> helpArticles([String? topic]) => _request(
    'GET',
    '/api/user-center/help/articles',
    query: topic == null || topic.trim().isEmpty
        ? null
        : <String, String>{'topic': topic.trim()},
  );
  Future<Map<String, dynamic>> about() =>
      _request('GET', '/api/user-center/about');

  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? query,
  }) async {
    final client = HttpClient()
      ..connectionTimeout = const Duration(seconds: 12);

    try {
      final req = await client.openUrl(method, _uri(path, query));
      req.headers.contentType = ContentType.json;
      final token = accessToken.trim();
      if (token.isNotEmpty) {
        req.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
      }
      if (body != null) {
        req.add(utf8.encode(jsonEncode(body)));
      }

      final resp = await req.close();
      final text = await resp.transform(utf8.decoder).join();

      Map<String, dynamic> decoded = <String, dynamic>{};
      try {
        final dynamic raw = jsonDecode(text);
        if (raw is Map<String, dynamic>) {
          decoded = raw;
        }
      } catch (_) {
        decoded = <String, dynamic>{};
      }

      final bool ok = resp.statusCode >= 200 && resp.statusCode < 300;
      final bool successFlag =
          decoded['success'] == null || decoded['success'] == true;
      if (!ok || !successFlag) {
        final message = (decoded['message'] ?? 'Request failed.').toString();
        throw Exception(message);
      }

      return decoded;
    } finally {
      client.close(force: true);
    }
  }
}
