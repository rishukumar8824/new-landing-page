import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:file_picker/file_picker.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'auth/auth_screens.dart';
import 'user_center/user_center_page.dart';

final ValueNotifier<bool> kycVerifiedNotifier = ValueNotifier<bool>(false);
final ValueNotifier<bool> kycBasicVerifiedNotifier = ValueNotifier<bool>(false);
final ValueNotifier<bool> kycAdvancedVerifiedNotifier = ValueNotifier<bool>(
  false,
);
final ValueNotifier<ThemeMode> appThemeModeNotifier = ValueNotifier<ThemeMode>(
  ThemeMode.dark,
);
final ValueNotifier<String?> profileImagePathNotifier = ValueNotifier<String?>(
  null,
);
final ValueNotifier<String> nicknameNotifier = ValueNotifier<String>('Guest');
final ValueNotifier<String> avatarSymbolNotifier = ValueNotifier<String>('S');
String currentUserUid = '--';
final ValueNotifier<List<SupportAlert>> supportAlertsNotifier =
    ValueNotifier<List<SupportAlert>>([]);
final ValueNotifier<List<SubmittedSupportTicket>>
submittedSupportTicketsNotifier = ValueNotifier<List<SubmittedSupportTicket>>(
  [],
);
final ValueNotifier<String> kycStatusNotifier = ValueNotifier<String>(
  'pending',
);
final ValueNotifier<bool> showHomeFavoritesWidget = ValueNotifier<bool>(true);
final ValueNotifier<bool> showHomeTopMoversWidget = ValueNotifier<bool>(true);
final ValueNotifier<bool> isUserLoggedInNotifier = ValueNotifier<bool>(false);
final ValueNotifier<String> authIdentityNotifier = ValueNotifier<String>('');
final ValueNotifier<String> authAccessTokenNotifier = ValueNotifier<String>('');
final ValueNotifier<double> fundingUsdtBalanceNotifier = ValueNotifier<double>(
  0,
);
final ValueNotifier<double> spotUsdtBalanceNotifier = ValueNotifier<double>(0);
final ValueNotifier<HomeWidgetSettings> homeWidgetSettingsNotifier =
    ValueNotifier<HomeWidgetSettings>(const HomeWidgetSettings());
final ValueNotifier<List<P2PAdItem>> p2pMarketplaceAdsNotifier =
    ValueNotifier<List<P2PAdItem>>(<P2PAdItem>[]);
final ValueNotifier<List<P2POrderItem>> p2pOrdersNotifier =
    ValueNotifier<List<P2POrderItem>>(<P2POrderItem>[]);
final ValueNotifier<bool> hasActiveDepositSessionNotifier = ValueNotifier<bool>(
  false,
);
final ValueNotifier<Map<String, String>> usdtDepositAddressByNetworkNotifier =
    ValueNotifier<Map<String, String>>(<String, String>{});
String _authRefreshToken = '';

const String _sessionStorageKey = 'bitegit_session_v2';
const String _secureSessionStorageKey = 'bitegit_session_secure_v1';
const FlutterSecureStorage _secureStorage = FlutterSecureStorage();

String _normalizeApiBase(String raw) {
  final normalized = raw.trim();
  if (normalized.isEmpty) {
    return '';
  }
  if (normalized.endsWith('/')) {
    return normalized.substring(0, normalized.length - 1);
  }
  return normalized;
}

List<String> _apiBaseUrls() {
  final fromEnv = _normalizeApiBase(
    const String.fromEnvironment('BITEGIT_API_BASE', defaultValue: ''),
  );
  const defaults = <String>['https://new-landing-page-rlv6.onrender.com'];
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

Uri _apiUri(String base, String path) => Uri.parse('$base$path');

double _toDouble(dynamic input, [double fallback = 0]) {
  if (input is num) {
    return input.toDouble();
  }
  return double.tryParse(input?.toString() ?? '') ?? fallback;
}

class _ApiHttpResponse {
  const _ApiHttpResponse({required this.statusCode, required this.bodyMap});

  final int statusCode;
  final Map<String, dynamic>? bodyMap;
}

class DepositWalletNetwork {
  const DepositWalletNetwork({
    required this.network,
    required this.address,
    required this.minConfirmations,
    required this.enabled,
    this.qrCodeUrl = '',
  });

  final String network;
  final String address;
  final int minConfirmations;
  final bool enabled;
  final String qrCodeUrl;
}

class DepositWalletCoin {
  const DepositWalletCoin({
    required this.coin,
    required this.defaultNetwork,
    required this.networks,
  });

  final String coin;
  final String defaultNetwork;
  final List<DepositWalletNetwork> networks;
}

Future<_ApiHttpResponse> _getJsonFromApi(Uri uri, {String? accessToken}) async {
  final client = HttpClient()..connectionTimeout = const Duration(seconds: 12);
  try {
    final req = await client.getUrl(uri);
    req.followRedirects = false;
    req.headers.set(HttpHeaders.acceptHeader, 'application/json');
    req.headers.set(HttpHeaders.cacheControlHeader, 'no-cache');
    req.headers.set(HttpHeaders.pragmaHeader, 'no-cache');
    final token = (accessToken ?? '').trim();
    if (token.isNotEmpty) {
      req.headers.set('Authorization', 'Bearer $token');
    }
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
    return _ApiHttpResponse(statusCode: resp.statusCode, bodyMap: decodedMap);
  } catch (_) {
    return const _ApiHttpResponse(statusCode: 0, bodyMap: null);
  } finally {
    client.close(force: true);
  }
}

Future<_ApiHttpResponse> _postJsonToApi(
  Uri uri,
  Map<String, dynamic> payload, {
  String? accessToken,
}) async {
  final client = HttpClient()..connectionTimeout = const Duration(seconds: 12);
  try {
    final req = await client.postUrl(uri);
    req.followRedirects = false;
    req.headers.contentType = ContentType.json;
    req.headers.set(HttpHeaders.cacheControlHeader, 'no-cache');
    req.headers.set(HttpHeaders.pragmaHeader, 'no-cache');
    final token = (accessToken ?? '').trim();
    if (token.isNotEmpty) {
      req.headers.set('Authorization', 'Bearer $token');
    }
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
    return _ApiHttpResponse(statusCode: resp.statusCode, bodyMap: decodedMap);
  } catch (_) {
    return const _ApiHttpResponse(statusCode: 0, bodyMap: null);
  } finally {
    client.close(force: true);
  }
}

bool _apiSuccess(_ApiHttpResponse response) {
  final statusOk = response.statusCode >= 200 && response.statusCode < 300;
  if (!statusOk) {
    return false;
  }
  final body = response.bodyMap;
  if (body == null) {
    return true;
  }
  return body['success'] != false;
}

String _apiErrorMessage(
  _ApiHttpResponse response, {
  String fallback = 'Request failed.',
}) {
  final msg = (response.bodyMap?['message'] ?? '').toString().trim();
  if (msg.isNotEmpty) {
    return msg;
  }
  if (response.statusCode == 0) {
    return 'Network error while reaching exchange API.';
  }
  return fallback;
}

Future<bool> _refreshAccessTokenWithRefreshToken() async {
  final refreshToken = _authRefreshToken.trim();
  if (refreshToken.isEmpty) {
    return false;
  }

  for (final base in _apiBaseUrls()) {
    final response = await _postJsonToApi(
      _apiUri(base, '/auth/refresh'),
      <String, dynamic>{'refreshToken': refreshToken},
    );
    if (!_apiSuccess(response)) {
      continue;
    }

    final nextAccessToken = (response.bodyMap?['accessToken'] ?? '')
        .toString()
        .trim();
    final nextRefreshToken = (response.bodyMap?['refreshToken'] ?? '')
        .toString()
        .trim();
    if (nextAccessToken.isEmpty) {
      continue;
    }

    authAccessTokenNotifier.value = nextAccessToken;
    if (nextRefreshToken.isNotEmpty) {
      _authRefreshToken = nextRefreshToken;
    }
    await _persistSessionState();
    return true;
  }

  return false;
}

Future<void> _syncWalletFromBackend({String? accessToken}) async {
  var token = (accessToken ?? authAccessTokenNotifier.value).trim();
  if (token.isEmpty) {
    return;
  }

  for (final base in _apiBaseUrls()) {
    var response = await _getJsonFromApi(
      _apiUri(base, '/api/wallet/summary'),
      accessToken: token,
    );
    if (response.statusCode == 401) {
      final refreshed = await _refreshAccessTokenWithRefreshToken();
      if (refreshed) {
        token = authAccessTokenNotifier.value.trim();
        response = await _getJsonFromApi(
          _apiUri(base, '/api/wallet/summary'),
          accessToken: token,
        );
      }
    }
    if (!_apiSuccess(response)) {
      continue;
    }
    final summary = response.bodyMap?['summary'];
    final wallet = response.bodyMap?['wallet'];
    final summaryMap = summary is Map<String, dynamic>
        ? summary
        : (wallet is Map<String, dynamic> ? wallet : const <String, dynamic>{});
    final available = _toDouble(
      summaryMap['available_balance'] ?? summaryMap['availableBalance'],
      0,
    );
    final spot = _toDouble(summaryMap['spot_balance'], available);
    fundingUsdtBalanceNotifier.value = available;
    spotUsdtBalanceNotifier.value = spot;
    _syncActiveUserState(walletBalanceUsdt: available);

    final rawNetworks = summaryMap['deposit_networks'];
    if (rawNetworks is List) {
      final addresses = <String, String>{};
      for (final item in rawNetworks) {
        if (item is! Map) continue;
        final network = (item['network'] ?? item['chain'] ?? '')
            .toString()
            .trim()
            .toUpperCase();
        final address = (item['address'] ?? '').toString().trim();
        if (network.isEmpty || address.isEmpty) continue;
        addresses[network] = address;
      }
      if (addresses.isNotEmpty) {
        usdtDepositAddressByNetworkNotifier.value = addresses;
      }
    }
    return;
  }
}

Future<void> _syncDepositSessionFromBackend({String? accessToken}) async {
  var token = (accessToken ?? authAccessTokenNotifier.value).trim();
  if (token.isEmpty) {
    hasActiveDepositSessionNotifier.value = false;
    return;
  }

  for (final base in _apiBaseUrls()) {
    var response = await _getJsonFromApi(
      _apiUri(base, '/api/deposits/active'),
      accessToken: token,
    );
    if (response.statusCode == 401) {
      final refreshed = await _refreshAccessTokenWithRefreshToken();
      if (refreshed) {
        token = authAccessTokenNotifier.value.trim();
        response = await _getJsonFromApi(
          _apiUri(base, '/api/deposits/active'),
          accessToken: token,
        );
      }
    }
    if (!_apiSuccess(response)) {
      continue;
    }
    final hasActive = response.bodyMap?['hasActiveDeposit'] == true;
    hasActiveDepositSessionNotifier.value = hasActive;
    return;
  }
}

Future<void> _syncHomeNotificationsFromBackend({String? accessToken}) async {
  var token = (accessToken ?? authAccessTokenNotifier.value).trim();

  for (final base in _apiBaseUrls()) {
    var response = await _getJsonFromApi(
      _apiUri(base, '/api/social/feed').replace(
        queryParameters: const <String, String>{
          'tab': 'announcement',
          'page': '1',
          'pageSize': '6',
        },
      ),
      accessToken: token.isEmpty ? null : token,
    );

    if (response.statusCode == 401 && token.isNotEmpty) {
      final refreshed = await _refreshAccessTokenWithRefreshToken();
      if (refreshed) {
        token = authAccessTokenNotifier.value.trim();
        response = await _getJsonFromApi(
          _apiUri(base, '/api/social/feed').replace(
            queryParameters: const <String, String>{
              'tab': 'announcement',
              'page': '1',
              'pageSize': '6',
            },
          ),
          accessToken: token,
        );
      }
    }

    if (!_apiSuccess(response)) {
      continue;
    }

    final body = response.bodyMap ?? const <String, dynamic>{};
    final rawItems = body['items'] is List<dynamic>
        ? body['items'] as List<dynamic>
        : const <dynamic>[];
    if (rawItems.isEmpty) {
      return;
    }

    final existing = supportAlertsNotifier.value;
    final knownMessages = existing.map((item) => item.message).toSet();
    final userUid = currentUserUid.trim().isEmpty ? '--' : currentUserUid;
    final mapped = <SupportAlert>[];

    for (final item in rawItems) {
      if (item is! Map<String, dynamic>) {
        continue;
      }
      final message =
          (item['contentText'] ??
                  item['content_text'] ??
                  item['text'] ??
                  item['title'] ??
                  '')
              .toString()
              .trim();
      if (message.isEmpty || knownMessages.contains(message)) {
        continue;
      }
      final rawTime = (item['createdAt'] ?? item['created_at'] ?? '')
          .toString()
          .trim();
      final parsedTime = DateTime.tryParse(rawTime) ?? DateTime.now();
      mapped.add(
        SupportAlert(
          id: _supportAlertCounter++,
          userUid: userUid,
          message: message,
          timestamp: parsedTime,
        ),
      );
    }

    if (mapped.isNotEmpty) {
      supportAlertsNotifier.value = <SupportAlert>[
        ...mapped,
        ...existing,
      ].take(20).toList(growable: false);
    }
    return;
  }
}

List<DepositWalletCoin> _fallbackDepositWalletCatalog() {
  return const <DepositWalletCoin>[
    DepositWalletCoin(
      coin: 'USDT',
      defaultNetwork: 'TRC20',
      networks: <DepositWalletNetwork>[
        DepositWalletNetwork(
          network: 'TRC20',
          address: '',
          minConfirmations: 20,
          enabled: false,
        ),
        DepositWalletNetwork(
          network: 'ERC20',
          address: '',
          minConfirmations: 12,
          enabled: false,
        ),
        DepositWalletNetwork(
          network: 'BEP20',
          address: '',
          minConfirmations: 15,
          enabled: false,
        ),
      ],
    ),
  ];
}

Future<List<DepositWalletCoin>> _fetchDepositWalletCatalog({
  String? accessToken,
}) async {
  var token = (accessToken ?? authAccessTokenNotifier.value).trim();
  if (token.isEmpty) {
    return _fallbackDepositWalletCatalog();
  }

  for (final base in _apiBaseUrls()) {
    var response = await _getJsonFromApi(
      _apiUri(base, '/api/deposits/wallets'),
      accessToken: token,
    );
    if (response.statusCode == 401) {
      final refreshed = await _refreshAccessTokenWithRefreshToken();
      if (refreshed) {
        token = authAccessTokenNotifier.value.trim();
        response = await _getJsonFromApi(
          _apiUri(base, '/api/deposits/wallets'),
          accessToken: token,
        );
      }
    }
    if (!_apiSuccess(response)) {
      continue;
    }

    final coinsRaw = response.bodyMap?['coins'];
    if (coinsRaw is! List) {
      continue;
    }

    final coins = <DepositWalletCoin>[];
    for (final rawCoin in coinsRaw) {
      if (rawCoin is! Map) continue;
      final coin = (rawCoin['coin'] ?? '').toString().trim().toUpperCase();
      if (coin.isEmpty) continue;

      final networksRaw = rawCoin['networks'];
      if (networksRaw is! List) continue;

      final networks = <DepositWalletNetwork>[];
      for (final rawNetwork in networksRaw) {
        if (rawNetwork is! Map) continue;
        final network = (rawNetwork['network'] ?? '')
            .toString()
            .trim()
            .toUpperCase();
        if (network.isEmpty) continue;
        networks.add(
          DepositWalletNetwork(
            network: network,
            address: (rawNetwork['address'] ?? '').toString().trim(),
            minConfirmations:
                int.tryParse(
                  (rawNetwork['minConfirmations'] ?? 1).toString(),
                ) ??
                1,
            enabled: rawNetwork['enabled'] != false,
            qrCodeUrl: (rawNetwork['qrCodeUrl'] ?? '').toString().trim(),
          ),
        );
      }
      final activeNetworks = networks
          .where((row) => row.enabled && row.address.trim().isNotEmpty)
          .toList();
      if (activeNetworks.isEmpty) continue;

      final defaultNetwork = (rawCoin['defaultNetwork'] ?? '')
          .toString()
          .trim()
          .toUpperCase();
      coins.add(
        DepositWalletCoin(
          coin: coin,
          defaultNetwork: defaultNetwork.isEmpty
              ? activeNetworks.first.network
              : defaultNetwork,
          networks: activeNetworks,
        ),
      );
    }

    if (coins.isNotEmpty) {
      return coins;
    }
  }

  return _fallbackDepositWalletCatalog();
}

Future<List<AssetTransactionRecord>> _fetchDepositHistory({
  String? accessToken,
  int limit = 20,
}) async {
  var token = (accessToken ?? authAccessTokenNotifier.value).trim();
  if (token.isEmpty) {
    return <AssetTransactionRecord>[];
  }

  for (final base in _apiBaseUrls()) {
    var response = await _getJsonFromApi(
      _apiUri(base, '/api/deposits?limit=$limit'),
      accessToken: token,
    );
    if (response.statusCode == 401) {
      final refreshed = await _refreshAccessTokenWithRefreshToken();
      if (refreshed) {
        token = authAccessTokenNotifier.value.trim();
        response = await _getJsonFromApi(
          _apiUri(base, '/api/deposits?limit=$limit'),
          accessToken: token,
        );
      }
    }
    if (!_apiSuccess(response)) {
      continue;
    }
    final deposits = response.bodyMap?['deposits'];
    if (deposits is! List) {
      return <AssetTransactionRecord>[];
    }
    return deposits.whereType<Map>().map((row) {
      final amount = _toDouble(row['amount'], 0);
      final createdAt =
          DateTime.tryParse((row['createdAt'] ?? '').toString()) ??
          DateTime.now();
      final statusRaw = (row['status'] ?? '').toString().trim().toUpperCase();
      final status = switch (statusRaw) {
        'COMPLETED' => 'Completed',
        'REJECTED' => 'Rejected',
        _ => 'Pending',
      };
      return AssetTransactionRecord(
        id: (row['id'] ?? '').toString(),
        type: 'deposit',
        coin: (row['coin'] ?? 'USDT').toString().toUpperCase(),
        amount: amount,
        time: createdAt,
        status: status,
        network: (row['network'] ?? '').toString().toUpperCase(),
      );
    }).toList();
  }

  return <AssetTransactionRecord>[];
}

Future<Map<String, dynamic>> _createDepositRequest({
  required String coin,
  required String network,
  required String address,
  required double amount,
  String txHash = '',
  String proofUrl = '',
  String? accessToken,
}) async {
  var token = (accessToken ?? authAccessTokenNotifier.value).trim();
  if (token.isEmpty) {
    throw Exception('Please login again to continue.');
  }

  String firstFailure = '';
  for (final base in _apiBaseUrls()) {
    var response =
        await _postJsonToApi(_apiUri(base, '/api/deposits'), <String, dynamic>{
          'coin': coin,
          'network': network,
          'address': address,
          'amount': amount,
          if (txHash.trim().isNotEmpty) 'txHash': txHash.trim(),
          if (proofUrl.trim().isNotEmpty) 'proofUrl': proofUrl.trim(),
        }, accessToken: token);
    if (response.statusCode == 401) {
      final refreshed = await _refreshAccessTokenWithRefreshToken();
      if (refreshed) {
        token = authAccessTokenNotifier.value.trim();
        response = await _postJsonToApi(
          _apiUri(base, '/api/deposits'),
          <String, dynamic>{
            'coin': coin,
            'network': network,
            'address': address,
            'amount': amount,
            if (txHash.trim().isNotEmpty) 'txHash': txHash.trim(),
            if (proofUrl.trim().isNotEmpty) 'proofUrl': proofUrl.trim(),
          },
          accessToken: token,
        );
      }
    }
    if (_apiSuccess(response)) {
      final deposit = response.bodyMap?['deposit'];
      if (deposit is Map<String, dynamic>) {
        return deposit;
      }
      return <String, dynamic>{};
    }
    if (firstFailure.isEmpty) {
      firstFailure = _apiErrorMessage(
        response,
        fallback: 'Unable to create deposit request.',
      );
    }
  }

  throw Exception(
    firstFailure.isEmpty ? 'Unable to create deposit request.' : firstFailure,
  );
}

Future<Map<String, dynamic>> _createWithdrawalRequest({
  required String currency,
  required String network,
  required String address,
  required double amount,
  String? accessToken,
}) async {
  var token = (accessToken ?? authAccessTokenNotifier.value).trim();
  if (token.isEmpty) {
    throw Exception('Please login again to continue.');
  }

  String firstFailure = '';
  for (final base in _apiBaseUrls()) {
    var response = await _postJsonToApi(
      _apiUri(base, '/api/withdrawals'),
      <String, dynamic>{
        'currency': currency,
        'network': network,
        'address': address,
        'amount': amount,
      },
      accessToken: token,
    );
    if (response.statusCode == 401) {
      final refreshed = await _refreshAccessTokenWithRefreshToken();
      if (refreshed) {
        token = authAccessTokenNotifier.value.trim();
        response = await _postJsonToApi(
          _apiUri(base, '/api/withdrawals'),
          <String, dynamic>{
            'currency': currency,
            'network': network,
            'address': address,
            'amount': amount,
          },
          accessToken: token,
        );
      }
    }
    if (_apiSuccess(response)) {
      final withdrawal = response.bodyMap?['withdrawal'];
      if (withdrawal is Map<String, dynamic>) {
        return withdrawal;
      }
      return <String, dynamic>{};
    }
    if (firstFailure.isEmpty) {
      firstFailure = _apiErrorMessage(
        response,
        fallback: 'Unable to submit withdrawal request.',
      );
    }
  }

  throw Exception(
    firstFailure.isEmpty
        ? 'Unable to submit withdrawal request.'
        : firstFailure,
  );
}

Future<void> _persistSessionState() async {
  final active = activeExchangeUserNotifier.value;
  final prefs = await SharedPreferences.getInstance();
  if (active == null || authAccessTokenNotifier.value.trim().isEmpty) {
    await _secureStorage.delete(key: _secureSessionStorageKey);
    await prefs.remove(_sessionStorageKey);
    return;
  }

  final payload = <String, dynamic>{
    'email': active.email,
    'userId': active.userId,
    'kycStatus': active.kycStatus,
    'walletBalanceUsdt': active.walletBalanceUsdt,
    'accessToken': authAccessTokenNotifier.value,
    'refreshToken': _authRefreshToken,
  };
  final encoded = jsonEncode(payload);
  await _secureStorage.write(key: _secureSessionStorageKey, value: encoded);
  await prefs.setString(_sessionStorageKey, encoded);
}

Future<void> _restoreSessionState() async {
  final prefs = await SharedPreferences.getInstance();
  final secureRaw =
      (await _secureStorage.read(key: _secureSessionStorageKey) ?? '').trim();
  final raw = secureRaw.isNotEmpty
      ? secureRaw
      : (prefs.getString(_sessionStorageKey) ?? '');
  if (raw.isEmpty) {
    return;
  }

  try {
    final decoded = jsonDecode(raw);
    if (decoded is! Map<String, dynamic>) {
      return;
    }

    final email = (decoded['email'] ?? '').toString().trim().toLowerCase();
    final accessToken = (decoded['accessToken'] ?? '').toString().trim();
    if (email.isEmpty || accessToken.isEmpty) {
      return;
    }

    final userId = (decoded['userId'] ?? '').toString().trim();
    final kycStatus = (decoded['kycStatus'] ?? 'pending')
        .toString()
        .trim()
        .toLowerCase();
    final walletBalance = _toDouble(decoded['walletBalanceUsdt'], 0);

    final restoredUser = ExchangeUser(
      userId: userId.isEmpty ? _generateUserUid() : userId,
      email: email,
      password: '',
      joinedAt: DateTime.now(),
      kycStatus: kycStatus,
      walletBalanceUsdt: walletBalance,
      canPostAds: kycStatus == 'verified',
    );

    _exchangeUsersByEmail[email] = restoredUser;
    _hydrateSessionFromUser(restoredUser);
    authAccessTokenNotifier.value = accessToken;
    _authRefreshToken = (decoded['refreshToken'] ?? '').toString().trim();

    if (_authRefreshToken.isNotEmpty) {
      await _refreshAccessTokenWithRefreshToken();
    }
    await _syncWalletFromBackend(accessToken: authAccessTokenNotifier.value);
    await _syncDepositSessionFromBackend(
      accessToken: authAccessTokenNotifier.value,
    );
  } catch (_) {
    // Ignore invalid session payload.
  }
}

Future<void> _clearSessionState() async {
  final prefs = await SharedPreferences.getInstance();
  await _secureStorage.delete(key: _secureSessionStorageKey);
  await prefs.remove(_sessionStorageKey);
}

class ExchangeUser {
  const ExchangeUser({
    required this.userId,
    required this.email,
    required this.password,
    required this.joinedAt,
    required this.kycStatus,
    required this.walletBalanceUsdt,
    required this.canPostAds,
  });

  final String userId;
  final String email;
  final String password;
  final DateTime joinedAt;
  final String kycStatus;
  final double walletBalanceUsdt;
  final bool canPostAds;

  ExchangeUser copyWith({
    String? userId,
    String? email,
    String? password,
    DateTime? joinedAt,
    String? kycStatus,
    double? walletBalanceUsdt,
    bool? canPostAds,
  }) {
    return ExchangeUser(
      userId: userId ?? this.userId,
      email: email ?? this.email,
      password: password ?? this.password,
      joinedAt: joinedAt ?? this.joinedAt,
      kycStatus: kycStatus ?? this.kycStatus,
      walletBalanceUsdt: walletBalanceUsdt ?? this.walletBalanceUsdt,
      canPostAds: canPostAds ?? this.canPostAds,
    );
  }
}

final Map<String, ExchangeUser> _exchangeUsersByEmail =
    <String, ExchangeUser>{};
final ValueNotifier<ExchangeUser?> activeExchangeUserNotifier =
    ValueNotifier<ExchangeUser?>(null);
int _supportAlertCounter = 1;
DateTime? _announcementDismissedUntil;
const String kGlobalAnnouncementMessage =
    'Scheduled maintenance notice: Fiat transfer service may be delayed for up to 30 minutes during peak load. '
    'Crypto trading, spot orders, and P2P matching remain operational.';

class HomeWidgetSettings {
  const HomeWidgetSettings({
    this.showDepositBanner = true,
    this.showQuickActions = true,
    this.showPromoScroller = true,
    this.showTicker = true,
    this.showPairs = true,
  });

  final bool showDepositBanner;
  final bool showQuickActions;
  final bool showPromoScroller;
  final bool showTicker;
  final bool showPairs;

  HomeWidgetSettings copyWith({
    bool? showDepositBanner,
    bool? showQuickActions,
    bool? showPromoScroller,
    bool? showTicker,
    bool? showPairs,
  }) {
    return HomeWidgetSettings(
      showDepositBanner: showDepositBanner ?? this.showDepositBanner,
      showQuickActions: showQuickActions ?? this.showQuickActions,
      showPromoScroller: showPromoScroller ?? this.showPromoScroller,
      showTicker: showTicker ?? this.showTicker,
      showPairs: showPairs ?? this.showPairs,
    );
  }
}

class SupportAlert {
  const SupportAlert({
    required this.id,
    required this.userUid,
    required this.message,
    required this.timestamp,
    this.resolved = false,
  });

  final int id;
  final String userUid;
  final String message;
  final DateTime timestamp;
  final bool resolved;

  SupportAlert copyWith({bool? resolved}) {
    return SupportAlert(
      id: id,
      userUid: userUid,
      message: message,
      timestamp: timestamp,
      resolved: resolved ?? this.resolved,
    );
  }
}

void _setKycStatus(String status) {
  final normalized = status.trim().toLowerCase();
  kycStatusNotifier.value = normalized;
  if (normalized == 'verified') {
    kycBasicVerifiedNotifier.value = true;
    kycAdvancedVerifiedNotifier.value = true;
    kycVerifiedNotifier.value = true;
    return;
  }
  if (normalized == 'under_review') {
    kycBasicVerifiedNotifier.value = true;
    kycAdvancedVerifiedNotifier.value = false;
    kycVerifiedNotifier.value = false;
    return;
  }
  if (normalized == 'rejected') {
    kycVerifiedNotifier.value = false;
    kycAdvancedVerifiedNotifier.value = false;
    kycBasicVerifiedNotifier.value = true;
    return;
  }
  kycVerifiedNotifier.value = false;
  kycBasicVerifiedNotifier.value = false;
  kycAdvancedVerifiedNotifier.value = false;
}

String _deriveNicknameFromIdentity(String identity) {
  final trimmed = identity.trim();
  if (trimmed.isEmpty) return 'Guest';
  return _maskIdentity(trimmed);
}

String _firstLetter(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) return 'G';
  return trimmed.substring(0, 1).toUpperCase();
}

void _hydrateSessionFromUser(ExchangeUser user) {
  activeExchangeUserNotifier.value = user;
  currentUserUid = user.userId;
  authIdentityNotifier.value = user.email;
  nicknameNotifier.value = _deriveNicknameFromIdentity(user.email);
  avatarSymbolNotifier.value = _firstLetter(user.email);
  fundingUsdtBalanceNotifier.value = user.walletBalanceUsdt;
  spotUsdtBalanceNotifier.value = 0;
  _setKycStatus(user.kycStatus);
  isUserLoggedInNotifier.value = true;
  unawaited(_persistSessionState());
}

void _syncActiveUserState({
  double? walletBalanceUsdt,
  String? kycStatus,
  bool? canPostAds,
}) {
  final current = activeExchangeUserNotifier.value;
  if (current == null) return;
  final resolvedKycStatus = (kycStatus ?? current.kycStatus)
      .trim()
      .toLowerCase();
  final resolvedCanPostAds = canPostAds ?? (resolvedKycStatus == 'verified');
  final next = current.copyWith(
    walletBalanceUsdt: walletBalanceUsdt,
    kycStatus: resolvedKycStatus,
    canPostAds: resolvedCanPostAds,
  );
  _exchangeUsersByEmail[next.email.toLowerCase()] = next;
  activeExchangeUserNotifier.value = next;
  unawaited(_persistSessionState());
}

ExchangeUser? _findUserByIdentity(String identity) {
  return _exchangeUsersByEmail[identity.trim().toLowerCase()];
}

String? _createUser({required String email, required String password}) {
  final key = email.trim().toLowerCase();
  if (key.isEmpty || _exchangeUsersByEmail.containsKey(key)) return null;
  final user = ExchangeUser(
    userId: _generateUserUid(),
    email: email.trim(),
    password: password,
    joinedAt: DateTime.now(),
    kycStatus: 'pending',
    walletBalanceUsdt: 0,
    canPostAds: false,
  );
  _exchangeUsersByEmail[key] = user;
  return user.userId;
}

void _logoutActiveSession() {
  activeExchangeUserNotifier.value = null;
  authIdentityNotifier.value = '';
  authAccessTokenNotifier.value = '';
  _authRefreshToken = '';
  currentUserUid = '--';
  nicknameNotifier.value = 'Guest';
  avatarSymbolNotifier.value = 'G';
  profileImagePathNotifier.value = null;
  fundingUsdtBalanceNotifier.value = 0;
  spotUsdtBalanceNotifier.value = 0;
  hasActiveDepositSessionNotifier.value = false;
  usdtDepositAddressByNetworkNotifier.value = <String, String>{};
  _setKycStatus('pending');
  isUserLoggedInNotifier.value = false;
  unawaited(_clearSessionState());
}

SupportAlert addSupportAgentAlert(String message) {
  final alert = SupportAlert(
    id: _supportAlertCounter++,
    userUid: currentUserUid.trim().isEmpty ? '--' : currentUserUid,
    message: message,
    timestamp: DateTime.now(),
  );
  supportAlertsNotifier.value = [alert, ...supportAlertsNotifier.value];
  return alert;
}

String _generateUserUid() {
  final random = Random();
  final a = random.nextInt(90000000) + 10000000;
  final b = random.nextInt(900) + 100;
  return '$a$b';
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await _clearTransientAppCacheOnLaunch();
  await _restoreSessionState();
  runApp(const BitegitApp());
}

Future<void> _clearTransientAppCacheOnLaunch() async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.remove('social_feed_cache');
  await prefs.remove('social_feed_last_fetch');
}

class BitegitApp extends StatelessWidget {
  const BitegitApp({super.key});

  @override
  Widget build(BuildContext context) {
    final darkTheme = ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: const Color(0xFF05070B),
      fontFamily: 'SF Pro Display',
      colorScheme: const ColorScheme.dark(
        primary: Color(0xFF9DFB3B),
        secondary: Color(0xFF111B31),
        surface: Color(0xFF0A1221),
      ),
      textTheme: const TextTheme(
        bodyMedium: TextStyle(fontSize: 12.2),
        bodySmall: TextStyle(fontSize: 10.8),
        titleMedium: TextStyle(fontSize: 13.6),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF0E1523),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF1E2C46)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF1E2C46)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF9DFB3B)),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 12,
        ),
        labelStyle: const TextStyle(fontSize: 11.8, color: Colors.white70),
      ),
    );

    final lightTheme = ThemeData(
      brightness: Brightness.light,
      scaffoldBackgroundColor: const Color(0xFFF3F6FC),
      fontFamily: 'SF Pro Display',
      colorScheme: const ColorScheme.light(
        primary: Color(0xFF2B9C1F),
        secondary: Color(0xFFDCE7FA),
        surface: Colors.white,
      ),
      textTheme: const TextTheme(
        bodyMedium: TextStyle(fontSize: 12.2),
        bodySmall: TextStyle(fontSize: 10.8),
        titleMedium: TextStyle(fontSize: 13.6),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFB8C4DE)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFB8C4DE)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF2B9C1F)),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 12,
        ),
        labelStyle: const TextStyle(fontSize: 11.8, color: Colors.black54),
      ),
    );

    return ValueListenableBuilder<ThemeMode>(
      valueListenable: appThemeModeNotifier,
      builder: (context, mode, child) {
        return MaterialApp(
          debugShowCheckedModeBanner: false,
          title: 'Exchange',
          theme: lightTheme,
          darkTheme: darkTheme,
          themeMode: mode,
          home: const AppLaunchBootstrap(),
        );
      },
    );
  }
}

class _ExchangeLogoGlyph extends StatelessWidget {
  const _ExchangeLogoGlyph({this.size = 64, this.glowStrength = 0.45});

  final double size;
  final double glowStrength;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFFFF29A), Color(0xFFF1CB3E)],
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(
              0xFFF1CB3E,
            ).withValues(alpha: (0.26 + (glowStrength * 0.24)).clamp(0, 1)),
            blurRadius: size * (0.34 + (glowStrength * 0.18)),
            spreadRadius: size * (0.03 + (glowStrength * 0.01)),
          ),
        ],
      ),
      child: Center(
        child: Icon(
          Icons.candlestick_chart_rounded,
          size: size * 0.56,
          color: const Color(0xFF111827),
        ),
      ),
    );
  }
}

class AppLaunchBootstrap extends StatefulWidget {
  const AppLaunchBootstrap({super.key});

  @override
  State<AppLaunchBootstrap> createState() => _AppLaunchBootstrapState();
}

class _AppLaunchBootstrapState extends State<AppLaunchBootstrap>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  bool _splashComplete = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    )..forward();

    Future<void>.delayed(const Duration(seconds: 2), () {
      if (!mounted) {
        return;
      }
      setState(() => _splashComplete = true);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 320),
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      child: _splashComplete
          ? const AuthGatePage(key: ValueKey<String>('auth-gate'))
          : _AnimatedSplashScreen(
              key: const ValueKey<String>('launch-splash'),
              animation: _controller,
            ),
    );
  }
}

class _AnimatedSplashScreen extends StatelessWidget {
  const _AnimatedSplashScreen({super.key, required this.animation});

  final Animation<double> animation;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF05070B),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF05070B), Color(0xFF0A1422), Color(0xFF05070B)],
          ),
        ),
        child: Center(
          child: AnimatedBuilder(
            animation: animation,
            builder: (context, child) {
              final fade = Curves.easeOutCubic.transform(animation.value);
              final pulse =
                  0.92 + (0.1 * sin(animation.value * pi * 2.2).abs());
              return Opacity(
                opacity: 0.2 + (0.8 * fade),
                child: Transform.scale(
                  scale: pulse,
                  child: _ExchangeLogoGlyph(size: 108, glowStrength: 0.8),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _HomeRefreshLogoLoader extends StatefulWidget {
  const _HomeRefreshLogoLoader();

  @override
  State<_HomeRefreshLogoLoader> createState() => _HomeRefreshLogoLoaderState();
}

class _HomeRefreshLogoLoaderState extends State<_HomeRefreshLogoLoader>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 950),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final turn = _controller.value * pi * 2;
        final pulse = 0.93 + (0.08 * sin(turn).abs());
        return Transform.rotate(
          angle: turn,
          child: Transform.scale(
            scale: pulse,
            child: const _ExchangeLogoGlyph(size: 46, glowStrength: 0.6),
          ),
        );
      },
    );
  }
}

class AuthGatePage extends StatelessWidget {
  const AuthGatePage({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: isUserLoggedInNotifier,
      builder: (context, loggedIn, _) {
        return AnimatedSwitcher(
          duration: const Duration(milliseconds: 220),
          switchInCurve: Curves.easeOutCubic,
          switchOutCurve: Curves.easeInCubic,
          child: loggedIn
              ? const ExchangeShell(key: ValueKey<String>('exchange-shell'))
              : const AuthLandingPage(key: ValueKey<String>('auth-landing')),
        );
      },
    );
  }
}

class AuthLandingPage extends StatelessWidget {
  const AuthLandingPage({super.key});

  Future<void> _handleOtpAuthSuccess(String email, dynamic verifyResult) async {
    final normalizedEmail = email.trim().toLowerCase();
    final accessToken = verifyResult != null
        ? ((verifyResult as dynamic).accessToken ?? '').toString().trim()
        : '';
    if (accessToken.isEmpty) {
      return;
    }

    final resolvedUserId = verifyResult != null
        ? ((verifyResult as dynamic).userId ?? '').toString().trim()
        : '';
    final resolvedEmail = verifyResult != null
        ? ((verifyResult as dynamic).email ?? normalizedEmail)
              .toString()
              .trim()
              .toLowerCase()
        : normalizedEmail;
    final resolvedKycStatus = verifyResult != null
        ? ((verifyResult as dynamic).kycStatus ?? 'pending')
              .toString()
              .trim()
              .toLowerCase()
        : 'pending';
    _authRefreshToken = verifyResult != null
        ? ((verifyResult as dynamic).refreshToken ?? '').toString().trim()
        : '';

    var user = _findUserByIdentity(resolvedEmail);
    if (user == null) {
      user = ExchangeUser(
        userId: resolvedUserId.isEmpty ? _generateUserUid() : resolvedUserId,
        email: resolvedEmail,
        password: '',
        joinedAt: DateTime.now(),
        kycStatus: resolvedKycStatus,
        walletBalanceUsdt: 0,
        canPostAds: resolvedKycStatus == 'verified',
      );
      _exchangeUsersByEmail[resolvedEmail] = user;
    } else {
      user = user.copyWith(
        userId: resolvedUserId.isEmpty ? user.userId : resolvedUserId,
        kycStatus: resolvedKycStatus,
        canPostAds: resolvedKycStatus == 'verified',
      );
      _exchangeUsersByEmail[resolvedEmail] = user;
    }

    _hydrateSessionFromUser(user);
    authAccessTokenNotifier.value = accessToken;
    await _syncWalletFromBackend(accessToken: accessToken);
    await _syncDepositSessionFromBackend(accessToken: accessToken);
    await _persistSessionState();
  }

  void _openLogin(BuildContext context, {bool replace = false}) {
    final route = MaterialPageRoute<void>(
      builder: (_) => LoginScreen(
        onAuthSuccess: _handleOtpAuthSuccess,
        onOpenSignup: () {
          _openSignup(context, replace: true);
        },
      ),
    );

    if (replace) {
      Navigator.of(context).pushReplacement<void, void>(route);
      return;
    }
    Navigator.of(context).push(route);
  }

  void _openSignup(BuildContext context, {bool replace = false}) {
    final route = MaterialPageRoute<void>(
      builder: (_) => SignupScreen(
        onAuthSuccess: _handleOtpAuthSuccess,
        onOpenLogin: () {
          _openLogin(context, replace: true);
        },
      ),
    );

    if (replace) {
      Navigator.of(context).pushReplacement<void, void>(route);
      return;
    }
    Navigator.of(context).push(route);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 24, 18, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Align(
                alignment: Alignment.centerLeft,
                child: _ExchangeLogoGlyph(size: 38, glowStrength: 0.5),
              ),
              const Spacer(flex: 2),
              const Text(
                'Welcome',
                style: TextStyle(
                  fontSize: 38,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Secure crypto trading starts here.',
                style: TextStyle(fontSize: 15, color: Colors.white70),
              ),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () {
                    _openLogin(context);
                  },
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.black,
                    minimumSize: const Size.fromHeight(58),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(30),
                    ),
                  ),
                  child: const Text(
                    'Log in / Sign up',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              const Center(
                child: Text(
                  'Secure OTP login with Geetest verification',
                  style: TextStyle(fontSize: 12.5, color: Colors.white54),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class MarketPair {
  const MarketPair({
    required this.symbol,
    required this.price,
    required this.change,
    required this.logoUrl,
    required this.volume,
  });

  final String symbol;
  final String price;
  final String change;
  final String logoUrl;
  final String volume;
}

class P2PAdItem {
  const P2PAdItem({
    required this.seller,
    required this.pair,
    required this.price,
    required this.limits,
    required this.completed30d,
    required this.completionRate30d,
    required this.avgReleaseTime,
    required this.avgPaymentTime,
    required this.available,
    required this.logoUrl,
    this.paymentMethods = const ['UPI'],
    this.topPick = false,
    this.verified = true,
    this.badge = 'Merchant',
    this.reputationScore = 4.8,
    this.timerMinutes = 15,
    this.autoPriceEnabled = true,
    this.side = 'sell',
  });

  final String seller;
  final String pair;
  final String price;
  final String limits;
  final String completed30d;
  final String completionRate30d;
  final String avgReleaseTime;
  final String avgPaymentTime;
  final String available;
  final String logoUrl;
  final List<String> paymentMethods;
  final bool topPick;
  final bool verified;
  final String badge;
  final double reputationScore;
  final int timerMinutes;
  final bool autoPriceEnabled;
  final String side;

  double get priceValue => _parseNumericValue(price);
  double get availableUsdt => _parseNumericValue(available);

  List<double> get limitRange {
    final values = RegExp(
      r'([0-9]+(?:\.[0-9]+)?(?:K|M)?)',
      caseSensitive: false,
    ).allMatches(limits).toList();
    if (values.length < 2) return [0, 0];
    return [
      _parseNumericValue(values[0].group(1) ?? '0'),
      _parseNumericValue(values[1].group(1) ?? '0'),
    ];
  }

  P2PAdItem copyWith({
    String? seller,
    String? pair,
    String? price,
    String? limits,
    String? completed30d,
    String? completionRate30d,
    String? avgReleaseTime,
    String? avgPaymentTime,
    String? available,
    String? logoUrl,
    List<String>? paymentMethods,
    bool? topPick,
    bool? verified,
    String? badge,
    double? reputationScore,
    int? timerMinutes,
    bool? autoPriceEnabled,
    String? side,
  }) {
    return P2PAdItem(
      seller: seller ?? this.seller,
      pair: pair ?? this.pair,
      price: price ?? this.price,
      limits: limits ?? this.limits,
      completed30d: completed30d ?? this.completed30d,
      completionRate30d: completionRate30d ?? this.completionRate30d,
      avgReleaseTime: avgReleaseTime ?? this.avgReleaseTime,
      avgPaymentTime: avgPaymentTime ?? this.avgPaymentTime,
      available: available ?? this.available,
      logoUrl: logoUrl ?? this.logoUrl,
      paymentMethods: paymentMethods ?? this.paymentMethods,
      topPick: topPick ?? this.topPick,
      verified: verified ?? this.verified,
      badge: badge ?? this.badge,
      reputationScore: reputationScore ?? this.reputationScore,
      timerMinutes: timerMinutes ?? this.timerMinutes,
      autoPriceEnabled: autoPriceEnabled ?? this.autoPriceEnabled,
      side: side ?? this.side,
    );
  }
}

enum P2POrderState {
  created,
  awaitingPayment,
  paymentSent,
  sellerConfirming,
  completed,
  cancelled,
  appealOpened,
  underReview,
  frozen,
}

String p2pOrderStateLabel(P2POrderState state) {
  switch (state) {
    case P2POrderState.created:
      return 'CREATED';
    case P2POrderState.awaitingPayment:
      return 'AWAITING_PAYMENT';
    case P2POrderState.paymentSent:
      return 'PAYMENT_SENT';
    case P2POrderState.sellerConfirming:
      return 'SELLER_CONFIRMING';
    case P2POrderState.completed:
      return 'COMPLETED';
    case P2POrderState.cancelled:
      return 'CANCELLED';
    case P2POrderState.appealOpened:
      return 'APPEAL_OPENED';
    case P2POrderState.underReview:
      return 'UNDER_REVIEW';
    case P2POrderState.frozen:
      return 'FROZEN';
  }
}

Color p2pStateColor(P2POrderState state) {
  switch (state) {
    case P2POrderState.completed:
      return const Color(0xFF53D983);
    case P2POrderState.paymentSent:
      return const Color(0xFF53D983);
    case P2POrderState.sellerConfirming:
      return const Color(0xFF9DFB3B);
    case P2POrderState.cancelled:
      return const Color(0xFFEF4E5E);
    case P2POrderState.appealOpened:
      return const Color(0xFFFFAE42);
    case P2POrderState.underReview:
      return const Color(0xFFFFAE42);
    case P2POrderState.frozen:
      return const Color(0xFFB894F4);
    case P2POrderState.created:
      return const Color(0xFF57A2FF);
    case P2POrderState.awaitingPayment:
      return const Color(0xFF57A2FF);
  }
}

class P2POrderItem {
  const P2POrderItem({
    required this.id,
    required this.pair,
    required this.side,
    required this.amount,
    required this.status,
    required this.createdAt,
    required this.logoUrl,
    required this.counterparty,
    required this.paymentMethod,
    this.orderState = P2POrderState.created,
    this.fiatAmount = 0,
    this.usdtAmount = 0,
    this.pricePerUsdt = 0,
    this.feeUsdt = 0,
    this.createdAtMs = 0,
    this.expiresAtMs = 0,
    this.escrowLocked = false,
    this.escrowReleased = false,
    this.cancelReason,
    this.disputeReason,
    this.appealStatus,
    this.appealProofPath,
    this.appealOpenedAtMs = 0,
    this.buyerWallet = 'buyer',
    this.sellerWallet = 'seller',
    this.escrowWallet = 'system_escrow',
    this.isFrozen = false,
    this.fraudFlag = false,
    this.unreadMessages = 0,
    this.paymentProofPath,
  });

  final String id;
  final String pair;
  final String side;
  final String amount;
  final String status;
  final String createdAt;
  final String logoUrl;
  final String counterparty;
  final String paymentMethod;
  final P2POrderState orderState;
  final double fiatAmount;
  final double usdtAmount;
  final double pricePerUsdt;
  final double feeUsdt;
  final int createdAtMs;
  final int expiresAtMs;
  final bool escrowLocked;
  final bool escrowReleased;
  final String? cancelReason;
  final String? disputeReason;
  final String? appealStatus;
  final String? appealProofPath;
  final int appealOpenedAtMs;
  final String buyerWallet;
  final String sellerWallet;
  final String escrowWallet;
  final bool isFrozen;
  final bool fraudFlag;
  final int unreadMessages;
  final String? paymentProofPath;

  P2POrderItem copyWith({
    String? id,
    String? pair,
    String? side,
    String? amount,
    String? status,
    String? createdAt,
    String? logoUrl,
    String? counterparty,
    String? paymentMethod,
    P2POrderState? orderState,
    double? fiatAmount,
    double? usdtAmount,
    double? pricePerUsdt,
    double? feeUsdt,
    int? createdAtMs,
    int? expiresAtMs,
    bool? escrowLocked,
    bool? escrowReleased,
    String? cancelReason,
    String? disputeReason,
    String? appealStatus,
    String? appealProofPath,
    int? appealOpenedAtMs,
    String? buyerWallet,
    String? sellerWallet,
    String? escrowWallet,
    bool? isFrozen,
    bool? fraudFlag,
    int? unreadMessages,
    String? paymentProofPath,
  }) {
    return P2POrderItem(
      id: id ?? this.id,
      pair: pair ?? this.pair,
      side: side ?? this.side,
      amount: amount ?? this.amount,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      logoUrl: logoUrl ?? this.logoUrl,
      counterparty: counterparty ?? this.counterparty,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      orderState: orderState ?? this.orderState,
      fiatAmount: fiatAmount ?? this.fiatAmount,
      usdtAmount: usdtAmount ?? this.usdtAmount,
      pricePerUsdt: pricePerUsdt ?? this.pricePerUsdt,
      feeUsdt: feeUsdt ?? this.feeUsdt,
      createdAtMs: createdAtMs ?? this.createdAtMs,
      expiresAtMs: expiresAtMs ?? this.expiresAtMs,
      escrowLocked: escrowLocked ?? this.escrowLocked,
      escrowReleased: escrowReleased ?? this.escrowReleased,
      cancelReason: cancelReason ?? this.cancelReason,
      disputeReason: disputeReason ?? this.disputeReason,
      appealStatus: appealStatus ?? this.appealStatus,
      appealProofPath: appealProofPath ?? this.appealProofPath,
      appealOpenedAtMs: appealOpenedAtMs ?? this.appealOpenedAtMs,
      buyerWallet: buyerWallet ?? this.buyerWallet,
      sellerWallet: sellerWallet ?? this.sellerWallet,
      escrowWallet: escrowWallet ?? this.escrowWallet,
      isFrozen: isFrozen ?? this.isFrozen,
      fraudFlag: fraudFlag ?? this.fraudFlag,
      unreadMessages: unreadMessages ?? this.unreadMessages,
      paymentProofPath: paymentProofPath ?? this.paymentProofPath,
    );
  }
}

double _parseNumericValue(String input) {
  final normalized = input.toUpperCase().replaceAll(',', '').trim();
  final match = RegExp(
    r'([0-9]+(?:\.[0-9]+)?)([KMBT]?)',
  ).firstMatch(normalized);
  if (match == null) return 0;
  final base = double.tryParse(match.group(1) ?? '') ?? 0;
  final suffix = match.group(2) ?? '';
  if (suffix == 'K') return base * 1000;
  if (suffix == 'M') return base * 1000000;
  if (suffix == 'B') return base * 1000000000;
  if (suffix == 'T') return base * 1000000000000;
  return base;
}

String _formatWithCommas(num value, {int decimals = 2}) {
  final fixed = value.toStringAsFixed(decimals);
  final parts = fixed.split('.');
  final intPart = parts.first.replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (m) => ',',
  );
  if (decimals <= 0) return intPart;
  return '$intPart.${parts.last}';
}

String _formatCompactVolume(double value) {
  if (value >= 1000000000) {
    return '${(value / 1000000000).toStringAsFixed(2)}B USDT';
  }
  if (value >= 1000000) {
    return '${(value / 1000000).toStringAsFixed(2)}M USDT';
  }
  if (value >= 1000) {
    return '${(value / 1000).toStringAsFixed(2)}K USDT';
  }
  return '${value.toStringAsFixed(0)} USDT';
}

double _parsePercentValue(String change) {
  final cleaned = change.replaceAll('%', '').replaceAll('+', '').trim();
  return double.tryParse(cleaned) ?? 0;
}

String _maskIdentity(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) return '';
  if (trimmed.contains('@')) {
    final parts = trimmed.split('@');
    final name = parts.first;
    final domain = parts.last;
    final safeName = name.length <= 2
        ? '${name[0]}*'
        : '${name.substring(0, 2)}***';
    final safeDomain = domain.length <= 3
        ? domain
        : '${domain.substring(0, 2)}***';
    return '$safeName@$safeDomain';
  }
  final digits = trimmed.replaceAll(RegExp(r'\D'), '');
  if (digits.length < 4) return '***';
  return '${digits.substring(0, 2)}****${digits.substring(digits.length - 2)}';
}

class AuthOtpService {
  static const List<String> _requestPaths = <String>[
    '/auth/send-otp',
    '/api/auth/send-otp',
    '/api/auth/otp/request',
  ];
  static const List<String> _verifyPaths = <String>[
    '/auth/verify-otp',
    '/api/auth/verify-otp',
    '/api/auth/otp/verify',
  ];

  static Future<OtpRequestResult> requestOtp(String identity) async {
    for (final base in _apiBaseUrls()) {
      for (final path in _requestPaths) {
        final response = await _postJson(
          uri: _apiUri(base, path),
          payload: <String, dynamic>{
            'contact': identity,
            'identity': identity,
            'email': identity,
            'channel': identity.contains('@') ? 'email' : 'sms',
          },
        );
        if (!response.ok || response.bodyMap == null) continue;
        final decoded = response.bodyMap!;
        final message = (decoded['message'] ?? 'OTP sent successfully')
            .toString();
        return OtpRequestResult(
          success: true,
          backendSent: true,
          message: message,
        );
      }
    }

    await Future<void>.delayed(const Duration(milliseconds: 450));
    return OtpRequestResult(
      success: false,
      backendSent: false,
      message:
          'Unable to send verification code right now. Please try again in a moment.',
    );
  }

  static Future<bool> verifyOtp({
    required String identity,
    required String otp,
  }) async {
    final trimmed = otp.trim();
    final displayName = _displayNameFromIdentity(identity);
    for (final base in _apiBaseUrls()) {
      for (final path in _verifyPaths) {
        final response = await _postJson(
          uri: _apiUri(base, path),
          payload: <String, dynamic>{
            'contact': identity,
            'identity': identity,
            'otp': trimmed,
            'code': trimmed,
            'name': displayName,
          },
        );
        if (!response.ok || response.bodyMap == null) continue;
        final decoded = response.bodyMap!;
        final ok =
            decoded['success'] == true ||
            decoded['verified'] == true ||
            decoded['status']?.toString().toLowerCase() == 'verified' ||
            decoded['status']?.toString().toLowerCase() == 'success' ||
            response.statusCode == 201;
        if (ok) return true;
      }
    }
    return false;
  }

  static Future<_HttpJsonResponse> _postJson({
    required Uri uri,
    required Map<String, dynamic> payload,
  }) async {
    final client = HttpClient()
      ..connectionTimeout = const Duration(seconds: 10);
    try {
      final req = await client.postUrl(uri);
      req.headers.contentType = ContentType.json;
      req.add(utf8.encode(jsonEncode(payload)));
      final resp = await req.close();
      final body = await resp.transform(utf8.decoder).join();
      Map<String, dynamic>? bodyMap;
      try {
        final decoded = jsonDecode(body);
        if (decoded is Map<String, dynamic>) {
          bodyMap = decoded;
        }
      } catch (_) {
        bodyMap = null;
      }
      final bool ok =
          resp.statusCode >= 200 &&
          resp.statusCode < 300 &&
          (bodyMap == null ||
              bodyMap['success'] == true ||
              bodyMap['status']?.toString().toLowerCase() == 'success' ||
              bodyMap['message'] != null);
      return _HttpJsonResponse(
        ok: ok,
        statusCode: resp.statusCode,
        bodyMap: bodyMap,
      );
    } catch (_) {
      return const _HttpJsonResponse(ok: false, statusCode: 0, bodyMap: null);
    } finally {
      client.close(force: true);
    }
  }
}

class _HttpJsonResponse {
  const _HttpJsonResponse({
    required this.ok,
    required this.statusCode,
    required this.bodyMap,
  });

  final bool ok;
  final int statusCode;
  final Map<String, dynamic>? bodyMap;
}

String _displayNameFromIdentity(String identity) {
  final raw = identity.trim();
  if (raw.isEmpty) return 'Exchange User';
  if (raw.contains('@')) {
    final local = raw.split('@').first;
    if (local.trim().isNotEmpty) return local.trim();
  }
  final digits = raw.replaceAll(RegExp(r'\D'), '');
  if (digits.length >= 4) {
    return 'User ${digits.substring(digits.length - 4)}';
  }
  return 'Exchange User';
}

class OtpRequestResult {
  const OtpRequestResult({
    required this.success,
    required this.backendSent,
    required this.message,
  });

  final bool success;
  final bool backendSent;
  final String message;
}

class LiveMarketService {
  static final Uri _marketsUri = Uri.parse(
    'https://api.coingecko.com/api/v3/coins/markets'
    '?vs_currency=usd'
    '&order=market_cap_desc'
    '&per_page=120'
    '&page=1'
    '&sparkline=false'
    '&price_change_percentage=24h',
  );

  Future<List<MarketPair>> fetchPairs() async {
    final client = HttpClient()..connectionTimeout = const Duration(seconds: 8);
    try {
      final request = await client.getUrl(_marketsUri);
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      final response = await request.close();
      if (response.statusCode != 200) {
        throw Exception('Market API status ${response.statusCode}');
      }
      final body = await response.transform(utf8.decoder).join();
      final decoded = jsonDecode(body);
      if (decoded is! List) throw Exception('Invalid market response');
      final pairs = <MarketPair>[];
      for (final item in decoded) {
        if (item is! Map<String, dynamic>) continue;
        final symbol = (item['symbol'] ?? '').toString().toUpperCase();
        if (symbol.isEmpty) continue;
        final double priceNum =
            (item['current_price'] as num?)?.toDouble() ?? 0;
        final double changeNum =
            (item['price_change_percentage_24h'] as num?)?.toDouble() ?? 0;
        final double volumeNum =
            (item['total_volume'] as num?)?.toDouble() ?? 0;
        final decimals = priceNum >= 1000
            ? 2
            : priceNum >= 1
            ? 4
            : 6;
        final changeSign = changeNum >= 0 ? '+' : '';
        pairs.add(
          MarketPair(
            symbol: '$symbol/USDT',
            price: _formatWithCommas(priceNum, decimals: decimals),
            change: '$changeSign${changeNum.toStringAsFixed(2)}%',
            logoUrl: (item['image'] ?? '').toString(),
            volume: _formatCompactVolume(volumeNum),
          ),
        );
      }
      return pairs.where((pair) => pair.symbol != '/USDT').toList();
    } finally {
      client.close(force: true);
    }
  }
}

class UserAvatar extends StatelessWidget {
  const UserAvatar({super.key, this.radius = 20});

  final double radius;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<String?>(
      valueListenable: profileImagePathNotifier,
      builder: (context, imagePath, child) {
        if (imagePath != null && imagePath.isNotEmpty) {
          return CircleAvatar(
            radius: radius,
            backgroundColor: const Color(0xFF1B273D),
            backgroundImage: FileImage(File(imagePath)),
          );
        }

        return ValueListenableBuilder<String>(
          valueListenable: avatarSymbolNotifier,
          builder: (context, symbol, child) {
            return CircleAvatar(
              radius: radius,
              backgroundColor: const Color(0xFF25324A),
              child: Text(
                symbol,
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: radius * 0.9,
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class CoinLogo extends StatelessWidget {
  const CoinLogo({
    super.key,
    required this.url,
    required this.fallback,
    this.size = 24,
  });

  final String url;
  final String fallback;
  final double size;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(size / 2),
      child: Image.network(
        url,
        width: size,
        height: size,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) {
          return Container(
            width: size,
            height: size,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: const Color(0xFF1B273D),
              borderRadius: BorderRadius.circular(size / 2),
            ),
            child: Text(
              fallback.isNotEmpty ? fallback[0] : '?',
              style: TextStyle(
                fontSize: size * 0.45,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          );
        },
      ),
    );
  }
}

const List<MarketPair> kMarketPairs = [
  MarketPair(
    symbol: 'BTC/USDT',
    price: '62,559.38',
    change: '-0.70%',
    logoUrl: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
    volume: '43.24M USDT',
  ),
  MarketPair(
    symbol: 'ETH/USDT',
    price: '3,230.76',
    change: '+0.96%',
    logoUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    volume: '84.70M USDT',
  ),
  MarketPair(
    symbol: 'SOL/USDT',
    price: '143.60',
    change: '-0.96%',
    logoUrl: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
    volume: '3.24M USDT',
  ),
  MarketPair(
    symbol: 'XRP/USDT',
    price: '0.6236',
    change: '+0.58%',
    logoUrl:
        'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
    volume: '5.18M USDT',
  ),
  MarketPair(
    symbol: 'BNB/USDT',
    price: '591.75',
    change: '+0.30%',
    logoUrl:
        'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
    volume: '2.87M USDT',
  ),
  MarketPair(
    symbol: 'DOGE/USDT',
    price: '0.0930',
    change: '-0.97%',
    logoUrl: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
    volume: '8.49M USDT',
  ),
];
final ValueNotifier<MarketPair> selectedTradePairNotifier =
    ValueNotifier<MarketPair>(kMarketPairs.first);

const List<P2PAdItem> kP2PSampleAds = <P2PAdItem>[];

const List<P2POrderItem> kP2PSampleOrders = <P2POrderItem>[];

final List<AssetTransactionRecord> kAssetTxHistory = <AssetTransactionRecord>[];

class P2PApiEndpoints {
  static const String offers = '/p2p/offers';
  static const String createOrder = '/p2p/order/create';
  static const String payOrder = '/p2p/order/pay';
  static const String releaseOrder = '/p2p/order/release';
  static const String cancelOrder = '/p2p/order/cancel';
  static const String disputeOrder = '/p2p/appeal';
  static const String disputes = '/p2p/disputes';
  static const String chat = '/p2p/chat';
}

class P2PAdminLog {
  const P2PAdminLog({
    required this.time,
    required this.action,
    required this.target,
    required this.meta,
  });

  final DateTime time;
  final String action;
  final String target;
  final String meta;
}

class P2PAppealTicket {
  const P2PAppealTicket({
    required this.orderId,
    required this.buyer,
    required this.seller,
    required this.amount,
    required this.paymentProofPath,
    required this.appealReason,
    required this.chatSummary,
    required this.createdAt,
    this.status = 'UNDER REVIEW',
  });

  final String orderId;
  final String buyer;
  final String seller;
  final String amount;
  final String paymentProofPath;
  final String appealReason;
  final String chatSummary;
  final DateTime createdAt;
  final String status;
}

class P2PEscrowEngine {
  P2PEscrowEngine({
    Map<String, double>? sellerBalances,
    Map<String, double>? buyerBalances,
  }) : _sellerBalances = sellerBalances ?? <String, double>{},
       _buyerBalances = buyerBalances ?? <String, double>{};

  final Map<String, double> _sellerBalances;
  final Map<String, double> _buyerBalances;
  final Map<String, double> _escrowBalances = <String, double>{};

  double sellerBalance(String seller) => _sellerBalances[seller] ?? 0;
  double buyerBalance(String buyer) => _buyerBalances[buyer] ?? 0;
  double escrowBalance(String orderId) => _escrowBalances[orderId] ?? 0;

  bool lockSeller(String seller, String orderId, double usdtAmount) {
    final current = _sellerBalances[seller] ?? 20000;
    if (current < usdtAmount) return false;
    _sellerBalances[seller] = current - usdtAmount;
    _escrowBalances[orderId] = usdtAmount;
    return true;
  }

  bool releaseToBuyer(String buyer, String orderId) {
    final locked = _escrowBalances[orderId] ?? 0;
    if (locked <= 0) return false;
    _escrowBalances.remove(orderId);
    _buyerBalances[buyer] = (_buyerBalances[buyer] ?? 0) + locked;
    return true;
  }

  bool refundToSeller(String seller, String orderId) {
    final locked = _escrowBalances[orderId] ?? 0;
    if (locked <= 0) return false;
    _escrowBalances.remove(orderId);
    _sellerBalances[seller] = (_sellerBalances[seller] ?? 0) + locked;
    return true;
  }
}

class P2PFraudEngine {
  const P2PFraudEngine();

  bool isHighRisk({
    required double fiatAmount,
    required P2PAdItem ad,
    required String paymentMethod,
  }) {
    final highAmount = fiatAmount > 250000;
    final lowRate = _parseNumericValue(ad.completionRate30d) < 92;
    final riskyPayment = paymentMethod.toLowerCase().contains('cash');
    return highAmount || lowRate || riskyPayment;
  }
}

class P2PApiService {
  P2PApiService({P2PEscrowEngine? escrowEngine, P2PFraudEngine? fraudEngine})
    : _escrowEngine = escrowEngine ?? P2PEscrowEngine(),
      _fraudEngine = fraudEngine ?? const P2PFraudEngine();

  final P2PEscrowEngine _escrowEngine;
  final P2PFraudEngine _fraudEngine;

  Future<List<P2PAdItem>> getOffers(List<P2PAdItem> source) async {
    await Future<void>.delayed(const Duration(milliseconds: 220));
    return source;
  }

  Future<P2POrderItem> createOrder({
    required P2PAdItem ad,
    required String buyerId,
    required String side,
    required double fiatAmount,
    required String fiatCurrency,
    required String paymentMethod,
    required String orderId,
    required DateTime now,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 320));
    final usdtAmount = fiatAmount / (ad.priceValue <= 0 ? 1 : ad.priceValue);
    final canLock = _escrowEngine.lockSeller(ad.seller, orderId, usdtAmount);
    if (!canLock) {
      throw Exception('Unable to lock merchant escrow');
    }
    final bool risk = _fraudEngine.isHighRisk(
      fiatAmount: fiatAmount,
      ad: ad,
      paymentMethod: paymentMethod,
    );
    return P2POrderItem(
      id: orderId,
      pair: ad.pair,
      side: side,
      amount:
          '${fiatAmount.toStringAsFixed(2)} $fiatCurrency • ${usdtAmount.toStringAsFixed(4)} ${ad.pair.split('/').first}',
      status: p2pOrderStateLabel(P2POrderState.created),
      createdAt:
          '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}',
      logoUrl: ad.logoUrl,
      counterparty: ad.seller,
      paymentMethod: paymentMethod,
      orderState: P2POrderState.created,
      fiatAmount: fiatAmount,
      usdtAmount: usdtAmount,
      pricePerUsdt: ad.priceValue,
      feeUsdt: 0,
      createdAtMs: now.millisecondsSinceEpoch,
      expiresAtMs: now.add(const Duration(minutes: 10)).millisecondsSinceEpoch,
      escrowLocked: true,
      buyerWallet: buyerId,
      sellerWallet: ad.seller,
      fraudFlag: risk,
    );
  }

  Future<P2POrderItem> markPaid({
    required P2POrderItem order,
    String? paymentProofPath,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 250));
    return order.copyWith(
      orderState: P2POrderState.paymentSent,
      status: p2pOrderStateLabel(P2POrderState.paymentSent),
      paymentProofPath: paymentProofPath,
    );
  }

  Future<P2POrderItem> markSellerConfirming(P2POrderItem order) async {
    await Future<void>.delayed(const Duration(milliseconds: 200));
    return order.copyWith(
      orderState: P2POrderState.sellerConfirming,
      status: p2pOrderStateLabel(P2POrderState.sellerConfirming),
    );
  }

  Future<P2POrderItem> releaseOrder({
    required P2POrderItem order,
    required String buyerId,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 240));
    final ok = _escrowEngine.releaseToBuyer(buyerId, order.id);
    return order.copyWith(
      orderState: P2POrderState.completed,
      status: p2pOrderStateLabel(P2POrderState.completed),
      escrowReleased: ok,
    );
  }

  Future<P2POrderItem> cancelOrder({
    required P2POrderItem order,
    required String reason,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 240));
    const cancellableStates = <P2POrderState>{
      P2POrderState.created,
      P2POrderState.awaitingPayment,
    };
    if (!cancellableStates.contains(order.orderState)) {
      throw Exception('Order cannot be cancelled after payment is marked sent');
    }
    _escrowEngine.refundToSeller(order.counterparty, order.id);
    return order.copyWith(
      orderState: P2POrderState.cancelled,
      status: p2pOrderStateLabel(P2POrderState.cancelled),
      cancelReason: reason,
      escrowLocked: false,
    );
  }

  Future<P2POrderItem> raiseDispute({
    required P2POrderItem order,
    required String reason,
    required String paymentProofPath,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 260));
    return order.copyWith(
      orderState: P2POrderState.appealOpened,
      status: p2pOrderStateLabel(P2POrderState.appealOpened),
      disputeReason: reason,
      appealStatus: p2pOrderStateLabel(P2POrderState.underReview),
      appealProofPath: paymentProofPath,
      appealOpenedAtMs: DateTime.now().millisecondsSinceEpoch,
      paymentProofPath: paymentProofPath,
    );
  }

  Future<List<Map<String, String>>> getChat({
    required String orderId,
    required String seller,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 150));
    final now = DateTime.now();
    final hh = now.hour.toString().padLeft(2, '0');
    final mm = now.minute.toString().padLeft(2, '0');
    return <Map<String, String>>[
      {
        'type': 'system',
        'text': 'Welcome to secure P2P chat. Order $orderId',
        'time': '$hh:$mm',
      },
      {
        'type': 'text',
        'text': 'Hello, I am $seller. Pay and share proof here.',
        'time': '$hh:$mm',
      },
    ];
  }
}

const List<String> kMarketNotices = [
  'Notice: P2P order release time improved for verified users.',
  'System: BTC/USDT futures maintenance window completed successfully.',
  'Security: Enable 2FA for safer withdrawals and P2P trading.',
  'Update: New merchant ads are now live in P2P marketplace.',
];

const Map<String, List<String>> kCoinNetworkBook = {
  'USDT': ['TRC20', 'ERC20', 'BEP20'],
  'BTC': ['BTC'],
  'ETH': ['ERC20', 'BEP20'],
  'BNB': ['BEP20'],
  'SOL': ['SOL'],
  'XRP': ['XRP'],
  'DOGE': ['DOGE'],
};

class ChainNetworkMeta {
  const ChainNetworkMeta({
    required this.code,
    required this.display,
    required this.feeUsdt,
    required this.minDepositUsdt,
    required this.minWithdrawUsdt,
    required this.arrival,
  });

  final String code;
  final String display;
  final double feeUsdt;
  final double minDepositUsdt;
  final double minWithdrawUsdt;
  final String arrival;
}

const Map<String, ChainNetworkMeta> kNetworkMeta = {
  'TRC20': ChainNetworkMeta(
    code: 'TRC20',
    display: 'Tron (TRC20)',
    feeUsdt: 1.0,
    minDepositUsdt: 1,
    minWithdrawUsdt: 10,
    arrival: '≈ 1 min',
  ),
  'BEP20': ChainNetworkMeta(
    code: 'BEP20',
    display: 'BNB Smart Chain (BEP20)',
    feeUsdt: 0.01,
    minDepositUsdt: 1,
    minWithdrawUsdt: 10,
    arrival: '≈ 1 min',
  ),
  'ERC20': ChainNetworkMeta(
    code: 'ERC20',
    display: 'Ethereum (ERC20)',
    feeUsdt: 0.5,
    minDepositUsdt: 5,
    minWithdrawUsdt: 15,
    arrival: '≈ 5-15 mins',
  ),
  'APTOS': ChainNetworkMeta(
    code: 'APTOS',
    display: 'Aptos',
    feeUsdt: 0.02,
    minDepositUsdt: 1,
    minWithdrawUsdt: 10,
    arrival: '≈ 1 min',
  ),
  'OPBNB': ChainNetworkMeta(
    code: 'OPBNB',
    display: 'opBNB',
    feeUsdt: 0.015,
    minDepositUsdt: 1,
    minWithdrawUsdt: 10,
    arrival: '≈ 1 min',
  ),
  'BTC': ChainNetworkMeta(
    code: 'BTC',
    display: 'Bitcoin',
    feeUsdt: 5.0,
    minDepositUsdt: 0.0001,
    minWithdrawUsdt: 0.0005,
    arrival: '≈ 10-30 mins',
  ),
  'SOL': ChainNetworkMeta(
    code: 'SOL',
    display: 'Solana',
    feeUsdt: 0.01,
    minDepositUsdt: 0.1,
    minWithdrawUsdt: 1,
    arrival: '≈ 1 min',
  ),
  'XRP': ChainNetworkMeta(
    code: 'XRP',
    display: 'Ripple',
    feeUsdt: 0.1,
    minDepositUsdt: 1,
    minWithdrawUsdt: 5,
    arrival: '≈ 1-2 mins',
  ),
};

class SupportHelpArticle {
  const SupportHelpArticle({
    required this.id,
    required this.title,
    required this.category,
    required this.body,
    this.description = '',
    this.lastUpdated = 'Updated recently',
    this.related = const <String>[],
  });

  final String id;
  final String title;
  final String category;
  final String body;
  final String description;
  final String lastUpdated;
  final List<String> related;
}

class SupportQuickCategory {
  const SupportQuickCategory(this.title, this.questions);

  final String title;
  final List<String> questions;
}

class CoinServiceStatus {
  const CoinServiceStatus({
    required this.symbol,
    required this.name,
    required this.depositEnabled,
    required this.withdrawEnabled,
    required this.networkStatus,
    required this.maintenanceAlert,
    required this.networks,
  });

  final String symbol;
  final String name;
  final bool depositEnabled;
  final bool withdrawEnabled;
  final String networkStatus;
  final String maintenanceAlert;
  final List<ChainNetworkMeta> networks;
}

class SubmittedSupportTicket {
  const SubmittedSupportTicket({
    required this.ticketId,
    required this.uid,
    required this.email,
    required this.category,
    required this.subcategory,
    required this.subject,
    required this.description,
    required this.createdAt,
    this.orderId,
    this.attachmentName,
    this.disputeStatus,
    this.status = 'OPEN',
  });

  final String ticketId;
  final String uid;
  final String email;
  final String category;
  final String subcategory;
  final String subject;
  final String description;
  final DateTime createdAt;
  final String? orderId;
  final String? attachmentName;
  final String? disputeStatus;
  final String status;
}

const List<String> kHelpCenterMainCategories = <String>[
  'Account Management',
  'Security',
  'P2P Trading',
  'Deposits',
  'Withdrawals',
  'Trading',
  'API',
  'Finance',
  'NFT',
];

const Map<String, List<String>> kSubmitCaseSubcategories =
    <String, List<String>>{
      'Deposit & Withdrawals': <String>[
        'Crypto deposit not credited',
        'Crypto withdrawal delayed',
        'Wrong network transfer',
        'Withdrawal verification failed',
        'My issue is not listed above',
      ],
      'P2P Trading': <String>[
        'Asset not available on P2P',
        'Asset frozen after P2P order closed',
        'Export P2P order data',
        'Issues adding P2P payment method',
        'P2P Advertiser inquiry',
        'How to post P2P advertisement',
        'Report other P2P users',
        'Completion rate appeal',
        'Change P2P nickname',
        'Remove negative reviews',
        'Coin release in progress',
        'Appeal in progress',
        'My issue is not listed above',
      ],
      'Account Verification (KYC)': <String>[
        'KYC pending for long time',
        'KYC rejected',
        'Face verification failed',
        'Name mismatch',
        'My issue is not listed above',
      ],
      'Security Issues': <String>[
        'Verification code not received',
        'Account frozen',
        'Suspicious login',
        '2FA reset request',
        'My issue is not listed above',
      ],
      'Trading Issues': <String>[
        'Order not executed',
        'Chart mismatch',
        'API order failure',
        'Fee issue',
        'My issue is not listed above',
      ],
      'Other Issues': <String>[
        'General inquiry',
        'Promotion issue',
        'Referral issue',
        'My issue is not listed above',
      ],
    };

const List<String> kP2PDisputeStatuses = <String>[
  'Coin release in progress',
  'Appeal in progress',
  'Canceled',
  'Completed',
  'Reached maximum appeal limit',
];

final List<CoinServiceStatus> kCoinServiceStatuses = <CoinServiceStatus>[
  CoinServiceStatus(
    symbol: 'BTC',
    name: 'Bitcoin',
    depositEnabled: true,
    withdrawEnabled: true,
    networkStatus: 'Operational',
    maintenanceAlert: 'No active maintenance',
    networks: <ChainNetworkMeta>[kNetworkMeta['BTC']!],
  ),
  CoinServiceStatus(
    symbol: 'ETH',
    name: 'Ethereum',
    depositEnabled: true,
    withdrawEnabled: true,
    networkStatus: 'Operational',
    maintenanceAlert: 'No active maintenance',
    networks: <ChainNetworkMeta>[kNetworkMeta['ERC20']!],
  ),
  CoinServiceStatus(
    symbol: 'USDT',
    name: 'Tether',
    depositEnabled: true,
    withdrawEnabled: true,
    networkStatus: 'Operational',
    maintenanceAlert: 'TRC20 low-latency mode active',
    networks: <ChainNetworkMeta>[
      kNetworkMeta['TRC20']!,
      kNetworkMeta['BEP20']!,
      kNetworkMeta['ERC20']!,
      kNetworkMeta['APTOS']!,
      kNetworkMeta['OPBNB']!,
    ],
  ),
  CoinServiceStatus(
    symbol: 'USDC',
    name: 'USD Coin',
    depositEnabled: true,
    withdrawEnabled: true,
    networkStatus: 'Operational',
    maintenanceAlert: 'No active maintenance',
    networks: <ChainNetworkMeta>[
      kNetworkMeta['ERC20']!,
      kNetworkMeta['BEP20']!,
    ],
  ),
  CoinServiceStatus(
    symbol: 'XRP',
    name: 'Ripple',
    depositEnabled: true,
    withdrawEnabled: true,
    networkStatus: 'Operational',
    maintenanceAlert: 'Tag validation required for deposit',
    networks: <ChainNetworkMeta>[kNetworkMeta['XRP']!],
  ),
  CoinServiceStatus(
    symbol: 'TRX',
    name: 'Tron',
    depositEnabled: true,
    withdrawEnabled: true,
    networkStatus: 'Operational',
    maintenanceAlert: 'No active maintenance',
    networks: <ChainNetworkMeta>[kNetworkMeta['TRC20']!],
  ),
  CoinServiceStatus(
    symbol: 'SOL',
    name: 'Solana',
    depositEnabled: true,
    withdrawEnabled: false,
    networkStatus: 'Withdrawal maintenance',
    maintenanceAlert: 'Temporary withdrawal suspension due to network upgrade',
    networks: <ChainNetworkMeta>[kNetworkMeta['SOL']!],
  ),
  CoinServiceStatus(
    symbol: 'MNT',
    name: 'Mantle',
    depositEnabled: false,
    withdrawEnabled: false,
    networkStatus: 'Maintenance',
    maintenanceAlert:
        'Deposits and withdrawals suspended during wallet migration',
    networks: <ChainNetworkMeta>[kNetworkMeta['ERC20']!],
  ),
  CoinServiceStatus(
    symbol: 'HMSTR',
    name: 'Hamster Kombat',
    depositEnabled: false,
    withdrawEnabled: true,
    networkStatus: 'Partial suspension',
    maintenanceAlert: 'Deposits suspended due to chain sync delay',
    networks: <ChainNetworkMeta>[kNetworkMeta['BEP20']!],
  ),
];

const List<SupportQuickCategory> kSupportQuickCategories = [
  SupportQuickCategory('Account & Security', [
    'Verification code not received',
    'Why is my crypto asset frozen?',
    'Account is susceptible to high risk',
    'How do I protect my account from phishing?',
  ]),
  SupportQuickCategory('Deposit & Withdrawal', [
    'Crypto deposit not credited',
    'How to submit a withdrawal',
    'Network fee and minimum amount details',
    'Wrong network transfer recovery process',
  ]),
  SupportQuickCategory('P2P', [
    'P2P order issue',
    'How to open dispute',
    'Merchant not releasing crypto',
    'How long does a P2P appeal take?',
  ]),
  SupportQuickCategory('Identity Verification', [
    'How to complete KYC',
    'Identity verification failed',
    'Name is incorrect after verification',
    'Face match failed during advanced KYC',
  ]),
  SupportQuickCategory('Promotion & Bonus', [
    "I didn't receive my rewards",
    'Reward distribution information',
    'Voucher and coupon not applied',
    'Promotion eligibility check',
  ]),
];

const List<SupportHelpArticle> kSupportHelpArticles = [
  SupportHelpArticle(
    id: 'account-security-guide',
    title: 'Account & Security - Full Guide',
    category: 'Account & Security',
    body: '''Account & Security Full Guide

1) Verification code not received
- Check spam/junk and promotions tabs.
- Make sure your mailbox has free space and no filter blocking exchange emails.
- Wait for the timer to reset, then request a fresh OTP and use the latest code only.
- Switch your network (Wi-Fi/mobile data) and retry.
- If SMS OTP fails, disable anti-spam/call blockers and retry in 2-3 minutes.

2) Account flagged as high risk
- A temporary risk flag can happen after unusual login location, device change, or multiple failed attempts.
- Secure your account immediately: change password, reset 2FA, and review device sessions.
- Complete KYC and submit security verification from the support center to remove restrictions.

3) Asset frozen / withdraw suspended
- Funds can be frozen by risk control if suspicious activity, compliance review, or unresolved disputes are detected.
- Resolve pending P2P disputes, security tickets, and KYC review first.
- Provide source-of-funds proof if asked by compliance.

4) Best practices (must do)
- Enable Email + Authenticator + Fund Password.
- Never share OTP, 2FA code, API keys, or screen-share your wallet section.
- Use anti-phishing code and trusted devices only.

If you still face issues, tap "Chat with us" and share UID, device model, and error screenshot.''',
  ),
  SupportHelpArticle(
    id: 'deposit-withdraw-guide',
    title: 'Deposit & Withdrawal - Full Guide',
    category: 'Deposit & Withdrawal',
    body: '''Deposit & Withdrawal Full Guide

Deposit flow:
1) Assets -> Deposit -> Select Coin -> Select Network.
2) Confirm chain details carefully (TRC20/BEP20/ERC20/APTOS/OPBNB).
3) Copy address and memo/tag (if required).
4) Send only supported coin on matching network.
5) Wait for blockchain confirmations.

Deposit not credited checklist:
- Wrong network selected
- Amount below minimum deposit
- Transaction still unconfirmed on-chain
- Missing memo/tag where required
- Network maintenance window

Withdrawal flow:
1) Assets -> Withdraw -> Select Coin + Network.
2) Add valid destination address.
3) Enter amount and confirm fee + receive amount.
4) Complete security checks (Email OTP / SMS OTP / Google Auth / Fund Password).
5) Submit and track status in withdrawal history.

Withdrawal failed / pending:
- Security lock after password/2FA change
- Risk-control hold due to abnormal behavior
- Insufficient available balance after fee deduction
- Chain congestion

Never withdraw to unsupported chains. Wrong-chain transfers can be irreversible.''',
  ),
  SupportHelpArticle(
    id: 'p2p-guide',
    title: 'P2P Trading - Full Guide',
    category: 'P2P',
    body: '''P2P Full Guide

How to buy:
1) Open P2P -> Buy tab.
2) Filter by INR amount and payment method.
3) Choose verified merchant (completion rate, release time, limits).
4) Enter INR or USDT amount and create order.
5) Transfer payment exactly as shown and click "I Have Paid".
6) Wait for merchant release.

How to sell:
1) Open P2P -> Sell tab.
2) Select buyer and create order.
3) Wait until payment is received in your bank/app.
4) Confirm funds received before releasing crypto.

Important protection rules:
- Never release crypto without receiving money.
- Never chat/settle outside in-order chat.
- Use exact payment reference rules.
- Keep screenshots and UTR/transaction ID.

Appeal process:
- If buyer marked paid but funds not received, open dispute.
- If seller does not release after valid payment, open dispute.
- Upload payment proof, bank receipt, and chat evidence.
- Admin reviews order log, chat log, and proof before final decision.

Order states:
CREATED -> AWAITING_PAYMENT -> PAYMENT_SENT -> SELLER_CONFIRMING -> COMPLETED
Fallback states: CANCELLED / APPEAL_OPENED / UNDER_REVIEW

This workflow keeps crypto locked in escrow until safe release.''',
  ),
  SupportHelpArticle(
    id: 'kyc-full-guide',
    title: 'Identity Verification - Full Guide',
    category: 'Identity Verification',
    body: '''Identity Verification (KYC) Guide

Level 1 (Basic):
- Full legal name
- Date of birth
- Country / address basics

Level 2 (Advanced):
- Government ID front image
- Government ID back image
- Selfie with live face match and liveness check

KYC rejection reasons:
- Blurry photo / cropped corners
- Glare, reflection, low light
- Name mismatch between profile and ID
- Unsupported document type
- Face mismatch / liveness failure

How to pass in first attempt:
- Use bright natural light
- Keep full document in frame
- Do not edit image
- Remove glasses/mask during face check
- Ensure stable internet during upload

If rejected, re-upload clear images and contact support with rejection code.''',
  ),
  SupportHelpArticle(
    id: 'promotion-bonus-guide',
    title: 'Promotion & Bonus - Full Guide',
    category: 'Promotion & Bonus',
    body: '''Promotion & Bonus Guide

Reward credit timing:
- Most campaign rewards are credited within 7 working days after campaign settlement.
- Some campaigns require KYC + minimum volume + eligible region.

Why reward may not arrive:
- Campaign conditions not fully met
- Order volume not counted due to disallowed pair/type
- Reward window still open
- Account ineligible due to compliance/risk checks

Coupons / vouchers:
- Apply only on eligible products (spot/futures/p2p as specified).
- Expired vouchers cannot be restored.
- One voucher may not stack with another if rule blocks it.

How to raise reward claim:
1) Open Support -> Promotion & Bonus.
2) Share campaign name, UID, order IDs, and screenshots.
3) Support verifies with campaign backend and replies with result.''',
  ),
  SupportHelpArticle(
    id: 'verification-email',
    title: 'Verification code not received - Email',
    category: 'Account & Security',
    body:
        '''If you have not received your email verification code, follow this full checklist:

1) Inbox and filters
- Check Inbox, Promotions, Spam, Junk, and Updates tabs.
- Search by keywords: verification, security code.
- Remove any mailbox rule that auto-archives or auto-deletes exchange emails.

2) Safe sender setup
- Add official support/notification domains to your safe sender list.
- Whitelist no-reply and service addresses in your email provider settings.

3) Request OTP correctly
- Wait until the 120-second timer resets.
- Request a fresh OTP once and use only the latest code.
- Avoid repeated requests in a short window (older codes become invalid).

4) Device and network checks
- Switch Wi-Fi/mobile data and retry.
- Disable VPN/Proxy briefly and test again.
- Restart app and device, then request again.

5) Still not received?
- Open Chat with us and share UID, exact request timestamp, email provider, and screenshot.
- Support will verify mail logs and help with account-side validation.''',
  ),
  SupportHelpArticle(
    id: 'verification-sms',
    title: 'Verification code not received - SMS',
    category: 'Account & Security',
    body: '''If SMS OTP is delayed or missing, use this troubleshooting flow:

1) Signal and network
- Ensure strong mobile signal and active SMS plan.
- Move to open network area or switch 5G/4G if delivery is unstable.

2) Device restrictions
- Disable call/SMS blocker, anti-spam, firewall, and security apps temporarily.
- Check blocked sender list and unblock service short codes.

3) Request pattern
- Wait for timer reset and request only one new OTP.
- Use only most recent OTP; older OTPs are invalid after new request.

4) Carrier and region checks
- Confirm your SIM can receive transactional/short-code messages.
- Roaming SIMs may face delays depending on local telecom rules.

5) Escalation
- If issue persists, chat with support and provide country code, masked number, UID, and request time.
- Support can cross-check SMS gateway delivery attempts.''',
  ),
  SupportHelpArticle(
    id: 'deposit-not-credited',
    title: "I haven't received my crypto deposit",
    category: 'Deposit & Withdrawal',
    body: '''Deposit is credited only after chain and account checks pass.

Please verify:
1) Coin + Network match exactly (for example USDT-TRC20 to TRC20 address).
2) Deposit amount is above minimum supported amount.
3) Required confirmations are completed on blockchain explorer.
4) Memo/Tag (if required coin) was included correctly.
5) Network was not under maintenance during transfer.

What to prepare before ticket:
- TXID/Hash
- Coin + network used
- Deposit address screenshot
- Amount + transfer timestamp

Open support with these details and the team can trace credit status quickly.''',
  ),
  SupportHelpArticle(
    id: 'withdraw-howto',
    title: 'How to submit a withdrawal?',
    category: 'Deposit & Withdrawal',
    body: '''To submit withdrawal safely:

1) Open Assets -> Withdraw.
2) Select coin and destination network.
3) Enter wallet address (and Memo/Tag if required).
4) Enter amount and review:
- Network fee
- Minimum withdrawal
- Receive amount after fee
- Estimated arrival time
5) Complete security verification:
- Email OTP
- SMS OTP
- Google Authenticator
- Fund password
6) Submit and track status in withdrawal history.

Important:
- Wrong network can permanently lose funds.
- Keep enough balance for fees.
- Large withdrawals may trigger additional risk checks.''',
  ),
  SupportHelpArticle(
    id: 'reward-info',
    title: "I didn't receive my rewards",
    category: 'Promotion & Bonus',
    body: '''Reward and bonus distribution guide:

1) Distribution timeline
- Most rewards are settled within 7 working days after campaign end.
- Some campaigns release in phases (daily/weekly milestone).

2) Common non-credit reasons
- KYC not completed
- Region not eligible
- Required trade volume not met
- Pair/order type not counted in campaign rules
- Reward claim window expired

3) What to do
- Re-check campaign terms and your qualifying activity.
- Check Coupons/Rewards center for credited vouchers.
- If missing after due date, open ticket with UID, campaign link, order IDs, and screenshots.''',
  ),
  SupportHelpArticle(
    id: 'kyc-guide',
    title: 'Identity verification',
    category: 'Identity Verification',
    body: '''Identity verification has two levels:

Level 1 (Basic):
- Full legal name
- DOB
- Country and basic profile details

Level 2 (Advanced):
- Government ID front image
- Government ID back image
- Live selfie + liveness check

Tips for quick approval:
1) Use clear light and full document in frame.
2) Avoid blur, glare, cropped edges, and edited photos.
3) Ensure profile name exactly matches ID name.
4) Complete face match without mask/sunglasses.

If rejected:
- Read rejection reason
- Re-upload better images
- Contact support if document is valid but repeatedly rejected.''',
  ),
  SupportHelpArticle(
    id: 'p2p-issue',
    title: 'P2P order issue',
    category: 'P2P',
    body: '''P2P issue resolution playbook:

1) Open the exact order and verify current status.
2) Use in-order chat first and keep all communication inside the order.
3) For payment disputes:
- Upload payment screenshot
- Share UTR/reference number
- Mention payment timestamp and method

4) Open appeal when:
- Buyer marked paid but seller not releasing
- Seller did not receive valid payment
- Payment details are incorrect

5) During appeal review:
- Escrow remains locked
- Support checks order log + chat + proof
- Final decision: release to buyer or return to seller

Never complete P2P deal outside platform chat/order.''',
  ),
];

class AssetTransactionRecord {
  const AssetTransactionRecord({
    required this.id,
    required this.type,
    required this.coin,
    required this.amount,
    required this.time,
    required this.status,
    required this.network,
  });

  final String id;
  final String type;
  final String coin;
  final double amount;
  final DateTime time;
  final String status;
  final String network;
}

class ExchangeShell extends StatefulWidget {
  const ExchangeShell({super.key});

  @override
  State<ExchangeShell> createState() => _ExchangeShellState();
}

class _ExchangeShellState extends State<ExchangeShell> {
  int _index = 0;
  bool _announcementCheckedThisSession = false;
  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = [
      HomePage(
        onOpenProfile: _openUserCenter,
        onNavigateTab: _goToTab,
        onOpenTradePair: _openTradePair,
      ),
      MarketsPage(
        onOpenProfile: _openUserCenter,
        onOpenTradePair: _openTradePair,
      ),
      FuturesPage(
        onOpenProfile: _openUserCenter,
        onOpenTradePair: _openTradePair,
      ),
      TradePage(onOpenProfile: _openUserCenter),
      AssetsPage(
        onOpenProfile: _openUserCenter,
        onNavigateTab: _goToTab,
        onOpenTradePair: _openTradePair,
      ),
    ];
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _maybeShowGlobalAnnouncement();
    });
  }

  Future<void> _openUserCenter() async {
    final identity = authIdentityNotifier.value.trim();
    final fallbackIdentity = identity.isNotEmpty
        ? identity
        : nicknameNotifier.value.trim();
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => BitegitUserCenterPage(
          accessToken: authAccessTokenNotifier.value,
          onToggleTheme: () {
            appThemeModeNotifier.value =
                appThemeModeNotifier.value == ThemeMode.dark
                ? ThemeMode.light
                : ThemeMode.dark;
          },
          fallbackIdentity: fallbackIdentity,
          fallbackUid: currentUserUid,
          fallbackNickname: nicknameNotifier.value,
          fallbackAvatarSymbol: avatarSymbolNotifier.value,
          fallbackAvatarPath: profileImagePathNotifier.value,
          onLogout: _logoutActiveSession,
          onNicknameChanged: (value) {
            final trimmed = value.trim();
            if (trimmed.isEmpty) return;
            nicknameNotifier.value = trimmed;
            avatarSymbolNotifier.value = trimmed.substring(0, 1).toUpperCase();
          },
        ),
      ),
    );
    if (mounted) {
      setState(() {});
    }
  }

  void _goToTab(int index) => setState(() => _index = index);

  Future<void> _openTradePair(MarketPair pair) async {
    selectedTradePairNotifier.value = pair;
    if (!mounted) return;
    setState(() => _index = 3);
  }

  Future<void> _maybeShowGlobalAnnouncement() async {
    if (!mounted || _announcementCheckedThisSession) return;
    _announcementCheckedThisSession = true;

    final now = DateTime.now();
    if (_announcementDismissedUntil != null &&
        now.isBefore(_announcementDismissedUntil!)) {
      return;
    }

    bool hideFor24Hours = false;
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Important Notice'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    kGlobalAnnouncementMessage,
                    style: TextStyle(fontSize: 13.2, height: 1.45),
                  ),
                  const SizedBox(height: 10),
                  CheckboxListTile(
                    value: hideFor24Hours,
                    onChanged: (value) {
                      setDialogState(() => hideFor24Hours = value ?? false);
                    },
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    controlAffinity: ListTileControlAffinity.leading,
                    title: const Text(
                      "Don't show again for 24 hours",
                      style: TextStyle(fontSize: 12.6),
                    ),
                  ),
                ],
              ),
              actions: [
                FilledButton(
                  onPressed: () {
                    if (hideFor24Hours) {
                      _announcementDismissedUntil = DateTime.now().add(
                        const Duration(hours: 24),
                      );
                    }
                    Navigator.of(dialogContext).pop();
                  },
                  child: const Text('Got it'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: IndexedStack(index: _index, children: _pages),
      ),
      bottomNavigationBar: Container(
        margin: const EdgeInsets.fromLTRB(14, 0, 14, 12),
        decoration: BoxDecoration(
          color: const Color(0xCC060A15),
          borderRadius: BorderRadius.circular(26),
          border: Border.all(color: const Color(0xFF1D2A46)),
        ),
        child: NavigationBar(
          height: 70,
          backgroundColor: Colors.transparent,
          indicatorColor: const Color(0xFF9DFB3B),
          selectedIndex: _index,
          onDestinationSelected: _goToTab,
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              label: 'Home',
            ),
            NavigationDestination(
              icon: Icon(Icons.show_chart),
              label: 'Markets',
            ),
            NavigationDestination(
              icon: Icon(Icons.description_outlined),
              label: 'Futures',
            ),
            NavigationDestination(
              icon: Icon(Icons.candlestick_chart),
              label: 'Trade',
            ),
            NavigationDestination(
              icon: Icon(Icons.account_balance_wallet_outlined),
              label: 'Assets',
            ),
          ],
        ),
      ),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({
    super.key,
    required this.onOpenProfile,
    required this.onNavigateTab,
    required this.onOpenTradePair,
  });

  final VoidCallback onOpenProfile;
  final ValueChanged<int> onNavigateTab;
  final ValueChanged<MarketPair> onOpenTradePair;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final ScrollController _scrollController = ScrollController();
  final GlobalKey<_HomeSocialDiscoveryFeedState> _socialFeedKey =
      GlobalKey<_HomeSocialDiscoveryFeedState>();
  final GlobalKey<_HomePopularPairsSectionState> _pairsSectionKey =
      GlobalKey<_HomePopularPairsSectionState>();
  bool _composerOpen = false;
  bool _refreshingHome = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_handleScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_handleScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _handleScroll() {
    if (!_scrollController.hasClients) return;
    if (_scrollController.position.extentAfter < 900) {
      _socialFeedKey.currentState?.loadMoreIfNeeded();
    }
  }

  Future<void> _refreshHomeContent() async {
    if (_refreshingHome) {
      return;
    }
    setState(() => _refreshingHome = true);

    final token = authAccessTokenNotifier.value.trim();
    try {
      await Future.wait<void>([
        _syncWalletFromBackend(accessToken: token),
        _syncDepositSessionFromBackend(accessToken: token),
        _syncHomeNotificationsFromBackend(accessToken: token),
        _pairsSectionKey.currentState?.refreshFromParent() ??
            Future<void>.value(),
        _socialFeedKey.currentState?.refreshFromParent() ??
            Future<void>.value(),
      ]);
    } finally {
      if (mounted) {
        await Future<void>.delayed(const Duration(milliseconds: 220));
        setState(() => _refreshingHome = false);
      }
    }
  }

  void _handleComposerAction(String action) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$action publishing will open here.')),
      );
    }
    setState(() => _composerOpen = false);
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<HomeWidgetSettings>(
      valueListenable: homeWidgetSettingsNotifier,
      builder: (context, settings, _) {
        return Stack(
          children: [
            RefreshIndicator(
              displacement: 74,
              edgeOffset: 8,
              color: Colors.transparent,
              backgroundColor: Colors.transparent,
              onRefresh: _refreshHomeContent,
              child: ListView(
                controller: _scrollController,
                physics: const AlwaysScrollableScrollPhysics(
                  parent: BouncingScrollPhysics(),
                ),
                cacheExtent: 1800,
                padding: const EdgeInsets.all(14),
                children: [
                  _TopHeader(onOpenProfile: widget.onOpenProfile),
                  const SizedBox(height: 8),
                  if (settings.showDepositBanner) ...[
                    _HomeDepositBanner(
                      onDeposit: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const DepositPage(),
                        ),
                      ),
                      onOpenAssets: () => widget.onNavigateTab(4),
                    ),
                    const SizedBox(height: 12),
                  ],
                  if (settings.showQuickActions) ...[
                    _HomeQuickActions(
                      onDeposit: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const DepositPage(),
                        ),
                      ),
                      onOpenP2POrders: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const P2PPage(),
                        ),
                      ),
                      onWithdraw: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const WithdrawPage(),
                        ),
                      ),
                      onReward: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const RewardsContestOverviewPage(),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                  ],
                  if (settings.showPromoScroller) ...[
                    const _HomeP2PTemplateScroller(),
                    const SizedBox(height: 10),
                  ],
                  if (settings.showTicker) ...[
                    const _AnnouncementTicker(items: kMarketNotices),
                    const SizedBox(height: 10),
                  ],
                  if (settings.showPairs) ...[
                    _HomePopularPairsSection(
                      key: _pairsSectionKey,
                      onOpenTradePair: widget.onOpenTradePair,
                    ),
                    const SizedBox(height: 12),
                  ],
                  _HomeSocialDiscoveryFeed(
                    key: _socialFeedKey,
                    accessTokenListenable: authAccessTokenNotifier,
                  ),
                  const SizedBox(height: 104),
                ],
              ),
            ),
            Positioned.fill(
              child: IgnorePointer(
                child: Center(
                  child: AnimatedOpacity(
                    duration: const Duration(milliseconds: 240),
                    curve: Curves.easeOut,
                    opacity: _refreshingHome ? 1 : 0,
                    child: AnimatedScale(
                      duration: const Duration(milliseconds: 260),
                      curve: Curves.easeOutBack,
                      scale: _refreshingHome ? 1 : 0.9,
                      child: const _HomeRefreshLogoLoader(),
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              right: 18,
              bottom: 102,
              child: _HomeFeedComposerFab(
                open: _composerOpen,
                onToggle: () => setState(() => _composerOpen = !_composerOpen),
                onSelect: _handleComposerAction,
              ),
            ),
          ],
        );
      },
    );
  }
}

class RewardsContestOverviewPage extends StatelessWidget {
  const RewardsContestOverviewPage({super.key});

  static const _contests = <Map<String, String>>[
    {
      'title': 'BTC Sprint League',
      'reward': '\$120,000 prize pool',
      'status': 'ONGOING',
      'endsIn': 'Ends in 2d 14h',
      'volume': 'Min volume: 2,000 USDT',
    },
    {
      'title': 'USDT Deposit Race',
      'reward': 'Up to 18% bonus',
      'status': 'ONGOING',
      'endsIn': 'Ends in 5d 03h',
      'volume': 'Min deposit: 100 USDT',
    },
    {
      'title': 'P2P Power Week',
      'reward': 'Zero fee + cashback',
      'status': 'ONGOING',
      'endsIn': 'Ends in 1d 09h',
      'volume': '5 completed P2P orders',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final bg = isLight ? const Color(0xFFF3F6FC) : const Color(0xFF05070B);
    final cardBg = isLight ? Colors.white : const Color(0xFF0F131C);
    final border = isLight ? const Color(0xFFD6DEEC) : const Color(0xFF232A39);
    final primary = isLight ? const Color(0xFF131722) : Colors.white;
    final secondary = isLight ? const Color(0xFF677084) : Colors.white70;

    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.transparent,
        title: Text(
          'Rewards Hub',
          style: TextStyle(
            color: primary,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
        iconTheme: IconThemeData(color: primary),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(14, 8, 14, 16),
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Ongoing Contests',
                  style: TextStyle(
                    color: primary,
                    fontSize: 19,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Join active campaigns and track rewards in real time.',
                  style: TextStyle(
                    color: secondary,
                    fontSize: 13.2,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          ..._contests.map((contest) {
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          contest['title']!,
                          style: TextStyle(
                            color: primary,
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFF2ABF74).withValues(alpha: .16),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Text(
                          'ONGOING',
                          style: TextStyle(
                            color: Color(0xFF2ABF74),
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    contest['reward']!,
                    style: TextStyle(
                      color: primary,
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    contest['endsIn']!,
                    style: const TextStyle(
                      color: Color(0xFFF0C244),
                      fontSize: 13.2,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    contest['volume']!,
                    style: TextStyle(
                      color: secondary,
                      fontSize: 12.8,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('${contest['title']} joined')),
                        );
                      },
                      style: FilledButton.styleFrom(
                        backgroundColor: isLight
                            ? const Color(0xFF151925)
                            : Colors.white,
                        foregroundColor: isLight
                            ? Colors.white
                            : const Color(0xFF11151E),
                        minimumSize: const Size.fromHeight(42),
                      ),
                      child: const Text(
                        'Join Contest',
                        style: TextStyle(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}

class _HomeDepositBanner extends StatelessWidget {
  const _HomeDepositBanner({
    required this.onDeposit,
    required this.onOpenAssets,
  });

  final VoidCallback onDeposit;
  final VoidCallback onOpenAssets;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<double>(
      valueListenable: fundingUsdtBalanceNotifier,
      builder: (context, funding, _) {
        return ValueListenableBuilder<double>(
          valueListenable: spotUsdtBalanceNotifier,
          builder: (context, spot, child) {
            return ValueListenableBuilder<bool>(
              valueListenable: hasActiveDepositSessionNotifier,
              builder: (context, hasActiveDeposit, __) {
                final total = funding + spot;
                final hasBalance = total > 0.0001;
                final isLight =
                    Theme.of(context).brightness == Brightness.light;
                final cardBg = isLight
                    ? const Color(0xFFE3E7EF)
                    : const Color(0xFF161A23);
                final border = isLight
                    ? const Color(0xFFD2DAE8)
                    : const Color(0xFF222A3B);
                final primary = isLight
                    ? const Color(0xFF121722)
                    : Colors.white;
                final secondary = isLight
                    ? const Color(0xFF5E6779)
                    : Colors.white70;
                final buttonBg = isLight
                    ? const Color(0xFF11141C)
                    : Colors.white;
                final buttonFg = isLight ? Colors.white : Colors.black;

                return Container(
                  padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
                  decoration: BoxDecoration(
                    color: cardBg,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        hasBalance
                            ? 'Total Balance ${_formatWithCommas(total, decimals: 2)} USDT'
                            : 'Deposit now to enjoy the\nultimate experience',
                        style: TextStyle(
                          fontSize: 21,
                          fontWeight: FontWeight.w700,
                          color: primary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        hasActiveDeposit
                            ? 'One deposit request is pending admin confirmation.'
                            : (hasBalance
                                  ? 'Funding ${_formatWithCommas(funding, decimals: 2)} • Spot ${_formatWithCommas(spot, decimals: 2)}'
                                  : 'All popular trading pairs supported! Enjoy exclusive benefits.'),
                        style: TextStyle(fontSize: 13.2, color: secondary),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: FilledButton(
                              onPressed: hasActiveDeposit ? null : onDeposit,
                              style: FilledButton.styleFrom(
                                backgroundColor: buttonBg,
                                foregroundColor: buttonFg,
                                disabledBackgroundColor: const Color(
                                  0xFF232323,
                                ),
                                disabledForegroundColor: Colors.white54,
                                minimumSize: const Size.fromHeight(44),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(24),
                                ),
                              ),
                              child: Text(
                                hasActiveDeposit
                                    ? 'Deposit Pending'
                                    : (hasBalance ? 'Deposit More' : 'Deposit'),
                                style: const TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                          if (hasBalance) ...[
                            const SizedBox(width: 8),
                            SizedBox(
                              height: 44,
                              child: OutlinedButton(
                                onPressed: onOpenAssets,
                                style: OutlinedButton.styleFrom(
                                  side: BorderSide(
                                    color: isLight
                                        ? const Color(0xFFB9C3D9)
                                        : const Color(0xFF3A465E),
                                  ),
                                  foregroundColor: primary,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(24),
                                  ),
                                ),
                                child: Text(
                                  'Assets',
                                  style: TextStyle(
                                    fontSize: 13.4,
                                    color: primary,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                );
              },
            );
          },
        );
      },
    );
  }
}

class _HomeQuickActions extends StatelessWidget {
  const _HomeQuickActions({
    required this.onDeposit,
    required this.onOpenP2POrders,
    required this.onWithdraw,
    required this.onReward,
  });

  final VoidCallback onDeposit;
  final VoidCallback onOpenP2POrders;
  final VoidCallback onWithdraw;
  final VoidCallback onReward;

  @override
  Widget build(BuildContext context) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final iconBg = isLight ? const Color(0xFFE5E8F0) : const Color(0xFF1C2230);
    final iconFg = isLight ? const Color(0xFF111420) : Colors.white;
    final label = isLight ? const Color(0xFF212735) : Colors.white;

    Widget action({
      required IconData icon,
      required String text,
      required VoidCallback? onTap,
    }) {
      return Expanded(
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 2),
            child: Column(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: iconBg,
                    borderRadius: BorderRadius.circular(15),
                  ),
                  child: Icon(icon, color: iconFg, size: 24),
                ),
                const SizedBox(height: 6),
                Text(
                  text,
                  style: TextStyle(
                    color: label,
                    fontSize: 12.6,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return ValueListenableBuilder<bool>(
      valueListenable: hasActiveDepositSessionNotifier,
      builder: (context, hasActiveDeposit, _) {
        return Row(
          children: [
            action(
              icon: Icons.account_balance_wallet_outlined,
              text: hasActiveDeposit ? 'Pending' : 'Deposit',
              onTap: hasActiveDeposit ? null : onDeposit,
            ),
            action(
              icon: Icons.swap_horiz_rounded,
              text: 'P2P',
              onTap: onOpenP2POrders,
            ),
            action(
              icon: Icons.north_east_rounded,
              text: 'Withdraw',
              onTap: onWithdraw,
            ),
            action(
              icon: Icons.emoji_events_outlined,
              text: 'Reward',
              onTap: onReward,
            ),
          ],
        );
      },
    );
  }
}

class _TopHeader extends StatelessWidget {
  const _TopHeader({required this.onOpenProfile});

  final VoidCallback onOpenProfile;

  @override
  Widget build(BuildContext context) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final searchBg = isLight
        ? const Color(0xFFE9EDF5)
        : const Color(0xFF171B29);
    final iconColor = isLight ? const Color(0xFF161A23) : Colors.white;
    final hintColor = isLight ? const Color(0xFF8A919F) : Colors.white54;

    return Row(
      children: [
        IconButton(
          onPressed: onOpenProfile,
          icon: Icon(Icons.apps_rounded, size: 22, color: iconColor),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Container(
            height: 42,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: searchBg,
              borderRadius: BorderRadius.circular(22),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.search,
                  size: 18,
                  color: isLight ? const Color(0xFF232734) : Colors.white70,
                ),
                const SizedBox(width: 8),
                Text(
                  'LIZARDSOL/USDT',
                  style: TextStyle(color: hintColor, fontSize: 13),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 8),
        IconButton(
          onPressed: () => Navigator.of(
            context,
          ).push(MaterialPageRoute<void>(builder: (_) => const ScanPage())),
          icon: Icon(Icons.qr_code_scanner_rounded, size: 22, color: iconColor),
        ),
        IconButton(
          onPressed: () => Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => const SupportHomePage()),
          ),
          icon: Icon(Icons.headset_mic_outlined, size: 22, color: iconColor),
        ),
        ValueListenableBuilder<List<SupportAlert>>(
          valueListenable: supportAlertsNotifier,
          builder: (context, alerts, child) {
            final openAlerts = alerts.where((alert) => !alert.resolved).length;
            return IconButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const SupportAlertsPage(),
                ),
              ),
              icon: Stack(
                clipBehavior: Clip.none,
                children: [
                  Icon(Icons.notifications_none, size: 22, color: iconColor),
                  if (openAlerts > 0)
                    Positioned(
                      right: -1,
                      top: -1,
                      child: Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: Color(0xFFFF4E63),
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }
}

class _HomeP2PTemplateScroller extends StatefulWidget {
  const _HomeP2PTemplateScroller();

  @override
  State<_HomeP2PTemplateScroller> createState() =>
      _HomeP2PTemplateScrollerState();
}

class _HomeP2PTemplateScrollerState extends State<_HomeP2PTemplateScroller> {
  Timer? _autoSlideTimer;
  int _activeIndex = 0;

  final List<Map<String, String>> _pages = <Map<String, String>>[
    {
      'leftTitle': "The Joker's here!",
      'leftSub': 'Weekly event • Lucky draw live',
      'leftCount': '1/6',
      'leftImage': 'promo_joker',
      'rightTopTitle': 'Invite & Earn\n50% Rebate',
      'rightTopSub': 'Invite friends • Instant bonus',
      'rightTopCount': '1/4',
      'rightTopImage': 'promo_invite',
      'rightBottomTitle': 'Vouchers',
      'rightBottomSub': 'Claim trading fee coupons',
      'rightBottomImage': 'promo_voucher',
    },
    {
      'leftTitle': 'Claim your\nwelcome perks',
      'leftSub': 'New user booster • Active now',
      'leftCount': '5/6',
      'leftImage': 'promo_welcome',
      'rightTopTitle': 'Invite & Earn\n50% Rebate',
      'rightTopSub': 'Daily leaderboard rewards',
      'rightTopCount': '1/4',
      'rightTopImage': 'promo_invite',
      'rightBottomTitle': 'Vouchers',
      'rightBottomSub': 'Use coupons in P2P & Spot',
      'rightBottomImage': 'promo_voucher',
    },
    {
      'leftTitle': 'WXT burn event:\n1M WXT',
      'leftSub': 'Burn campaign • Prize pool live',
      'leftCount': '6/6',
      'leftImage': 'promo_burn',
      'rightTopTitle': 'Trade gold-\nbacked PAXG',
      'rightTopSub': 'Ongoing contest • Ends soon',
      'rightTopCount': '2/4',
      'rightTopImage': 'promo_gold',
      'rightBottomTitle': 'Buy Crypto',
      'rightBottomSub': 'Fast fiat purchase',
      'rightBottomImage': 'promo_buy',
    },
    {
      'leftTitle': 'Airdrop Hub',
      'leftSub': 'Claim tasks and earn tokens',
      'leftCount': '3/6',
      'leftImage': 'promo_airdrop',
      'rightTopTitle': 'Trade gold-\nbacked XAUT',
      'rightTopSub': 'Commodity contest live',
      'rightTopCount': '3/4',
      'rightTopImage': 'promo_xaut',
      'rightBottomTitle': 'Buy Crypto',
      'rightBottomSub': 'Card and bank supported',
      'rightBottomImage': 'promo_buy',
    },
    {
      'leftTitle': 'Trade to win',
      'leftSub': 'Compete for rank rewards',
      'leftCount': '4/6',
      'leftImage': 'promo_tradewin',
      'rightTopTitle': 'Trade silver-\nbacked XAG',
      'rightTopSub': 'High APR campaign',
      'rightTopCount': '4/4',
      'rightTopImage': 'promo_silver',
      'rightBottomTitle': 'Vouchers',
      'rightBottomSub': 'Redeem with one tap',
      'rightBottomImage': 'promo_voucher',
    },
    {
      'leftTitle': '\$300,000 up\nfor grabs',
      'leftSub': 'Seasonal championship',
      'leftCount': '2/6',
      'leftImage': 'promo_grabs',
      'rightTopTitle': 'Trade gold-\nbacked PAXG',
      'rightTopSub': 'Volume challenge active',
      'rightTopCount': '2/4',
      'rightTopImage': 'promo_gold',
      'rightBottomTitle': 'Vouchers',
      'rightBottomSub': 'New pack available',
      'rightBottomImage': 'promo_voucher',
    },
  ];

  @override
  void initState() {
    super.initState();
    _autoSlideTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      if (!mounted) return;
      setState(() {
        _activeIndex = (_activeIndex + 1) % _pages.length;
      });
    });
  }

  @override
  void dispose() {
    _autoSlideTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final page = _pages[_activeIndex];
    return SizedBox(
      height: 286,
      child: Padding(
        padding: const EdgeInsets.only(right: 10),
        child: Row(
          children: [
            Expanded(
              flex: 55,
              child: _templateCard(
                title: page['leftTitle']!,
                subtitle: page['leftSub']!,
                count: page['leftCount']!,
                imageUrl: page['leftImage']!,
                large: true,
                animationKey: "left-${page['leftTitle']}-${page['leftCount']}",
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              flex: 45,
              child: Column(
                children: [
                  Expanded(
                    child: _templateCard(
                      title: page['rightTopTitle']!,
                      subtitle: page['rightTopSub']!,
                      count: page['rightTopCount']!,
                      imageUrl: page['rightTopImage']!,
                      large: false,
                      animationKey:
                          "rightTop-${page['rightTopTitle']}-${page['rightTopCount']}",
                    ),
                  ),
                  const SizedBox(height: 10),
                  _smallTemplateCard(
                    title: page['rightBottomTitle']!,
                    subtitle: page['rightBottomSub']!,
                    imageUrl: page['rightBottomImage']!,
                    animationKey:
                        "rightBottom-${page['rightBottomTitle']}-${page['rightBottomImage']}",
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _templateCard({
    required String title,
    required String subtitle,
    required String count,
    required String imageUrl,
    required bool large,
    required String animationKey,
  }) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final cardBg = isLight ? const Color(0xFFF6F7FB) : const Color(0xFF050608);
    final cardBorder = isLight
        ? const Color(0xFFD6DAE6)
        : const Color(0xFF262D3E);
    final textPrimary = isLight ? const Color(0xFF0F121A) : Colors.white;
    final textSecondary = isLight ? const Color(0xFF666D7A) : Colors.white60;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: cardBorder),
      ),
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 650),
        switchInCurve: Curves.easeInOutSine,
        switchOutCurve: Curves.easeInOutSine,
        transitionBuilder: (child, animation) {
          final slide = Tween<Offset>(
            begin: const Offset(0.015, 0),
            end: Offset.zero,
          ).animate(animation);
          return ClipRect(
            child: SlideTransition(
              position: slide,
              child: FadeTransition(opacity: animation, child: child),
            ),
          );
        },
        child: Column(
          key: ValueKey(animationKey),
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: large ? 21 : 18,
                fontWeight: FontWeight.w700,
                height: 1.12,
                color: textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: large ? 12.4 : 11.6,
                fontWeight: FontWeight.w500,
                color: textSecondary,
                height: 1.18,
              ),
            ),
            const Spacer(),
            Align(
              alignment: Alignment.center,
              child: _promoVisual(
                token: imageUrl,
                size: large ? 120 : 84,
                isLight: isLight,
                textSecondary: textSecondary,
              ),
            ),
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.bottomLeft,
              child: Text(
                count,
                style: TextStyle(fontSize: 18, color: textSecondary),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _smallTemplateCard({
    required String title,
    required String subtitle,
    required String imageUrl,
    required String animationKey,
  }) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final cardBg = isLight ? const Color(0xFFF6F7FB) : const Color(0xFF050608);
    final cardBorder = isLight
        ? const Color(0xFFD6DAE6)
        : const Color(0xFF262D3E);
    final textPrimary = isLight ? const Color(0xFF0F121A) : Colors.white;
    final textSecondary = isLight ? const Color(0xFF666D7A) : Colors.white54;

    return Container(
      height: 106,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: cardBorder),
      ),
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 650),
        switchInCurve: Curves.easeInOutSine,
        switchOutCurve: Curves.easeInOutSine,
        transitionBuilder: (child, animation) {
          final slide = Tween<Offset>(
            begin: const Offset(0.015, 0),
            end: Offset.zero,
          ).animate(animation);
          return ClipRect(
            child: SlideTransition(
              position: slide,
              child: FadeTransition(opacity: animation, child: child),
            ),
          );
        },
        child: Row(
          key: ValueKey(animationKey),
          children: [
            _promoVisual(
              token: imageUrl,
              size: 42,
              isLight: isLight,
              textSecondary: textSecondary,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 22 / 1.6,
                      fontWeight: FontWeight.w600,
                      color: textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11.2,
                      fontWeight: FontWeight.w500,
                      color: textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _promoVisual({
    required String token,
    required double size,
    required bool isLight,
    required Color textSecondary,
  }) {
    final colors = _promoPalette(token, isLight);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(size * 0.24),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: colors,
        ),
        boxShadow: [
          BoxShadow(
            color: (isLight ? Colors.black : colors.first).withValues(
              alpha: .16,
            ),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Stack(
        children: [
          Center(
            child: Icon(
              _promoIcon(token),
              size: size * 0.46,
              color: Colors.white,
            ),
          ),
          Positioned(
            right: size * 0.1,
            top: size * 0.1,
            child: Icon(
              Icons.auto_awesome_rounded,
              size: size * 0.17,
              color: textSecondary.withValues(alpha: .75),
            ),
          ),
        ],
      ),
    );
  }

  IconData _promoIcon(String token) {
    switch (token) {
      case 'promo_joker':
        return Icons.theater_comedy_rounded;
      case 'promo_invite':
        return Icons.group_add_rounded;
      case 'promo_voucher':
        return Icons.card_giftcard_rounded;
      case 'promo_welcome':
        return Icons.celebration_rounded;
      case 'promo_burn':
        return Icons.local_fire_department_rounded;
      case 'promo_gold':
      case 'promo_xaut':
        return Icons.workspace_premium_rounded;
      case 'promo_silver':
        return Icons.military_tech_rounded;
      case 'promo_buy':
        return Icons.account_balance_wallet_rounded;
      case 'promo_airdrop':
        return Icons.currency_exchange_rounded;
      case 'promo_tradewin':
        return Icons.emoji_events_rounded;
      case 'promo_grabs':
        return Icons.attach_money_rounded;
      default:
        return Icons.auto_graph_rounded;
    }
  }

  List<Color> _promoPalette(String token, bool isLight) {
    switch (token) {
      case 'promo_joker':
        return [const Color(0xFF5C2EFA), const Color(0xFFAA5EFF)];
      case 'promo_invite':
        return [const Color(0xFF00A86B), const Color(0xFF3FD197)];
      case 'promo_voucher':
        return [const Color(0xFFE1A300), const Color(0xFFF9CC52)];
      case 'promo_welcome':
        return [const Color(0xFF2A7BFF), const Color(0xFF59A3FF)];
      case 'promo_burn':
        return [const Color(0xFFD9534F), const Color(0xFFFF7B54)];
      case 'promo_gold':
      case 'promo_xaut':
        return [const Color(0xFFB58A00), const Color(0xFFF0C244)];
      case 'promo_silver':
        return [const Color(0xFF7C8798), const Color(0xFFA5AFBF)];
      case 'promo_buy':
        return [const Color(0xFF2378FF), const Color(0xFF58A6FF)];
      case 'promo_airdrop':
        return [const Color(0xFF3F51B5), const Color(0xFF7986CB)];
      case 'promo_tradewin':
        return [const Color(0xFF00A86B), const Color(0xFF00CC88)];
      case 'promo_grabs':
        return [const Color(0xFF9D3AE6), const Color(0xFFDA77FF)];
      default:
        if (isLight) {
          return [const Color(0xFF4D5D7A), const Color(0xFF7B8AA8)];
        }
        return [const Color(0xFF1D273C), const Color(0xFF3A4D6C)];
    }
  }
}

class _HomePopularPairsSection extends StatefulWidget {
  const _HomePopularPairsSection({super.key, required this.onOpenTradePair});

  final ValueChanged<MarketPair> onOpenTradePair;

  @override
  State<_HomePopularPairsSection> createState() =>
      _HomePopularPairsSectionState();
}

class _HomePopularPairsSectionState extends State<_HomePopularPairsSection> {
  String _tab = 'Popular';
  static const _tabs = ['Popular', 'Gainers', 'New', '24h Vol'];
  final LiveMarketService _marketService = LiveMarketService();
  List<MarketPair> _pairs = List<MarketPair>.from(kMarketPairs);
  bool _loading = true;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _refresh();
    _timer = Timer.periodic(const Duration(seconds: 20), (_) => _refresh());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _refresh() async {
    try {
      final live = await _marketService.fetchPairs();
      if (!mounted) return;
      if (live.isEmpty) {
        setState(() => _loading = false);
        return;
      }
      setState(() {
        _pairs = live;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> refreshFromParent() async {
    if (!mounted) return;
    setState(() => _loading = true);
    await _refresh();
  }

  List<MarketPair> _rowsForCurrentTab() {
    if (_pairs.isEmpty) return List<MarketPair>.from(kMarketPairs);
    final list = List<MarketPair>.from(_pairs);
    switch (_tab) {
      case 'Gainers':
        list.sort(
          (a, b) => _parsePercentValue(
            b.change,
          ).compareTo(_parsePercentValue(a.change)),
        );
        return list.take(6).toList();
      case 'New':
        if (list.length > 35) return list.skip(25).take(6).toList();
        return list.reversed.take(6).toList();
      case '24h Vol':
        list.sort(
          (a, b) => _parseNumericValue(
            b.volume,
          ).compareTo(_parseNumericValue(a.volume)),
        );
        return list.take(6).toList();
      case 'Popular':
      default:
        return list.take(6).toList();
    }
  }

  @override
  Widget build(BuildContext context) {
    final rows = _rowsForCurrentTab();
    final isLight = Theme.of(context).brightness == Brightness.light;
    final sectionBg = isLight ? Colors.white : const Color(0xFF0C111A);
    final sectionBorder = isLight
        ? const Color(0xFFD9E0EE)
        : const Color(0xFF1A2233);
    final primary = isLight ? const Color(0xFF131722) : Colors.white;
    final secondary = isLight ? const Color(0xFF677083) : Colors.white54;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: sectionBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: sectionBorder),
      ),
      child: Column(
        children: [
          Row(
            children: _tabs.map((item) {
              final active = _tab == item;
              return Expanded(
                child: InkWell(
                  onTap: () => setState(() => _tab = item),
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Column(
                      children: [
                        Text(
                          item,
                          style: TextStyle(
                            fontSize: 12.2,
                            color: active ? primary : secondary,
                            fontWeight: active
                                ? FontWeight.w700
                                : FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          width: 46,
                          height: 2,
                          color: active
                              ? const Color(0xFFF1CB3E)
                              : Colors.transparent,
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: Text(
                  'Pair',
                  style: TextStyle(color: secondary, fontSize: 10.8),
                ),
              ),
              Text('Price', style: TextStyle(color: secondary, fontSize: 10.8)),
              SizedBox(width: 14),
              Text(
                'Change',
                style: TextStyle(color: secondary, fontSize: 10.8),
              ),
            ],
          ),
          const SizedBox(height: 4),
          if (_loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 14),
              child: Center(
                child: CircularProgressIndicator(
                  strokeWidth: 2.1,
                  color: Color(0xFF9DFB3B),
                ),
              ),
            ),
          ...rows.map((pair) {
            final bool isDown = pair.change.startsWith('-');
            final changeText = pair.change.startsWith('+')
                ? pair.change.substring(1)
                : pair.change;
            return InkWell(
              onTap: () => widget.onOpenTradePair(pair),
              child: Container(
                margin: const EdgeInsets.only(top: 8),
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          CoinLogo(
                            url: pair.logoUrl,
                            fallback: pair.symbol,
                            size: 26,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            pair.symbol,
                            style: TextStyle(
                              fontSize: 11.8,
                              fontWeight: FontWeight.w700,
                              color: primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      pair.price,
                      style: TextStyle(
                        fontSize: 11.8,
                        fontWeight: FontWeight.w700,
                        color: primary,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Container(
                      width: 86,
                      alignment: Alignment.center,
                      padding: const EdgeInsets.symmetric(vertical: 7),
                      decoration: BoxDecoration(
                        color: isDown
                            ? const Color(0xFFEF4E5E)
                            : const Color(0xFF53D983),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Text(
                        changeText,
                        style: const TextStyle(
                          fontSize: 11.6,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () {},
            child: const Text(
              'View more',
              style: TextStyle(
                fontSize: 12.2,
                decoration: TextDecoration.underline,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SocialFeedPost {
  const _SocialFeedPost({
    required this.id,
    required this.username,
    required this.createdAt,
    required this.contentText,
    required this.mediaType,
    required this.mediaUrl,
    required this.isLive,
    required this.commentCount,
    required this.repostCount,
    required this.likeCount,
    required this.viewCount,
    this.avatarUrl = '',
  });

  final String id;
  final String username;
  final String avatarUrl;
  final DateTime createdAt;
  final String contentText;
  final String mediaType;
  final String mediaUrl;
  final bool isLive;
  final int commentCount;
  final int repostCount;
  final int likeCount;
  final int viewCount;

  factory _SocialFeedPost.fromMap(Map<String, dynamic> map) {
    DateTime parsedDate = DateTime.now();
    final rawDate = map['createdAt'] ?? map['created_at'] ?? map['time'];
    if (rawDate != null) {
      parsedDate = DateTime.tryParse(rawDate.toString()) ?? DateTime.now();
    }
    return _SocialFeedPost(
      id: (map['id'] ?? '').toString().trim(),
      username: (map['username'] ?? map['name'] ?? 'Exchange User')
          .toString()
          .trim(),
      avatarUrl: (map['avatarUrl'] ?? map['avatar_url'] ?? '')
          .toString()
          .trim(),
      createdAt: parsedDate,
      contentText:
          (map['contentText'] ?? map['content_text'] ?? map['text'] ?? '')
              .toString()
              .trim(),
      mediaType: (map['mediaType'] ?? map['media_type'] ?? 'text')
          .toString()
          .trim()
          .toLowerCase(),
      mediaUrl: (map['mediaUrl'] ?? map['media_url'] ?? '').toString().trim(),
      isLive:
          map['isLive'] == true ||
          map['is_live'] == true ||
          map['is_live'] == 1,
      commentCount: _parseCounter(map['commentCount'] ?? map['comment_count']),
      repostCount: _parseCounter(map['repostCount'] ?? map['repost_count']),
      likeCount: _parseCounter(map['likeCount'] ?? map['like_count']),
      viewCount: _parseCounter(map['viewCount'] ?? map['view_count']),
    );
  }
}

class _SuggestedCreator {
  const _SuggestedCreator({
    required this.id,
    required this.name,
    required this.followersCount,
    required this.verified,
    this.avatarUrl = '',
    this.isFollowing = false,
  });

  final String id;
  final String name;
  final int followersCount;
  final bool verified;
  final String avatarUrl;
  final bool isFollowing;

  factory _SuggestedCreator.fromMap(Map<String, dynamic> map) {
    return _SuggestedCreator(
      id: (map['id'] ?? '').toString().trim(),
      name: (map['name'] ?? 'Creator').toString().trim(),
      followersCount: _parseCounter(
        map['followersCount'] ?? map['followers_count'],
      ),
      verified: map['verified'] == true || map['verified'] == 1,
      avatarUrl: (map['avatarUrl'] ?? map['avatar_url'] ?? '')
          .toString()
          .trim(),
      isFollowing:
          map['isFollowing'] == true ||
          map['is_following'] == true ||
          map['is_following'] == 1,
    );
  }
}

class _CopyTrader {
  const _CopyTrader({
    required this.id,
    required this.username,
    required this.minCopyAmount,
    required this.pnl7d,
    required this.roiPercent,
    required this.aumValue,
    required this.winRate,
    this.avatarUrl = '',
  });

  final String id;
  final String username;
  final String avatarUrl;
  final double minCopyAmount;
  final double pnl7d;
  final double roiPercent;
  final double aumValue;
  final double winRate;

  factory _CopyTrader.fromMap(Map<String, dynamic> map) {
    return _CopyTrader(
      id: (map['id'] ?? '').toString().trim(),
      username: (map['username'] ?? 'Trader').toString().trim(),
      avatarUrl: (map['avatarUrl'] ?? map['avatar_url'] ?? '')
          .toString()
          .trim(),
      minCopyAmount: _toDouble(map['minCopyAmount'] ?? map['min_copy_amount']),
      pnl7d: _toDouble(map['pnl7d'] ?? map['pnl_7d']),
      roiPercent: _toDouble(map['roiPercent'] ?? map['roi_percent']),
      aumValue: _toDouble(map['aumValue'] ?? map['aum_value']),
      winRate: _toDouble(map['winRate'] ?? map['win_rate']),
    );
  }
}

int _parseCounter(dynamic value) {
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

String _initialsOf(String input) {
  final cleaned = input.trim();
  if (cleaned.isEmpty) return 'B';
  final parts = cleaned
      .split(RegExp(r'\s+'))
      .where((part) => part.isNotEmpty)
      .toList();
  if (parts.length >= 2) {
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  }
  if (parts.first.length >= 2) {
    return parts.first.substring(0, 2).toUpperCase();
  }
  return parts.first.substring(0, 1).toUpperCase();
}

String _formatCountCompact(int value) {
  if (value >= 1000000) {
    return '${(value / 1000000).toStringAsFixed(1)}M';
  }
  if (value >= 1000) {
    return '${(value / 1000).toStringAsFixed(1)}K';
  }
  return '$value';
}

String _timeAgo(DateTime value) {
  final now = DateTime.now();
  final diff = now.difference(value);
  if (diff.inMinutes < 1) return 'Just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m';
  if (diff.inHours < 24) return '${diff.inHours}h';
  if (diff.inDays < 7) return '${diff.inDays}d';
  return '${value.day.toString().padLeft(2, '0')}/${value.month.toString().padLeft(2, '0')}';
}

class _HomeSocialDiscoveryFeed extends StatefulWidget {
  const _HomeSocialDiscoveryFeed({
    super.key,
    required this.accessTokenListenable,
  });

  final ValueNotifier<String> accessTokenListenable;

  @override
  State<_HomeSocialDiscoveryFeed> createState() =>
      _HomeSocialDiscoveryFeedState();
}

class _HomeSocialDiscoveryFeedState extends State<_HomeSocialDiscoveryFeed> {
  static const List<String> _tabs = [
    'Discover',
    'Following',
    'Campaign',
    'Announcement',
  ];
  int _tabIndex = 0;
  bool _loading = true;
  bool _loadingMore = false;
  bool _hasMore = true;
  int _page = 1;
  String? _errorText;

  List<_SocialFeedPost> _posts = const <_SocialFeedPost>[];
  List<_SuggestedCreator> _creators = const <_SuggestedCreator>[];
  List<_CopyTrader> _copyTraders = const <_CopyTrader>[];
  final Set<String> _followingCreators = <String>{};

  @override
  void initState() {
    super.initState();
    widget.accessTokenListenable.addListener(_handleAuthChanged);
    _reloadAll();
  }

  @override
  void dispose() {
    widget.accessTokenListenable.removeListener(_handleAuthChanged);
    super.dispose();
  }

  void _handleAuthChanged() {
    if (!mounted) return;
    if (_tabKey == 'following') {
      _reloadAll();
    }
  }

  String get _tabKey => _tabs[_tabIndex].toLowerCase();

  Future<_ApiHttpResponse> _fetchGet(
    String path, {
    Map<String, String>? query,
    bool includeAuth = true,
  }) async {
    final token = includeAuth ? widget.accessTokenListenable.value.trim() : '';
    _ApiHttpResponse last = const _ApiHttpResponse(
      statusCode: 0,
      bodyMap: null,
    );
    _ApiHttpResponse? clientError;
    for (final base in _apiBaseUrls()) {
      final uri = _apiUri(base, path).replace(queryParameters: query);
      final response = await _getJsonFromApi(
        uri,
        accessToken: token.isEmpty ? null : token,
      );
      last = response;
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return response;
      }
      if (response.statusCode >= 400 &&
          response.statusCode < 500 &&
          clientError == null) {
        clientError = response;
      }
    }
    return clientError ?? last;
  }

  Future<_ApiHttpResponse> _fetchPost(
    String path,
    Map<String, dynamic> payload,
  ) async {
    final token = widget.accessTokenListenable.value.trim();
    _ApiHttpResponse last = const _ApiHttpResponse(
      statusCode: 0,
      bodyMap: null,
    );
    _ApiHttpResponse? clientError;
    for (final base in _apiBaseUrls()) {
      final response = await _postJsonToApi(
        _apiUri(base, path),
        payload,
        accessToken: token.isEmpty ? null : token,
      );
      last = response;
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return response;
      }
      if (response.statusCode >= 400 &&
          response.statusCode < 500 &&
          clientError == null) {
        clientError = response;
      }
    }
    return clientError ?? last;
  }

  Future<void> _reloadAll() async {
    setState(() {
      _loading = true;
      _errorText = null;
      _page = 1;
      _hasMore = true;
    });
    await Future.wait<void>([
      _loadFeedPage(append: false),
      _loadCreators(),
      _loadCopyTraders(),
    ]);
    if (!mounted) return;
    setState(() => _loading = false);
  }

  Future<void> _loadFeedPage({required bool append}) async {
    final targetPage = append ? _page + 1 : 1;
    final response = await _fetchGet(
      '/api/social/feed',
      query: <String, String>{
        'tab': _tabKey,
        'page': '$targetPage',
        'pageSize': '10',
        'ts': DateTime.now().millisecondsSinceEpoch.toString(),
      },
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final body = response.bodyMap ?? const <String, dynamic>{};
      final rawItems = (body['items'] is List)
          ? body['items'] as List<dynamic>
          : (body['data'] is Map<String, dynamic> &&
                (body['data'] as Map<String, dynamic>)['items'] is List)
          ? ((body['data'] as Map<String, dynamic>)['items'] as List<dynamic>)
          : const <dynamic>[];

      final parsed = rawItems
          .whereType<Map<String, dynamic>>()
          .map(_SocialFeedPost.fromMap)
          .where((post) => post.id.isNotEmpty)
          .toList(growable: false);

      if (!mounted) return;
      setState(() {
        _posts = append ? <_SocialFeedPost>[..._posts, ...parsed] : parsed;
        _page = targetPage;
        _hasMore = body['hasMore'] == true || parsed.length >= 10;
        _errorText = null;
      });
      return;
    }

    if (!mounted) return;
    if (!append) {
      final fallbackItems = _tabKey == 'following'
          ? _localFollowingFallbackPosts()
          : _fallbackPostsForTab(_tabKey);
      setState(() {
        _posts = fallbackItems;
        _hasMore = false;
        _errorText =
            response.statusCode == 401 &&
                _tabKey == 'following' &&
                fallbackItems.isEmpty
            ? 'Login required to load Following feed.'
            : null;
      });
    }
  }

  Future<void> _loadCreators() async {
    final response = await _fetchGet(
      '/api/social/suggested-creators',
      query: const <String, String>{'limit': '6'},
    );
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final body = response.bodyMap ?? const <String, dynamic>{};
      final rawItems = body['items'] is List
          ? body['items'] as List<dynamic>
          : const <dynamic>[];
      final parsed = rawItems
          .whereType<Map<String, dynamic>>()
          .map(_SuggestedCreator.fromMap)
          .where((item) => item.id.isNotEmpty)
          .toList(growable: false);
      if (!mounted) return;
      final resolvedCreators = parsed.isEmpty ? _fallbackCreators : parsed;
      final latestFollowing = resolvedCreators
          .where((item) => item.isFollowing)
          .map((item) => item.id)
          .toSet();
      setState(() {
        _creators = resolvedCreators;
        _followingCreators
          ..removeWhere((id) => !resolvedCreators.any((item) => item.id == id))
          ..addAll(latestFollowing);
      });
      return;
    }
    if (!mounted) return;
    setState(() => _creators = _fallbackCreators);
  }

  Future<void> _loadCopyTraders() async {
    final response = await _fetchGet(
      '/api/social/copy-traders',
      query: const <String, String>{'limit': '8'},
    );
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final body = response.bodyMap ?? const <String, dynamic>{};
      final rawItems = body['items'] is List
          ? body['items'] as List<dynamic>
          : const <dynamic>[];
      final parsed = rawItems
          .whereType<Map<String, dynamic>>()
          .map(_CopyTrader.fromMap)
          .where((item) => item.id.isNotEmpty)
          .toList(growable: false);
      if (!mounted) return;
      setState(() {
        _copyTraders = parsed.isEmpty ? _fallbackCopyTraders : parsed;
      });
      return;
    }
    if (!mounted) return;
    setState(() => _copyTraders = _fallbackCopyTraders);
  }

  Future<void> _followCreator(_SuggestedCreator creator) async {
    if (_followingCreators.contains(creator.id)) {
      return;
    }
    setState(() => _followingCreators.add(creator.id));
    final response = await _fetchPost(
      '/api/social/creators/${creator.id}/follow',
      const <String, dynamic>{},
    );
    if (!mounted) return;
    if (!_apiSuccess(response)) {
      final softFailure =
          response.statusCode == 0 ||
          response.statusCode == 401 ||
          response.statusCode == 403 ||
          response.statusCode >= 500;
      if (softFailure) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Following ${creator.name}. Sync will complete when connection stabilizes.',
            ),
          ),
        );
        if (_tabKey == 'following') {
          await _loadFeedPage(append: false);
        }
        return;
      }
      setState(() => _followingCreators.remove(creator.id));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _apiErrorMessage(response, fallback: 'Unable to follow creator.'),
          ),
        ),
      );
      return;
    }
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text('Following ${creator.name}')));
    if (_tabKey == 'following') {
      await _loadFeedPage(append: false);
    }
  }

  List<_SocialFeedPost> _localFollowingFallbackPosts() {
    if (_followingCreators.isEmpty) {
      return const <_SocialFeedPost>[];
    }
    final followedNames = _creators
        .where((creator) => _followingCreators.contains(creator.id))
        .map((creator) => creator.name.trim().toLowerCase())
        .where((name) => name.isNotEmpty)
        .toSet();
    if (followedNames.isEmpty) {
      return const <_SocialFeedPost>[];
    }
    return _fallbackPostsForTab('discover')
        .where((post) => followedNames.contains(post.username.trim().toLowerCase()))
        .toList(growable: false);
  }

  void _dismissPost(String id) {
    setState(() {
      _posts = _posts.where((post) => post.id != id).toList(growable: false);
    });
  }

  Future<void> _changeTab(int index) async {
    if (_tabIndex == index) return;
    setState(() {
      _tabIndex = index;
      _loading = true;
      _loadingMore = false;
      _hasMore = true;
      _page = 1;
      _errorText = null;
    });
    await _loadFeedPage(append: false);
    if (!mounted) return;
    setState(() => _loading = false);
  }

  Future<void> refreshFromParent() async {
    await _reloadAll();
  }

  Future<void> loadMoreIfNeeded() async {
    if (_loading || _loadingMore || !_hasMore) {
      return;
    }
    _loadingMore = true;
    await _loadFeedPage(append: true);
    if (!mounted) return;
    setState(() => _loadingMore = false);
  }

  @override
  Widget build(BuildContext context) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final shell = isLight ? Colors.white : const Color(0xFF0C111A);
    final border = isLight ? const Color(0xFFD8E0EE) : const Color(0xFF1E2638);
    final primary = isLight ? const Color(0xFF121722) : Colors.white;
    final secondary = isLight ? const Color(0xFF6D768A) : Colors.white60;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: shell,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Community Feed',
            style: TextStyle(
              color: primary,
              fontSize: 17.5,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'Discover trader updates and community intelligence.',
            style: TextStyle(
              color: secondary,
              fontSize: 12.2,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 10),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: List.generate(_tabs.length, (index) {
                final selected = _tabIndex == index;
                return Padding(
                  padding: EdgeInsets.only(
                    right: index == _tabs.length - 1 ? 0 : 8,
                  ),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(999),
                    onTap: () => _changeTab(index),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: selected
                            ? (isLight
                                  ? const Color(0xFF111827)
                                  : const Color(0xFFF4F6FA))
                            : (isLight
                                  ? const Color(0xFFECEFF7)
                                  : const Color(0xFF151D2A)),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        _tabs[index],
                        style: TextStyle(
                          color: selected
                              ? (isLight
                                    ? Colors.white
                                    : const Color(0xFF111827))
                              : secondary,
                          fontSize: 12.4,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
          const SizedBox(height: 10),
          if (_loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Center(
                child: CircularProgressIndicator(
                  strokeWidth: 2.1,
                  color: Color(0xFFF1CB3E),
                ),
              ),
            ),
          if (!_loading && _errorText != null) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isLight
                    ? const Color(0xFFF7EBEB)
                    : const Color(0xFF2A1720),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                _errorText!,
                style: TextStyle(
                  color: isLight
                      ? const Color(0xFF912E39)
                      : const Color(0xFFFFB9C1),
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const SizedBox(height: 8),
          ],
          if (!_loading)
            ..._posts.map(
              (post) => RepaintBoundary(
                child: _SocialPostCard(
                  post: post,
                  onClose: () => _dismissPost(post.id),
                ),
              ),
            ),
          if (!_loading && _posts.isEmpty)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(top: 6),
              padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 12),
              decoration: BoxDecoration(
                color: isLight
                    ? const Color(0xFFF6F8FC)
                    : const Color(0xFF101522),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Text(
                _tabKey == 'following'
                    ? 'No following posts yet. Follow creators to personalize your feed.'
                    : 'No posts available right now.',
                style: TextStyle(
                  color: secondary,
                  fontSize: 12.4,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          if (!_loadingMore && !_loading && _hasMore)
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: loadMoreIfNeeded,
                icon: const Icon(Icons.expand_more_rounded),
                label: const Text('Load more'),
              ),
            ),
          if (_loadingMore)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: Center(
                child: SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Color(0xFFF1CB3E),
                  ),
                ),
              ),
            ),
          const SizedBox(height: 10),
          _SuggestedCreatorsSection(
            creators: _creators,
            following: _followingCreators,
            onFollow: _followCreator,
          ),
          const SizedBox(height: 12),
          _CopyTradingForYouSection(traders: _copyTraders),
        ],
      ),
    );
  }

  List<_SocialFeedPost> _fallbackPostsForTab(String tab) {
    final now = DateTime.now();
    if (tab == 'campaign') {
      return <_SocialFeedPost>[
        _SocialFeedPost(
          id: 'fallback-campaign-1',
          username: 'Campaign Desk',
          createdAt: now.subtract(const Duration(minutes: 20)),
          contentText:
              'Campaign: Trade Futures and unlock up to 20% fee rebate this week.',
          mediaType: 'image',
          mediaUrl: 'https://picsum.photos/seed/bitegit-campaign/900/520',
          isLive: false,
          commentCount: 0,
          repostCount: 0,
          likeCount: 0,
          viewCount: 0,
        ),
      ];
    }
    if (tab == 'announcement') {
      return <_SocialFeedPost>[
        _SocialFeedPost(
          id: 'fallback-announcement-1',
          username: 'Official Desk',
          createdAt: now.subtract(const Duration(minutes: 15)),
          contentText:
              'Announcement: Wallet maintenance scheduled at 02:00 UTC.',
          mediaType: 'text',
          mediaUrl: '',
          isLive: false,
          commentCount: 0,
          repostCount: 0,
          likeCount: 0,
          viewCount: 0,
        ),
      ];
    }
    return <_SocialFeedPost>[
      _SocialFeedPost(
        id: 'fallback-discover-1',
        username: 'Alpha Whale',
        createdAt: now.subtract(const Duration(minutes: 4)),
        contentText:
            'BTC liquidity zones updated for NY session. Watching 67.8k-68.2k.',
        mediaType: 'image',
        mediaUrl: 'https://picsum.photos/seed/bitegit-discover-1/900/520',
        isLive: false,
        commentCount: 19,
        repostCount: 8,
        likeCount: 142,
        viewCount: 3580,
        avatarUrl: 'https://i.pravatar.cc/120?img=12',
      ),
      _SocialFeedPost(
        id: 'fallback-discover-2',
        username: 'Chain Pulse',
        createdAt: now.subtract(const Duration(minutes: 11)),
        contentText:
            'ETH perp basis stable. No aggressive long until confirmation close.',
        mediaType: 'video',
        mediaUrl: 'https://picsum.photos/seed/bitegit-discover-2/900/520',
        isLive: false,
        commentCount: 7,
        repostCount: 3,
        likeCount: 68,
        viewCount: 1910,
        avatarUrl: 'https://i.pravatar.cc/120?img=18',
      ),
    ];
  }

  List<_SuggestedCreator> get _fallbackCreators => const <_SuggestedCreator>[
    _SuggestedCreator(
      id: '1',
      name: 'Alpha Whale',
      followersCount: 21873,
      verified: true,
      avatarUrl: 'https://i.pravatar.cc/120?img=12',
    ),
    _SuggestedCreator(
      id: '2',
      name: 'Chain Pulse',
      followersCount: 14704,
      verified: true,
      avatarUrl: 'https://i.pravatar.cc/120?img=18',
    ),
    _SuggestedCreator(
      id: '3',
      name: 'Macro Desk',
      followersCount: 9931,
      verified: false,
      avatarUrl: 'https://i.pravatar.cc/120?img=22',
    ),
  ];

  List<_CopyTrader> get _fallbackCopyTraders => const <_CopyTrader>[
    _CopyTrader(
      id: 't1',
      username: 'Alpha Whale',
      avatarUrl: 'https://i.pravatar.cc/120?img=12',
      minCopyAmount: 10,
      pnl7d: 2142.33,
      roiPercent: 38.1,
      aumValue: 930241.24,
      winRate: 82.6,
    ),
    _CopyTrader(
      id: 't2',
      username: 'Chain Pulse',
      avatarUrl: 'https://i.pravatar.cc/120?img=18',
      minCopyAmount: 25,
      pnl7d: 1497.2,
      roiPercent: 31.7,
      aumValue: 512630.11,
      winRate: 77.5,
    ),
  ];
}

class _SocialPostCard extends StatelessWidget {
  const _SocialPostCard({required this.post, required this.onClose});

  final _SocialFeedPost post;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final cardBg = isLight ? const Color(0xFFF7F9FD) : const Color(0xFF0F1522);
    final border = isLight ? const Color(0xFFD8E0EE) : const Color(0xFF212A3E);
    final primary = isLight ? const Color(0xFF121722) : Colors.white;
    final secondary = isLight ? const Color(0xFF6D768A) : Colors.white60;

    final showMedia =
        post.mediaType != 'text' || post.mediaUrl.isNotEmpty || post.isLive;
    final mediaType = post.mediaType.toLowerCase();
    final mediaLabel = mediaType == 'video' ? 'Video preview' : 'Image preview';
    final mediaIcon = mediaType == 'video'
        ? Icons.play_circle_fill_rounded
        : Icons.photo_library_rounded;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: const Color(0xFFF1CB3E).withValues(alpha: 0.22),
                backgroundImage: post.avatarUrl.isNotEmpty
                    ? NetworkImage(post.avatarUrl)
                    : null,
                onBackgroundImageError: (_, __) {},
                child: post.avatarUrl.isEmpty
                    ? Text(
                        _initialsOf(post.username),
                        style: TextStyle(
                          color: primary,
                          fontSize: 12.8,
                          fontWeight: FontWeight.w800,
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      post.username,
                      style: TextStyle(
                        color: primary,
                        fontSize: 13.4,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      _timeAgo(post.createdAt),
                      style: TextStyle(
                        color: secondary,
                        fontSize: 11.4,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: onClose,
                icon: Icon(Icons.close_rounded, color: secondary, size: 18),
                tooltip: 'Hide',
              ),
            ],
          ),
          if (post.contentText.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              post.contentText,
              style: TextStyle(
                color: primary,
                fontSize: 13.1,
                height: 1.36,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
          if (showMedia) ...[
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: Stack(
                children: [
                  Container(
                    width: double.infinity,
                    height: 166,
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Color(0xFF1A2234), Color(0xFF263454)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                    child: post.mediaUrl.isNotEmpty
                        ? Image.network(
                            post.mediaUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) =>
                                Center(
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        mediaIcon,
                                        color: Colors.white70,
                                        size: 32,
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        mediaLabel,
                                        style: const TextStyle(
                                          color: Colors.white70,
                                          fontSize: 12.4,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                          )
                        : Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  mediaIcon,
                                  color: Colors.white70,
                                  size: 32,
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  mediaLabel,
                                  style: const TextStyle(
                                    color: Colors.white70,
                                    fontSize: 12.4,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                  ),
                  if (post.isLive)
                    Positioned(
                      left: 10,
                      top: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE93E59),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: const Text(
                          'LIVE',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 10.2,
                            fontWeight: FontWeight.w800,
                            letterSpacing: .4,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              _StatPill(
                icon: Icons.chat_bubble_outline_rounded,
                text: _formatCountCompact(post.commentCount),
              ),
              const SizedBox(width: 8),
              _StatPill(
                icon: Icons.repeat_rounded,
                text: _formatCountCompact(post.repostCount),
              ),
              const SizedBox(width: 8),
              _StatPill(
                icon: Icons.favorite_border_rounded,
                text: _formatCountCompact(post.likeCount),
              ),
              const Spacer(),
              _StatPill(
                icon: Icons.remove_red_eye_outlined,
                text: _formatCountCompact(post.viewCount),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatPill extends StatelessWidget {
  const _StatPill({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: isLight ? const Color(0xFFE8EDF8) : const Color(0xFF1A2233),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 13.8,
            color: isLight ? const Color(0xFF313A4E) : Colors.white70,
          ),
          const SizedBox(width: 4),
          Text(
            text,
            style: TextStyle(
              color: isLight ? const Color(0xFF313A4E) : Colors.white70,
              fontSize: 11.2,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _SuggestedCreatorsSection extends StatelessWidget {
  const _SuggestedCreatorsSection({
    required this.creators,
    required this.following,
    required this.onFollow,
  });

  final List<_SuggestedCreator> creators;
  final Set<String> following;
  final ValueChanged<_SuggestedCreator> onFollow;

  @override
  Widget build(BuildContext context) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final primary = isLight ? const Color(0xFF121722) : Colors.white;
    final secondary = isLight ? const Color(0xFF6D768A) : Colors.white60;
    final cardBg = isLight ? const Color(0xFFF7F9FD) : const Color(0xFF0F1522);
    final border = isLight ? const Color(0xFFD8E0EE) : const Color(0xFF212A3E);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Suggested Creators',
          style: TextStyle(
            color: primary,
            fontSize: 15.8,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 142,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: creators.length,
            itemBuilder: (context, index) {
              final creator = creators[index];
              final isFollowing = following.contains(creator.id);
              return Container(
                width: 174,
                margin: EdgeInsets.only(
                  right: index == creators.length - 1 ? 0 : 8,
                ),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 16,
                          backgroundColor: const Color(0xFFF1CB3E).withValues(alpha: .24),
                          backgroundImage: creator.avatarUrl.isNotEmpty
                              ? NetworkImage(creator.avatarUrl)
                              : null,
                          onBackgroundImageError: (_, __) {},
                          child: creator.avatarUrl.isEmpty
                              ? Text(
                                  _initialsOf(creator.name),
                                  style: const TextStyle(
                                    color: Color(0xFF1A1F2B),
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w800,
                                  ),
                                )
                              : null,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            creator.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: primary,
                              fontSize: 12.6,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        if (creator.verified)
                          const Icon(
                            Icons.verified_rounded,
                            color: Color(0xFF22C17A),
                            size: 15,
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${_formatCountCompact(creator.followersCount)} followers',
                      style: TextStyle(
                        color: secondary,
                        fontSize: 11.6,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const Spacer(),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: isFollowing ? null : () => onFollow(creator),
                        style: FilledButton.styleFrom(
                          backgroundColor: isFollowing
                              ? const Color(0xFF2ABF74)
                              : const Color(0xFFF1CB3E),
                          foregroundColor: const Color(0xFF121722),
                          disabledBackgroundColor: const Color(0xFF2ABF74),
                          disabledForegroundColor: const Color(0xFF0B1F12),
                          minimumSize: const Size.fromHeight(34),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: Text(
                          isFollowing ? 'Following' : 'Follow',
                          style: const TextStyle(
                            fontSize: 12.2,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _CopyTradingForYouSection extends StatelessWidget {
  const _CopyTradingForYouSection({required this.traders});

  final List<_CopyTrader> traders;

  @override
  Widget build(BuildContext context) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final primary = isLight ? const Color(0xFF121722) : Colors.white;
    final secondary = isLight ? const Color(0xFF6D768A) : Colors.white60;
    final cardBg = isLight ? const Color(0xFFF7F9FD) : const Color(0xFF0F1522);
    final border = isLight ? const Color(0xFFD8E0EE) : const Color(0xFF212A3E);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Copy Trading For You',
          style: TextStyle(
            color: primary,
            fontSize: 15.8,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 8),
        ...traders.map((trader) {
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: border),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 17,
                  backgroundColor: const Color(0xFFF1CB3E).withValues(alpha: .24),
                  backgroundImage: trader.avatarUrl.isNotEmpty
                      ? NetworkImage(trader.avatarUrl)
                      : null,
                  onBackgroundImageError: (_, __) {},
                  child: trader.avatarUrl.isEmpty
                      ? Text(
                          _initialsOf(trader.username),
                          style: const TextStyle(
                            color: Color(0xFF1A1F2B),
                            fontSize: 11.8,
                            fontWeight: FontWeight.w800,
                          ),
                        )
                      : null,
                ),
                const SizedBox(width: 9),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        trader.username,
                        style: TextStyle(
                          color: primary,
                          fontSize: 12.8,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Min copy ${_formatWithCommas(trader.minCopyAmount, decimals: 0)} USDT',
                        style: TextStyle(
                          color: secondary,
                          fontSize: 11.4,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '7D PNL ${trader.pnl7d >= 0 ? '+' : ''}${_formatWithCommas(trader.pnl7d, decimals: 2)} • ROI ${trader.roiPercent.toStringAsFixed(2)}% • Win ${trader.winRate.toStringAsFixed(1)}%',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: secondary,
                          fontSize: 11.1,
                          height: 1.28,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'AUM',
                      style: TextStyle(
                        color: secondary,
                        fontSize: 10.6,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      '\$${_formatWithCommas(trader.aumValue, decimals: 0)}',
                      style: TextStyle(
                        color: primary,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 6),
                    FilledButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              'Copying ${trader.username} will open next.',
                            ),
                          ),
                        );
                      },
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFFF1CB3E),
                        foregroundColor: const Color(0xFF111827),
                        minimumSize: const Size(64, 30),
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(9),
                        ),
                      ),
                      child: const Text(
                        'Copy',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        }),
      ],
    );
  }
}

class _HomeFeedComposerFab extends StatelessWidget {
  const _HomeFeedComposerFab({
    required this.open,
    required this.onToggle,
    required this.onSelect,
  });

  final bool open;
  final VoidCallback onToggle;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    const options = <String>[
      'Create Post',
      'Share Trade',
      'Upload Chart',
      'Start Live Stream',
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      mainAxisSize: MainAxisSize.min,
      children: [
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 180),
          child: !open
              ? const SizedBox.shrink()
              : Container(
                  key: const ValueKey<String>('composer-menu'),
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xE6151D2A),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFF303A50)),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: options
                        .map((item) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: OutlinedButton(
                              onPressed: () => onSelect(item),
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(
                                  color: Color(0xFF3B4560),
                                ),
                                backgroundColor: const Color(0xFF1D2739),
                                foregroundColor: Colors.white,
                                minimumSize: const Size(168, 34),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                              child: Text(
                                item,
                                style: const TextStyle(
                                  fontSize: 11.8,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          );
                        })
                        .toList(growable: false),
                  ),
                ),
        ),
        Material(
          color: const Color(0xFFF1CB3E),
          borderRadius: BorderRadius.circular(999),
          child: InkWell(
            onTap: onToggle,
            borderRadius: BorderRadius.circular(999),
            child: SizedBox(
              width: 54,
              height: 54,
              child: Center(
                child: AnimatedRotation(
                  turns: open ? 0.125 : 0,
                  duration: const Duration(milliseconds: 180),
                  child: const Icon(
                    Icons.add_rounded,
                    size: 31,
                    color: Color(0xFF1A1F2B),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _HomeMarketWidgets extends StatefulWidget {
  const _HomeMarketWidgets({required this.onOpenTradePair});

  final ValueChanged<MarketPair> onOpenTradePair;

  @override
  State<_HomeMarketWidgets> createState() => _HomeMarketWidgetsState();
}

class _HomeMarketWidgetsState extends State<_HomeMarketWidgets> {
  late List<MarketPair> _favorites;
  late List<MarketPair> _movers;
  final LiveMarketService _marketService = LiveMarketService();
  Timer? _ticker;

  @override
  void initState() {
    super.initState();
    _favorites = List<MarketPair>.from(kMarketPairs.take(3));
    _movers = List<MarketPair>.from(kMarketPairs.reversed.take(6));
    _refresh();
    _ticker = Timer.periodic(const Duration(seconds: 20), (_) => _refresh());
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  Future<void> _refresh() async {
    try {
      final pairs = await _marketService.fetchPairs();
      if (!mounted || pairs.isEmpty) return;
      final movers = List<MarketPair>.from(pairs)
        ..sort(
          (a, b) => _parsePercentValue(
            b.change,
          ).compareTo(_parsePercentValue(a.change)),
        );
      setState(() {
        _favorites = pairs.take(3).toList();
        _movers = movers.take(6).toList();
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: showHomeFavoritesWidget,
      builder: (context, showFav, _) {
        return ValueListenableBuilder<bool>(
          valueListenable: showHomeTopMoversWidget,
          builder: (context, showTop, child) {
            return Column(
              children: [
                if (showFav)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF111318),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFF212731)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Expanded(
                              child: Text(
                                'Favorites',
                                style: TextStyle(
                                  fontSize: 14.5,
                                  color: Colors.white60,
                                ),
                              ),
                            ),
                            Icon(
                              Icons.chevron_right,
                              size: 18,
                              color: Colors.white38,
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        const Row(
                          children: [
                            Text(
                              'Spot',
                              style: TextStyle(
                                fontSize: 14.2,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            SizedBox(width: 16),
                            Text(
                              'Derivatives',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.white60,
                              ),
                            ),
                            SizedBox(width: 16),
                            Text(
                              'TradFi',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.white60,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: List.generate(_favorites.length, (index) {
                            final pair = _favorites[index];
                            return Expanded(
                              child: Padding(
                                padding: EdgeInsets.only(
                                  right: index == _favorites.length - 1 ? 0 : 8,
                                ),
                                child: InkWell(
                                  onTap: () => widget.onOpenTradePair(pair),
                                  child: _HomeMiniTicker(
                                    name: pair.symbol.split('/').first,
                                    price: pair.price,
                                    change: pair.change,
                                  ),
                                ),
                              ),
                            );
                          }),
                        ),
                      ],
                    ),
                  ),
                if (showFav && showTop) const SizedBox(height: 10),
                if (showTop)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF111318),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFF212731)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Expanded(
                              child: Text(
                                'Top movers',
                                style: TextStyle(
                                  fontSize: 14.5,
                                  color: Colors.white60,
                                ),
                              ),
                            ),
                            Icon(
                              Icons.chevron_right,
                              size: 18,
                              color: Colors.white38,
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        const Row(
                          children: [
                            Text(
                              'Gainers',
                              style: TextStyle(
                                fontSize: 14.2,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            SizedBox(width: 16),
                            Text(
                              'Losers',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.white60,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        _HomeMoverGrid(
                          pairs: _movers,
                          onOpenTradePair: widget.onOpenTradePair,
                        ),
                      ],
                    ),
                  ),
              ],
            );
          },
        );
      },
    );
  }
}

class _HomeMiniTicker extends StatelessWidget {
  const _HomeMiniTicker({
    required this.name,
    required this.price,
    required this.change,
  });

  final String name;
  final String price;
  final String change;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 24,
              height: 24,
              decoration: const BoxDecoration(
                color: Color(0xFF1E2530),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  name.substring(0, 1),
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 6),
            Text(
              name,
              style: const TextStyle(
                fontSize: 12.4,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          price,
          style: const TextStyle(fontSize: 11.6, fontWeight: FontWeight.w700),
        ),
        Text(
          change,
          style: const TextStyle(
            fontSize: 11,
            color: Color(0xFF40D580),
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class _HomeMoverGrid extends StatelessWidget {
  const _HomeMoverGrid({required this.pairs, required this.onOpenTradePair});

  final List<MarketPair> pairs;
  final ValueChanged<MarketPair> onOpenTradePair;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: pairs.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        mainAxisSpacing: 12,
        crossAxisSpacing: 10,
        childAspectRatio: 0.95,
      ),
      itemBuilder: (context, index) {
        final pair = pairs[index];
        final symbol = pair.symbol.split('/').first;
        return InkWell(
          onTap: () => onOpenTradePair(pair),
          child: Column(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: const BoxDecoration(
                  color: Color(0xFF1C232D),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    symbol.substring(0, 1),
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                symbol,
                style: const TextStyle(
                  fontSize: 11.8,
                  fontWeight: FontWeight.w700,
                ),
              ),
              Text(
                pair.change,
                style: TextStyle(
                  fontSize: 11,
                  color: pair.change.startsWith('-')
                      ? const Color(0xFFEF4E5E)
                      : const Color(0xFF40D580),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _AnnouncementTicker extends StatefulWidget {
  const _AnnouncementTicker({required this.items});

  final List<String> items;

  @override
  State<_AnnouncementTicker> createState() => _AnnouncementTickerState();
}

class _AnnouncementTickerState extends State<_AnnouncementTicker> {
  late final ScrollController _controller;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _controller = ScrollController();
    _timer = Timer.periodic(const Duration(milliseconds: 55), (_) {
      if (!_controller.hasClients) return;
      final max = _controller.position.maxScrollExtent;
      var next = _controller.offset + 1.6;
      if (next >= max) {
        next = 0;
      }
      _controller.jumpTo(next);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final merged = widget.items.join('     •     ');
    return Container(
      height: 30,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF0C1324),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF1A2742)),
      ),
      child: Row(
        children: [
          const Icon(Icons.campaign_outlined, size: 14, color: Colors.white70),
          const SizedBox(width: 8),
          Expanded(
            child: ListView(
              controller: _controller,
              scrollDirection: Axis.horizontal,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                Center(
                  child: Text(
                    '$merged     •     $merged',
                    style: const TextStyle(
                      fontSize: 10.1,
                      color: Colors.white70,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class AuthEntryPage extends StatefulWidget {
  const AuthEntryPage({super.key});

  @override
  State<AuthEntryPage> createState() => _AuthEntryPageState();
}

class _AuthEntryPageState extends State<AuthEntryPage> {
  final TextEditingController _identityController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _loggingIn = false;

  @override
  void dispose() {
    _identityController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (_loggingIn) return;
    final identity = _identityController.text.trim();
    final password = _passwordController.text;
    if (identity.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Enter email and password')));
      return;
    }
    setState(() => _loggingIn = true);
    await Future<void>.delayed(const Duration(milliseconds: 220));
    final user = _findUserByIdentity(identity);
    if (!mounted) return;
    if (user == null || user.password != password) {
      setState(() => _loggingIn = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Invalid credentials')));
      return;
    }
    _hydrateSessionFromUser(user);
    _syncActiveUserState(walletBalanceUsdt: fundingUsdtBalanceNotifier.value);
    setState(() => _loggingIn = false);
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Login successful')));
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 12),
            child: Icon(Icons.support_agent_outlined, size: 20),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(14),
        children: [
          const SizedBox(height: 10),
          const Text(
            'Welcome back!',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 24),
          const Text(
            'Email/Phone number',
            style: TextStyle(fontSize: 12.8, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _identityController,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
            decoration: const InputDecoration(hintText: 'Enter email or phone'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _passwordController,
            obscureText: true,
            decoration: const InputDecoration(hintText: 'Password'),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _loggingIn ? null : _login,
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFF1CB3E),
                foregroundColor: Colors.black,
                minimumSize: const Size.fromHeight(48),
              ),
              child: const Text(
                'Continue',
                style: TextStyle(fontSize: 14.8, fontWeight: FontWeight.w700),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text(
                'No account? ',
                style: TextStyle(fontSize: 12.4, color: Colors.white70),
              ),
              TextButton(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const SignupEntryPage(),
                    ),
                  );
                },
                child: const Text('Sign up'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class SignupEntryPage extends StatefulWidget {
  const SignupEntryPage({super.key});

  @override
  State<SignupEntryPage> createState() => _SignupEntryPageState();
}

class _SignupEntryPageState extends State<SignupEntryPage> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmController = TextEditingController();
  bool _creating = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  bool _validEmail(String value) {
    return RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(value.trim());
  }

  Future<void> _createAccount() async {
    if (_creating) return;
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    final confirm = _confirmController.text;
    if (!_validEmail(email)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid email address')),
      );
      return;
    }
    if (password.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password must be at least 6 characters')),
      );
      return;
    }
    if (password != confirm) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Passwords do not match')));
      return;
    }
    setState(() => _creating = true);
    await Future<void>.delayed(const Duration(milliseconds: 260));
    final createdUserId = _createUser(email: email, password: password);
    if (!mounted) return;
    if (createdUserId == null) {
      setState(() => _creating = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('User already exists. Please login.')),
      );
      return;
    }
    final user = _findUserByIdentity(email);
    if (user == null) {
      setState(() => _creating = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to create user profile')),
      );
      return;
    }
    _hydrateSessionFromUser(user);
    _syncActiveUserState(
      walletBalanceUsdt: 0,
      canPostAds: false,
      kycStatus: 'pending',
    );
    setState(() => _creating = false);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Signup successful. Complete KYC next.')),
    );
    await Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(builder: (_) => const KycVerificationPage()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(leading: const BackButton(), title: const Text('Sign Up')),
      body: ListView(
        padding: const EdgeInsets.all(14),
        children: [
          const SizedBox(height: 10),
          const Text(
            'Create your account',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(labelText: 'Email'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _passwordController,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Password'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _confirmController,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Confirm Password'),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _creating ? null : _createAccount,
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFF1CB3E),
                foregroundColor: Colors.black,
                minimumSize: const Size.fromHeight(50),
              ),
              child: Text(
                _creating ? 'Creating...' : 'Sign Up',
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FakeGeetestDialog extends StatefulWidget {
  const _FakeGeetestDialog({required this.identity});

  final String identity;

  @override
  State<_FakeGeetestDialog> createState() => _FakeGeetestDialogState();
}

class _FakeGeetestDialogState extends State<_FakeGeetestDialog> {
  final Random _random = Random();
  late double _target;
  double _slider = 0;
  bool _verifying = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _resetPuzzle();
  }

  void _resetPuzzle() {
    _target = 60 + _random.nextInt(30).toDouble();
    _slider = 0;
    _error = null;
    _verifying = false;
  }

  Future<void> _verifySlide(double value) async {
    if (_verifying) return;
    setState(() {
      _verifying = true;
      _error = null;
    });
    await Future<void>.delayed(const Duration(milliseconds: 180));
    final diff = (value - _target).abs();
    if (diff <= 4.8) {
      if (!mounted) return;
      setState(() => _slider = _target);
      await Future<void>.delayed(const Duration(milliseconds: 180));
      if (!mounted) return;
      Navigator.of(context).pop(true);
      return;
    }

    setState(() {
      _error = 'Slider not matched. Try again.';
      _slider = 0;
      _verifying = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final slotLeft = 22 + (_target / 100) * 190;
    final pieceLeft = 22 + (_slider / 100) * 190;
    return Dialog(
      backgroundColor: const Color(0xFF0B0E16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFDEE5F4),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Slide to complete puzzle',
                    style: TextStyle(
                      fontSize: 18,
                      color: Color(0xFF333D4C),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Identity: ${_maskIdentity(widget.identity)}',
                    style: const TextStyle(
                      fontSize: 11.8,
                      color: Color(0xFF4A556A),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF202833), Color(0xFF2A3348)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Column(
                      children: [
                        SizedBox(
                          height: 150,
                          child: Stack(
                            children: [
                              Positioned.fill(
                                child: Container(
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(10),
                                    gradient: const LinearGradient(
                                      colors: [
                                        Color(0xFF141C2A),
                                        Color(0xFF0E1522),
                                      ],
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                    ),
                                  ),
                                ),
                              ),
                              for (int i = 0; i < 7; i++)
                                Positioned(
                                  left: 8 + i * 38,
                                  top: (i.isEven ? 18 : 30),
                                  child: Container(
                                    width: 28,
                                    height: 20 + (i % 3) * 8,
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(
                                        alpha: 0.05,
                                      ),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                  ),
                                ),
                              Positioned(
                                left: slotLeft,
                                top: 56,
                                child: Container(
                                  width: 34,
                                  height: 34,
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(8),
                                    color: Colors.white.withValues(alpha: 0.2),
                                    border: Border.all(
                                      color: const Color(0x99FFFFFF),
                                      width: 1.4,
                                    ),
                                  ),
                                ),
                              ),
                              Positioned(
                                left: pieceLeft,
                                top: 56,
                                child: Container(
                                  width: 34,
                                  height: 34,
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(8),
                                    gradient: const LinearGradient(
                                      colors: [
                                        Color(0xFFF4D06F),
                                        Color(0xFFE6A82C),
                                      ],
                                    ),
                                    boxShadow: const [
                                      BoxShadow(
                                        color: Color(0x55000000),
                                        blurRadius: 6,
                                        offset: Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: const Icon(
                                    Icons.extension_rounded,
                                    size: 18,
                                    color: Color(0xFF1C2430),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),
                        SliderTheme(
                          data: SliderThemeData(
                            trackHeight: 8,
                            thumbShape: const RoundSliderThumbShape(
                              enabledThumbRadius: 10,
                            ),
                            overlayShape: SliderComponentShape.noOverlay,
                            activeTrackColor: const Color(0xFF57C97A),
                            inactiveTrackColor: const Color(0xFF364155),
                            thumbColor: const Color(0xFF9DFB3B),
                          ),
                          child: Slider(
                            value: _slider,
                            min: 0,
                            max: 100,
                            onChanged: _verifying
                                ? null
                                : (v) => setState(() => _slider = v),
                            onChangeEnd: _verifySlide,
                          ),
                        ),
                        if (_error != null) ...[
                          const SizedBox(height: 6),
                          Text(
                            _error!,
                            style: const TextStyle(
                              fontSize: 11.5,
                              color: Color(0xFFFF8C8C),
                            ),
                          ),
                        ],
                        if (_verifying) ...[
                          const SizedBox(height: 4),
                          const Text(
                            'Verifying...',
                            style: TextStyle(
                              fontSize: 11.5,
                              color: Color(0xFF9DFB3B),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: null,
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFFAEC0EA),
                        foregroundColor: Colors.white,
                      ),
                      child: const Text('Slide To Verify'),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  icon: const Icon(
                    Icons.cancel_outlined,
                    size: 22,
                    color: Colors.white60,
                  ),
                ),
                IconButton(
                  onPressed: () {
                    setState(() {
                      _resetPuzzle();
                    });
                  },
                  icon: const Icon(
                    Icons.refresh,
                    size: 22,
                    color: Colors.white60,
                  ),
                ),
                const Icon(
                  Icons.chat_outlined,
                  size: 22,
                  color: Colors.white60,
                ),
                const Text(
                  'GEETEST',
                  style: TextStyle(fontSize: 18, color: Colors.white54),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class VerificationCodePage extends StatefulWidget {
  const VerificationCodePage({
    super.key,
    required this.maskedIdentity,
    required this.identity,
    required this.backendOtpSent,
    required this.helperMessage,
  });

  final String maskedIdentity;
  final String identity;
  final bool backendOtpSent;
  final String helperMessage;

  @override
  State<VerificationCodePage> createState() => _VerificationCodePageState();
}

class _VerificationCodePageState extends State<VerificationCodePage> {
  final TextEditingController _codeController = TextEditingController();
  int _seconds = 118;
  Timer? _timer;
  bool _verifying = false;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      if (_seconds <= 0) return;
      setState(() => _seconds -= 1);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _codeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final chars = _codeController.text.padRight(6).split('');
    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 12),
            child: Icon(Icons.support_agent_outlined, size: 20),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(14),
        children: [
          const SizedBox(height: 8),
          const Text(
            'Enter verification code',
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 14),
          Text(
            'Verification code : ${widget.maskedIdentity}',
            style: const TextStyle(fontSize: 14.5),
          ),
          const SizedBox(height: 6),
          Text(
            widget.backendOtpSent
                ? 'OTP sent via secure gateway'
                : widget.helperMessage,
            style: const TextStyle(fontSize: 11.8, color: Colors.white60),
          ),
          const SizedBox(height: 12),
          Stack(
            children: [
              Row(
                children: List.generate(6, (i) {
                  final v = chars[i].trim();
                  return Expanded(
                    child: Container(
                      margin: EdgeInsets.only(right: i == 5 ? 0 : 8),
                      height: 56,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: const Color(0xFF1A1E27),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Text(
                        v,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  );
                }),
              ),
              Positioned.fill(
                child: TextField(
                  controller: _codeController,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  style: const TextStyle(color: Colors.transparent),
                  decoration: const InputDecoration(
                    counterText: '',
                    border: InputBorder.none,
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                'Resend in ${_seconds}s',
                style: const TextStyle(fontSize: 13, color: Colors.white70),
              ),
              const Spacer(),
              OutlinedButton(
                onPressed: () async {
                  final data = await Clipboard.getData(Clipboard.kTextPlain);
                  final t = data?.text ?? '';
                  if (t.isEmpty) return;
                  _codeController.text = t.substring(0, min(6, t.length));
                  setState(() {});
                },
                child: const Text('Paste'),
              ),
              const SizedBox(width: 8),
              OutlinedButton(
                onPressed: _seconds == 0
                    ? () async {
                        final messenger = ScaffoldMessenger.of(context);
                        final result = await AuthOtpService.requestOtp(
                          widget.identity,
                        );
                        if (!mounted) return;
                        setState(() => _seconds = 118);
                        messenger.showSnackBar(
                          SnackBar(
                            content: Text(
                              result.success ? 'OTP resent' : result.message,
                            ),
                          ),
                        );
                      }
                    : null,
                child: const Text('Resend'),
              ),
            ],
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _codeController.text.length == 6 && !_verifying
                  ? () async {
                      final navigator = Navigator.of(context);
                      final messenger = ScaffoldMessenger.of(context);
                      setState(() => _verifying = true);
                      try {
                        await Future<void>.delayed(
                          const Duration(milliseconds: 350),
                        );
                        final ok = await AuthOtpService.verifyOtp(
                          identity: widget.identity,
                          otp: _codeController.text,
                        );
                        if (!mounted) return;
                        if (ok) {
                          navigator.pop(true);
                        } else {
                          messenger.showSnackBar(
                            const SnackBar(
                              content: Text('Invalid OTP. Please try again.'),
                            ),
                          );
                        }
                      } finally {
                        if (mounted) setState(() => _verifying = false);
                      }
                    }
                  : null,
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF2C313E),
                minimumSize: const Size.fromHeight(48),
              ),
              child: Text(
                _verifying ? 'Verifying...' : 'Confirm',
                style: const TextStyle(fontSize: 16),
              ),
            ),
          ),
          const SizedBox(height: 12),
          const Center(
            child: Text(
              "Didn't receive the code?",
              style: TextStyle(fontSize: 13.2, color: Colors.white70),
            ),
          ),
          const SizedBox(height: 20),
          const Center(
            child: Text(
              'Verify via other methods',
              style: TextStyle(fontSize: 16.2, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}

class TradingViewChartPage extends StatefulWidget {
  const TradingViewChartPage({super.key, required this.pair});

  final MarketPair pair;

  @override
  State<TradingViewChartPage> createState() => _TradingViewChartPageState();
}

class _TradingViewChartPageState extends State<TradingViewChartPage> {
  late final WebViewController _controller;
  bool _loading = true;
  String _interval = '15';
  static const List<String> _intervals = ['1', '5', '15', '60', '240', '1D'];

  String _tvSymbol(String pair) {
    final cleaned = pair.toUpperCase().replaceAll('/', '').replaceAll('-', '');
    return 'BINANCE:$cleaned';
  }

  String _chartUrl() {
    final symbol = Uri.encodeComponent(_tvSymbol(widget.pair.symbol));
    final interval = Uri.encodeComponent(_interval);
    return 'https://s.tradingview.com/widgetembed/'
        '?symbol=$symbol'
        '&interval=$interval'
        '&hidesidetoolbar=1'
        '&symboledit=0'
        '&saveimage=1'
        '&toolbarbg=05070B'
        '&theme=dark'
        '&style=1'
        '&timezone=Asia%2FKolkata'
        '&withdateranges=1'
        '&hidevolume=0'
        '&allow_symbol_change=0';
  }

  void _reloadChart() {
    setState(() => _loading = true);
    _controller.loadRequest(Uri.parse(_chartUrl()));
  }

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF060A15))
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (!mounted) return;
            setState(() => _loading = true);
          },
          onPageFinished: (_) {
            if (!mounted) return;
            setState(() => _loading = false);
          },
          onWebResourceError: (_) {
            if (!mounted) return;
            setState(() => _loading = false);
          },
        ),
      )
      ..loadRequest(Uri.parse(_chartUrl()));
  }

  @override
  Widget build(BuildContext context) {
    final isDown = widget.pair.change.startsWith('-');
    final changeColor = isDown
        ? const Color(0xFFEF4E5E)
        : const Color(0xFF53D983);
    return Scaffold(
      backgroundColor: const Color(0xFF05070B),
      appBar: AppBar(
        backgroundColor: const Color(0xFF05070B),
        title: Text(
          widget.pair.symbol,
          style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700),
        ),
        actions: [
          IconButton(
            onPressed: _reloadChart,
            icon: const Icon(Icons.refresh, size: 20),
            tooltip: 'Refresh',
          ),
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.close_fullscreen_rounded, size: 20),
            tooltip: 'Close',
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            margin: const EdgeInsets.fromLTRB(12, 8, 12, 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              gradient: const LinearGradient(
                colors: [Color(0xFF0B1322), Color(0xFF0C182E)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              border: Border.all(color: const Color(0xFF1D2A44)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.pair.price,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        widget.pair.change,
                        style: TextStyle(
                          fontSize: 12,
                          color: changeColor,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFF132238),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: const Color(0xFF2A3E61)),
                  ),
                  child: const Text(
                    'TradingView',
                    style: TextStyle(fontSize: 10.6, color: Colors.white70),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(
            height: 36,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              scrollDirection: Axis.horizontal,
              itemBuilder: (context, index) {
                final item = _intervals[index];
                final active = _interval == item;
                return ChoiceChip(
                  label: Text(item, style: const TextStyle(fontSize: 10.8)),
                  selected: active,
                  onSelected: (_) {
                    if (_interval == item) return;
                    setState(() => _interval = item);
                    _reloadChart();
                  },
                );
              },
              separatorBuilder: (_, unused) => const SizedBox(width: 6),
              itemCount: _intervals.length,
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: Container(
              margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              decoration: BoxDecoration(
                color: const Color(0xFF060A15),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF1D2A44)),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x55000000),
                    blurRadius: 14,
                    offset: Offset(0, 6),
                  ),
                ],
              ),
              clipBehavior: Clip.antiAlias,
              child: Stack(
                children: [
                  WebViewWidget(controller: _controller),
                  if (_loading)
                    const Center(
                      child: CircularProgressIndicator(
                        strokeWidth: 2.2,
                        color: Color(0xFF9DFB3B),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class MarketsPage extends StatefulWidget {
  const MarketsPage({
    super.key,
    required this.onOpenProfile,
    required this.onOpenTradePair,
  });

  final VoidCallback onOpenProfile;
  final ValueChanged<MarketPair> onOpenTradePair;

  @override
  State<MarketsPage> createState() => _MarketsPageState();
}

class _MarketsPageState extends State<MarketsPage> {
  final LiveMarketService _marketService = LiveMarketService();
  List<MarketPair> _pairs = List<MarketPair>.from(kMarketPairs);
  bool _loading = true;
  Timer? _timer;
  String _mainTab = 'Spot';
  String _subTab = 'All';

  static const Map<String, List<String>> _subTabMap = {
    'Favorites': ['Futures', 'Spot'],
    'Futures': ['USDT-M'],
    'Spot': ['All', 'Initial listing', '0 fees', 'Meme', 'Pre-market'],
  };

  @override
  void initState() {
    super.initState();
    _refresh();
    _timer = Timer.periodic(const Duration(seconds: 20), (_) => _refresh());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _refresh() async {
    try {
      final fetched = await _marketService.fetchPairs();
      if (!mounted || fetched.isEmpty) return;
      setState(() {
        _pairs = fetched.take(40).toList();
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  void _setMainTab(String value) {
    if (value == _mainTab) return;
    final subtabs = _subTabMap[value] ?? const <String>[];
    setState(() {
      _mainTab = value;
      _subTab = subtabs.isEmpty ? '' : subtabs.first;
    });
  }

  List<MarketPair> _rowsForState() {
    if (_pairs.isEmpty) return List<MarketPair>.from(kMarketPairs);
    final rows = List<MarketPair>.from(_pairs);
    if (_mainTab == 'Futures') {
      rows.sort(
        (a, b) => _parseNumericValue(
          b.volume,
        ).compareTo(_parseNumericValue(a.volume)),
      );
      return rows.take(22).toList();
    }
    rows.sort(
      (a, b) =>
          _parsePercentValue(b.change).compareTo(_parsePercentValue(a.change)),
    );
    if (_subTab == 'Gainers') {
      return rows.take(22).toList();
    }
    if (_subTab == 'New') {
      return rows.reversed.take(22).toList();
    }
    if (_subTab == '24h Vol') {
      rows.sort(
        (a, b) => _parseNumericValue(
          b.volume,
        ).compareTo(_parseNumericValue(a.volume)),
      );
      return rows.take(22).toList();
    }
    return List<MarketPair>.from(_pairs).take(22).toList();
  }

  Widget _buildMainTabs() {
    const tabs = ['Favorites', 'Futures', 'Spot'];
    return Row(
      children: tabs.map((tab) {
        final active = tab == _mainTab;
        return Expanded(
          child: InkWell(
            onTap: () => _setMainTab(tab),
            child: Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Column(
                children: [
                  Text(
                    tab,
                    style: TextStyle(
                      fontSize: 45 / 3.0,
                      fontWeight: active ? FontWeight.w700 : FontWeight.w600,
                      color: active ? Colors.white : Colors.white54,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    height: 2,
                    width: 48,
                    color: active ? Colors.white : Colors.transparent,
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildSubTabs() {
    final subtabs = _subTabMap[_mainTab] ?? const <String>[];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: subtabs.map((tab) {
          final active = tab == _subTab;
          return Padding(
            padding: const EdgeInsets.only(right: 18),
            child: InkWell(
              onTap: () => setState(() => _subTab = tab),
              child: Column(
                children: [
                  Text(
                    tab,
                    style: TextStyle(
                      fontSize: 16,
                      color: active ? Colors.white : Colors.white54,
                      fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    width: 42,
                    height: 2,
                    color: active ? Colors.white : Colors.transparent,
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildFavoritesGrid() {
    final rows = _pairs.take(6).toList();
    return Column(
      children: [
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: rows.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            childAspectRatio: 1.65,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
          ),
          itemBuilder: (context, index) {
            final pair = rows[index];
            final isDown = pair.change.startsWith('-');
            return InkWell(
              onTap: () => widget.onOpenTradePair(pair),
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF1B1F2A),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF2B3140)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            pair.symbol.replaceAll('/', ''),
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const Icon(Icons.check_box, size: 18),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      pair.price,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      pair.change,
                      style: TextStyle(
                        fontSize: 14,
                        color: isDown
                            ? const Color(0xFFEF4E5E)
                            : const Color(0xFF53D983),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 18),
        SizedBox(
          width: double.infinity,
          child: FilledButton(
            onPressed: () {},
            style: FilledButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: Colors.black,
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(24),
              ),
            ),
            child: const Text(
              'Favorite',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPairRows() {
    final rows = _rowsForState();
    return Column(
      children: [
        const Row(
          children: [
            Expanded(
              child: Text(
                'Market/Vol',
                style: TextStyle(color: Colors.white54, fontSize: 12.4),
              ),
            ),
            SizedBox(
              width: 132,
              child: Text(
                'Price',
                textAlign: TextAlign.right,
                style: TextStyle(color: Colors.white54, fontSize: 12.4),
              ),
            ),
            SizedBox(
              width: 96,
              child: Text(
                'Change',
                textAlign: TextAlign.right,
                style: TextStyle(color: Colors.white54, fontSize: 12.4),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ...rows.map((pair) {
          final isDown = pair.change.startsWith('-');
          return InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () => widget.onOpenTradePair(pair),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          pair.symbol.replaceAll('/', ''),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Vol ${pair.volume.replaceAll(' USDT', '')}',
                          style: const TextStyle(
                            color: Colors.white54,
                            fontSize: 11.8,
                          ),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(
                    width: 132,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          pair.price,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '\$${_formatWithCommas(double.tryParse(pair.price.replaceAll(',', '')) ?? 0, decimals: 2)}',
                          style: const TextStyle(
                            color: Colors.white54,
                            fontSize: 11.8,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Container(
                    width: 86,
                    alignment: Alignment.center,
                    padding: const EdgeInsets.symmetric(vertical: 9),
                    decoration: BoxDecoration(
                      color: isDown
                          ? const Color(0xFFEF4E5E)
                          : const Color(0xFF53D983),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Text(
                      pair.change,
                      style: const TextStyle(
                        fontSize: 12.8,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(14),
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          height: 54,
          decoration: BoxDecoration(
            color: const Color(0xFF171B29),
            borderRadius: BorderRadius.circular(27),
          ),
          child: const Row(
            children: [
              Icon(Icons.search, size: 28, color: Colors.white70),
              SizedBox(width: 10),
              Text(
                'Search',
                style: TextStyle(color: Colors.white54, fontSize: 17),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        _buildMainTabs(),
        const SizedBox(height: 6),
        _buildSubTabs(),
        const SizedBox(height: 14),
        if (_loading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(
              child: CircularProgressIndicator(
                strokeWidth: 2.2,
                color: Color(0xFF9DFB3B),
              ),
            ),
          ),
        if (!_loading) ...[
          if (_mainTab == 'Favorites')
            _buildFavoritesGrid()
          else
            _buildPairRows(),
        ],
      ],
    );
  }
}

class TradePage extends StatefulWidget {
  const TradePage({super.key, required this.onOpenProfile});

  final VoidCallback onOpenProfile;

  @override
  State<TradePage> createState() => _TradePageState();
}

class _TradePageState extends State<TradePage> {
  int _marketTabIndex = 0;
  int _headerTab = 0;
  int _timeframeIndex = 1;
  int _flowFrameIndex = 0;
  bool _isBuy = true;
  String? _activePairSymbol;

  final Random _liveRandom = Random();
  final Map<String, double> _livePrice = {};
  final Map<String, List<_CandleBar>> _seriesCache = {};
  final Map<String, int> _candleTickCounter = {};
  Timer? _liveTimer;

  static const List<String> _marketTabs = [
    'Spot',
    'Margin',
    'Onchain',
    'Earn',
    'Tools',
  ];
  static const List<String> _headerTabs = ['Chart', 'Data', 'Square', 'About'];
  static const List<String> _timeframes = [
    '1m',
    '15m',
    '1h',
    '4h',
    '1D',
    'More',
  ];
  static const List<String> _flowFrames = [
    '15m',
    '30m',
    '1h',
    '2h',
    '4h',
    '1D',
  ];

  @override
  void initState() {
    super.initState();
    _activePairSymbol = selectedTradePairNotifier.value.symbol;
    selectedTradePairNotifier.addListener(_handleSelectedPairChanged);
    _liveTimer = Timer.periodic(const Duration(milliseconds: 1000), (_) {
      if (!mounted) return;
      final pair = selectedTradePairNotifier.value;
      setState(() => _tickLiveSeries(pair));
    });
  }

  void _handleSelectedPairChanged() {
    final symbol = selectedTradePairNotifier.value.symbol;
    if (_activePairSymbol == symbol) return;
    _activePairSymbol = symbol;
    if (!mounted) return;
    setState(() {
      _marketTabIndex = 0;
      _headerTab = 0;
      _timeframeIndex = 1;
      _flowFrameIndex = 0;
      _isBuy = true;
    });
  }

  @override
  void dispose() {
    selectedTradePairNotifier.removeListener(_handleSelectedPairChanged);
    _liveTimer?.cancel();
    super.dispose();
  }

  double _priceFromString(String value) {
    return double.tryParse(value.replaceAll(',', '')) ?? 1;
  }

  String _seriesKey(MarketPair pair) =>
      '${pair.symbol}-${_timeframes[_timeframeIndex]}';

  int _rollEveryForTimeframe() {
    final tf = _timeframes[_timeframeIndex];
    if (tf == '1m') return 3;
    if (tf == '15m') return 5;
    if (tf == '1h') return 7;
    if (tf == '4h') return 9;
    if (tf == '1D') return 12;
    return 8;
  }

  int _seedForKey(String key) {
    int hash = 17;
    for (final c in key.codeUnits) {
      hash = ((hash * 31) + c) & 0x7fffffff;
    }
    return hash;
  }

  List<String> _pairParts(String symbol) {
    if (symbol.contains('/')) {
      final parts = symbol.split('/');
      if (parts.length >= 2 && parts[0].isNotEmpty && parts[1].isNotEmpty) {
        return [parts[0], parts[1]];
      }
    }
    const quoteCandidates = ['USDT', 'USDC', 'BTC', 'ETH', 'BNB', 'INR', 'USD'];
    for (final quote in quoteCandidates) {
      if (symbol.length > quote.length && symbol.endsWith(quote)) {
        return [symbol.substring(0, symbol.length - quote.length), quote];
      }
    }
    return [symbol, 'USDT'];
  }

  String _baseAsset(MarketPair pair) => _pairParts(pair.symbol)[0];
  String _quoteAsset(MarketPair pair) => _pairParts(pair.symbol)[1];

  List<_CandleBar> _generateInitialSeries(MarketPair pair, String key) {
    final random = Random(_seedForKey(key));
    final base = _priceFromString(pair.price);
    final List<_CandleBar> candles = [];
    double cursor = base * (0.96 + random.nextDouble() * 0.08);
    for (int i = 0; i < 66; i++) {
      final drift = (random.nextDouble() - 0.5) * (base * 0.0048 + 0.03);
      final open = cursor;
      final close = (cursor + drift).clamp(base * 0.7, base * 1.4).toDouble();
      final high =
          max(open, close) + random.nextDouble() * (base * 0.0024 + 0.02);
      final low =
          min(open, close) - random.nextDouble() * (base * 0.0024 + 0.02);
      candles.add(_CandleBar(open: open, high: high, low: low, close: close));
      cursor = close;
    }
    _livePrice[pair.symbol] = candles.last.close;
    _candleTickCounter[key] = 0;
    return candles;
  }

  void _tickLiveSeries(MarketPair pair) {
    final anchor = _priceFromString(pair.price);
    final current = _livePrice[pair.symbol] ?? anchor;
    final drift = (_liveRandom.nextDouble() - 0.5) * 0.00135;
    final next = (current * (1 + drift)).clamp(anchor * 0.7, anchor * 1.35);
    final key = _seriesKey(pair);
    final source = _seriesCache[key] ?? _generateInitialSeries(pair, key);
    final candles = List<_CandleBar>.from(source);
    if (candles.isEmpty) {
      _seriesCache[key] = _generateInitialSeries(pair, key);
      _livePrice[pair.symbol] = next.toDouble();
      return;
    }

    final last = candles.last;
    candles[candles.length - 1] = _CandleBar(
      open: last.open,
      high: max(last.high, next),
      low: min(last.low, next),
      close: next.toDouble(),
    );

    final step = (_candleTickCounter[key] ?? 0) + 1;
    if (step >= _rollEveryForTimeframe()) {
      final closeShift = (_liveRandom.nextDouble() - 0.5) * (anchor * 0.0011);
      final close = (next + closeShift).clamp(anchor * 0.7, anchor * 1.35);
      final high =
          max(next, close) +
          _liveRandom.nextDouble() * (anchor * 0.0015 + 0.02);
      final low =
          min(next, close) -
          _liveRandom.nextDouble() * (anchor * 0.0015 + 0.02);
      candles.add(
        _CandleBar(
          open: next.toDouble(),
          high: high.toDouble(),
          low: low.toDouble(),
          close: close.toDouble(),
        ),
      );
      if (candles.length > 66) candles.removeAt(0);
      _candleTickCounter[key] = 0;
    } else {
      _candleTickCounter[key] = step;
    }

    _seriesCache[key] = candles;
    _livePrice[pair.symbol] = next.toDouble();
  }

  List<_CandleBar> _buildSeries(MarketPair pair) {
    final key = _seriesKey(pair);
    return _seriesCache.putIfAbsent(
      key,
      () => _generateInitialSeries(pair, key),
    );
  }

  Widget _buildTopMarketTabs() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: List.generate(_marketTabs.length, (index) {
          final active = _marketTabIndex == index;
          return Padding(
            padding: EdgeInsets.only(
              right: index == _marketTabs.length - 1 ? 0 : 20,
            ),
            child: InkWell(
              onTap: () => setState(() => _marketTabIndex = index),
              borderRadius: BorderRadius.circular(8),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Text(
                  _marketTabs[index],
                  style: TextStyle(
                    fontSize: 20,
                    color: active ? Colors.white : Colors.white60,
                    fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildHeaderTabs() {
    return Row(
      children: List.generate(_headerTabs.length, (index) {
        final active = _headerTab == index;
        return Padding(
          padding: const EdgeInsets.only(right: 22),
          child: InkWell(
            onTap: () => setState(() => _headerTab = index),
            borderRadius: BorderRadius.circular(8),
            child: Column(
              children: [
                Text(
                  _headerTabs[index],
                  style: TextStyle(
                    fontSize: 16.2,
                    color: active ? Colors.white : Colors.white54,
                    fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  width: 34,
                  height: 3,
                  decoration: BoxDecoration(
                    color: active ? Colors.white : Colors.transparent,
                    borderRadius: BorderRadius.circular(6),
                  ),
                ),
              ],
            ),
          ),
        );
      }),
    );
  }

  Widget _buildEntryField(String label, String value, {bool muted = false}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 9),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF1A202F),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 11.2,
                color: muted ? Colors.white38 : Colors.white60,
              ),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 12,
              color: muted ? Colors.white54 : Colors.white,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTradeMatrix(
    MarketPair pair,
    List<_CandleBar> candles,
    double lastPrice,
    bool isDown,
  ) {
    final baseAsset = _baseAsset(pair);
    final quoteAsset = _quoteAsset(pair);
    final asks = List<double>.generate(
      8,
      (i) => lastPrice + ((8 - i) * (lastPrice * 0.00045 + 0.02)),
    );
    final bids = List<double>.generate(
      8,
      (i) => lastPrice - ((i + 1) * (lastPrice * 0.00045 + 0.02)),
    );
    return Column(
      children: [
        SizedBox(
          height: 520,
          child: Row(
            children: [
              Expanded(
                flex: 52,
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F1522),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF1E2A44)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        height: 44,
                        decoration: BoxDecoration(
                          color: const Color(0xFF1A2232),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: InkWell(
                                onTap: () => setState(() => _isBuy = true),
                                child: Container(
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    color: _isBuy
                                        ? const Color(0xFF13B5D1)
                                        : Colors.transparent,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    'Buy',
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w700,
                                      color: _isBuy
                                          ? Colors.white
                                          : Colors.white70,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            Expanded(
                              child: InkWell(
                                onTap: () => setState(() => _isBuy = false),
                                child: Container(
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    color: !_isBuy
                                        ? const Color(0xFFEF4E5E)
                                        : Colors.transparent,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    'Sell',
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w700,
                                      color: !_isBuy
                                          ? Colors.white
                                          : Colors.white70,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),
                      Container(
                        height: 44,
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1A202F),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Row(
                          children: [
                            Icon(
                              Icons.info_outline_rounded,
                              size: 16,
                              color: Colors.white60,
                            ),
                            SizedBox(width: 6),
                            Text(
                              'Limit',
                              style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            Spacer(),
                            Icon(
                              Icons.keyboard_arrow_down_rounded,
                              color: Colors.white70,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),
                      _buildEntryField(
                        'Price ($quoteAsset)',
                        lastPrice.toStringAsFixed(2),
                      ),
                      _buildEntryField('Quantity', baseAsset, muted: true),
                      _buildEntryField('Total', quoteAsset, muted: true),
                      const SizedBox(height: 2),
                      Row(
                        children: List.generate(5, (index) {
                          return Expanded(
                            child: Container(
                              margin: EdgeInsets.only(
                                right: index == 4 ? 0 : 8,
                              ),
                              height: 3,
                              decoration: BoxDecoration(
                                color: index == 0
                                    ? Colors.white70
                                    : const Color(0xFF2A344C),
                                borderRadius: BorderRadius.circular(6),
                              ),
                            ),
                          );
                        }),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: const [
                          Icon(
                            Icons.check_box_outline_blank_rounded,
                            size: 19,
                            color: Colors.white70,
                          ),
                          SizedBox(width: 8),
                          Text('TP/SL', style: TextStyle(fontSize: 14.5)),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          const Text(
                            'Available',
                            style: TextStyle(
                              fontSize: 15.2,
                              color: Colors.white70,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            '0.00 $quoteAsset',
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Container(
                            width: 22,
                            height: 22,
                            decoration: BoxDecoration(
                              color: const Color(0xFF1E2638),
                              borderRadius: BorderRadius.circular(22),
                            ),
                            alignment: Alignment.center,
                            child: const Text(
                              '+',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: () {},
                          style: FilledButton.styleFrom(
                            backgroundColor: _isBuy
                                ? const Color(0xFF13B5D1)
                                : const Color(0xFFEF4E5E),
                            foregroundColor: Colors.white,
                            minimumSize: const Size.fromHeight(48),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: Text(
                            _isBuy ? 'Buy $baseAsset' : 'Sell $baseAsset',
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 48,
                child: Container(
                  padding: const EdgeInsets.fromLTRB(10, 10, 10, 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F1522),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF1E2A44)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Price\n($quoteAsset)',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.white70,
                              ),
                            ),
                          ),
                          Expanded(
                            child: Text(
                              'Quantity\n($baseAsset)',
                              textAlign: TextAlign.right,
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.white70,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      ...asks.map((price) {
                        final qty = ((price * 0.00012) % 0.82) + 0.001;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  _formatWithCommas(price, decimals: 2),
                                  style: const TextStyle(
                                    color: Color(0xFFEF4E5E),
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              Expanded(
                                child: Text(
                                  qty.toStringAsFixed(6),
                                  textAlign: TextAlign.right,
                                  style: const TextStyle(
                                    color: Colors.white70,
                                    fontSize: 11,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                      const SizedBox(height: 3),
                      Text(
                        _formatWithCommas(lastPrice, decimals: 2),
                        style: TextStyle(
                          fontSize: 45 / 1.7,
                          fontWeight: FontWeight.w700,
                          color: isDown
                              ? const Color(0xFFEF4E5E)
                              : const Color(0xFF1BB6D1),
                        ),
                      ),
                      Text(
                        '≈\$${_formatWithCommas(lastPrice, decimals: 2)}',
                        style: const TextStyle(
                          fontSize: 11.8,
                          color: Colors.white54,
                        ),
                      ),
                      const SizedBox(height: 6),
                      ...bids.map((price) {
                        final qty = ((price * 0.0001) % 0.82) + 0.001;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  _formatWithCommas(price, decimals: 2),
                                  style: const TextStyle(
                                    color: Color(0xFF1BB6D1),
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              Expanded(
                                child: Text(
                                  qty.toStringAsFixed(6),
                                  textAlign: TextAlign.right,
                                  style: const TextStyle(
                                    color: Colors.white70,
                                    fontSize: 11,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                      const Spacer(),
                      Row(
                        children: [
                          Text(
                            'B ${(48 + (lastPrice % 10)).toStringAsFixed(0)}%',
                            style: const TextStyle(
                              color: Color(0xFF1BB6D1),
                              fontSize: 12.2,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Container(
                              height: 4,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(4),
                                gradient: const LinearGradient(
                                  colors: [
                                    Color(0xFF1BB6D1),
                                    Color(0xFFEF4E5E),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'S ${(52 - (lastPrice % 10)).toStringAsFixed(0)}%',
                            style: const TextStyle(
                              color: Color(0xFFEF4E5E),
                              fontSize: 12.2,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Container(
                        height: 38,
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1A202F),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Row(
                          children: [
                            Icon(
                              Icons.dashboard_outlined,
                              size: 16,
                              color: Colors.white60,
                            ),
                            SizedBox(width: 8),
                            Text('0.01', style: TextStyle(fontSize: 14.8)),
                            Spacer(),
                            Icon(
                              Icons.keyboard_arrow_down_rounded,
                              color: Colors.white70,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        const Row(
          children: [
            Text(
              'Orders(0)',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
            ),
            SizedBox(width: 26),
            Text(
              'Assets',
              style: TextStyle(fontSize: 17, color: Colors.white70),
            ),
            SizedBox(width: 26),
            Text(
              'Bots(0)',
              style: TextStyle(fontSize: 17, color: Colors.white70),
            ),
          ],
        ),
        const SizedBox(height: 9),
        Row(
          children: const [
            Icon(
              Icons.check_box_outline_blank_rounded,
              color: Colors.white54,
              size: 22,
            ),
            SizedBox(width: 8),
            Text(
              'Show current',
              style: TextStyle(color: Colors.white70, fontSize: 16),
            ),
            Spacer(),
            Icon(Icons.access_time_rounded, color: Colors.white54, size: 20),
          ],
        ),
        const SizedBox(height: 14),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 22, horizontal: 14),
          decoration: BoxDecoration(
            color: const Color(0xFF0E1420),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF1E2A44)),
          ),
          child: Column(
            children: [
              const Icon(
                Icons.description_outlined,
                size: 34,
                color: Colors.white24,
              ),
              const SizedBox(height: 10),
              const Text(
                'Transfer funds to start spot trading.',
                style: TextStyle(fontSize: 15.4, color: Colors.white60),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {},
                      child: const Text('Deposit/Transfer'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {},
                      child: const Text('Spot tutorial'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0xFF090F1A),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFF1E2A44)),
          ),
          child: Row(
            children: [
              Text(
                '${pair.symbol} Chart',
                style: const TextStyle(
                  fontSize: 15.8,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              const Icon(
                Icons.keyboard_arrow_up_rounded,
                color: Colors.white70,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDataView(MarketPair pair, double lastPrice) {
    final baseAsset = _baseAsset(pair);
    final buyLarge = 24 + (lastPrice % 20);
    final buyMedium = 1.2 + ((lastPrice * 0.0013) % 1.4);
    final buySmall = 0.2 + ((lastPrice * 0.00014) % 0.4);
    final sellLarge = 16 + (lastPrice % 18);
    final sellMedium = 0.4 + ((lastPrice * 0.0011) % 0.9);
    final sellSmall = 0.06 + ((lastPrice * 0.00008) % 0.2);

    final slices = <double>[
      buyLarge,
      buyMedium,
      buySmall,
      sellLarge,
      sellMedium,
      sellSmall,
    ];
    final total = slices.fold<double>(0, (sum, item) => sum + item);
    final pct = slices.map((item) => ((item / total) * 100)).toList();
    final netInflow =
        (buyLarge + buyMedium + buySmall) -
        (sellLarge + sellMedium + sellSmall);

    final rows = <Map<String, String>>[
      {
        'bucket': 'Large',
        'buy': buyLarge.toStringAsFixed(6),
        'sell': sellLarge.toStringAsFixed(6),
        'net': (buyLarge - sellLarge).toStringAsFixed(6),
      },
      {
        'bucket': 'Medium',
        'buy': buyMedium.toStringAsFixed(6),
        'sell': sellMedium.toStringAsFixed(6),
        'net': (buyMedium - sellMedium).toStringAsFixed(6),
      },
      {
        'bucket': 'Small',
        'buy': buySmall.toStringAsFixed(6),
        'sell': sellSmall.toStringAsFixed(6),
        'net': (buySmall - sellSmall).toStringAsFixed(6),
      },
      {
        'bucket': 'Total',
        'buy': (buyLarge + buyMedium + buySmall).toStringAsFixed(6),
        'sell': (sellLarge + sellMedium + sellSmall).toStringAsFixed(6),
        'net': netInflow.toStringAsFixed(6),
      },
    ];

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1522),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF1E2A44)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _pill('Fund flow', selected: true),
              const SizedBox(width: 8),
              _pill('Margin data', selected: false),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: const [
              Text(
                'Fund flow analysis',
                style: TextStyle(fontSize: 41 / 2, fontWeight: FontWeight.w700),
              ),
              SizedBox(width: 6),
              Icon(Icons.info_outline_rounded, size: 17, color: Colors.white60),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: List.generate(_flowFrames.length, (index) {
              final active = _flowFrameIndex == index;
              return OutlinedButton(
                onPressed: () => setState(() => _flowFrameIndex = index),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(48, 36),
                  side: BorderSide(
                    color: active
                        ? const Color(0xFF13B5D1)
                        : const Color(0xFF2A344C),
                  ),
                  backgroundColor: active
                      ? const Color(0x2413B5D1)
                      : Colors.transparent,
                ),
                child: Text(
                  _flowFrames[index],
                  style: TextStyle(
                    fontSize: 12,
                    color: active ? const Color(0xFF13B5D1) : Colors.white70,
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 16),
          Center(
            child: SizedBox(
              width: 260,
              height: 260,
              child: CustomPaint(
                painter: _FundFlowDonutPainter(
                  values: slices,
                  colors: const [
                    Color(0xFF15B8D8),
                    Color(0xFF1CC8E6),
                    Color(0xFF44D7F1),
                    Color(0xFFEE2F68),
                    Color(0xFFF2577D),
                    Color(0xFFF07FA1),
                  ],
                ),
                child: Align(
                  alignment: Alignment.center,
                  child: Text(
                    '${pct.first.toStringAsFixed(2)}%',
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: Text(
                  'Buy ($baseAsset)',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ),
              Expanded(
                child: Text(
                  'Sell ($baseAsset)',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ),
              Expanded(
                child: Text(
                  'Net inflow',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...rows.map((row) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  SizedBox(
                    width: 62,
                    child: Text(
                      row['bucket']!,
                      style: const TextStyle(
                        fontSize: 14.2,
                        color: Colors.white70,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      row['buy']!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 14.2,
                        color: Color(0xFF15B8D8),
                      ),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      row['sell']!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 14.2,
                        color: Color(0xFFEE2F68),
                      ),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      row['net']!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 14.2,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
          const SizedBox(height: 14),
          Text(
            '5D large order net inflow ($baseAsset)',
            style: const TextStyle(
              fontSize: 37 / 2,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '5D main funds net inflow: ${netInflow >= 0 ? '+' : ''}${netInflow.toStringAsFixed(2)}K',
            style: const TextStyle(fontSize: 15.2, color: Colors.white60),
          ),
        ],
      ),
    );
  }

  Widget _pill(String text, {required bool selected}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: selected ? const Color(0xFF222C40) : const Color(0xFF151D2B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: selected ? const Color(0xFF2E3E63) : const Color(0xFF222C40),
        ),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 14,
          color: selected ? Colors.white : Colors.white54,
          fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<MarketPair>(
      valueListenable: selectedTradePairNotifier,
      builder: (context, pair, _) {
        final anchorPrice = _priceFromString(pair.price);
        final candles = _buildSeries(pair);
        final lastPrice = candles.isNotEmpty ? candles.last.close : anchorPrice;
        final changePct = ((lastPrice - anchorPrice) / anchorPrice) * 100;
        final isDown = changePct < 0;
        final changeText =
            '${changePct >= 0 ? '+' : ''}${changePct.toStringAsFixed(2)}%';
        final changeColor = isDown
            ? const Color(0xFFEF4E5E)
            : const Color(0xFF13B5D1);

        return ListView(
          padding: const EdgeInsets.all(14),
          children: [
            _buildTopMarketTabs(),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        pair.symbol,
                        style: const TextStyle(
                          fontSize: 48 / 2,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        changeText,
                        style: TextStyle(
                          fontSize: 34 / 2,
                          color: changeColor,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => TradeFocusedChartPage(pair: pair),
                    ),
                  ),
                  icon: const Icon(Icons.candlestick_chart, size: 26),
                  tooltip: 'Open chart',
                ),
                IconButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('More options opening soon'),
                      ),
                    );
                  },
                  icon: const Icon(Icons.more_horiz_rounded, size: 28),
                ),
              ],
            ),
            const SizedBox(height: 2),
            _buildHeaderTabs(),
            const SizedBox(height: 10),
            if (_headerTab == 0)
              _buildTradeMatrix(pair, candles, lastPrice, isDown),
            if (_headerTab == 1) _buildDataView(pair, lastPrice),
            if (_headerTab == 2)
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F1522),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF1E2A44)),
                ),
                child: const Text(
                  'Square feed is loading live market discussions.',
                  style: TextStyle(fontSize: 15, color: Colors.white70),
                ),
              ),
            if (_headerTab == 3)
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F1522),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF1E2A44)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'About ${pair.symbol}',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Last price ${_formatWithCommas(lastPrice, decimals: 2)}  •  24H volume ${pair.volume}',
                      style: const TextStyle(
                        fontSize: 14.5,
                        color: Colors.white70,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        );
      },
    );
  }
}

class _CandleBar {
  const _CandleBar({
    required this.open,
    required this.high,
    required this.low,
    required this.close,
  });

  final double open;
  final double high;
  final double low;
  final double close;
}

class _CandleChartPainter extends CustomPainter {
  _CandleChartPainter({required this.candles, required this.isDownTrend});

  final List<_CandleBar> candles;
  final bool isDownTrend;

  @override
  void paint(Canvas canvas, Size size) {
    final paintGrid = Paint()
      ..color = const Color(0xFF1B263F)
      ..strokeWidth = 1;
    final paintWick = Paint()..strokeWidth = 1;
    final paintBody = Paint();
    final textPainter = TextPainter(textDirection: TextDirection.ltr);

    for (int i = 1; i <= 4; i++) {
      final y = (size.height / 5) * i;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paintGrid);
    }
    for (int i = 1; i <= 5; i++) {
      final x = (size.width / 6) * i;
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paintGrid);
    }

    if (candles.isEmpty) return;
    final minPrice = candles.map((e) => e.low).reduce(min);
    final maxPrice = candles.map((e) => e.high).reduce(max);
    final priceSpan = (maxPrice - minPrice).abs() < 0.00001
        ? 1
        : maxPrice - minPrice;

    double yFromPrice(double price) {
      return ((maxPrice - price) / priceSpan) * (size.height - 10) + 5;
    }

    final candleWidth = size.width / candles.length;
    for (int i = 0; i < candles.length; i++) {
      final item = candles[i];
      final x = (i * candleWidth) + (candleWidth / 2);
      final highY = yFromPrice(item.high);
      final lowY = yFromPrice(item.low);
      final openY = yFromPrice(item.open);
      final closeY = yFromPrice(item.close);
      final bullish = item.close >= item.open;
      final color = bullish ? const Color(0xFF53D983) : const Color(0xFFF04E71);
      paintWick.color = color;
      paintBody.color = color;

      canvas.drawLine(Offset(x, highY), Offset(x, lowY), paintWick);
      final bodyTop = min(openY, closeY);
      final bodyBottom = max(openY, closeY);
      final bodyRect = Rect.fromLTRB(
        x - (candleWidth * 0.28),
        bodyTop,
        x + (candleWidth * 0.28),
        max(bodyBottom, bodyTop + 1.5),
      );
      canvas.drawRRect(
        RRect.fromRectAndRadius(bodyRect, const Radius.circular(1.2)),
        paintBody,
      );
    }

    final lastPrice = candles.last.close;
    final lastY = yFromPrice(lastPrice);
    final lastPaint = Paint()
      ..color = isDownTrend
          ? const Color(0xFFF04E71).withValues(alpha: 0.75)
          : const Color(0xFF53D983).withValues(alpha: 0.75)
      ..strokeWidth = 1.1;
    canvas.drawLine(Offset(0, lastY), Offset(size.width, lastY), lastPaint);

    textPainter.text = TextSpan(
      text: lastPrice.toStringAsFixed(4),
      style: const TextStyle(fontSize: 10, color: Colors.white70),
    );
    textPainter.layout(maxWidth: size.width);
    textPainter.paint(
      canvas,
      Offset(size.width - textPainter.width - 4, max(0, lastY - 14)),
    );
  }

  @override
  bool shouldRepaint(covariant _CandleChartPainter oldDelegate) {
    return oldDelegate.candles != candles ||
        oldDelegate.isDownTrend != isDownTrend;
  }
}

class _FundFlowDonutPainter extends CustomPainter {
  _FundFlowDonutPainter({required this.values, required this.colors});

  final List<double> values;
  final List<Color> colors;

  @override
  void paint(Canvas canvas, Size size) {
    if (values.isEmpty || colors.isEmpty) return;
    final total = values.fold<double>(0, (sum, v) => sum + v);
    if (total <= 0) return;

    final stroke = min(size.width, size.height) * 0.18;
    final rect = Rect.fromCircle(
      center: Offset(size.width / 2, size.height / 2),
      radius: (min(size.width, size.height) / 2) - stroke / 2,
    );
    final basePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..color = const Color(0xFF1A2335);
    canvas.drawArc(rect, 0, pi * 2, false, basePaint);

    double start = -pi / 2;
    const gap = 0.018;
    for (int i = 0; i < values.length; i++) {
      final sweep = (values[i] / total) * (pi * 2);
      final paint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round
        ..color = colors[i % colors.length];
      canvas.drawArc(rect, start + gap, max(0, sweep - gap * 2), false, paint);
      start += sweep;
    }
  }

  @override
  bool shouldRepaint(covariant _FundFlowDonutPainter oldDelegate) {
    return oldDelegate.values != values || oldDelegate.colors != colors;
  }
}

class TradeFocusedChartPage extends StatefulWidget {
  const TradeFocusedChartPage({super.key, required this.pair});

  final MarketPair pair;

  @override
  State<TradeFocusedChartPage> createState() => _TradeFocusedChartPageState();
}

class _TradeFocusedChartPageState extends State<TradeFocusedChartPage> {
  final Random _random = Random();
  late List<_CandleBar> _candles;
  late double _anchor;
  Timer? _timer;
  int _tabIndex = 0;
  int _timeframeIndex = 4;
  int _flowFrameIndex = 0;
  int _overviewTabIndex = 0;
  int _feedTabIndex = 0;

  static const List<String> _tabs = ['Chart', 'Overview', 'Data', 'Feed'];
  static const List<String> _overviewTabs = [
    'Info',
    'Fundraising',
    'Tokenomics',
    'Network',
  ];
  static const List<String> _feedTabs = ['News', 'Market Trend', 'Calendar'];
  static const List<String> _timeframes = [
    '1m',
    '15m',
    '1h',
    '4h',
    '1D',
    'More',
  ];
  static const List<String> _flowFrames = [
    '15m',
    '30m',
    '1h',
    '2h',
    '4h',
    '1D',
  ];
  static const List<String> _indicators = [
    'MA',
    'EMA',
    'BOLL',
    'SAR',
    'AVL',
    'VOL',
    'MACD',
    'KDJ',
  ];

  List<String> _pairParts(String symbol) {
    if (symbol.contains('/')) {
      final parts = symbol.split('/');
      if (parts.length >= 2 && parts[0].isNotEmpty && parts[1].isNotEmpty) {
        return [parts[0], parts[1]];
      }
    }
    const quoteCandidates = ['USDT', 'USDC', 'BTC', 'ETH', 'BNB', 'INR', 'USD'];
    for (final quote in quoteCandidates) {
      if (symbol.length > quote.length && symbol.endsWith(quote)) {
        return [symbol.substring(0, symbol.length - quote.length), quote];
      }
    }
    return [symbol, 'USDT'];
  }

  String get _baseAsset => _pairParts(widget.pair.symbol)[0];
  String get _quoteAsset => _pairParts(widget.pair.symbol)[1];

  @override
  void initState() {
    super.initState();
    _anchor = double.tryParse(widget.pair.price.replaceAll(',', '')) ?? 68000;
    _candles = _seedCandles();
    _timer = Timer.periodic(const Duration(milliseconds: 1300), (_) {
      if (!mounted) return;
      setState(_tickCandles);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  List<_CandleBar> _seedCandles() {
    final seed = widget.pair.symbol.codeUnits.fold<int>(
      17,
      (sum, ch) => (sum * 31 + ch) & 0x7fffffff,
    );
    final random = Random(seed);
    final List<_CandleBar> list = [];
    double cursor = _anchor * (0.93 + random.nextDouble() * 0.14);
    for (int i = 0; i < 62; i++) {
      final drift = (random.nextDouble() - 0.5) * (_anchor * 0.006 + 0.04);
      final open = cursor;
      final close = (cursor + drift)
          .clamp(_anchor * 0.72, _anchor * 1.38)
          .toDouble();
      final high =
          max(open, close) + random.nextDouble() * (_anchor * 0.0023 + 0.03);
      final low =
          min(open, close) - random.nextDouble() * (_anchor * 0.0023 + 0.03);
      list.add(_CandleBar(open: open, high: high, low: low, close: close));
      cursor = close;
    }
    return list;
  }

  void _tickCandles() {
    if (_candles.isEmpty) return;
    final next =
        (_candles.last.close * (1 + ((_random.nextDouble() - 0.5) * 0.0016)))
            .clamp(_anchor * 0.72, _anchor * 1.38)
            .toDouble();
    final list = List<_CandleBar>.from(_candles);
    final last = list.last;
    list[list.length - 1] = _CandleBar(
      open: last.open,
      high: max(last.high, next),
      low: min(last.low, next),
      close: next,
    );
    if (_random.nextBool()) {
      final close = (next + ((_random.nextDouble() - 0.5) * (_anchor * 0.0014)))
          .clamp(_anchor * 0.72, _anchor * 1.38)
          .toDouble();
      final high = max(next, close) + _random.nextDouble() * (_anchor * 0.0018);
      final low = min(next, close) - _random.nextDouble() * (_anchor * 0.0018);
      list.add(_CandleBar(open: next, high: high, low: low, close: close));
      if (list.length > 62) list.removeAt(0);
    }
    _candles = list;
  }

  Widget _buildMainTabs() {
    return Row(
      children: List.generate(_tabs.length, (index) {
        final active = _tabIndex == index;
        return Padding(
          padding: const EdgeInsets.only(right: 22),
          child: InkWell(
            onTap: () => setState(() => _tabIndex = index),
            child: Column(
              children: [
                Text(
                  _tabs[index],
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                    color: active ? Colors.white : Colors.white54,
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  width: 34,
                  height: 3,
                  decoration: BoxDecoration(
                    color: active ? Colors.white : Colors.transparent,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ],
            ),
          ),
        );
      }),
    );
  }

  Widget _buildChartTab(double lastPrice) {
    final baseAsset = _baseAsset;
    final quoteAsset = _quoteAsset;
    final bool down = lastPrice < _anchor;
    final Color changeColor = down
        ? const Color(0xFFEF4E5E)
        : const Color(0xFF13B5D1);
    final changePct = ((lastPrice - _anchor) / _anchor) * 100;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _formatWithCommas(lastPrice, decimals: 2),
                    style: const TextStyle(
                      fontSize: 57,
                      height: 0.95,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '≈\$${_formatWithCommas(lastPrice, decimals: 2)}  ${changePct >= 0 ? '+' : ''}${changePct.toStringAsFixed(2)}%',
                    style: TextStyle(
                      fontSize: 16.2,
                      color: changeColor,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFF181F30),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'Public Chain',
                      style: TextStyle(fontSize: 12.8, color: Colors.white70),
                    ),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                _infoLabel(
                  '24h high',
                  _formatWithCommas(lastPrice * 1.044, decimals: 2),
                ),
                _infoLabel(
                  '24h low',
                  _formatWithCommas(lastPrice * 0.972, decimals: 2),
                ),
                _infoLabel(
                  '24h Vol ($baseAsset)',
                  _formatWithCommas(
                    (lastPrice % 10000) / 11 + 3200,
                    decimals: 2,
                  ),
                ),
                _infoLabel(
                  '24h Turnover ($quoteAsset)',
                  '${_formatWithCommas((lastPrice * 3840) / 1000000, decimals: 2)}M',
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Icon(Icons.campaign_outlined, size: 16, color: Colors.white60),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                '$baseAsset market moved sharply: latest updates and analysis...',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 12.8, color: Colors.white70),
              ),
            ),
            Icon(Icons.close, size: 16, color: Colors.white54),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            ...List.generate(_timeframes.length, (index) {
              final active = _timeframeIndex == index;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: InkWell(
                  onTap: () => setState(() => _timeframeIndex = index),
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: active
                          ? const Color(0xFF1D2435)
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _timeframes[index],
                      style: TextStyle(
                        fontSize: 16,
                        color: active ? Colors.white : Colors.white70,
                        fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                      ),
                    ),
                  ),
                ),
              );
            }),
            const Spacer(),
            const Icon(
              Icons.insert_chart_outlined_rounded,
              size: 22,
              color: Colors.white70,
            ),
            const SizedBox(width: 12),
            const Icon(Icons.draw_rounded, size: 22, color: Colors.white70),
            const SizedBox(width: 12),
            const Icon(Icons.tune_rounded, size: 22, color: Colors.white70),
          ],
        ),
        const SizedBox(height: 10),
        Text(
          'MA(5): ${_formatWithCommas(lastPrice * 1.004, decimals: 2)}   MA(10): ${_formatWithCommas(lastPrice * 0.997, decimals: 2)}   MA(20): ${_formatWithCommas(lastPrice * 0.985, decimals: 2)}',
          style: const TextStyle(
            fontSize: 13.6,
            color: Color(0xFFED55E8),
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          height: 430,
          width: double.infinity,
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: const Color(0xFF090E17),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFF1B263F)),
          ),
          child: CustomPaint(
            painter: _CandleChartPainter(candles: _candles, isDownTrend: down),
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 36,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _indicators.length,
            separatorBuilder: (_, index) => const SizedBox(width: 8),
            itemBuilder: (context, index) {
              final active = _indicators[index] == 'VOL';
              return Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: active ? const Color(0xFF1A2233) : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  _indicators[index],
                  style: TextStyle(
                    fontSize: 15,
                    color: active ? Colors.white : Colors.white60,
                    fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _perfCell('Today', '-3.24%'),
            _perfCell('7 days', '+4.12%'),
            _perfCell('30 days', '-6.26%'),
            _perfCell('90 days', '-23.13%'),
            _perfCell('180 days', '-38.28%'),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            const Text(
              'Similar pairs',
              style: TextStyle(fontSize: 14.2, color: Colors.white70),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: SizedBox(
                height: 30,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children:
                      <String>[
                        widget.pair.symbol,
                        '$_baseAsset/USDT',
                        'BTC/USDT',
                        'ETH/USDT',
                        'SOL/USDT',
                      ].map((symbol) {
                        final isActive = symbol == widget.pair.symbol;
                        return Container(
                          margin: const EdgeInsets.only(right: 8),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: isActive
                                ? const Color(0xFF1A2233)
                                : const Color(0xFF121826),
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(
                              color: isActive
                                  ? const Color(0xFF2B3D63)
                                  : const Color(0xFF202B42),
                            ),
                          ),
                          child: Text(
                            symbol,
                            style: TextStyle(
                              fontSize: 12,
                              color: isActive ? Colors.white : Colors.white70,
                              fontWeight: isActive
                                  ? FontWeight.w700
                                  : FontWeight.w500,
                            ),
                          ),
                        );
                      }).toList(),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _infoLabel(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 13.6, color: Colors.white60),
          ),
          Text(
            value,
            style: const TextStyle(fontSize: 14.8, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }

  Widget _perfCell(String title, String value) {
    final up = value.startsWith('+');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 12.8, color: Colors.white60),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontSize: 14.4,
            fontWeight: FontWeight.w700,
            color: up ? const Color(0xFF1BC8E0) : const Color(0xFFEF4E5E),
          ),
        ),
      ],
    );
  }

  Widget _buildDataTab(double lastPrice) {
    final baseAsset = _baseAsset;
    final buyLarge = 24 + (lastPrice % 20);
    final buyMedium = 1.2 + ((lastPrice * 0.0013) % 1.4);
    final buySmall = 0.2 + ((lastPrice * 0.00014) % 0.4);
    final sellLarge = 16 + (lastPrice % 18);
    final sellMedium = 0.4 + ((lastPrice * 0.0011) % 0.9);
    final sellSmall = 0.06 + ((lastPrice * 0.00008) % 0.2);

    final slices = <double>[
      buyLarge,
      buyMedium,
      buySmall,
      sellLarge,
      sellMedium,
      sellSmall,
    ];
    final total = slices.fold<double>(0, (sum, item) => sum + item);
    final pct = slices.map((item) => ((item / total) * 100)).toList();
    final netInflow =
        (buyLarge + buyMedium + buySmall) -
        (sellLarge + sellMedium + sellSmall);

    final rows = <Map<String, String>>[
      {
        'bucket': 'Large',
        'buy': buyLarge.toStringAsFixed(6),
        'sell': sellLarge.toStringAsFixed(6),
        'net': (buyLarge - sellLarge).toStringAsFixed(6),
      },
      {
        'bucket': 'Medium',
        'buy': buyMedium.toStringAsFixed(6),
        'sell': sellMedium.toStringAsFixed(6),
        'net': (buyMedium - sellMedium).toStringAsFixed(6),
      },
      {
        'bucket': 'Small',
        'buy': buySmall.toStringAsFixed(6),
        'sell': sellSmall.toStringAsFixed(6),
        'net': (buySmall - sellSmall).toStringAsFixed(6),
      },
      {
        'bucket': 'Total',
        'buy': (buyLarge + buyMedium + buySmall).toStringAsFixed(6),
        'sell': (sellLarge + sellMedium + sellSmall).toStringAsFixed(6),
        'net': netInflow.toStringAsFixed(6),
      },
    ];

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1522),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF1E2A44)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _tagPill('Fund flow', selected: true),
              const SizedBox(width: 8),
              _tagPill('Margin data', selected: false),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: const [
              Text(
                'Fund flow analysis',
                style: TextStyle(fontSize: 20.5, fontWeight: FontWeight.w700),
              ),
              SizedBox(width: 6),
              Icon(Icons.info_outline_rounded, size: 17, color: Colors.white60),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: List.generate(_flowFrames.length, (index) {
              final active = _flowFrameIndex == index;
              return OutlinedButton(
                onPressed: () => setState(() => _flowFrameIndex = index),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(48, 36),
                  side: BorderSide(
                    color: active
                        ? const Color(0xFF13B5D1)
                        : const Color(0xFF2A344C),
                  ),
                  backgroundColor: active
                      ? const Color(0x2413B5D1)
                      : Colors.transparent,
                ),
                child: Text(
                  _flowFrames[index],
                  style: TextStyle(
                    fontSize: 12,
                    color: active ? const Color(0xFF13B5D1) : Colors.white70,
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 16),
          Center(
            child: SizedBox(
              width: 260,
              height: 260,
              child: CustomPaint(
                painter: _FundFlowDonutPainter(
                  values: slices,
                  colors: const [
                    Color(0xFF15B8D8),
                    Color(0xFF1CC8E6),
                    Color(0xFF44D7F1),
                    Color(0xFFEE2F68),
                    Color(0xFFF2577D),
                    Color(0xFFF07FA1),
                  ],
                ),
                child: Align(
                  alignment: Alignment.center,
                  child: Text(
                    '${pct.first.toStringAsFixed(2)}%',
                    style: const TextStyle(
                      fontSize: 30,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: Text(
                  'Buy ($baseAsset)',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ),
              Expanded(
                child: Text(
                  'Sell ($baseAsset)',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ),
              Expanded(
                child: Text(
                  'Net inflow',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...rows.map((row) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  SizedBox(
                    width: 62,
                    child: Text(
                      row['bucket']!,
                      style: const TextStyle(
                        fontSize: 14.2,
                        color: Colors.white70,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      row['buy']!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 14.2,
                        color: Color(0xFF15B8D8),
                      ),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      row['sell']!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 14.2,
                        color: Color(0xFFEE2F68),
                      ),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      row['net']!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 14.2,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
          const SizedBox(height: 14),
          Text(
            '5D large order net inflow ($baseAsset)',
            style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          Text(
            '5D main funds net inflow: ${netInflow >= 0 ? '+' : ''}${netInflow.toStringAsFixed(2)}K',
            style: const TextStyle(fontSize: 15.2, color: Colors.white60),
          ),
        ],
      ),
    );
  }

  Widget _buildOverviewTab(double lastPrice) {
    final description =
        '$_baseAsset is a high-performance crypto asset with active spot liquidity and cross-market depth. '
        'This overview includes token profile, official links, and current valuation signals for quick due diligence.';
    final marketCap = _formatWithCommas(lastPrice * 98000000, decimals: 0);
    final fdv = _formatWithCommas(lastPrice * 125000000, decimals: 0);

    Widget sectionMetric(String title, String value) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 7),
        child: Row(
          children: [
            Expanded(
              child: Text(
                title,
                style: const TextStyle(fontSize: 14, color: Colors.white60),
              ),
            ),
            Text(
              value,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1522),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF1E2A44)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: List.generate(_overviewTabs.length, (index) {
              final selected = _overviewTabIndex == index;
              return InkWell(
                onTap: () => setState(() => _overviewTabIndex = index),
                borderRadius: BorderRadius.circular(999),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 7,
                  ),
                  decoration: BoxDecoration(
                    color: selected
                        ? const Color(0xFF202B43)
                        : const Color(0xFF141C2D),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    _overviewTabs[index],
                    style: TextStyle(
                      fontSize: 12.4,
                      color: selected ? Colors.white : Colors.white60,
                      fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                    ),
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 14),
          Text(
            'About $_baseAsset',
            style: const TextStyle(
              fontSize: 34 / 2,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            description,
            style: const TextStyle(
              fontSize: 14.6,
              color: Colors.white70,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 14),
          const Divider(color: Color(0xFF22324D), height: 1),
          const SizedBox(height: 12),
          sectionMetric('Explore', '${_baseAsset.toLowerCase()}scan.xyz'),
          sectionMetric('Website', 'Official'),
          sectionMetric('Whitepaper', 'Available'),
          const SizedBox(height: 8),
          const Divider(color: Color(0xFF22324D), height: 1),
          const SizedBox(height: 12),
          sectionMetric('Market Cap', '\$$marketCap'),
          sectionMetric('FDV', '\$$fdv'),
          sectionMetric('Circulating Supply', '3,899,984,688'),
          sectionMetric('Total Supply', '10,000,000,000'),
          sectionMetric('Max Supply', '10,000,000,000'),
        ],
      ),
    );
  }

  Widget _buildFeedTab() {
    final items = <Map<String, String>>[
      <String, String>{
        'time': '2026-03-11 14:06 (UTC)',
        'source': 'AI analysis',
        'sentiment': 'Bullish',
        'title': 'Analysts signal that current crypto dip may be stabilizing',
      },
      <String, String>{
        'time': '2026-03-11 14:06 (UTC)',
        'source': 'Macro Watch',
        'sentiment': 'Bearish',
        'title': 'US inflation risk keeps short-term market sentiment cautious',
      },
      <String, String>{
        'time': '2026-03-11 13:49 (UTC)',
        'source': 'WuBlock',
        'sentiment': 'Neutral',
        'title':
            'Daily highlights: inflation prints and derivatives open interest',
      },
    ];

    Color sentimentColor(String sentiment) {
      final lower = sentiment.toLowerCase();
      if (lower == 'bullish') return const Color(0xFF00C48C);
      if (lower == 'bearish') return const Color(0xFFFF4D67);
      return const Color(0xFF8D95A5);
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1522),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF1E2A44)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: List.generate(_feedTabs.length, (index) {
              final selected = _feedTabIndex == index;
              return Padding(
                padding: const EdgeInsets.only(right: 10),
                child: InkWell(
                  onTap: () => setState(() => _feedTabIndex = index),
                  borderRadius: BorderRadius.circular(999),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 7,
                    ),
                    decoration: BoxDecoration(
                      color: selected
                          ? const Color(0xFF202B43)
                          : const Color(0xFF141C2D),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      _feedTabs[index],
                      style: TextStyle(
                        fontSize: 12.4,
                        color: selected ? Colors.white : Colors.white60,
                        fontWeight: selected
                            ? FontWeight.w700
                            : FontWeight.w500,
                      ),
                    ),
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFF1A2234),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFF2A3859)),
            ),
            child: const Row(
              children: [
                Icon(Icons.auto_awesome, size: 18, color: Color(0xFFB9C5E5)),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'AI analysis',
                    style: TextStyle(
                      fontSize: 15.4,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                Text(
                  'Ask AI',
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFFFFA726),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          ...items.map((item) {
            final sentiment = item['sentiment'] ?? 'Neutral';
            return Container(
              padding: const EdgeInsets.symmetric(vertical: 11),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: Color(0xFF1E2A44))),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          item['time'] ?? '',
                          style: const TextStyle(
                            fontSize: 12.8,
                            color: Colors.white60,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: sentimentColor(
                            sentiment,
                          ).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(
                            color: sentimentColor(
                              sentiment,
                            ).withValues(alpha: 0.45),
                          ),
                        ),
                        child: Text(
                          sentiment,
                          style: TextStyle(
                            fontSize: 11.8,
                            color: sentimentColor(sentiment),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    item['title'] ?? '',
                    style: const TextStyle(
                      fontSize: 15.6,
                      height: 1.42,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _tagPill(String text, {required bool selected}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: selected ? const Color(0xFF222C40) : const Color(0xFF151D2B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: selected ? const Color(0xFF2E3E63) : const Color(0xFF222C40),
        ),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 14,
          color: selected ? Colors.white : Colors.white54,
          fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
        ),
      ),
    );
  }

  Widget _buildBottomDock() {
    Widget dockItem(IconData icon, String label) {
      return Expanded(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 22, color: Colors.white70),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(fontSize: 11.5, color: Colors.white70),
            ),
          ],
        ),
      );
    }

    return SafeArea(
      top: false,
      child: Container(
        height: 86,
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
        decoration: const BoxDecoration(
          color: Color(0xFF080D15),
          border: Border(top: BorderSide(color: Color(0xFF1A263E))),
        ),
        child: Row(
          children: [
            dockItem(Icons.more_horiz_rounded, 'More'),
            dockItem(Icons.library_books_outlined, 'Futures'),
            dockItem(Icons.smart_toy_outlined, 'Bot'),
            dockItem(Icons.person_pin_circle_outlined, 'Margin'),
            Expanded(
              flex: 2,
              child: Container(
                height: 52,
                margin: const EdgeInsets.only(left: 10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                ),
                alignment: Alignment.center,
                child: const Text(
                  'Trade',
                  style: TextStyle(
                    fontSize: 20,
                    color: Color(0xFF0E1420),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final lastPrice = _candles.isEmpty ? _anchor : _candles.last.close;
    return Scaffold(
      backgroundColor: const Color(0xFF060A15),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
              children: [
                Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.arrow_back, size: 26),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      widget.pair.symbol,
                      style: const TextStyle(
                        fontSize: 23,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const Icon(Icons.arrow_drop_down_rounded, size: 24),
                    const Spacer(),
                    IconButton(
                      onPressed: () {},
                      icon: const Icon(Icons.star_outline_rounded),
                    ),
                    IconButton(
                      onPressed: () {},
                      icon: const Icon(Icons.article_outlined),
                    ),
                    IconButton(
                      onPressed: () {},
                      icon: const Icon(Icons.notifications_active_outlined),
                    ),
                    IconButton(
                      onPressed: () {},
                      icon: const Icon(Icons.share_outlined),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                _buildMainTabs(),
                const SizedBox(height: 10),
                if (_tabIndex == 0) _buildChartTab(lastPrice),
                if (_tabIndex == 1) _buildOverviewTab(lastPrice),
                if (_tabIndex == 2) _buildDataTab(lastPrice),
                if (_tabIndex == 3) _buildFeedTab(),
              ],
            ),
          ),
          _buildBottomDock(),
        ],
      ),
    );
  }
}

class FuturesPage extends StatefulWidget {
  const FuturesPage({
    super.key,
    required this.onOpenProfile,
    required this.onOpenTradePair,
  });

  final VoidCallback onOpenProfile;
  final ValueChanged<MarketPair> onOpenTradePair;

  @override
  State<FuturesPage> createState() => _FuturesPageState();
}

class _FuturesPageState extends State<FuturesPage> {
  final LiveMarketService _marketService = LiveMarketService();
  List<MarketPair> _pairs = List<MarketPair>.from(kMarketPairs);
  bool _loading = true;
  Timer? _timer;
  String _mainTab = 'Futures';
  String _subTab = 'USDT-M';

  static const Map<String, List<String>> _subTabMap = {
    'Favorites': ['Futures', 'Spot'],
    'Futures': ['USDT-M'],
    'Spot': ['All', 'Initial listing', '0 fees', 'Meme', 'Pre-market'],
  };

  @override
  void initState() {
    super.initState();
    _refresh();
    _timer = Timer.periodic(const Duration(seconds: 20), (_) => _refresh());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _refresh() async {
    try {
      final pairs = await _marketService.fetchPairs();
      if (!mounted || pairs.isEmpty) return;
      setState(() {
        _pairs = pairs.take(60).toList();
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  void _setMainTab(String tab) {
    if (tab == _mainTab) return;
    final subtabs = _subTabMap[tab] ?? const <String>[];
    setState(() {
      _mainTab = tab;
      _subTab = subtabs.isEmpty ? '' : subtabs.first;
    });
  }

  List<MarketPair> _rows() {
    if (_pairs.isEmpty) return List<MarketPair>.from(kMarketPairs);
    final rows = List<MarketPair>.from(_pairs);
    rows.sort(
      (a, b) =>
          _parseNumericValue(b.volume).compareTo(_parseNumericValue(a.volume)),
    );
    return rows.take(20).toList();
  }

  @override
  Widget build(BuildContext context) {
    final rows = _rows();
    final subtabs = _subTabMap[_mainTab] ?? const <String>[];
    return ListView(
      padding: const EdgeInsets.all(14),
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          height: 54,
          decoration: BoxDecoration(
            color: const Color(0xFF171B29),
            borderRadius: BorderRadius.circular(27),
          ),
          child: const Row(
            children: [
              Icon(Icons.search, size: 28, color: Colors.white70),
              SizedBox(width: 10),
              Text(
                'Search',
                style: TextStyle(color: Colors.white54, fontSize: 17),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: const [
            Expanded(
              child: Text(
                'Favorites',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                  color: Colors.white70,
                ),
                textAlign: TextAlign.center,
              ),
            ),
            Expanded(
              child: Text(
                'Futures',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
                textAlign: TextAlign.center,
              ),
            ),
            Expanded(
              child: Text(
                'Spot',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                  color: Colors.white70,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: ['Favorites', 'Futures', 'Spot'].map((tab) {
            final active = tab == _mainTab;
            return Expanded(
              child: InkWell(
                onTap: () => _setMainTab(tab),
                child: Column(
                  children: [
                    Text(
                      tab,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                        color: active ? Colors.white : Colors.white54,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      width: 44,
                      height: 2,
                      color: active ? Colors.white : Colors.transparent,
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 10),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: subtabs.map((tab) {
              final active = tab == _subTab;
              return Padding(
                padding: const EdgeInsets.only(right: 16),
                child: InkWell(
                  onTap: () => setState(() => _subTab = tab),
                  child: Column(
                    children: [
                      Text(
                        tab,
                        style: TextStyle(
                          fontSize: 15.5,
                          fontWeight: active
                              ? FontWeight.w700
                              : FontWeight.w500,
                          color: active ? Colors.white : Colors.white54,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        width: 42,
                        height: 2,
                        color: active ? Colors.white : Colors.transparent,
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 12),
        const Row(
          children: [
            Expanded(
              child: Text(
                'Market/Vol',
                style: TextStyle(color: Colors.white54, fontSize: 12.4),
              ),
            ),
            SizedBox(
              width: 132,
              child: Text(
                'Price',
                textAlign: TextAlign.right,
                style: TextStyle(color: Colors.white54, fontSize: 12.4),
              ),
            ),
            SizedBox(
              width: 96,
              child: Text(
                'Change',
                textAlign: TextAlign.right,
                style: TextStyle(color: Colors.white54, fontSize: 12.4),
              ),
            ),
          ],
        ),
        if (_loading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(
              child: CircularProgressIndicator(
                strokeWidth: 2.2,
                color: Color(0xFF9DFB3B),
              ),
            ),
          ),
        if (!_loading)
          ...rows.map((pair) {
            final isDown = pair.change.startsWith('-');
            return InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: () => widget.onOpenTradePair(pair),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            pair.symbol.replaceAll('/', ''),
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Vol ${pair.volume.replaceAll(' USDT', '')}',
                            style: const TextStyle(
                              color: Colors.white54,
                              fontSize: 11.8,
                            ),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(
                      width: 132,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            pair.price,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '\$${_formatWithCommas(double.tryParse(pair.price.replaceAll(',', '')) ?? 0, decimals: 2)}',
                            style: const TextStyle(
                              color: Colors.white54,
                              fontSize: 11.8,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    Container(
                      width: 86,
                      alignment: Alignment.center,
                      padding: const EdgeInsets.symmetric(vertical: 9),
                      decoration: BoxDecoration(
                        color: isDown
                            ? const Color(0xFFEF4E5E)
                            : const Color(0xFF53D983),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Text(
                        pair.change,
                        style: const TextStyle(
                          fontSize: 12.8,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }
}

class AssetsPage extends StatefulWidget {
  const AssetsPage({
    super.key,
    required this.onOpenProfile,
    required this.onNavigateTab,
    required this.onOpenTradePair,
  });

  final VoidCallback onOpenProfile;
  final ValueChanged<int> onNavigateTab;
  final ValueChanged<MarketPair> onOpenTradePair;

  @override
  State<AssetsPage> createState() => _AssetsPageState();
}

class _AssetsPageState extends State<AssetsPage> {
  int _tabIndex = 0;
  bool _hideSmallAssets = false;
  static const _tabs = ['Overview', 'Spot', 'Funding'];

  List<Map<String, String>> _assetRows(double funding, double spot) {
    final total = funding + spot;
    return <Map<String, String>>[
      {
        'symbol': 'USDT',
        'name': 'Tether',
        'value': _formatWithCommas(total, decimals: 2),
        'usd': _formatWithCommas(total, decimals: 2),
        'logo':
            'https://assets.coingecko.com/coins/images/325/small/Tether.png',
      },
      {
        'symbol': 'SOLVEX',
        'name': 'Solvex',
        'value': '0.00',
        'usd': '0.00',
        'logo':
            'https://assets.coingecko.com/coins/images/4128/small/solana.png',
      },
      {
        'symbol': 'ADA',
        'name': 'Cardano',
        'value': '0.00',
        'usd': '0.00',
        'logo':
            'https://assets.coingecko.com/coins/images/975/small/cardano.png',
      },
      {
        'symbol': 'OM',
        'name': 'Mantra',
        'value': '0.00',
        'usd': '0.00',
        'logo': 'https://assets.coingecko.com/coins/images/12151/small/om.png',
      },
      {
        'symbol': 'PYOR',
        'name': 'Pyor',
        'value': '0.00',
        'usd': '0.00',
        'logo':
            'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
      },
    ];
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<double>(
      valueListenable: fundingUsdtBalanceNotifier,
      builder: (context, funding, _) {
        return ValueListenableBuilder<double>(
          valueListenable: spotUsdtBalanceNotifier,
          builder: (context, spot, child) {
            final total = funding + spot;
            final displayBalance = _tabIndex == 1
                ? spot
                : (_tabIndex == 2 ? funding : total);
            final visibleRows = _assetRows(funding, spot).where((row) {
              if (!_hideSmallAssets) return true;
              final value = double.tryParse(row['value'] ?? '0') ?? 0;
              return value >= 1;
            }).toList();
            final bool isLight =
                Theme.of(context).brightness == Brightness.light;
            final Color primaryText = isLight
                ? const Color(0xFF11141B)
                : Colors.white;
            final Color secondaryText = isLight
                ? const Color(0xFF687183)
                : Colors.white70;
            final Color lineColor = isLight
                ? const Color(0xFF1E242F)
                : Colors.white;
            final Color vipCardBg = isLight
                ? Colors.white
                : const Color(0xFF101319);
            final Color vipCardBorder = isLight
                ? const Color(0xFFD8DFEC)
                : const Color(0xFF242B38);
            final Color vipIconBg = isLight
                ? const Color(0xFFE8ECF5)
                : const Color(0xFF2A303D);

            return ListView(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
              children: [
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: List.generate(_tabs.length, (index) {
                      final active = _tabIndex == index;
                      return Padding(
                        padding: const EdgeInsets.only(right: 24),
                        child: InkWell(
                          onTap: () => setState(() => _tabIndex = index),
                          child: Column(
                            children: [
                              Text(
                                _tabs[index],
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: active
                                      ? FontWeight.w700
                                      : FontWeight.w600,
                                  color: active ? primaryText : secondaryText,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Container(
                                width: 68,
                                height: 2,
                                color: active
                                    ? primaryText
                                    : Colors.transparent,
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Text(
                      'Est. balance',
                      style: TextStyle(fontSize: 14, color: primaryText),
                    ),
                    const SizedBox(width: 8),
                    Icon(
                      Icons.remove_red_eye_outlined,
                      size: 22,
                      color: secondaryText,
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      _formatWithCommas(displayBalance, decimals: 2),
                      style: TextStyle(
                        fontSize: 30,
                        height: 0.95,
                        fontWeight: FontWeight.w700,
                        color: primaryText,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Padding(
                      padding: EdgeInsets.only(bottom: 8),
                      child: Text(
                        'USDT',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: primaryText,
                        ),
                      ),
                    ),
                  ],
                ),
                Text(
                  '≈ \$${_formatWithCommas(displayBalance, decimals: 2)}',
                  style: TextStyle(fontSize: 13.2, color: secondaryText),
                ),
                const SizedBox(height: 8),
                Text(
                  'Today\'s PnL ≈ \$0.00 (0.00%)',
                  style: TextStyle(fontSize: 12, color: secondaryText),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    _assetAction(
                      icon: Icons.download_rounded,
                      label: 'Add Funds',
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const DepositPage(),
                        ),
                      ),
                    ),
                    _assetAction(
                      icon: Icons.upload_rounded,
                      label: 'Send',
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const WithdrawPage(),
                        ),
                      ),
                    ),
                    _assetAction(
                      icon: Icons.swap_horiz_rounded,
                      label: 'Transfer',
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const TransferPage(),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton.icon(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const AssetHistoryPage(),
                      ),
                    ),
                    icon: const Icon(Icons.history_rounded, size: 18),
                    label: const Text(
                      'Transaction History',
                      style: TextStyle(fontSize: 12.4),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: vipCardBg,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: vipCardBorder),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 13,
                        backgroundColor: vipIconBg,
                        child: Icon(
                          Icons.verified_outlined,
                          size: 14,
                          color: secondaryText,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Upgrade to VIP1 to enjoy more perks',
                          style: TextStyle(
                            fontSize: 13.8,
                            fontWeight: FontWeight.w600,
                            color: primaryText,
                          ),
                        ),
                      ),
                      Icon(Icons.chevron_right_rounded, color: secondaryText),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  'Assets',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    color: primaryText,
                  ),
                ),
                const SizedBox(height: 6),
                Container(height: 2, width: 120, color: lineColor),
                const SizedBox(height: 10),
                Row(
                  children: [
                    InkWell(
                      onTap: () =>
                          setState(() => _hideSmallAssets = !_hideSmallAssets),
                      child: Row(
                        children: [
                          Icon(
                            _hideSmallAssets
                                ? Icons.check_box_rounded
                                : Icons.check_box_outline_blank_rounded,
                            size: 24,
                            color: _hideSmallAssets
                                ? const Color(0xFF9DFB3B)
                                : secondaryText,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Hide assets < 1 USDT',
                            style: TextStyle(
                              fontSize: 13.4,
                              color: secondaryText,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      onPressed: () => widget.onNavigateTab(1),
                      icon: const Icon(Icons.search_rounded, size: 26),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ...visibleRows.map((row) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    child: Row(
                      children: [
                        CoinLogo(
                          url: row['logo']!,
                          fallback: row['symbol']!,
                          size: 48,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            row['symbol']!,
                            style: TextStyle(
                              fontSize: 17.2,
                              fontWeight: FontWeight.w600,
                              color: primaryText,
                            ),
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              row['value']!,
                              style: TextStyle(
                                fontSize: 17.2,
                                fontWeight: FontWeight.w600,
                                color: primaryText,
                              ),
                            ),
                            Text(
                              '\$${row['usd']}',
                              style: TextStyle(
                                fontSize: 13.2,
                                color: secondaryText,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                }),
              ],
            );
          },
        );
      },
    );
  }

  Widget _assetAction({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    final bool isLight = Theme.of(context).brightness == Brightness.light;
    final Color circleBg = isLight
        ? const Color(0xFFE6EBF5)
        : const Color(0xFF272B35);
    final Color iconColor = isLight ? const Color(0xFF10141B) : Colors.white;
    final Color textColor = isLight ? const Color(0xFF5F6677) : Colors.white70;

    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: circleBg,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 27, color: iconColor),
            ),
            const SizedBox(height: 7),
            Text(label, style: TextStyle(fontSize: 14.6, color: textColor)),
          ],
        ),
      ),
    );
  }
}

class UserCenterPage extends StatefulWidget {
  const UserCenterPage({super.key});

  @override
  State<UserCenterPage> createState() => _UserCenterPageState();
}

class _UserCenterPageState extends State<UserCenterPage> {
  int _tab = 0;
  bool _alwaysOn = false;
  final ImagePicker _profilePicker = ImagePicker();

  void _showMessage(String text) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  Future<void> _openKyc() async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const KycVerificationPage()),
    );
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _pickProfileImage(ImageSource source) async {
    final messenger = ScaffoldMessenger.of(context);
    final XFile? picked = await _profilePicker.pickImage(
      source: source,
      imageQuality: 85,
      maxWidth: 1400,
    );
    if (picked == null) return;

    profileImagePathNotifier.value = picked.path;
    _showMessage('Profile photo updated');
    if (mounted) setState(() {});
    messenger.hideCurrentSnackBar();
  }

  Future<void> _chooseAvatarSymbol() async {
    const symbols = ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];
    final selected = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: const Color(0xFF0D1424),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(16),
          child: Wrap(
            spacing: 10,
            runSpacing: 10,
            children: symbols.map((symbol) {
              return InkWell(
                onTap: () => Navigator.of(context).pop(symbol),
                child: CircleAvatar(
                  radius: 24,
                  backgroundColor: const Color(0xFF25324A),
                  child: Text(
                    symbol,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        );
      },
    );

    if (selected == null) return;
    avatarSymbolNotifier.value = selected;
    profileImagePathNotifier.value = null;
    if (mounted) setState(() {});
  }

  Future<void> _openProfileEditor() async {
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: const Color(0xFF0D1424),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Update Profile Picture',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  FilledButton.icon(
                    onPressed: () {
                      Navigator.of(context).pop();
                      _pickProfileImage(ImageSource.camera);
                    },
                    icon: const Icon(Icons.camera_alt_outlined, size: 16),
                    label: const Text('Camera', style: TextStyle(fontSize: 12)),
                  ),
                  FilledButton.icon(
                    onPressed: () {
                      Navigator.of(context).pop();
                      _pickProfileImage(ImageSource.gallery);
                    },
                    icon: const Icon(Icons.photo_library_outlined, size: 16),
                    label: const Text(
                      'Gallery',
                      style: TextStyle(fontSize: 12),
                    ),
                  ),
                  OutlinedButton.icon(
                    onPressed: () {
                      Navigator.of(context).pop();
                      _chooseAvatarSymbol();
                    },
                    icon: const Icon(Icons.face_2_outlined, size: 16),
                    label: const Text('Avatar', style: TextStyle(fontSize: 12)),
                  ),
                  OutlinedButton.icon(
                    onPressed: () {
                      profileImagePathNotifier.value = null;
                      Navigator.of(context).pop();
                      _showMessage('Photo removed');
                    },
                    icon: const Icon(Icons.delete_outline, size: 16),
                    label: const Text('Remove', style: TextStyle(fontSize: 12)),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _editNickname() async {
    final controller = TextEditingController(text: nicknameNotifier.value);
    final String? value = await showDialog<String>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Set Nickname'),
          content: TextField(
            controller: controller,
            maxLength: 20,
            decoration: const InputDecoration(hintText: 'Enter nickname'),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () =>
                  Navigator.of(context).pop(controller.text.trim()),
              child: const Text('Save'),
            ),
          ],
        );
      },
    );

    if (value == null || value.isEmpty) return;
    nicknameNotifier.value = value;
    avatarSymbolNotifier.value = value.substring(0, 1).toUpperCase();
    if (mounted) setState(() {});
  }

  void _setTheme(ThemeMode mode) {
    appThemeModeNotifier.value = mode;
    setState(() {});
  }

  void _toggleThemeMode() {
    final nextMode = appThemeModeNotifier.value == ThemeMode.dark
        ? ThemeMode.light
        : ThemeMode.dark;
    _setTheme(nextMode);
  }

  @override
  Widget build(BuildContext context) {
    final tabs = ['My info', 'Preference', 'General'];
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
          children: [
            Row(
              children: [
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
                ),
                const Expanded(
                  child: Text(
                    'User Center',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                ),
                ValueListenableBuilder<ThemeMode>(
                  valueListenable: appThemeModeNotifier,
                  builder: (context, mode, child) {
                    return IconButton(
                      onPressed: _toggleThemeMode,
                      icon: Icon(
                        mode == ThemeMode.dark
                            ? Icons.light_mode_rounded
                            : Icons.dark_mode_rounded,
                        size: 21,
                        color: const Color(0xFF9DFB3B),
                      ),
                    );
                  },
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                InkWell(
                  onTap: _openProfileEditor,
                  borderRadius: BorderRadius.circular(36),
                  child: const UserAvatar(radius: 32),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ValueListenableBuilder<String>(
                        valueListenable: nicknameNotifier,
                        builder: (context, nickname, child) {
                          return Text(
                            nickname,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'UID: $currentUserUid',
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF0A101A),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF202C42)),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text('Security level ', style: TextStyle(fontSize: 15)),
                      Text(
                        'Low',
                        style: TextStyle(
                          fontSize: 15,
                          color: Color(0xFFFF4A61),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 4),
                  Text(
                    'At least 1 authentication method needs to be enabled.',
                    style: TextStyle(color: Colors.white54, fontSize: 12),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: List.generate(tabs.length, (index) {
                final bool active = index == _tab;
                return Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _tab = index),
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Column(
                        children: [
                          Text(
                            tabs[index],
                            style: TextStyle(
                              fontSize: 12.4,
                              color: active ? Colors.white : Colors.white38,
                              fontWeight: active
                                  ? FontWeight.w600
                                  : FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            height: 3,
                            width: 58,
                            decoration: BoxDecoration(
                              color: active ? Colors.white : Colors.transparent,
                              borderRadius: BorderRadius.circular(6),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ),
            const SizedBox(height: 6),
            if (_tab == 0) ...[
              _CenterOptionTile(
                icon: Icons.account_circle_outlined,
                title: 'Profile Picture',
                value: 'Change',
                onTap: _openProfileEditor,
              ),
              ValueListenableBuilder<String>(
                valueListenable: nicknameNotifier,
                builder: (context, nickname, child) {
                  return _CenterOptionTile(
                    icon: Icons.badge_outlined,
                    title: 'Nickname',
                    value: nickname,
                    onTap: _editNickname,
                  );
                },
              ),
              _CenterOptionTile(
                icon: Icons.perm_identity_outlined,
                title: 'UID',
                value: currentUserUid,
                onTap: () async {
                  await Clipboard.setData(ClipboardData(text: currentUserUid));
                  if (!mounted) return;
                  _showMessage('UID copied');
                },
              ),
              ValueListenableBuilder<bool>(
                valueListenable: kycVerifiedNotifier,
                builder: (context, verified, child) {
                  final bool basic = kycBasicVerifiedNotifier.value;
                  return _CenterOptionTile(
                    icon: Icons.verified_user_outlined,
                    title: 'Identity Verification',
                    value: verified
                        ? 'Lv.2 Verified'
                        : (basic ? 'Lv.1 Verified' : 'Start KYC'),
                    onTap: _openKyc,
                  );
                },
              ),
              _CenterOptionTile(
                icon: Icons.security_outlined,
                title: 'Security',
                value: 'Set up 2FA',
                onTap: () => _showMessage('2FA setup screen will open here'),
              ),
              _CenterOptionTile(
                icon: Icons.workspace_premium_outlined,
                title: 'VIP level',
                value: 'Non-VIP',
                onTap: () => _showMessage('VIP screen will open here'),
              ),
              _CenterOptionTile(
                icon: Icons.percent_outlined,
                title: 'My Fee Rates',
                value: 'View',
                onTap: () => _showMessage('Fee rates screen will open here'),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () {
                  _logoutActiveSession();
                  Navigator.of(context).popUntil((route) => route.isFirst);
                },
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFF2A344C)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: const Text('Log Out', style: TextStyle(fontSize: 16)),
              ),
            ],
            if (_tab == 1) ...[
              _CenterOptionTile(
                icon: Icons.access_time,
                title: 'Benchmark Time Zone',
                value: 'Last 24 hours',
                onTap: () => _showMessage('Time zone settings will open here'),
              ),
              _CenterOptionTile(
                icon: Icons.account_balance_wallet_outlined,
                title: 'Withdrawal Address',
                value: 'Manage',
                onTap: () =>
                    _showMessage('Withdrawal address settings will open here'),
              ),
              _CenterOptionTile(
                icon: Icons.wallet_outlined,
                title: 'Manage Crypto Withdrawal Limits',
                value: 'View',
                onTap: () => _showMessage('Withdrawal limits will open here'),
              ),
              _CenterOptionTile(
                icon: Icons.route_outlined,
                title: 'Switch routing',
                value: 'Auto Routing',
                onTap: () => _showMessage('Routing settings will open here'),
              ),
              _CenterOptionTile(
                icon: Icons.swap_calls_outlined,
                title: 'Route Deposits To',
                value: 'Funding Account',
                onTap: () => _showMessage('Deposit routing will open here'),
              ),
              _CenterOptionTile(
                icon: Icons.notifications_none,
                title: 'Notification Settings',
                value: 'Manage',
                onTap: () =>
                    _showMessage('Notification settings will open here'),
              ),
              _CenterOptionTile(
                icon: Icons.email_outlined,
                title: 'Email Subscriptions',
                value: 'Manage',
                onTap: () => _showMessage('Email preferences will open here'),
              ),
            ],
            if (_tab == 2) ...[
              _CenterOptionTile(
                icon: Icons.language,
                title: 'Language',
                value: 'English',
                onTap: () => _showMessage('Language selector will open here'),
              ),
              _CenterOptionTile(
                icon: Icons.currency_exchange_outlined,
                title: 'Currency Display',
                value: 'INR',
                onTap: () => _showMessage('Currency selector will open here'),
              ),
              ValueListenableBuilder<ThemeMode>(
                valueListenable: appThemeModeNotifier,
                builder: (context, mode, child) {
                  return _CenterOptionTile(
                    icon: Icons.palette_outlined,
                    title: 'Color Preferences',
                    value: mode == ThemeMode.dark ? 'Dark' : 'Light',
                    onTap: _toggleThemeMode,
                  );
                },
              ),
              Container(
                margin: const EdgeInsets.only(top: 2, bottom: 2),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: Colors.white.withValues(alpha: 0.08),
                    ),
                  ),
                ),
                child: SwitchListTile(
                  value: _alwaysOn,
                  onChanged: (value) => setState(() => _alwaysOn = value),
                  title: const Text(
                    'Always on (no screen lock)',
                    style: TextStyle(fontSize: 13.5),
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 2),
                ),
              ),
              _CenterOptionTile(
                icon: Icons.help_outline,
                title: 'Help Center',
                value: 'Open',
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const SupportHomePage(),
                  ),
                ),
              ),
              _CenterOptionTile(
                icon: Icons.show_chart,
                title: 'Trade market overview',
                value: 'Open',
                onTap: () => _showMessage('Market overview will open here'),
              ),
              _CenterOptionTile(
                icon: Icons.headset_mic_outlined,
                title: 'Customer Support Bot',
                value: 'Chat',
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const ChatSupportPage(),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _CenterOptionTile extends StatelessWidget {
  const _CenterOptionTile({
    required this.icon,
    required this.title,
    required this.value,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final bool isLight = Theme.of(context).brightness == Brightness.light;
    final borderColor = isLight
        ? const Color(0x220E1422)
        : Colors.white.withValues(alpha: 0.08);
    final iconColor = isLight ? const Color(0xFF2B3A57) : Colors.white70;
    final valueColor = isLight ? const Color(0xFF41506B) : Colors.white54;
    final chevronColor = isLight ? const Color(0xFF596A88) : Colors.white38;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: borderColor)),
        ),
        child: Row(
          children: [
            Icon(icon, size: 20, color: iconColor),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 12.8,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            Text(value, style: TextStyle(fontSize: 11.8, color: valueColor)),
            const SizedBox(width: 4),
            Icon(Icons.chevron_right, color: chevronColor, size: 20),
          ],
        ),
      ),
    );
  }
}

class KycVerificationPage extends StatefulWidget {
  const KycVerificationPage({super.key});

  @override
  State<KycVerificationPage> createState() => _KycVerificationPageState();
}

class _KycVerificationPageState extends State<KycVerificationPage> {
  final _fullNameController = TextEditingController();
  final _dobController = TextEditingController();
  final _nationalityController = TextEditingController();
  final _aadhaarNumberController = TextEditingController();
  final _addressController = TextEditingController();
  final _cityController = TextEditingController();
  final _stateController = TextEditingController();
  final _pincodeController = TextEditingController();

  final ImagePicker _imagePicker = ImagePicker();

  XFile? _aadhaarFront;
  XFile? _aadhaarBack;
  XFile? _selfieWithDoc;
  PlatformFile? _supportingFile;

  int _level = 0;
  bool _isSubmitting = false;
  bool _faceMatchPassed = false;
  String _faceStatus = 'Not started';

  @override
  void dispose() {
    _fullNameController.dispose();
    _dobController.dispose();
    _nationalityController.dispose();
    _aadhaarNumberController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _pincodeController.dispose();
    super.dispose();
  }

  String _fileNameFromPath(String path) {
    final normalized = path.replaceAll('\\', '/');
    return normalized.split('/').last;
  }

  Future<void> _pickImage({
    required String label,
    required ImageSource source,
    required void Function(XFile file) assign,
  }) async {
    final messenger = ScaffoldMessenger.of(context);
    final XFile? picked = await _imagePicker.pickImage(
      source: source,
      imageQuality: 85,
      maxWidth: 1800,
    );
    if (picked == null) return;

    if (!mounted) return;
    setState(() {
      assign(picked);
      _faceMatchPassed = false;
      _faceStatus = 'Pending AI match';
    });
    messenger.showSnackBar(SnackBar(content: Text('$label selected')));
  }

  Future<void> _pickSupportingFile() async {
    final messenger = ScaffoldMessenger.of(context);
    final FilePickerResult? result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
    );
    if (result == null || result.files.isEmpty) return;

    if (!mounted) return;
    setState(() {
      _supportingFile = result.files.first;
    });
    messenger.showSnackBar(
      const SnackBar(content: Text('Supporting file selected')),
    );
  }

  Future<int> _detectFacesInImage(String imagePath) async {
    final FaceDetector detector = FaceDetector(
      options: FaceDetectorOptions(
        performanceMode: FaceDetectorMode.accurate,
        enableLandmarks: true,
      ),
    );

    try {
      final InputImage image = InputImage.fromFilePath(imagePath);
      final faces = await detector.processImage(image);
      return faces.length;
    } finally {
      detector.close();
    }
  }

  Future<bool> _runAutoFaceMatch() async {
    if (_aadhaarFront == null || _selfieWithDoc == null) {
      return false;
    }

    try {
      final int aadhaarFaces = await _detectFacesInImage(_aadhaarFront!.path);
      final int selfieFaces = await _detectFacesInImage(_selfieWithDoc!.path);
      final bool passed = aadhaarFaces > 0 && selfieFaces > 0;

      if (!mounted) return false;
      setState(() {
        _faceMatchPassed = passed;
        _faceStatus = passed
            ? 'AI verified: face detected in selfie + document'
            : 'Face not clear. Please re-upload images';
      });
      return passed;
    } catch (_) {
      if (!mounted) return false;
      setState(() {
        _faceMatchPassed = false;
        _faceStatus = 'AI verification failed. Try clear photos';
      });
      return false;
    }
  }

  bool get _isBasicReady {
    return _fullNameController.text.trim().isNotEmpty &&
        _dobController.text.trim().isNotEmpty &&
        _nationalityController.text.trim().isNotEmpty;
  }

  bool get _isAdvancedReady {
    return _aadhaarNumberController.text.trim().isNotEmpty &&
        _addressController.text.trim().isNotEmpty &&
        _cityController.text.trim().isNotEmpty &&
        _stateController.text.trim().isNotEmpty &&
        _pincodeController.text.trim().isNotEmpty &&
        _aadhaarFront != null &&
        _aadhaarBack != null &&
        _selfieWithDoc != null;
  }

  void _submitBasicLevel() {
    if (!_isBasicReady) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Complete all basic details first')),
      );
      return;
    }
    kycBasicVerifiedNotifier.value = true;
    setState(() {
      _level = 1;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Level 1 basic verification completed')),
    );
  }

  Future<void> _submitAdvancedLevel() async {
    if (!kycBasicVerifiedNotifier.value) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Complete Level 1 first')));
      return;
    }

    if (!_isAdvancedReady) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Upload Aadhaar front/back and selfie')),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
      _faceStatus = 'Backend AI verification in progress...';
    });

    final bool passed = await _runAutoFaceMatch();

    if (!mounted) return;
    setState(() {
      _isSubmitting = false;
    });

    if (!passed) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Face verification failed. Re-upload clear photos'),
        ),
      );
      return;
    }

    _setKycStatus('under_review');
    _syncActiveUserState(kycStatus: 'under_review', canPostAds: false);
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('KYC Under Review')));
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Identity Verification')),
      body: ListView(
        padding: const EdgeInsets.all(14),
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF0F1A2B),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF22304D)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  kycStatusNotifier.value == 'verified'
                      ? 'KYC Status: Lv.2 Verified'
                      : (kycStatusNotifier.value == 'under_review'
                            ? 'KYC Status: Under Review'
                            : (kycBasicVerifiedNotifier.value
                                  ? 'KYC Status: Lv.1 Basic done'
                                  : 'KYC Status: Pending')),
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Level 1: Name + Basic info. Level 2: Aadhaar front/back + selfie.',
                  style: TextStyle(color: Colors.white70, fontSize: 12.5),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => _level = 0),
                  style: OutlinedButton.styleFrom(
                    backgroundColor: _level == 0
                        ? const Color(0xFF18263F)
                        : Colors.transparent,
                  ),
                  child: const Text(
                    'Level 1 Basic',
                    style: TextStyle(fontSize: 12.5),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => _level = 1),
                  style: OutlinedButton.styleFrom(
                    backgroundColor: _level == 1
                        ? const Color(0xFF18263F)
                        : Colors.transparent,
                  ),
                  child: const Text(
                    'Level 2 Advanced',
                    style: TextStyle(fontSize: 12.5),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (_level == 0) ...[
            TextField(
              controller: _fullNameController,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(labelText: 'Full Name'),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _dobController,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Date of Birth (DD/MM/YYYY)',
              ),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _nationalityController,
              textInputAction: TextInputAction.done,
              decoration: const InputDecoration(labelText: 'Nationality'),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _submitBasicLevel,
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 11),
                  backgroundColor: const Color(0xFF9DFB3B),
                  foregroundColor: Colors.black,
                ),
                child: const Text(
                  'Submit Level 1',
                  style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ],
          if (_level == 1) ...[
            TextField(
              controller: _aadhaarNumberController,
              textInputAction: TextInputAction.next,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Aadhaar Number'),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _addressController,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(labelText: 'Address'),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _cityController,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(labelText: 'City'),
                    onChanged: (_) => setState(() {}),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _stateController,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(labelText: 'State'),
                    onChanged: (_) => setState(() {}),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _pincodeController,
              textInputAction: TextInputAction.done,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Pincode'),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 10),
            _KycUploadTile(
              title: 'Aadhaar Front',
              value: _aadhaarFront == null
                  ? 'Not selected'
                  : _fileNameFromPath(_aadhaarFront!.path),
              onGallery: () => _pickImage(
                label: 'Aadhaar front',
                source: ImageSource.gallery,
                assign: (file) => _aadhaarFront = file,
              ),
              onCamera: () => _pickImage(
                label: 'Aadhaar front',
                source: ImageSource.camera,
                assign: (file) => _aadhaarFront = file,
              ),
            ),
            const SizedBox(height: 8),
            _KycUploadTile(
              title: 'Aadhaar Back',
              value: _aadhaarBack == null
                  ? 'Not selected'
                  : _fileNameFromPath(_aadhaarBack!.path),
              onGallery: () => _pickImage(
                label: 'Aadhaar back',
                source: ImageSource.gallery,
                assign: (file) => _aadhaarBack = file,
              ),
              onCamera: () => _pickImage(
                label: 'Aadhaar back',
                source: ImageSource.camera,
                assign: (file) => _aadhaarBack = file,
              ),
            ),
            const SizedBox(height: 8),
            _KycUploadTile(
              title: 'Selfie With Document',
              value: _selfieWithDoc == null
                  ? 'Not selected'
                  : _fileNameFromPath(_selfieWithDoc!.path),
              onGallery: () => _pickImage(
                label: 'Selfie with document',
                source: ImageSource.gallery,
                assign: (file) => _selfieWithDoc = file,
              ),
              onCamera: () => _pickImage(
                label: 'Selfie with document',
                source: ImageSource.camera,
                assign: (file) => _selfieWithDoc = file,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF0D1422),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF1D2A42)),
              ),
              child: Row(
                children: [
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Additional File (optional)',
                          style: TextStyle(
                            fontSize: 12.2,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        SizedBox(height: 3),
                        Text(
                          'PDF/JPG/PNG',
                          style: TextStyle(
                            color: Colors.white54,
                            fontSize: 11.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    _supportingFile?.name ?? 'None',
                    style: const TextStyle(fontSize: 11, color: Colors.white60),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton(
                    onPressed: _pickSupportingFile,
                    child: const Text(
                      'Select',
                      style: TextStyle(fontSize: 11.5),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF101825),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF1F2C44)),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.auto_awesome,
                    size: 16,
                    color: Color(0xFF9DFB3B),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _faceStatus,
                      style: TextStyle(
                        color: _faceMatchPassed
                            ? const Color(0xFF9DFB3B)
                            : Colors.white60,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _isSubmitting ? null : _submitAdvancedLevel,
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 11),
                  backgroundColor: const Color(0xFF9DFB3B),
                  foregroundColor: Colors.black,
                ),
                child: Text(
                  _isSubmitting ? 'Verifying...' : 'Submit Advanced KYC',
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _KycUploadTile extends StatelessWidget {
  const _KycUploadTile({
    required this.title,
    required this.value,
    required this.onGallery,
    required this.onCamera,
  });

  final String title;
  final String value;
  final VoidCallback onGallery;
  final VoidCallback onCamera;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFF0D1422),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF1D2A42)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 13.2, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(color: Colors.white54, fontSize: 11.8),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              OutlinedButton.icon(
                onPressed: onGallery,
                icon: const Icon(Icons.photo_library_outlined, size: 16),
                label: const Text('Gallery', style: TextStyle(fontSize: 12)),
              ),
              const SizedBox(width: 8),
              OutlinedButton.icon(
                onPressed: onCamera,
                icon: const Icon(Icons.camera_alt_outlined, size: 16),
                label: const Text('Camera', style: TextStyle(fontSize: 12)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class DepositPage extends StatefulWidget {
  const DepositPage({super.key});

  @override
  State<DepositPage> createState() => _DepositPageState();
}

class _DepositPageState extends State<DepositPage> {
  int _step = 1;
  String _coin = 'USDT';
  String _network = 'TRC20';
  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _proofController = TextEditingController();
  bool _submitting = false;
  bool _loadingWallets = true;
  bool _loadingHistory = true;
  List<AssetTransactionRecord> _deposits = <AssetTransactionRecord>[];
  List<DepositWalletCoin> _walletCatalog = <DepositWalletCoin>[];

  List<String> get _availableCoins {
    final backendCoins = _walletCatalog
        .map((row) => row.coin.trim().toUpperCase())
        .where((row) => row.isNotEmpty)
        .toSet()
        .toList();
    if (backendCoins.isNotEmpty) {
      backendCoins.sort();
      return backendCoins;
    }
    return kCoinNetworkBook.keys.toList();
  }

  DepositWalletCoin? get _coinWalletConfig {
    for (final row in _walletCatalog) {
      if (row.coin.toUpperCase() == _coin.toUpperCase()) {
        return row;
      }
    }
    return null;
  }

  List<String> get _availableNetworks {
    final backendNetworks =
        _coinWalletConfig?.networks
            .map((row) => row.network.trim().toUpperCase())
            .where((row) => row.isNotEmpty)
            .toList() ??
        const <String>[];
    if (backendNetworks.isNotEmpty) {
      return backendNetworks;
    }
    return kCoinNetworkBook[_coin] ?? const <String>['TRC20'];
  }

  DepositWalletNetwork? get _selectedWallet {
    final options =
        _coinWalletConfig?.networks ?? const <DepositWalletNetwork>[];
    for (final wallet in options) {
      if (wallet.network.toUpperCase() == _network.toUpperCase()) {
        return wallet;
      }
    }
    return null;
  }

  String get _address => _selectedWallet?.address.trim() ?? '';
  String get _qrCodeUrl => _selectedWallet?.qrCodeUrl.trim() ?? '';

  ChainNetworkMeta get _networkMeta =>
      kNetworkMeta[_network] ??
      const ChainNetworkMeta(
        code: 'CUSTOM',
        display: 'Custom Network',
        feeUsdt: 0,
        minDepositUsdt: 0,
        minWithdrawUsdt: 0,
        arrival: 'N/A',
      );

  @override
  void initState() {
    super.initState();
    unawaited(_refreshDepositData());
  }

  @override
  void dispose() {
    _amountController.dispose();
    _proofController.dispose();
    super.dispose();
  }

  Future<void> _refreshDepositData() async {
    setState(() {
      _loadingHistory = true;
      _loadingWallets = true;
    });
    try {
      await _syncWalletFromBackend();
      await _syncDepositSessionFromBackend();
      final wallets = await _fetchDepositWalletCatalog();
      final rows = await _fetchDepositHistory(limit: 20);
      if (!mounted) return;
      setState(() {
        _walletCatalog = wallets;
        if (!_availableCoins.contains(_coin) && _availableCoins.isNotEmpty) {
          _coin = _availableCoins.first;
        }
        final selectedCoinConfig = _coinWalletConfig;
        if (selectedCoinConfig != null &&
            selectedCoinConfig.defaultNetwork.trim().isNotEmpty &&
            _availableNetworks.contains(
              selectedCoinConfig.defaultNetwork.trim().toUpperCase(),
            )) {
          _network = selectedCoinConfig.defaultNetwork.trim().toUpperCase();
        }
        if (!_availableNetworks.contains(_network) &&
            _availableNetworks.isNotEmpty) {
          _network = _availableNetworks.first;
        }
        _deposits = rows;
      });
    } finally {
      if (mounted) {
        setState(() {
          _loadingHistory = false;
          _loadingWallets = false;
        });
      }
    }
  }

  Future<void> _selectCoin() async {
    final selected = await Navigator.of(context).push<String>(
      MaterialPageRoute<String>(
        builder: (_) => _CoinSelectPage(
          title: 'Select Coin',
          items: _availableCoins,
          balances: {
            'USDT':
                fundingUsdtBalanceNotifier.value +
                spotUsdtBalanceNotifier.value,
          },
        ),
      ),
    );
    if (selected == null || selected == _coin) return;
    setState(() {
      _coin = selected;
      _network = _availableNetworks.first;
    });
  }

  Future<void> _selectNetwork() async {
    final selected = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Theme.of(context).brightness == Brightness.light
          ? Colors.white
          : const Color(0xFF0A111F),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 18),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 42,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Theme.of(context).brightness == Brightness.light
                        ? const Color(0xFFD0D7E6)
                        : const Color(0xFF2A344A),
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                const SizedBox(height: 12),
                const Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Select Network',
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700),
                  ),
                ),
                const SizedBox(height: 10),
                Flexible(
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: _availableNetworks.length,
                    separatorBuilder: (context, index) =>
                        const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final code = _availableNetworks[index];
                      final meta = kNetworkMeta[code];
                      final display = meta?.display ?? code;
                      final fee = meta?.feeUsdt ?? 0;
                      final min = meta?.minWithdrawUsdt ?? 0;
                      final arrival = meta?.arrival ?? 'N/A';
                      return InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: () => Navigator.of(context).pop(code),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: code == _network
                                  ? const Color(0xFFE4C657)
                                  : Theme.of(context).brightness ==
                                        Brightness.light
                                  ? const Color(0xFFD4DCEB)
                                  : const Color(0xFF1E2942),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    code,
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      display,
                                      style: const TextStyle(
                                        fontSize: 13,
                                        color: Colors.grey,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Network fee ${fee.toStringAsFixed(3)} USDT',
                                style: const TextStyle(
                                  fontSize: 12.6,
                                  color: Colors.grey,
                                ),
                              ),
                              Text(
                                'Minimum deposit ${min.toStringAsFixed(4).replaceAll(RegExp(r'0+$'), '').replaceAll(RegExp(r'\\.$'), '')} $_coin',
                                style: const TextStyle(
                                  fontSize: 12.6,
                                  color: Colors.grey,
                                ),
                              ),
                              Text(
                                'Estimated arrival $arrival',
                                style: const TextStyle(
                                  fontSize: 12.6,
                                  color: Colors.grey,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
    if (selected == null) return;
    setState(() {
      _network = selected;
    });
  }

  Future<void> _confirmDeposit() async {
    if (_submitting) return;
    final amount = double.tryParse(_amountController.text.trim());
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid deposit amount.')),
      );
      return;
    }
    if (_address.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Deposit address is not available.')),
      );
      return;
    }
    if (hasActiveDepositSessionNotifier.value) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('A deposit request is already pending admin review.'),
        ),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      final deposit = await _createDepositRequest(
        coin: _coin,
        network: _network,
        address: _address,
        amount: amount,
        txHash: _proofController.text.trim(),
        proofUrl: _proofController.text.trim(),
      );

      final createdAt =
          DateTime.tryParse((deposit['createdAt'] ?? '').toString().trim()) ??
          DateTime.now();
      final statusRaw = (deposit['status'] ?? 'PENDING')
          .toString()
          .trim()
          .toUpperCase();
      final status = switch (statusRaw) {
        'COMPLETED' => 'Completed',
        'REJECTED' => 'Rejected',
        _ => 'Pending',
      };

      final record = AssetTransactionRecord(
        id: (deposit['id'] ?? 'DEP-${DateTime.now().millisecondsSinceEpoch}')
            .toString(),
        type: 'deposit',
        coin: _coin,
        amount: amount,
        time: createdAt,
        status: status,
        network: _network,
      );
      setState(() {
        _deposits = [record, ..._deposits];
        _step = 1;
        _amountController.clear();
        _proofController.clear();
      });
      hasActiveDepositSessionNotifier.value = status == 'Pending';

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Deposit request submitted. Balance updates after admin approval.',
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString().replaceFirst('Exception: ', '')),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  Widget _stepPill(int index, String title) {
    final active = _step == index;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: active ? const Color(0xFFE5C863) : const Color(0xFF141B2A),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          '$index. $title',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 11.8,
            fontWeight: FontWeight.w700,
            color: active ? Colors.black : Colors.white70,
          ),
        ),
      ),
    );
  }

  Widget _buildAddressQr() {
    if (_qrCodeUrl.startsWith('http://') || _qrCodeUrl.startsWith('https://')) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Image.network(
          _qrCodeUrl,
          width: 160,
          height: 160,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _AddressQrWidget(data: _address),
        ),
      );
    }
    return _AddressQrWidget(data: _address);
  }

  @override
  Widget build(BuildContext context) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final primary = isLight ? const Color(0xFF10141B) : Colors.white;
    final secondary = isLight ? const Color(0xFF6C7485) : Colors.white70;
    final card = isLight ? Colors.white : const Color(0xFF0B1323);
    final border = isLight ? const Color(0xFFD6DEEC) : const Color(0xFF1D2D49);
    final deposits = _deposits.take(8).toList();
    return Scaffold(
      appBar: AppBar(title: const Text('Deposit')),
      body: ListView(
        padding: const EdgeInsets.all(14),
        children: [
          Row(
            children: [
              _stepPill(1, 'Coin'),
              const SizedBox(width: 8),
              _stepPill(2, 'Network'),
              const SizedBox(width: 8),
              _stepPill(3, 'Address & Amount'),
            ],
          ),
          const SizedBox(height: 12),
          if (_loadingWallets)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 10),
              child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
            ),
          if (!_loadingWallets && _availableCoins.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 10),
              child: Text(
                'Deposit wallets are not configured by admin yet.',
                style: TextStyle(color: Colors.white70),
              ),
            ),
          if (_step == 1) ...[
            InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: _selectCoin,
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: card,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: border),
                ),
                child: Row(
                  children: [
                    Text(
                      _coin,
                      style: TextStyle(
                        fontSize: 20,
                        color: primary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _coin == 'USDT' ? 'TetherUS' : 'Select token',
                      style: TextStyle(fontSize: 13.4, color: secondary),
                    ),
                    const Spacer(),
                    const Icon(Icons.chevron_right_rounded),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _availableCoins.isEmpty
                    ? null
                    : () => setState(() => _step = 2),
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.black,
                ),
                child: const Text('Continue'),
              ),
            ),
          ],
          if (_step == 2) ...[
            const SizedBox(height: 2),
            const SizedBox(height: 10),
            InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: _selectNetwork,
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: card,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: border),
                ),
                child: Row(
                  children: [
                    Text(
                      _network,
                      style: TextStyle(
                        fontSize: 18,
                        color: primary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _networkMeta.display,
                        style: TextStyle(fontSize: 13, color: secondary),
                      ),
                    ),
                    const Icon(Icons.keyboard_arrow_down_rounded),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: card,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _networkInfoRow(
                    'Network fee',
                    '${_networkMeta.feeUsdt.toStringAsFixed(3)} USDT',
                    secondary,
                  ),
                  _networkInfoRow(
                    'Minimum deposit',
                    '${_networkMeta.minDepositUsdt.toStringAsFixed(4).replaceAll(RegExp(r'0+$'), '').replaceAll(RegExp(r'\\.$'), '')} $_coin',
                    secondary,
                  ),
                  _networkInfoRow(
                    'Estimated arrival',
                    _networkMeta.arrival,
                    secondary,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _availableNetworks.isEmpty
                    ? null
                    : () {
                        if (_address.trim().isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Deposit wallet is not configured for selected coin/network.',
                              ),
                            ),
                          );
                          return;
                        }
                        setState(() => _step = 3);
                      },
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.black,
                ),
                child: const Text('Continue'),
              ),
            ),
          ],
          if (_step == 3) ...[
            const SizedBox(height: 2),
            const SizedBox(height: 10),
            TextField(
              controller: _amountController,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: InputDecoration(
                labelText: 'Amount ($_coin)',
                hintText: 'Enter amount',
                suffixText: _coin,
              ),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _proofController,
              decoration: const InputDecoration(
                labelText: 'Transaction Hash / Proof URL (optional)',
                hintText: 'Paste tx hash or screenshot URL',
              ),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF0A1321),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF1D2D49)),
              ),
              child: Column(
                children: [
                  _buildAddressQr(),
                  const SizedBox(height: 8),
                  Text(
                    '$_coin • $_network',
                    style: const TextStyle(
                      fontSize: 12.2,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 5),
                  SelectableText(
                    _address,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 11.5,
                      color: Colors.white70,
                    ),
                  ),
                  const SizedBox(height: 8),
                  FilledButton.icon(
                    onPressed: () async {
                      final messenger = ScaffoldMessenger.of(context);
                      await Clipboard.setData(ClipboardData(text: _address));
                      if (!mounted) return;
                      messenger.showSnackBar(
                        const SnackBar(content: Text('Address copied')),
                      );
                    },
                    icon: const Icon(Icons.copy, size: 14),
                    label: const Text(
                      'Copy Address',
                      style: TextStyle(fontSize: 11.8),
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        final scanned = await Navigator.of(context)
                            .push<String>(
                              MaterialPageRoute<String>(
                                builder: (_) => const ScanPage(),
                              ),
                            );
                        if (scanned == null || scanned.trim().isEmpty) {
                          return;
                        }
                        _proofController.text = scanned.trim();
                      },
                      icon: const Icon(Icons.qr_code_scanner_rounded, size: 16),
                      label: const Text('QR Code Scanner'),
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _submitting ? null : _confirmDeposit,
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFF53D983),
                        foregroundColor: Colors.black,
                      ),
                      child: Text(
                        _submitting
                            ? 'Submitting...'
                            : 'I have sent the deposit',
                        style: TextStyle(
                          fontSize: 11.8,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 10),
          Text(
            'Send only $_coin via $_network. A mismatched network can permanently lose funds.',
            style: TextStyle(color: secondary, fontSize: 11.4),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Text(
                'Recent Deposits',
                style: TextStyle(
                  color: primary,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              TextButton(
                onPressed: _loadingHistory ? null : _refreshDepositData,
                child: const Text('Refresh'),
              ),
            ],
          ),
          if (_loadingHistory)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
            ),
          ...deposits.map((item) {
            final y = item.time.year.toString().padLeft(4, '0');
            final m = item.time.month.toString().padLeft(2, '0');
            final d = item.time.day.toString().padLeft(2, '0');
            final hh = item.time.hour.toString().padLeft(2, '0');
            final mm = item.time.minute.toString().padLeft(2, '0');
            final ss = item.time.second.toString().padLeft(2, '0');
            return Container(
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: isLight
                        ? const Color(0xFFE0E6F2)
                        : const Color(0xFF1B263B),
                  ),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.coin,
                          style: TextStyle(
                            color: primary,
                            fontSize: 14.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text(
                          '$y-$m-$d $hh:$mm:$ss',
                          style: TextStyle(color: secondary, fontSize: 11.8),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '+${item.amount.toStringAsFixed(4).replaceAll(RegExp(r'0+$'), '').replaceAll(RegExp(r'\\.$'), '')}',
                        style: const TextStyle(
                          color: Color(0xFF56C08C),
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(item.status, style: TextStyle(color: secondary)),
                    ],
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _networkInfoRow(String label, String value, Color secondary) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(fontSize: 12, color: secondary),
            ),
          ),
          Text(
            value,
            style: const TextStyle(fontSize: 12.6, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

class _CoinSelectPage extends StatefulWidget {
  const _CoinSelectPage({
    required this.title,
    required this.items,
    required this.balances,
  });

  final String title;
  final List<String> items;
  final Map<String, double> balances;

  @override
  State<_CoinSelectPage> createState() => _CoinSelectPageState();
}

class _CoinSelectPageState extends State<_CoinSelectPage> {
  final TextEditingController _searchController = TextEditingController();
  String _query = '';
  static const _history = ['USDT', 'BTC', 'ETH'];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final rows = widget.items
        .where((item) => item.toLowerCase().contains(_query.toLowerCase()))
        .toList();
    final isLight = Theme.of(context).brightness == Brightness.light;
    final secondary = isLight ? const Color(0xFF6A7284) : Colors.white60;

    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: ListView(
        padding: const EdgeInsets.all(14),
        children: [
          TextField(
            controller: _searchController,
            onChanged: (value) => setState(() => _query = value.trim()),
            decoration: const InputDecoration(
              prefixIcon: Icon(Icons.search),
              hintText: 'Search Coins',
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Text(
                'Search History',
                style: TextStyle(fontSize: 16.4, fontWeight: FontWeight.w700),
              ),
              const Spacer(),
              Icon(Icons.delete_outline, size: 20, color: secondary),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _history.map((item) => Chip(label: Text(item))).toList(),
          ),
          const SizedBox(height: 12),
          const Text(
            'Coin List',
            style: TextStyle(fontSize: 16.4, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          ...rows.map((coin) {
            final value = widget.balances[coin] ?? 0;
            return ListTile(
              contentPadding: const EdgeInsets.symmetric(
                vertical: 2,
                horizontal: 0,
              ),
              onTap: () => Navigator.of(context).pop(coin),
              leading: CircleAvatar(
                radius: 15,
                backgroundColor: const Color(0xFF17B7AE),
                child: Text(
                  coin.isNotEmpty ? coin[0] : '?',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              title: Text(
                coin,
                style: const TextStyle(
                  fontSize: 16.8,
                  fontWeight: FontWeight.w700,
                ),
              ),
              subtitle: Text(
                coin == 'USDT' ? 'TetherUS' : coin,
                style: TextStyle(fontSize: 12.8, color: secondary),
              ),
              trailing: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    _formatWithCommas(value, decimals: 4),
                    style: const TextStyle(
                      fontSize: 15.2,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Text(
                    '₹${_formatWithCommas(value * 91.8, decimals: 2)}',
                    style: TextStyle(fontSize: 12, color: secondary),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}

class _AddressQrWidget extends StatelessWidget {
  const _AddressQrWidget({required this.data});

  final String data;

  List<List<bool>> _buildMatrix(String value) {
    const int side = 29;
    final matrix = List.generate(side, (_) => List<bool>.filled(side, false));

    void paintFinder(int top, int left) {
      for (var r = 0; r < 7; r++) {
        for (var c = 0; c < 7; c++) {
          final rr = top + r;
          final cc = left + c;
          final isBorder = r == 0 || r == 6 || c == 0 || c == 6;
          final isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          matrix[rr][cc] = isBorder || isCenter;
        }
      }
    }

    bool inFinderZone(int row, int col) {
      final inTopLeft = row < 7 && col < 7;
      final inTopRight = row < 7 && col >= side - 7;
      final inBottomLeft = row >= side - 7 && col < 7;
      return inTopLeft || inTopRight || inBottomLeft;
    }

    paintFinder(0, 0);
    paintFinder(0, side - 7);
    paintFinder(side - 7, 0);

    final bytes = utf8.encode(value);
    var seed = 0;
    for (final b in bytes) {
      seed = (seed * 131 + b) & 0x7fffffff;
    }
    final random = Random(seed);

    for (var r = 0; r < side; r++) {
      for (var c = 0; c <= side ~/ 2; c++) {
        if (inFinderZone(r, c) || inFinderZone(r, side - 1 - c)) {
          continue;
        }
        final bit = random.nextBool();
        matrix[r][c] = bit;
        matrix[r][side - 1 - c] = bit;
      }
    }

    return matrix;
  }

  @override
  Widget build(BuildContext context) {
    final matrix = _buildMatrix(data);
    return Container(
      width: 160,
      height: 160,
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: CustomPaint(painter: _QrMatrixPainter(matrix)),
    );
  }
}

class _QrMatrixPainter extends CustomPainter {
  _QrMatrixPainter(this.matrix);

  final List<List<bool>> matrix;

  @override
  void paint(Canvas canvas, Size size) {
    final side = matrix.length;
    final cellW = size.width / side;
    final cellH = size.height / side;
    final paint = Paint()..color = Colors.black;

    for (var r = 0; r < side; r++) {
      for (var c = 0; c < side; c++) {
        if (!matrix[r][c]) continue;
        canvas.drawRect(
          Rect.fromLTWH(c * cellW, r * cellH, cellW, cellH),
          paint,
        );
      }
    }
  }

  @override
  bool shouldRepaint(covariant _QrMatrixPainter oldDelegate) {
    return oldDelegate.matrix != matrix;
  }
}

class ScanPage extends StatefulWidget {
  const ScanPage({super.key});

  @override
  State<ScanPage> createState() => _ScanPageState();
}

class _ScanPageState extends State<ScanPage> {
  final MobileScannerController _scannerController = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    formats: const [BarcodeFormat.qrCode],
    facing: CameraFacing.back,
    torchEnabled: false,
  );
  bool _torchOn = false;
  bool _busy = false;
  String? _lastCode;

  @override
  void dispose() {
    _scannerController.dispose();
    super.dispose();
  }

  Future<void> _handleDetect(BarcodeCapture capture) async {
    if (_busy) return;
    final code = capture.barcodes
        .map((b) => b.rawValue ?? '')
        .firstWhere((v) => v.trim().isNotEmpty, orElse: () => '');
    if (code.isEmpty) return;
    _busy = true;
    _lastCode = code;
    await _scannerController.stop();
    if (!mounted) return;

    final action = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: const Color(0xFF0C1324),
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Scan Result',
                style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              SelectableText(
                code,
                style: const TextStyle(fontSize: 12.4, color: Colors.white70),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        await Clipboard.setData(ClipboardData(text: code));
                        if (!mounted) return;
                        Navigator.of(context).pop('copy');
                      },
                      icon: const Icon(Icons.copy, size: 16),
                      label: const Text('Copy'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () => Navigator.of(context).pop('use'),
                      icon: const Icon(Icons.check_circle_outline, size: 16),
                      label: const Text('Use'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: () => Navigator.of(context).pop('scan'),
                  child: const Text('Scan Again'),
                ),
              ),
            ],
          ),
        ),
      ),
    );

    if (!mounted) return;
    if (action == 'use') {
      Navigator.of(context).pop(code);
      return;
    }
    if (action == 'copy') {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Scanned value copied')));
    }
    _busy = false;
    await _scannerController.start();
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan QR'),
        actions: [
          IconButton(
            onPressed: () async {
              await _scannerController.toggleTorch();
              if (!mounted) return;
              setState(() => _torchOn = !_torchOn);
            },
            icon: Icon(_torchOn ? Icons.flash_on : Icons.flash_off),
            tooltip: 'Torch',
          ),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: _scannerController,
            onDetect: _handleDetect,
          ),
          IgnorePointer(
            child: Center(
              child: Container(
                width: 260,
                height: 260,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFF9DFB3B), width: 2),
                ),
              ),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 22,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xCC05070B),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFF223149)),
                ),
                child: Text(
                  _lastCode == null
                      ? 'Align QR code inside frame'
                      : 'Last: ${_lastCode!.length > 28 ? '${_lastCode!.substring(0, 28)}...' : _lastCode}',
                  style: const TextStyle(fontSize: 11.4, color: Colors.white70),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class SupportAlertsPage extends StatelessWidget {
  const SupportAlertsPage({super.key});

  String _fmt(DateTime t) {
    final dd = t.day.toString().padLeft(2, '0');
    final mm = t.month.toString().padLeft(2, '0');
    final hh = t.hour.toString().padLeft(2, '0');
    final mi = t.minute.toString().padLeft(2, '0');
    return '$dd/$mm $hh:$mi';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Support Alerts')),
      body: ValueListenableBuilder<List<SupportAlert>>(
        valueListenable: supportAlertsNotifier,
        builder: (context, alerts, child) {
          if (alerts.isEmpty) {
            return const Center(
              child: Text(
                'No alerts yet',
                style: TextStyle(fontSize: 12.4, color: Colors.white70),
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: alerts.length,
            itemBuilder: (context, index) {
              final alert = alerts[index];
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF0D1422),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF1D2A42)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          'Ticket #${alert.id}',
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const Spacer(),
                        Text(
                          alert.resolved ? 'Resolved' : 'Open',
                          style: TextStyle(
                            fontSize: 11.2,
                            color: alert.resolved
                                ? const Color(0xFF8EEA8A)
                                : const Color(0xFFFFB347),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'User ${alert.userUid} • ${_fmt(alert.timestamp)}',
                      style: const TextStyle(
                        fontSize: 10.6,
                        color: Colors.white60,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(alert.message, style: const TextStyle(fontSize: 11.8)),
                    if (!alert.resolved) ...[
                      const SizedBox(height: 8),
                      Align(
                        alignment: Alignment.centerRight,
                        child: OutlinedButton(
                          onPressed: () {
                            final updated = supportAlertsNotifier.value
                                .map(
                                  (item) => item.id == alert.id
                                      ? item.copyWith(resolved: true)
                                      : item,
                                )
                                .toList();
                            supportAlertsNotifier.value = updated;
                          },
                          child: const Text(
                            'Mark Resolved',
                            style: TextStyle(fontSize: 11),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class WithdrawPage extends StatefulWidget {
  const WithdrawPage({super.key});

  @override
  State<WithdrawPage> createState() => _WithdrawPageState();
}

class _WithdrawPageState extends State<WithdrawPage> {
  String _coin = 'USDT';
  final TextEditingController _addressController = TextEditingController();
  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _emailCodeController = TextEditingController();
  final TextEditingController _smsCodeController = TextEditingController();
  final TextEditingController _googleCodeController = TextEditingController();
  final TextEditingController _fundPasswordController = TextEditingController();
  String _network = 'TRC20';
  bool _submitting = false;

  List<String> get _availableNetworks =>
      kCoinNetworkBook[_coin] ?? const ['TRC20'];
  ChainNetworkMeta get _networkMeta =>
      kNetworkMeta[_network] ??
      const ChainNetworkMeta(
        code: 'CUSTOM',
        display: 'Custom Network',
        feeUsdt: 0,
        minDepositUsdt: 0,
        minWithdrawUsdt: 0,
        arrival: 'N/A',
      );

  @override
  void initState() {
    super.initState();
    unawaited(_syncWalletFromBackend());
  }

  @override
  void dispose() {
    _addressController.dispose();
    _amountController.dispose();
    _emailCodeController.dispose();
    _smsCodeController.dispose();
    _googleCodeController.dispose();
    _fundPasswordController.dispose();
    super.dispose();
  }

  Future<void> _selectCoin() async {
    final selected = await Navigator.of(context).push<String>(
      MaterialPageRoute<String>(
        builder: (_) => _CoinSelectPage(
          title: 'Select Coin',
          items: kCoinNetworkBook.keys.toList(),
          balances: {
            'USDT': fundingUsdtBalanceNotifier.value,
            'BTC': 0,
            'ETH': 0,
            'BNB': 0,
            'SOL': 0,
            'XRP': 0,
            'DOGE': 0,
          },
        ),
      ),
    );
    if (selected == null || selected == _coin) return;
    setState(() {
      _coin = selected;
      _network = _availableNetworks.first;
    });
  }

  Future<void> _selectNetwork() async {
    final selected = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Theme.of(context).brightness == Brightness.light
          ? Colors.white
          : const Color(0xFF0A111F),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          top: false,
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 14),
            children: [
              const Text(
                'Choose Network',
                style: TextStyle(fontSize: 27, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              ..._availableNetworks.map((code) {
                final meta = kNetworkMeta[code];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: () => Navigator.of(context).pop(code),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: code == _network
                              ? const Color(0xFFE4C657)
                              : Theme.of(context).brightness == Brightness.light
                              ? const Color(0xFFD5DDED)
                              : const Color(0xFF1D2A44),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '$code ${meta?.display ?? ''}',
                            style: const TextStyle(
                              fontSize: 16.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Fee ${meta?.feeUsdt.toStringAsFixed(3) ?? '0'} USDT',
                            style: const TextStyle(
                              fontSize: 12.2,
                              color: Colors.grey,
                            ),
                          ),
                          Text(
                            'Minimum withdrawal ${meta?.minWithdrawUsdt.toStringAsFixed(4).replaceAll(RegExp(r'0+$'), '').replaceAll(RegExp(r'\\.$'), '') ?? '0'} $_coin',
                            style: const TextStyle(
                              fontSize: 12.2,
                              color: Colors.grey,
                            ),
                          ),
                          Text(
                            'Arrival time ${meta?.arrival ?? 'N/A'}',
                            style: const TextStyle(
                              fontSize: 12.2,
                              color: Colors.grey,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0x12000000),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Text(
                  'Ensure selected network matches destination wallet support.',
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ),
            ],
          ),
        );
      },
    );
    if (selected == null) return;
    setState(() => _network = selected);
  }

  Future<void> _submitWithdrawal() async {
    if (_submitting) return;
    final amount = double.tryParse(_amountController.text.trim()) ?? 0;
    final available = fundingUsdtBalanceNotifier.value;
    if (_addressController.text.trim().isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Enter withdrawal address')));
      return;
    }
    if (amount < _networkMeta.minWithdrawUsdt) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Minimum withdrawal is ${_networkMeta.minWithdrawUsdt.toStringAsFixed(2)} $_coin',
          ),
        ),
      );
      return;
    }
    final finalAmount = amount + _networkMeta.feeUsdt;
    if (finalAmount > available) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Insufficient available balance')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      final withdrawal = await _createWithdrawalRequest(
        currency: _coin,
        network: _network,
        address: _addressController.text.trim(),
        amount: amount,
      );

      final createdAt =
          DateTime.tryParse(
            (withdrawal['createdAt'] ?? '').toString().trim(),
          ) ??
          DateTime.now();
      kAssetTxHistory.insert(
        0,
        AssetTransactionRecord(
          id:
              (withdrawal['requestId'] ??
                      withdrawal['id'] ??
                      'WDR-${DateTime.now().millisecondsSinceEpoch}')
                  .toString(),
          type: 'withdraw',
          coin: _coin,
          amount: amount,
          time: createdAt,
          status: 'Pending',
          network: _network,
        ),
      );

      await _syncWalletFromBackend();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Withdrawal request submitted. Awaiting admin approval.',
          ),
        ),
      );
      Navigator.of(context).pop();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString().replaceFirst('Exception: ', '')),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final primary = isLight ? const Color(0xFF11151F) : Colors.white;
    final secondary = isLight ? const Color(0xFF6B7385) : Colors.white60;
    final available = fundingUsdtBalanceNotifier.value;
    return Scaffold(
      appBar: AppBar(title: Text('Send $_coin')),
      body: ListView(
        padding: const EdgeInsets.all(14),
        children: [
          InkWell(
            onTap: _selectCoin,
            borderRadius: BorderRadius.circular(12),
            child: InputDecorator(
              decoration: const InputDecoration(labelText: 'Coin'),
              child: Row(
                children: [
                  Text(
                    _coin,
                    style: const TextStyle(
                      fontSize: 16.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const Spacer(),
                  const Icon(Icons.chevron_right_rounded),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          InkWell(
            onTap: _selectNetwork,
            borderRadius: BorderRadius.circular(12),
            child: InputDecorator(
              decoration: const InputDecoration(labelText: 'Network'),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      '$_network • ${_networkMeta.display}',
                      style: const TextStyle(fontSize: 14),
                    ),
                  ),
                  const Icon(Icons.keyboard_arrow_down_rounded),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _addressController,
            decoration: const InputDecoration(
              labelText: 'Recipient Address',
              hintText: 'Paste destination wallet address',
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _amountController,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: 'Withdrawal Amount',
              hintText:
                  'Minimum ${_networkMeta.minWithdrawUsdt.toStringAsFixed(2)}',
              suffixText: _coin,
            ),
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isLight ? Colors.white : const Color(0xFF0E1523),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isLight
                    ? const Color(0xFFD5DDEC)
                    : const Color(0xFF1E2C46),
              ),
            ),
            child: Column(
              children: [
                _withdrawMetaRow(
                  'Network fee',
                  '${_networkMeta.feeUsdt.toStringAsFixed(3)} $_coin',
                  secondary,
                ),
                _withdrawMetaRow(
                  'Minimum withdrawal',
                  '${_networkMeta.minWithdrawUsdt.toStringAsFixed(2)} $_coin',
                  secondary,
                ),
                _withdrawMetaRow(
                  'Available balance',
                  '${_formatWithCommas(available, decimals: 4)} $_coin',
                  secondary,
                ),
                _withdrawMetaRow(
                  'Estimated arrival',
                  _networkMeta.arrival,
                  secondary,
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'Security verification',
            style: TextStyle(
              color: primary,
              fontSize: 14.4,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _emailCodeController,
            decoration: const InputDecoration(
              labelText: 'Email verification code',
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _smsCodeController,
            decoration: const InputDecoration(
              labelText: 'SMS verification code',
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _googleCodeController,
            decoration: const InputDecoration(
              labelText: 'Google Authenticator code',
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _fundPasswordController,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Fund password'),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _submitting ? null : _submitWithdrawal,
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFFE4C657),
              foregroundColor: Colors.black87,
              minimumSize: const Size.fromHeight(48),
            ),
            child: Text(
              _submitting ? 'Submitting...' : 'Withdraw',
              style: const TextStyle(fontSize: 14.2),
            ),
          ),
        ],
      ),
    );
  }

  Widget _withdrawMetaRow(String label, String value, Color secondary) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(fontSize: 12.2, color: secondary),
            ),
          ),
          Text(
            value,
            style: const TextStyle(fontSize: 12.6, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

class TransferPage extends StatefulWidget {
  const TransferPage({super.key});

  @override
  State<TransferPage> createState() => _TransferPageState();
}

class _TransferPageState extends State<TransferPage> {
  String _from = 'Funding';
  String _to = 'Spot';
  final TextEditingController _amountController = TextEditingController();

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Transfer Funds')),
      body: ListView(
        padding: const EdgeInsets.all(14),
        children: [
          DropdownButtonFormField<String>(
            initialValue: _from,
            decoration: const InputDecoration(labelText: 'From Wallet'),
            items: const [
              DropdownMenuItem(value: 'Funding', child: Text('Funding')),
              DropdownMenuItem(value: 'Spot', child: Text('Spot')),
            ],
            onChanged: (value) {
              if (value == null) return;
              setState(() => _from = value);
            },
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            initialValue: _to,
            decoration: const InputDecoration(labelText: 'To Wallet'),
            items: const [
              DropdownMenuItem(value: 'Funding', child: Text('Funding')),
              DropdownMenuItem(value: 'Spot', child: Text('Spot')),
            ],
            onChanged: (value) {
              if (value == null) return;
              setState(() => _to = value);
            },
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _amountController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Amount',
              hintText: 'Enter USDT amount',
            ),
          ),
          const SizedBox(height: 10),
          FilledButton(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Transferred from $_from to $_to')),
              );
            },
            child: const Text('Transfer Now', style: TextStyle(fontSize: 13)),
          ),
        ],
      ),
    );
  }
}

class AssetHistoryPage extends StatefulWidget {
  const AssetHistoryPage({super.key});

  @override
  State<AssetHistoryPage> createState() => _AssetHistoryPageState();
}

class _AssetHistoryPageState extends State<AssetHistoryPage> {
  int _tab = 0;
  static const _tabs = ['Deposit', 'Withdraw', 'Transfer'];

  List<AssetTransactionRecord> _rowsForTab() {
    final type = switch (_tab) {
      0 => 'deposit',
      1 => 'withdraw',
      _ => 'transfer',
    };
    return kAssetTxHistory.where((item) => item.type == type).toList()
      ..sort((a, b) => b.time.compareTo(a.time));
  }

  String _timeLabel(DateTime value) {
    final y = value.year.toString().padLeft(4, '0');
    final m = value.month.toString().padLeft(2, '0');
    final d = value.day.toString().padLeft(2, '0');
    final hh = value.hour.toString().padLeft(2, '0');
    final mm = value.minute.toString().padLeft(2, '0');
    final ss = value.second.toString().padLeft(2, '0');
    return '$y-$m-$d $hh:$mm:$ss';
  }

  @override
  Widget build(BuildContext context) {
    final rows = _rowsForTab();
    final isLight = Theme.of(context).brightness == Brightness.light;
    final primary = isLight ? const Color(0xFF11151F) : Colors.white;
    final secondary = isLight ? const Color(0xFF6D7586) : Colors.white60;
    final divider = isLight ? const Color(0xFFD9E0EE) : const Color(0xFF1F293D);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Assets'),
        actions: [
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.download_outlined),
          ),
        ],
      ),
      body: Column(
        children: [
          const SizedBox(height: 2),
          Text(
            '${_tabs[_tab]} History',
            style: TextStyle(
              color: secondary,
              fontSize: 13.8,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: List.generate(_tabs.length, (index) {
              final active = _tab == index;
              return Expanded(
                child: InkWell(
                  onTap: () => setState(() => _tab = index),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Column(
                      children: [
                        Text(
                          _tabs[index],
                          style: TextStyle(
                            fontSize: 14.2,
                            fontWeight: active
                                ? FontWeight.w700
                                : FontWeight.w500,
                            color: active ? primary : secondary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          width: 44,
                          height: 2.5,
                          decoration: BoxDecoration(
                            color: active
                                ? const Color(0xFFE4C657)
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ),
          Container(
            width: double.infinity,
            color: isLight ? Colors.white : const Color(0xFF090E18),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: Text(
              'Deposits not arrived? Check solutions here',
              style: TextStyle(
                color: secondary,
                fontSize: 12.6,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: rows.isEmpty
                ? Center(
                    child: Text(
                      'No ${_tabs[_tab].toLowerCase()} records',
                      style: TextStyle(fontSize: 13.2, color: secondary),
                    ),
                  )
                : ListView.separated(
                    itemCount: rows.length,
                    separatorBuilder: (context, index) =>
                        Divider(height: 1, color: divider),
                    itemBuilder: (context, index) {
                      final item = rows[index];
                      final amountColor = item.type == 'withdraw'
                          ? const Color(0xFFEF4E5E)
                          : const Color(0xFF56C08C);
                      return ListTile(
                        contentPadding: const EdgeInsets.fromLTRB(
                          16,
                          10,
                          16,
                          10,
                        ),
                        title: Text(
                          item.coin,
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: primary,
                          ),
                        ),
                        subtitle: Text(
                          _timeLabel(item.time),
                          style: TextStyle(fontSize: 12.4, color: secondary),
                        ),
                        trailing: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              '${item.type == 'withdraw' ? '-' : '+'}${_formatWithCommas(item.amount, decimals: 4).replaceAll(RegExp(r'0+$'), '').replaceAll(RegExp(r'\\.$'), '')}',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w700,
                                color: amountColor,
                              ),
                            ),
                            Text(
                              item.status,
                              style: TextStyle(
                                fontSize: 12.6,
                                color: secondary,
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class SupportBotPage extends StatefulWidget {
  const SupportBotPage({super.key});

  @override
  State<SupportBotPage> createState() => _SupportBotPageState();
}

class _SupportBotPageState extends State<SupportBotPage> {
  static const String _supportApiBase = String.fromEnvironment(
    'SUPPORT_API_BASE',
    defaultValue: 'https://new-landing-page-rlv6.onrender.com',
  );
  static const String _supportApiBearer = String.fromEnvironment(
    'SUPPORT_API_BEARER',
    defaultValue: '',
  );

  final TextEditingController _queryController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<_SupportMessage> _messages = [];
  final List<_SupportTicket> _tickets = [];

  SupportQuickCategory? _selectedCategory;
  SupportHelpArticle? _activeArticle;
  Map<String, dynamic>? _analytics;

  Timer? _pollTimer;
  String? _remoteTicketId;
  int _remoteMessageCount = 0;
  int _localTicketSeed = 1100;
  bool _sending = false;
  bool _loadingAnalytics = false;
  bool _showP2POptions = false;
  bool _showHelpfulPrompt = false;
  bool _showUnresolvedSuggestions = false;
  bool _showEscalationActions = false;
  bool? _helpfulSelection;
  String? _selectedP2POption;

  final TextEditingController _guestNameController = TextEditingController();
  final TextEditingController _guestMobileController = TextEditingController();

  static const List<String> _p2pOptions = <String>[
    'P2P Appeals',
    'Unable to use P2P function',
    'Security Deposit Inquiry',
    'Become a P2P Advertiser',
    'Unable to Post Advertisements',
  ];

  static const List<String> _p2pUnresolvedSuggestions = <String>[
    'I Want to Know More About P2P Trading',
    'Understanding P2P Advertiser',
    'What You Need to Know to Start P2P Trading',
    'Tips for Safe P2P Trading',
    'Everything You Need to Know for Safe P2P Trading',
  ];

  static const List<String> _topQuestions = [
    'P2P order issue',
    'Crypto deposit not credited',
    'How to submit a withdrawal?',
    'Verification code not received - SMS',
    'Verification code not received - Email',
    "Why is my crypto asset frozen?",
  ];

  @override
  void initState() {
    super.initState();
    _appendBot("Hello there! I'm Bitebot, how can I assist you today?");
    _loadAnalytics();
    _pollTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      _pollRemoteSupportUpdates();
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _queryController.dispose();
    _scrollController.dispose();
    _guestNameController.dispose();
    _guestMobileController.dispose();
    super.dispose();
  }

  String _timeTag(DateTime dt) {
    final hh = dt.hour.toString().padLeft(2, '0');
    final mm = dt.minute.toString().padLeft(2, '0');
    return '$hh:$mm';
  }

  void _appendBot(String text) {
    _messages.add(
      _SupportMessage(role: 'bot', text: text, time: DateTime.now()),
    );
  }

  void _appendUser(String text) {
    _messages.add(
      _SupportMessage(role: 'user', text: text, time: DateTime.now()),
    );
  }

  void _scrollToBottomSoon() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent + 220,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  String _normalizedApiBase() {
    return _supportApiBase.endsWith('/')
        ? _supportApiBase.substring(0, _supportApiBase.length - 1)
        : _supportApiBase;
  }

  Future<_HttpJsonResponse> _supportPost(
    String path,
    Map<String, dynamic> payload,
  ) async {
    final client = HttpClient()
      ..connectionTimeout = const Duration(seconds: 12);
    try {
      final req = await client.postUrl(
        Uri.parse('${_normalizedApiBase()}$path'),
      );
      req.headers.contentType = ContentType.json;
      if (_supportApiBearer.trim().isNotEmpty) {
        req.headers.set('Authorization', 'Bearer ${_supportApiBearer.trim()}');
      }
      req.add(utf8.encode(jsonEncode(payload)));
      final resp = await req.close();
      final raw = await resp.transform(utf8.decoder).join();

      Map<String, dynamic>? map;
      try {
        final decoded = jsonDecode(raw);
        if (decoded is Map<String, dynamic>) {
          map = decoded;
        }
      } catch (_) {
        map = null;
      }

      final ok =
          resp.statusCode >= 200 &&
          resp.statusCode < 300 &&
          (map == null || map['success'] != false);

      return _HttpJsonResponse(
        ok: ok,
        statusCode: resp.statusCode,
        bodyMap: map,
      );
    } catch (_) {
      return const _HttpJsonResponse(ok: false, statusCode: 0, bodyMap: null);
    } finally {
      client.close(force: true);
    }
  }

  Future<_HttpJsonResponse> _supportGet(String path) async {
    final client = HttpClient()
      ..connectionTimeout = const Duration(seconds: 12);
    try {
      final req = await client.getUrl(
        Uri.parse('${_normalizedApiBase()}$path'),
      );
      if (_supportApiBearer.trim().isNotEmpty) {
        req.headers.set('Authorization', 'Bearer ${_supportApiBearer.trim()}');
      }
      final resp = await req.close();
      final raw = await resp.transform(utf8.decoder).join();

      Map<String, dynamic>? map;
      try {
        final decoded = jsonDecode(raw);
        if (decoded is Map<String, dynamic>) {
          map = decoded;
        }
      } catch (_) {
        map = null;
      }

      final ok =
          resp.statusCode >= 200 &&
          resp.statusCode < 300 &&
          (map == null || map['success'] != false);

      return _HttpJsonResponse(
        ok: ok,
        statusCode: resp.statusCode,
        bodyMap: map,
      );
    } catch (_) {
      return const _HttpJsonResponse(ok: false, statusCode: 0, bodyMap: null);
    } finally {
      client.close(force: true);
    }
  }

  SupportHelpArticle? _matchFaqArticle(String question) {
    final q = question.toLowerCase();
    if (q.contains('sms')) {
      return kSupportHelpArticles.firstWhere((a) => a.id == 'verification-sms');
    }
    if (q.contains('email') || q.contains('verification code')) {
      return kSupportHelpArticles.firstWhere(
        (a) => a.id == 'verification-email',
      );
    }
    if (q.contains('deposit')) {
      return kSupportHelpArticles.firstWhere(
        (a) => a.id == 'deposit-not-credited',
      );
    }
    if (q.contains('withdraw')) {
      return kSupportHelpArticles.firstWhere((a) => a.id == 'withdraw-howto');
    }
    if (q.contains('reward') || q.contains('bonus') || q.contains('coupon')) {
      return kSupportHelpArticles.firstWhere((a) => a.id == 'reward-info');
    }
    if (q.contains('identity') || q.contains('kyc') || q.contains('verify')) {
      return kSupportHelpArticles.firstWhere((a) => a.id == 'kyc-guide');
    }
    if (q.contains('p2p') || q.contains('merchant') || q.contains('dispute')) {
      return kSupportHelpArticles.firstWhere((a) => a.id == 'p2p-issue');
    }
    return null;
  }

  SupportHelpArticle _findCategoryGuide(String category) {
    if (category == 'Account & Security') {
      return kSupportHelpArticles.firstWhere(
        (a) => a.id == 'account-security-guide',
      );
    }
    if (category == 'Deposit & Withdrawal') {
      return kSupportHelpArticles.firstWhere(
        (a) => a.id == 'deposit-withdraw-guide',
      );
    }
    if (category == 'P2P') {
      return kSupportHelpArticles.firstWhere((a) => a.id == 'p2p-guide');
    }
    if (category == 'Identity Verification') {
      return kSupportHelpArticles.firstWhere((a) => a.id == 'kyc-full-guide');
    }
    if (category == 'Promotion & Bonus') {
      return kSupportHelpArticles.firstWhere(
        (a) => a.id == 'promotion-bonus-guide',
      );
    }
    return kSupportHelpArticles.first;
  }

  String _quickAnswerForArticle(SupportHelpArticle article) {
    final lines = article.body
        .split('\n')
        .map((line) => line.trim())
        .where((line) => line.isNotEmpty)
        .toList();
    if (lines.isEmpty) return 'I opened the article details for you.';
    final content = lines.length > 1 ? lines.sublist(1) : lines;
    return content.take(5).join('\n');
  }

  SupportQuickCategory? _categoryFromArticle(SupportHelpArticle article) {
    for (final item in kSupportQuickCategories) {
      if (item.title == article.category) return item;
    }
    return null;
  }

  String? _extractTicketId(Map<String, dynamic>? root) {
    final data = root?['data'];
    if (data is Map<String, dynamic>) {
      final ticket = data['ticket'];
      if (ticket is Map<String, dynamic>) {
        final id = ticket['id'];
        if (id != null) return id.toString();
      }
    }
    return null;
  }

  String? _extractTicketStatus(Map<String, dynamic>? root) {
    final data = root?['data'];
    if (data is Map<String, dynamic>) {
      final ticket = data['ticket'];
      if (ticket is Map<String, dynamic>) {
        final status = ticket['status'];
        if (status != null) return status.toString();
      }
    }
    return null;
  }

  List<dynamic> _extractMessageList(Map<String, dynamic>? root) {
    final data = root?['data'];
    if (data is Map<String, dynamic>) {
      final messages = data['messages'];
      if (messages is List) {
        return messages;
      }
    }
    return const [];
  }

  String? _extractBotReply(Map<String, dynamic>? root) {
    final messages = _extractMessageList(root);
    for (final item in messages.reversed) {
      if (item is! Map) continue;
      final senderType = (item['sender_type'] ?? '').toString().toLowerCase();
      final isAi = item['is_ai_generated'] == true;
      if (senderType == 'bot' || isAi) {
        final text = (item['message'] ?? '').toString().trim();
        if (text.isNotEmpty) return text;
      }
    }
    return null;
  }

  Future<void> _loadAnalytics() async {
    if (_loadingAnalytics) return;
    setState(() => _loadingAnalytics = true);

    final resp = await _supportGet('/api/admin/support/analytics');
    if (!mounted) return;

    setState(() {
      _loadingAnalytics = false;
      if (resp.ok && resp.bodyMap != null) {
        final data = resp.bodyMap!['data'];
        if (data is Map<String, dynamic>) {
          _analytics = data;
        }
      }
    });
  }

  Future<void> _createSupportTicket(
    String reason, {
    bool liveAgent = false,
  }) async {
    _localTicketSeed += 1;
    final localId = 'STK-$_localTicketSeed';

    final alert = addSupportAgentAlert(reason);

    setState(() {
      _tickets.insert(
        0,
        _SupportTicket(
          id: localId,
          reason: reason,
          status: 'OPEN',
          createdAt: DateTime.now(),
          alertId: alert.id,
        ),
      );
      _appendBot(
        'Ticket $localId created. ${liveAgent ? 'Live agent has been requested.' : 'Support has been notified.'}',
      );
    });

    final resp = await _supportPost('/api/support/tickets', {
      'subject': liveAgent ? 'Live Agent Request' : 'Mobile Support',
      'message': reason,
      'live_agent': liveAgent,
    });

    final remoteTicketId = _extractTicketId(resp.bodyMap);
    final botReply = _extractBotReply(resp.bodyMap);

    if (!mounted) return;

    setState(() {
      if (remoteTicketId != null) {
        _remoteTicketId = remoteTicketId;
        _remoteMessageCount = _extractMessageList(resp.bodyMap).length;
      }

      if (botReply != null && botReply.isNotEmpty) {
        _appendBot(botReply);
      }
    });

    _scrollToBottomSoon();
  }

  Future<void> _pollRemoteSupportUpdates() async {
    final ticketId = _remoteTicketId;
    if (ticketId == null || ticketId.trim().isEmpty) {
      return;
    }

    final resp = await _supportGet('/api/support/tickets/$ticketId/messages');
    if (!resp.ok || resp.bodyMap == null || !mounted) {
      return;
    }

    final messages = _extractMessageList(resp.bodyMap);
    if (messages.length <= _remoteMessageCount) {
      return;
    }

    final newItems = messages.skip(_remoteMessageCount).toList();
    final status = _extractTicketStatus(resp.bodyMap)?.toLowerCase();

    setState(() {
      for (final item in newItems) {
        if (item is! Map) continue;
        final senderType = (item['sender_type'] ?? '').toString().toLowerCase();
        final text = (item['message'] ?? '').toString().trim();
        if (text.isEmpty) continue;

        if (senderType == 'admin') {
          _appendBot('Agent: $text');
          addSupportAgentAlert('Agent replied on ticket #$ticketId');
        } else if (senderType == 'system') {
          _appendBot(text);
        }
      }

      if (status == 'closed') {
        _appendBot('Your ticket #$ticketId is now closed.');
        addSupportAgentAlert('Ticket #$ticketId was closed by support.');
      }

      _remoteMessageCount = messages.length;
    });

    _scrollToBottomSoon();
  }

  bool _isP2PIntent(String text) {
    final lower = text.toLowerCase();
    return lower.contains('p2p') ||
        lower.contains('appeal') ||
        lower.contains('merchant') ||
        lower.contains('advertiser') ||
        lower.contains('release crypto');
  }

  void _startP2PFlow() {
    _appendBot(
      "If you're experiencing issues with P2P Trading, please select the option that best matches your concern.",
    );
    _appendBot(
      'Live chat agents cannot handle P2P order or appeal cases. Please check the P2P Order Appeal Progress page.',
    );
    _showP2POptions = true;
    _showHelpfulPrompt = false;
    _showUnresolvedSuggestions = false;
    _showEscalationActions = false;
    _helpfulSelection = null;
    _selectedP2POption = null;
  }

  void _selectP2POption(String option) {
    setState(() {
      _selectedP2POption = option;
      _showHelpfulPrompt = true;
      _showUnresolvedSuggestions = false;
      _showEscalationActions = false;
      _appendUser(option);
      _appendBot(
        'P2P module selected: $option\nCheck order timeline, payment proof, and appeal status first.',
      );
    });
    _scrollToBottomSoon();
  }

  void _setHelpfulFeedback(bool helpful) {
    setState(() {
      _helpfulSelection = helpful;
      if (helpful) {
        _appendBot('Great. If anything else comes up, I am here to help.');
        _showUnresolvedSuggestions = false;
      } else {
        _appendBot(
          'You might be looking for one of these guides. If still unresolved, choose "My issue isn\'t listed above".',
        );
        _showUnresolvedSuggestions = true;
      }
      _showEscalationActions = false;
    });
    _scrollToBottomSoon();
  }

  void _markIssueNotListed() {
    setState(() {
      _showEscalationActions = true;
      _appendBot('Choose Submit Case or Connect to Live Agent.');
    });
    _scrollToBottomSoon();
  }

  Future<void> _openSubmitCase() async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => const SubmitCasePage()));
  }

  Future<void> _connectToLiveAgent() async {
    final bool? registered = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Live Agent'),
        content: const Text('Are you already a registered user?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('No'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Yes'),
          ),
        ],
      ),
    );

    if (registered == null) return;
    if (!mounted) return;

    if (registered) {
      final int queue = 4 + Random().nextInt(7);
      setState(() {
        _appendBot(
          'You are now connected to live support. Your position in the queue is $queue.',
        );
      });
      _scrollToBottomSoon();
      await _requestLiveAgent();
      return;
    }

    _guestNameController.clear();
    _guestMobileController.clear();
    bool submitted = false;

    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Guest Live Support'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _guestNameController,
              decoration: const InputDecoration(labelText: 'Full name'),
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _guestMobileController,
              decoration: const InputDecoration(labelText: 'Mobile number'),
              keyboardType: TextInputType.phone,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (_guestNameController.text.trim().isEmpty ||
                  _guestMobileController.text.trim().isEmpty) {
                return;
              }
              submitted = true;
              Navigator.of(ctx).pop();
            },
            child: const Text('Continue'),
          ),
        ],
      ),
    );

    if (!submitted) return;
    if (!mounted) return;

    final String name = _guestNameController.text.trim();
    final String mobile = _guestMobileController.text.trim();
    final int queue = 4 + Random().nextInt(7);

    setState(() {
      _appendBot(
        'Thanks $name. Your position in the queue is $queue. Our agent will contact $mobile shortly.',
      );
    });
    _scrollToBottomSoon();

    await _createSupportTicket(
      'Guest live-agent request from $name ($mobile).',
      liveAgent: true,
    );
  }

  Future<void> _sendQuestion([String? preset]) async {
    final question = (preset ?? _queryController.text).trim();
    if (question.isEmpty || _sending) return;

    _queryController.clear();

    if (_isP2PIntent(question)) {
      setState(() {
        _appendUser(question);
        _startP2PFlow();
      });
      _scrollToBottomSoon();
      return;
    }

    final faqArticle = _matchFaqArticle(question);
    if (faqArticle != null) {
      setState(() {
        _selectedCategory = _categoryFromArticle(faqArticle);
        _activeArticle = faqArticle;
        _appendUser(question);
        _showP2POptions = false;
        _showHelpfulPrompt = false;
        _showUnresolvedSuggestions = false;
        _showEscalationActions = false;
        _appendBot(
          'Assistant quick help:\n${_quickAnswerForArticle(faqArticle)}\n\nIf still unresolved, tap Live Agent.',
        );
      });
      _scrollToBottomSoon();
      return;
    }

    setState(() {
      _sending = true;
      _appendUser(question);
    });

    final hasRemoteTicket =
        _remoteTicketId != null && _remoteTicketId!.trim().isNotEmpty;

    final resp = await _supportPost(
      hasRemoteTicket
          ? '/api/support/tickets/${_remoteTicketId!}/messages'
          : '/api/support/tickets',
      hasRemoteTicket
          ? {'message': question}
          : {'subject': 'Mobile AI Support', 'message': question},
    );

    final remoteTicketId = _extractTicketId(resp.bodyMap);
    final botReply = _extractBotReply(resp.bodyMap);

    if (!mounted) return;

    setState(() {
      _sending = false;

      if (remoteTicketId != null) {
        _remoteTicketId = remoteTicketId;
        _remoteMessageCount = _extractMessageList(resp.bodyMap).length;
      }

      if (botReply != null && botReply.isNotEmpty) {
        _appendBot(botReply);
      } else {
        _appendBot(
          'I could not fetch a live AI reply right now. Please share TX hash/order id and tap Live Agent for priority help.',
        );
      }
    });

    _scrollToBottomSoon();
  }

  Future<void> _requestLiveAgent() async {
    await _createSupportTicket(
      'User requested live support agent from mobile app.',
      liveAgent: true,
    );
  }

  Widget _analyticsCard(bool isLight) {
    final data = _analytics;
    if (data == null && !_loadingAnalytics) {
      return const SizedBox.shrink();
    }

    final bg = isLight ? Colors.white : const Color(0xFF101824);
    final border = isLight ? const Color(0xFFD8DFEB) : const Color(0xFF202C3F);

    final total = data?['total_tickets']?.toString() ?? '--';
    final open = data?['open_tickets']?.toString() ?? '--';
    final closed = data?['closed_tickets']?.toString() ?? '--';
    final avg = data?['avg_response_time']?.toString() ?? '--';
    final today = data?['tickets_today']?.toString() ?? '--';

    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Support Analytics',
                  style: TextStyle(fontSize: 16.8, fontWeight: FontWeight.w700),
                ),
              ),
              IconButton(
                onPressed: _loadingAnalytics ? null : _loadAnalytics,
                icon: _loadingAnalytics
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.refresh_rounded, size: 18),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _metricChip('Total', total),
              _metricChip('Open', open),
              _metricChip('Closed', closed),
              _metricChip('Avg Resp(s)', avg),
              _metricChip('Today', today),
            ],
          ),
        ],
      ),
    );
  }

  Widget _metricChip(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: const Color(0xFF162335),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        '$label: $value',
        style: const TextStyle(fontSize: 11.8, color: Colors.white),
      ),
    );
  }

  Widget _categorySection(bool isLight) {
    final cardBg = isLight ? const Color(0xFFF1F3F6) : const Color(0xFF111820);
    final chipBg = isLight ? Colors.white : const Color(0xFF1B2532);
    final textColor = isLight ? const Color(0xFF1B1F2A) : Colors.white;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Quick categories',
            style: TextStyle(
              fontSize: 13.8,
              fontWeight: FontWeight.w600,
              color: textColor,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: kSupportQuickCategories.map((cat) {
              final active = _selectedCategory?.title == cat.title;
              return InkWell(
                onTap: () {
                  final article = _findCategoryGuide(cat.title);
                  setState(() {
                    _selectedCategory = cat;
                    _activeArticle = article;
                    _appendBot(
                      'Guide opened: ${article.title}\n\n${_quickAnswerForArticle(article)}',
                    );
                  });
                  _scrollToBottomSoon();
                },
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: active ? const Color(0xFF16A7C8) : chipBg,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    cat.title,
                    style: TextStyle(
                      fontSize: 11.8,
                      color: active
                          ? Colors.white
                          : (isLight
                                ? const Color(0xFF202534)
                                : Colors.white70),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _topQuestionsCard(bool isLight) {
    final bg = isLight ? Colors.white : const Color(0xFF0F1724);
    final border = isLight ? const Color(0xFFD8DFEB) : const Color(0xFF202C3F);

    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Top questions',
            style: TextStyle(fontSize: 18.5, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          ..._topQuestions.map((q) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: OutlinedButton(
                onPressed: () => _sendQuestion(q),
                style: OutlinedButton.styleFrom(
                  alignment: Alignment.centerLeft,
                  minimumSize: const Size.fromHeight(44),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(q, style: const TextStyle(fontSize: 14)),
                    ),
                    const Icon(Icons.chevron_right_rounded, size: 18),
                  ],
                ),
              ),
            );
          }),
          const SizedBox(height: 2),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _connectToLiveAgent,
              style: FilledButton.styleFrom(
                backgroundColor: isLight
                    ? const Color(0xFFE9EDF4)
                    : const Color(0xFF202A3A),
                foregroundColor: isLight ? Colors.black : Colors.white,
                minimumSize: const Size.fromHeight(50),
              ),
              icon: const Icon(Icons.support_agent_outlined),
              label: const Text(
                'Connect to Live Agent',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _activeArticleCard(bool isLight) {
    final article = _activeArticle;
    if (article == null) return const SizedBox.shrink();

    final bg = isLight ? const Color(0xFFF0F2F6) : const Color(0xFF141D2A);
    final border = isLight ? const Color(0xFFD3DBE9) : const Color(0xFF1E2C44);
    final primary = isLight ? const Color(0xFF151A25) : Colors.white;
    final secondary = isLight ? const Color(0xFF4E566A) : Colors.white70;

    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  article.title,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: primary,
                  ),
                ),
              ),
              TextButton(
                onPressed: () => setState(() => _activeArticle = null),
                child: const Text('Close'),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            article.body,
            style: TextStyle(
              fontSize: 14.2,
              color: secondary,
              height: 1.44,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _p2pGuidedCard(bool isLight) {
    if (!_showP2POptions &&
        !_showHelpfulPrompt &&
        !_showUnresolvedSuggestions &&
        !_showEscalationActions) {
      return const SizedBox.shrink();
    }

    final bg = isLight ? Colors.white : const Color(0xFF0F1724);
    final border = isLight ? const Color(0xFFD8DFEB) : const Color(0xFF202C3F);
    final secondary = isLight ? const Color(0xFF586176) : Colors.white70;
    const accent = Color(0xFFF7931A);

    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_showP2POptions) ...[
            const Text(
              'P2P Support',
              style: TextStyle(fontSize: 16.8, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(
              "If you're experiencing issues with P2P Trading, please select the option that best matches your concern.",
              style: TextStyle(fontSize: 12.4, color: secondary, height: 1.35),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _p2pOptions.map((option) {
                final selected = _selectedP2POption == option;
                return ChoiceChip(
                  label: Text(option, style: const TextStyle(fontSize: 11.4)),
                  selected: selected,
                  selectedColor: accent.withValues(alpha: 0.22),
                  onSelected: (_) => _selectP2POption(option),
                );
              }).toList(),
            ),
            const SizedBox(height: 8),
            Text(
              'Live chat agents cannot handle P2P order or appeal cases. Please check the P2P Order Appeal Progress page.',
              style: TextStyle(fontSize: 11.8, color: secondary),
            ),
          ],
          if (_showHelpfulPrompt) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                const Text(
                  'Helpful?',
                  style: TextStyle(fontSize: 13.2, fontWeight: FontWeight.w700),
                ),
                const SizedBox(width: 8),
                IconButton(
                  visualDensity: VisualDensity.compact,
                  onPressed: () => _setHelpfulFeedback(true),
                  icon: Icon(
                    _helpfulSelection == true
                        ? Icons.thumb_up_alt
                        : Icons.thumb_up_alt_outlined,
                    color: _helpfulSelection == true
                        ? accent
                        : (isLight ? const Color(0xFF5C667B) : Colors.white70),
                  ),
                ),
                IconButton(
                  visualDensity: VisualDensity.compact,
                  onPressed: () => _setHelpfulFeedback(false),
                  icon: Icon(
                    _helpfulSelection == false
                        ? Icons.thumb_down_alt
                        : Icons.thumb_down_alt_outlined,
                    color: _helpfulSelection == false
                        ? const Color(0xFFEF4E5E)
                        : (isLight ? const Color(0xFF5C667B) : Colors.white70),
                  ),
                ),
              ],
            ),
          ],
          if (_showUnresolvedSuggestions) ...[
            const SizedBox(height: 8),
            Text(
              'You might be looking for:',
              style: TextStyle(
                fontSize: 12.8,
                color: secondary,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            ..._p2pUnresolvedSuggestions.map((item) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: OutlinedButton(
                  onPressed: () => _sendQuestion(item),
                  style: OutlinedButton.styleFrom(
                    alignment: Alignment.centerLeft,
                    minimumSize: const Size.fromHeight(42),
                  ),
                  child: Text(item, style: const TextStyle(fontSize: 12.2)),
                ),
              );
            }),
            const SizedBox(height: 2),
            FilledButton(
              onPressed: _markIssueNotListed,
              style: FilledButton.styleFrom(
                backgroundColor: accent,
                foregroundColor: Colors.black,
              ),
              child: const Text("My issue isn't listed above"),
            ),
          ],
          if (_showEscalationActions) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: FilledButton(
                    onPressed: _openSubmitCase,
                    style: FilledButton.styleFrom(
                      backgroundColor: accent,
                      foregroundColor: Colors.black,
                    ),
                    child: const Text('Submit Case'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: _connectToLiveAgent,
                    child: const Text('Connect to Live Agent'),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _chatThreadCard(bool isLight) {
    if (_messages.isEmpty) return const SizedBox.shrink();

    final bg = isLight ? Colors.white : const Color(0xFF0F1724);
    final border = isLight ? const Color(0xFFD8DFEB) : const Color(0xFF202C3F);
    final botBg = isLight ? const Color(0xFFF0F3F8) : const Color(0xFF1A2436);
    final userBg = const Color(0xFF18AFCB);

    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: Column(
        children: _messages.map((item) {
          final isBot = item.role == 'bot';
          return Padding(
            padding: const EdgeInsets.only(bottom: 9),
            child: Column(
              crossAxisAlignment: isBot
                  ? CrossAxisAlignment.start
                  : CrossAxisAlignment.end,
              children: [
                Text(
                  _timeTag(item.time),
                  style: TextStyle(
                    fontSize: 11,
                    color: isLight ? const Color(0xFF747C8F) : Colors.white54,
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  constraints: const BoxConstraints(maxWidth: 340),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: isBot ? botBg : userBg,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Text(
                    item.text,
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.38,
                      color: isBot
                          ? (isLight ? const Color(0xFF1B2130) : Colors.white)
                          : Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _ticketSummaryCard(bool isLight) {
    if (_tickets.isEmpty) return const SizedBox.shrink();

    final bg = isLight ? Colors.white : const Color(0xFF101822);
    final border = isLight ? const Color(0xFFD8DFEB) : const Color(0xFF203047);

    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Support Tickets',
            style: TextStyle(fontSize: 16.8, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          ..._tickets.take(5).map((ticket) {
            final created = _timeTag(ticket.createdAt);
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: isLight
                      ? const Color(0xFFF2F5FA)
                      : const Color(0xFF1B2434),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        '${ticket.id} • ${ticket.reason}',
                        style: const TextStyle(
                          fontSize: 12.6,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${ticket.status} · $created',
                      style: const TextStyle(
                        fontSize: 11.6,
                        color: Color(0xFF18AFCB),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final inputHint = isLight ? const Color(0xFF8C94A5) : Colors.white54;
    const accent = Color(0xFFF7931A);

    return Scaffold(
      appBar: AppBar(
        title: const Text('24/7 Dedicated Support'),
        actions: [
          IconButton(
            tooltip: 'Language',
            onPressed: () {},
            icon: const Icon(Icons.language_rounded),
          ),
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.power_settings_new_rounded),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              controller: _scrollController,
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
              children: [
                _analyticsCard(isLight),
                _categorySection(isLight),
                _activeArticleCard(isLight),
                _ticketSummaryCard(isLight),
                _topQuestionsCard(isLight),
                _p2pGuidedCard(isLight),
                _chatThreadCard(isLight),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 10),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _queryController,
                    decoration: InputDecoration(
                      hintText: 'Drop your question(s) here',
                      hintStyle: TextStyle(color: inputHint),
                      isDense: true,
                    ),
                    onSubmitted: (_) => _sendQuestion(),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: _sending ? null : () => _sendQuestion(),
                  style: FilledButton.styleFrom(
                    backgroundColor: accent,
                    foregroundColor: Colors.black,
                    shape: const CircleBorder(),
                    padding: const EdgeInsets.all(12),
                  ),
                  child: _sending
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.arrow_upward_rounded, size: 16),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class HelpCenterHubPage extends StatefulWidget {
  const HelpCenterHubPage({super.key, this.initialTab = 0});

  final int initialTab;

  @override
  State<HelpCenterHubPage> createState() => _HelpCenterHubPageState();
}

class _HelpCenterHubPageState extends State<HelpCenterHubPage> {
  final TextEditingController _helpSearchController = TextEditingController();
  final TextEditingController _coinSearchController = TextEditingController();
  final TextEditingController _uidController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _orderIdController = TextEditingController();
  final TextEditingController _subjectController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _orderLookupController = TextEditingController();

  final Map<String, int> _helpFeedback = <String, int>{};
  PlatformFile? _attachmentFile;

  String _helpSearch = '';
  String _coinSearch = '';
  String? _selectedHelpTopic;
  String? _selectedCaseCategory;
  String? _selectedCaseSubCategory;
  String? _selectedDisputeStatus;
  bool _showSubmitForm = false;
  bool _hideSuspendedDeposits = false;
  bool _showOnlySuspendedCoins = false;
  P2POrderItem? _lookedUpOrder;

  @override
  void initState() {
    super.initState();
    _uidController.text = currentUserUid;
    _emailController.text = authIdentityNotifier.value.trim().isNotEmpty
        ? authIdentityNotifier.value.trim()
        : 'user@bitegit.com';
    _helpSearchController.addListener(() {
      final next = _helpSearchController.text.trim();
      if (_helpSearch != next) {
        setState(() => _helpSearch = next);
      }
    });
    _coinSearchController.addListener(() {
      final next = _coinSearchController.text.trim();
      if (_coinSearch != next) {
        setState(() => _coinSearch = next);
      }
    });
  }

  @override
  void dispose() {
    _helpSearchController.dispose();
    _coinSearchController.dispose();
    _uidController.dispose();
    _emailController.dispose();
    _orderIdController.dispose();
    _subjectController.dispose();
    _descriptionController.dispose();
    _orderLookupController.dispose();
    super.dispose();
  }

  List<SupportHelpArticle> _filteredArticles() {
    final q = _helpSearch.toLowerCase();
    final List<SupportHelpArticle> source = kSupportHelpArticles.where((item) {
      if (q.isEmpty) return true;
      return item.title.toLowerCase().contains(q) ||
          item.category.toLowerCase().contains(q) ||
          item.body.toLowerCase().contains(q) ||
          item.description.toLowerCase().contains(q);
    }).toList();
    if (_selectedHelpTopic == null) return source;
    return source
        .where((item) => _topicMatch(item, _selectedHelpTopic!))
        .toList();
  }

  bool _topicMatch(SupportHelpArticle article, String topic) {
    final t = topic.toLowerCase();
    final category = article.category.toLowerCase();
    final title = article.title.toLowerCase();
    if (t == 'account management') {
      return category.contains('account') || category.contains('identity');
    }
    if (t == 'security') return category.contains('security');
    if (t == 'p2p trading') return category.contains('p2p');
    if (t == 'deposits') return title.contains('deposit');
    if (t == 'withdrawals') return title.contains('withdraw');
    if (t == 'trading') {
      return title.contains('trading') || title.contains('order');
    }
    if (t == 'api') return title.contains('api');
    if (t == 'finance') {
      return title.contains('reward') || title.contains('bonus');
    }
    if (t == 'nft') return title.contains('nft');
    return true;
  }

  String _articleDescription(SupportHelpArticle article) {
    if (article.description.trim().isNotEmpty) {
      return article.description.trim();
    }
    final lines = article.body
        .split('\n')
        .map((line) => line.trim())
        .where((line) => line.isNotEmpty)
        .toList();
    if (lines.length <= 1) return article.body.trim();
    return lines[1];
  }

  List<SupportHelpArticle> _relatedArticles(SupportHelpArticle article) {
    if (article.related.isNotEmpty) {
      final mapped = article.related
          .map(
            (id) =>
                kSupportHelpArticles.where((item) => item.id == id).toList(),
          )
          .expand((items) => items)
          .toList();
      if (mapped.isNotEmpty) return mapped.take(3).toList();
    }
    return kSupportHelpArticles
        .where(
          (item) => item.category == article.category && item.id != article.id,
        )
        .take(3)
        .toList();
  }

  bool _requiresDisputeStatus() {
    if (_selectedCaseSubCategory == null) return false;
    final text = _selectedCaseSubCategory!.toLowerCase();
    return text.contains('appeal') ||
        text.contains('release') ||
        text.contains('dispute') ||
        text.contains('frozen');
  }

  String _tipText() {
    final category = _selectedCaseCategory ?? '';
    if (category == 'P2P Trading') {
      return 'Useful Tips: Please transfer your assets to your Funding Account before using P2P trading. '
          'If you recently changed your security settings, selling coins may be restricted for 24 hours.';
    }
    if (category == 'Deposit & Withdrawals') {
      return 'Useful Tips: Confirm coin + network match, minimum amount, and chain confirmations before submitting. '
          'Large withdrawals may be delayed by additional risk checks.';
    }
    if (category == 'Account Verification (KYC)') {
      return 'Useful Tips: Upload clear document photos, keep all 4 edges visible, and avoid blur/glare. '
          'Face verification fails when lighting is poor.';
    }
    return 'Useful Tips: Check Help Center article steps first. If issue persists, submit complete details '
        '(UID, order ID, screenshots, and exact timestamp) for faster resolution.';
  }

  Future<void> _pickSupportAttachment() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const <String>['pdf', 'png', 'jpg', 'jpeg', 'mp4'],
    );
    if (result == null || result.files.isEmpty) return;
    setState(() => _attachmentFile = result.files.first);
  }

  String _createTicketId() {
    final random = Random();
    final stamp = DateTime.now().millisecondsSinceEpoch.toString();
    final suffix = (random.nextInt(9000) + 1000).toString();
    return 'SUP-${stamp.substring(stamp.length - 6)}-$suffix';
  }

  void _searchOrderById() {
    final query = _orderLookupController.text.trim().toLowerCase();
    if (query.isEmpty) {
      setState(() => _lookedUpOrder = null);
      return;
    }
    final matched = p2pOrdersNotifier.value.where((order) {
      return order.id.toLowerCase().contains(query);
    }).toList();
    setState(() => _lookedUpOrder = matched.isEmpty ? null : matched.first);
  }

  void _submitSupportTicket() {
    final uid = _uidController.text.trim();
    final email = _emailController.text.trim();
    final subject = _subjectController.text.trim();
    final description = _descriptionController.text.trim();

    if (uid.isEmpty ||
        email.isEmpty ||
        _selectedCaseCategory == null ||
        _selectedCaseSubCategory == null ||
        subject.isEmpty ||
        description.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Fill all required support fields first')),
      );
      return;
    }

    final id = _createTicketId();
    final ticket = SubmittedSupportTicket(
      ticketId: id,
      uid: uid,
      email: email,
      category: _selectedCaseCategory!,
      subcategory: _selectedCaseSubCategory!,
      subject: subject,
      description: description,
      createdAt: DateTime.now(),
      orderId: _orderIdController.text.trim().isEmpty
          ? null
          : _orderIdController.text.trim(),
      attachmentName: _attachmentFile?.name,
      disputeStatus: _selectedDisputeStatus,
    );

    submittedSupportTicketsNotifier.value = <SubmittedSupportTicket>[
      ticket,
      ...submittedSupportTicketsNotifier.value,
    ];
    addSupportAgentAlert(
      'New support ticket ${ticket.ticketId} (${ticket.category})',
    );

    _subjectController.clear();
    _descriptionController.clear();
    _orderIdController.clear();
    setState(() {
      _attachmentFile = null;
      _showSubmitForm = false;
    });

    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Support Ticket Created'),
        content: Text(
          'Your ticket ID is ${ticket.ticketId}.\nOur team will respond soon.',
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _openAiChat() {
    Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => const ChatSupportPage()));
  }

  void _openAdminPanel() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => const SupportModerationPanelPage(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool isLight = Theme.of(context).brightness == Brightness.light;
    final Color background = isLight
        ? const Color(0xFFF5F7FB)
        : const Color(0xFF0B0B0F);
    final Color card = isLight ? Colors.white : const Color(0xFF141414);
    final Color secondary = isLight
        ? const Color(0xFF6A7282)
        : const Color(0xFFA0A0A0);
    final Color accent = const Color(0xFFF7A600);
    final textColor = isLight ? const Color(0xFF10131A) : Colors.white;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Help Center'),
        actions: [
          IconButton(
            onPressed: _openAiChat,
            tooltip: 'AI Support Chatbot',
            icon: const Icon(Icons.smart_toy_outlined),
          ),
          IconButton(
            onPressed: _openAdminPanel,
            tooltip: 'Admin Panel',
            icon: const Icon(Icons.admin_panel_settings_outlined),
          ),
        ],
      ),
      body: DefaultTabController(
        initialIndex: widget.initialTab < 0
            ? 0
            : (widget.initialTab > 2 ? 2 : widget.initialTab),
        length: 3,
        child: Column(
          children: [
            Container(
              color: background,
              child: TabBar(
                indicatorColor: accent,
                labelColor: textColor,
                unselectedLabelColor: secondary,
                tabs: const [
                  Tab(text: 'Help Center'),
                  Tab(text: 'Submit Case'),
                  Tab(text: 'Coin Status'),
                ],
              ),
            ),
            Expanded(
              child: TabBarView(
                children: [
                  _buildHelpCenterTab(
                    context: context,
                    card: card,
                    accent: accent,
                    textColor: textColor,
                    secondary: secondary,
                    isLight: isLight,
                  ),
                  _buildSubmitCaseTab(
                    card: card,
                    accent: accent,
                    textColor: textColor,
                    secondary: secondary,
                  ),
                  _buildCoinStatusTab(
                    card: card,
                    accent: accent,
                    textColor: textColor,
                    secondary: secondary,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHelpCenterTab({
    required BuildContext context,
    required Color card,
    required Color accent,
    required Color textColor,
    required Color secondary,
    required bool isLight,
  }) {
    final filtered = _filteredArticles();
    final Map<String, List<SupportHelpArticle>> grouped =
        <String, List<SupportHelpArticle>>{};
    for (final item in filtered) {
      grouped
          .putIfAbsent(item.category, () => <SupportHelpArticle>[])
          .add(item);
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: card,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isLight
                  ? const Color(0xFFD8DFEB)
                  : const Color(0xFF262626),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: _helpSearchController,
                decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.search_rounded),
                  hintText: 'Need help? Ask me anything',
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  FilledButton.icon(
                    onPressed: () =>
                        DefaultTabController.of(context).animateTo(1),
                    style: FilledButton.styleFrom(
                      backgroundColor: accent,
                      foregroundColor: Colors.black,
                    ),
                    icon: const Icon(Icons.support_agent_outlined, size: 16),
                    label: const Text('Submit Case'),
                  ),
                  OutlinedButton.icon(
                    onPressed: _openAiChat,
                    icon: const Icon(Icons.smart_toy_outlined, size: 16),
                    label: const Text('AI Support Chatbot'),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        Text(
          'Start Now',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: textColor,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: kHelpCenterMainCategories.map((topic) {
            final selected = topic == _selectedHelpTopic;
            return ChoiceChip(
              label: Text(topic, style: const TextStyle(fontSize: 12.4)),
              selected: selected,
              selectedColor: accent.withValues(alpha: 0.22),
              onSelected: (_) {
                setState(() {
                  _selectedHelpTopic = selected ? null : topic;
                });
              },
            );
          }).toList(),
        ),
        const SizedBox(height: 14),
        Text(
          'Top Articles',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: textColor,
          ),
        ),
        const SizedBox(height: 8),
        ...filtered.take(6).map((article) {
          final vote = _helpFeedback[article.id] ?? 0;
          final related = _relatedArticles(article);
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: card,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: isLight
                    ? const Color(0xFFD8DFEB)
                    : const Color(0xFF262626),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  article.title,
                  style: TextStyle(
                    fontSize: 15.2,
                    fontWeight: FontWeight.w700,
                    color: textColor,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _articleDescription(article),
                  style: TextStyle(fontSize: 12.8, color: secondary),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Text(
                      article.lastUpdated,
                      style: TextStyle(fontSize: 11.8, color: secondary),
                    ),
                    const Spacer(),
                    IconButton(
                      visualDensity: VisualDensity.compact,
                      onPressed: () =>
                          setState(() => _helpFeedback[article.id] = 1),
                      icon: Icon(
                        vote == 1
                            ? Icons.thumb_up_alt
                            : Icons.thumb_up_alt_outlined,
                        size: 18,
                        color: vote == 1 ? accent : secondary,
                      ),
                    ),
                    IconButton(
                      visualDensity: VisualDensity.compact,
                      onPressed: () =>
                          setState(() => _helpFeedback[article.id] = -1),
                      icon: Icon(
                        vote == -1
                            ? Icons.thumb_down_alt
                            : Icons.thumb_down_alt_outlined,
                        size: 18,
                        color: vote == -1 ? const Color(0xFFEF4E5E) : secondary,
                      ),
                    ),
                  ],
                ),
                if (related.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: related.map((item) {
                      return ActionChip(
                        label: Text(
                          item.title,
                          style: const TextStyle(fontSize: 11.6),
                        ),
                        onPressed: () {
                          showModalBottomSheet<void>(
                            context: context,
                            backgroundColor: isLight
                                ? Colors.white
                                : const Color(0xFF141414),
                            showDragHandle: true,
                            builder: (_) => Padding(
                              padding: const EdgeInsets.fromLTRB(16, 8, 16, 18),
                              child: SingleChildScrollView(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item.title,
                                      style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w700,
                                        color: textColor,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      item.body,
                                      style: TextStyle(
                                        fontSize: 13.5,
                                        color: secondary,
                                        height: 1.5,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      );
                    }).toList(),
                  ),
                ],
              ],
            ),
          );
        }),
        const SizedBox(height: 4),
        Text(
          'All Topics',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: textColor,
          ),
        ),
        const SizedBox(height: 8),
        ...grouped.entries.map((entry) {
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            decoration: BoxDecoration(
              color: card,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isLight
                    ? const Color(0xFFD8DFEB)
                    : const Color(0xFF262626),
              ),
            ),
            child: ExpansionTile(
              title: Text(
                entry.key,
                style: TextStyle(fontSize: 14.2, color: textColor),
              ),
              children: entry.value.map((article) {
                return ListTile(
                  dense: true,
                  title: Text(
                    article.title,
                    style: TextStyle(fontSize: 12.8, color: textColor),
                  ),
                  subtitle: Text(
                    _articleDescription(article),
                    style: TextStyle(fontSize: 11.8, color: secondary),
                  ),
                  trailing: Icon(Icons.chevron_right_rounded, color: secondary),
                  onTap: () {
                    showModalBottomSheet<void>(
                      context: context,
                      backgroundColor: isLight
                          ? Colors.white
                          : const Color(0xFF141414),
                      showDragHandle: true,
                      isScrollControlled: true,
                      builder: (_) => FractionallySizedBox(
                        heightFactor: 0.86,
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                          child: SingleChildScrollView(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  article.title,
                                  style: TextStyle(
                                    fontSize: 19,
                                    fontWeight: FontWeight.w700,
                                    color: textColor,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  article.body,
                                  style: TextStyle(
                                    fontSize: 13.8,
                                    color: secondary,
                                    height: 1.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                );
              }).toList(),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildSubmitCaseTab({
    required Color card,
    required Color accent,
    required Color textColor,
    required Color secondary,
  }) {
    final categories = kSubmitCaseSubcategories.keys.toList();
    final subcategories = _selectedCaseCategory == null
        ? const <String>[]
        : kSubmitCaseSubcategories[_selectedCaseCategory!] ?? const <String>[];

    return ValueListenableBuilder<List<SubmittedSupportTicket>>(
      valueListenable: submittedSupportTicketsNotifier,
      builder: (context, tickets, child) {
        return ListView(
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0x33F7A600),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0x88F7A600)),
              ),
              child: const Text(
                'We are currently experiencing a large volume of inquiries. '
                'To facilitate faster responses please check the help center first.',
                style: TextStyle(fontSize: 12.8, fontWeight: FontWeight.w600),
              ),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _selectedCaseCategory,
              decoration: const InputDecoration(labelText: 'Category'),
              items: categories
                  .map(
                    (item) => DropdownMenuItem(value: item, child: Text(item)),
                  )
                  .toList(),
              onChanged: (value) {
                setState(() {
                  _selectedCaseCategory = value;
                  _selectedCaseSubCategory = null;
                  _selectedDisputeStatus = null;
                  _showSubmitForm = false;
                });
              },
            ),
            const SizedBox(height: 10),
            if (_selectedCaseCategory != null)
              DropdownButtonFormField<String>(
                initialValue: _selectedCaseSubCategory,
                decoration: const InputDecoration(labelText: 'Subcategory'),
                items: subcategories
                    .map(
                      (item) =>
                          DropdownMenuItem(value: item, child: Text(item)),
                    )
                    .toList(),
                onChanged: (value) {
                  setState(() {
                    _selectedCaseSubCategory = value;
                    _selectedDisputeStatus = null;
                    _showSubmitForm = false;
                  });
                },
              ),
            if (_requiresDisputeStatus()) ...[
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: _selectedDisputeStatus,
                decoration: const InputDecoration(labelText: 'Dispute status'),
                items: kP2PDisputeStatuses
                    .map(
                      (item) =>
                          DropdownMenuItem(value: item, child: Text(item)),
                    )
                    .toList(),
                onChanged: (value) =>
                    setState(() => _selectedDisputeStatus = value),
              ),
            ],
            if (_selectedCaseSubCategory != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF7A600).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0x88F7A600)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _tipText(),
                      style: TextStyle(
                        fontSize: 12.5,
                        color: secondary,
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: 10),
                    FilledButton(
                      onPressed: () => setState(() => _showSubmitForm = true),
                      style: FilledButton.styleFrom(
                        backgroundColor: accent,
                        foregroundColor: Colors.black,
                      ),
                      child: const Text('Yes – Submit Request'),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: card,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF262626)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'P2P Order Query',
                    style: TextStyle(
                      fontSize: 13.8,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _orderLookupController,
                          decoration: const InputDecoration(
                            hintText: 'Search by Order ID',
                            isDense: true,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton(
                        onPressed: _searchOrderById,
                        child: const Text('Search'),
                      ),
                    ],
                  ),
                  if (_lookedUpOrder != null) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0x1A16A7C8),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Order ID: ${_lookedUpOrder!.id}',
                            style: TextStyle(color: textColor, fontSize: 12.4),
                          ),
                          Text(
                            'Amount: ${_lookedUpOrder!.amount}',
                            style: TextStyle(color: secondary, fontSize: 12),
                          ),
                          Text(
                            'Buyer/Seller: ${_lookedUpOrder!.counterparty}',
                            style: TextStyle(color: secondary, fontSize: 12),
                          ),
                          Text(
                            'Order Status: ${_lookedUpOrder!.status}',
                            style: const TextStyle(
                              color: Color(0xFF16A7C8),
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            children: [
                              OutlinedButton(
                                onPressed: () {},
                                child: const Text('View Order'),
                              ),
                              OutlinedButton(
                                onPressed: () => setState(() {
                                  _selectedCaseCategory = 'P2P Trading';
                                  _selectedCaseSubCategory =
                                      'Appeal in progress';
                                  _showSubmitForm = true;
                                }),
                                child: const Text('Open Dispute'),
                              ),
                              OutlinedButton(
                                onPressed: _openAiChat,
                                child: const Text('Contact Merchant'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (_showSubmitForm) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: card,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF262626)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Submit Support Ticket',
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _uidController,
                      decoration: const InputDecoration(labelText: 'User UID'),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _emailController,
                      decoration: const InputDecoration(
                        labelText: 'Email Address',
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _orderIdController,
                      decoration: const InputDecoration(labelText: 'Order ID'),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _subjectController,
                      decoration: const InputDecoration(labelText: 'Subject'),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _descriptionController,
                      minLines: 4,
                      maxLines: 6,
                      decoration: const InputDecoration(
                        labelText: 'Description',
                      ),
                    ),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(10),
                        color: const Color(0x14000000),
                        border: Border.all(color: const Color(0x3FFFFFFF)),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              _attachmentFile == null
                                  ? 'Attachments: PDF, PNG, JPG, JPEG, MP4'
                                  : 'Attachment: ${_attachmentFile!.name}',
                              style: TextStyle(
                                fontSize: 11.8,
                                color: secondary,
                              ),
                            ),
                          ),
                          OutlinedButton(
                            onPressed: _pickSupportAttachment,
                            child: const Text('Attach'),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: _submitSupportTicket,
                        style: FilledButton.styleFrom(
                          backgroundColor: accent,
                          foregroundColor: Colors.black,
                        ),
                        child: const Text('Submit Ticket'),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            if (tickets.isNotEmpty) ...[
              const SizedBox(height: 14),
              Text(
                'Recent Tickets',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: textColor,
                ),
              ),
              const SizedBox(height: 8),
              ...tickets.take(8).map((ticket) {
                final created =
                    '${ticket.createdAt.year}-${ticket.createdAt.month.toString().padLeft(2, '0')}-${ticket.createdAt.day.toString().padLeft(2, '0')} '
                    '${ticket.createdAt.hour.toString().padLeft(2, '0')}:${ticket.createdAt.minute.toString().padLeft(2, '0')}';
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: card,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF262626)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        ticket.ticketId,
                        style: TextStyle(
                          fontSize: 12.6,
                          fontWeight: FontWeight.w700,
                          color: accent,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '${ticket.category} • ${ticket.subcategory}',
                        style: TextStyle(fontSize: 12, color: textColor),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${ticket.status} • $created',
                        style: TextStyle(fontSize: 11.4, color: secondary),
                      ),
                    ],
                  ),
                );
              }),
            ],
          ],
        );
      },
    );
  }

  Widget _buildCoinStatusTab({
    required Color card,
    required Color accent,
    required Color textColor,
    required Color secondary,
  }) {
    final query = _coinSearch.toLowerCase();
    final rows = kCoinServiceStatuses.where((coin) {
      final suspended = !coin.depositEnabled || !coin.withdrawEnabled;
      final matchesSearch =
          query.isEmpty ||
          coin.symbol.toLowerCase().contains(query) ||
          coin.name.toLowerCase().contains(query);
      if (!matchesSearch) return false;
      if (_showOnlySuspendedCoins && !suspended) return false;
      if (_hideSuspendedDeposits && !coin.depositEnabled) return false;
      return true;
    }).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
      children: [
        TextField(
          controller: _coinSearchController,
          decoration: const InputDecoration(
            prefixIcon: Icon(Icons.search_rounded),
            hintText: 'Search coin status',
          ),
        ),
        const SizedBox(height: 10),
        SwitchListTile.adaptive(
          value: _hideSuspendedDeposits,
          onChanged: (v) => setState(() => _hideSuspendedDeposits = v),
          title: const Text(
            'Hide coins with suspended deposits',
            style: TextStyle(fontSize: 12.4),
          ),
          contentPadding: EdgeInsets.zero,
        ),
        SwitchListTile.adaptive(
          value: _showOnlySuspendedCoins,
          onChanged: (v) => setState(() => _showOnlySuspendedCoins = v),
          title: const Text(
            'Show only coins with suspended deposits',
            style: TextStyle(fontSize: 12.4),
          ),
          contentPadding: EdgeInsets.zero,
        ),
        const SizedBox(height: 8),
        ...rows.map((coin) {
          final depositLabel = coin.depositEnabled
              ? 'Deposit: ON'
              : 'Deposit: OFF';
          final withdrawLabel = coin.withdrawEnabled
              ? 'Withdraw: ON'
              : 'Withdraw: OFF';
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            decoration: BoxDecoration(
              color: card,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF262626)),
            ),
            child: ExpansionTile(
              title: Text(
                '${coin.symbol} • ${coin.name}',
                style: TextStyle(fontSize: 14, color: textColor),
              ),
              subtitle: Text(
                coin.networkStatus,
                style: TextStyle(fontSize: 11.8, color: secondary),
              ),
              trailing: const Icon(Icons.expand_more_rounded),
              childrenPadding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: coin.depositEnabled
                            ? const Color(0x1A53D983)
                            : const Color(0x1AEF4E5E),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        depositLabel,
                        style: TextStyle(
                          color: coin.depositEnabled
                              ? const Color(0xFF53D983)
                              : const Color(0xFFEF4E5E),
                          fontSize: 11.3,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: coin.withdrawEnabled
                            ? const Color(0x1A53D983)
                            : const Color(0x1AEF4E5E),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        withdrawLabel,
                        style: TextStyle(
                          color: coin.withdrawEnabled
                              ? const Color(0xFF53D983)
                              : const Color(0xFFEF4E5E),
                          fontSize: 11.3,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Maintenance Alert: ${coin.maintenanceAlert}',
                  style: TextStyle(fontSize: 12, color: secondary),
                ),
                const SizedBox(height: 8),
                ...coin.networks.map((network) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 6),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0x12000000),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0x2FFFFFFF)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${network.code} • ${network.display}',
                          style: TextStyle(
                            fontSize: 12.4,
                            color: textColor,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Fee: ${network.feeUsdt} USDT  |  Min deposit: ${network.minDepositUsdt}  |  ETA: ${network.arrival}',
                          style: TextStyle(fontSize: 11.5, color: secondary),
                        ),
                      ],
                    ),
                  );
                }),
                const SizedBox(height: 4),
                Row(
                  children: [
                    OutlinedButton(
                      onPressed: _openAiChat,
                      child: const Text('Report issue'),
                    ),
                    const SizedBox(width: 8),
                    FilledButton(
                      onPressed: () {},
                      style: FilledButton.styleFrom(
                        backgroundColor: accent,
                        foregroundColor: Colors.black,
                      ),
                      child: const Text('Got it'),
                    ),
                  ],
                ),
              ],
            ),
          );
        }),
      ],
    );
  }
}

class SupportHomePage extends StatefulWidget {
  const SupportHomePage({super.key});

  @override
  State<SupportHomePage> createState() => _SupportHomePageState();
}

class _SupportHomePageState extends State<SupportHomePage> {
  static const Map<String, List<String>> _faqByCategory =
      <String, List<String>>{
        'Event & Bonus': <String>[
          "Why can't I join token splash?",
          "I didn't receive my rewards",
          'How does reward distribution work?',
          'Where can I find promotion rules?',
        ],
        'Account & Identity Verification': <String>[
          'KYC verification problems',
          'Verification code not received',
          'Why is my account restricted?',
          'How to reset security settings?',
        ],
        'P2P Trading': <String>[
          'P2P order issue',
          'How to open P2P appeal?',
          'Unable to post P2P advertisement',
          'Merchant completion rate appeal',
        ],
        'Crypto Deposit & Withdrawal': <String>[
          'How can I deposit crypto?',
          'Crypto deposit not credited',
          'How to submit a withdrawal?',
          'Why is withdrawal delayed?',
        ],
        'Trading Issues': <String>[
          "Why can't I trade?",
          'Order failed or pending',
          'Futures risk limit reached',
          'Spot order not executing',
        ],
        'Security Issues': <String>[
          'Anti-phishing setup',
          'Device risk warning',
          '2FA reset request',
          'Suspicious login alert',
        ],
      };

  late String _selectedCategory = _faqByCategory.keys.first;

  Future<void> _openNoticeModal() async {
    final bool isLight = Theme.of(context).brightness == Brightness.light;
    bool doNotShow = false;
    await showDialog<void>(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setInnerState) {
            return AlertDialog(
              backgroundColor: isLight ? Colors.white : const Color(0xFF141414),
              title: const Text('Important Notice'),
              content: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'Temporary Suspension of Selected Fiat Services',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'SEPA Beneficiary Details Change:\n'
                      '1) Check latest bank details before transfer.\n'
                      '2) Old beneficiary routes are disabled.\n'
                      '3) Contact support if transfer is pending for 24h+.',
                    ),
                    const SizedBox(height: 10),
                    CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      value: doNotShow,
                      onChanged: (v) =>
                          setInnerState(() => doNotShow = v ?? false),
                      title: const Text(
                        "Don't show again for the next 24 hours",
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                FilledButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFFF7A600),
                    foregroundColor: Colors.black,
                  ),
                  child: const Text('Got It'),
                ),
              ],
            );
          },
        );
      },
    );
    if (doNotShow) {
      _announcementDismissedUntil = DateTime.now().add(
        const Duration(hours: 24),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool isLight = Theme.of(context).brightness == Brightness.light;
    final Color bg = isLight
        ? const Color(0xFFF5F7FB)
        : const Color(0xFF0B0B0F);
    final Color card = isLight ? Colors.white : const Color(0xFF141414);
    final Color textColor = isLight ? const Color(0xFF11131A) : Colors.white;
    final Color secondary = isLight
        ? const Color(0xFF667085)
        : const Color(0xFFA0A0A0);
    final Color border = isLight
        ? const Color(0xFFD7DEEA)
        : const Color(0xFF262626);
    const accent = Color(0xFFF7A600);
    final List<String> questions =
        _faqByCategory[_selectedCategory] ?? const <String>[];

    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(
        title: const Text('24/7 Dedicated Support'),
        actions: [
          IconButton(
            tooltip: 'Language',
            onPressed: () {},
            icon: const Icon(Icons.language_rounded),
          ),
          IconButton(
            tooltip: 'Exit',
            onPressed: () => Navigator.of(context).maybePop(),
            icon: const Icon(Icons.power_settings_new_rounded),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 14),
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: card,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const CircleAvatar(
                      radius: 18,
                      backgroundColor: Color(0xFFF7A600),
                      child: Icon(
                        Icons.smart_toy_outlined,
                        color: Colors.black,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        "Hello there! I'm Bitebot, how can I assist you today?",
                        style: TextStyle(
                          fontSize: 13.5,
                          color: secondary,
                          height: 1.35,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const ChatSupportPage(),
                      ),
                    ),
                    style: FilledButton.styleFrom(
                      backgroundColor: accent,
                      foregroundColor: Colors.black,
                    ),
                    child: const Text('Start Asking'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: _openNoticeModal,
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: card,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: border),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              'Important Notice',
                              style: TextStyle(
                                fontSize: 14.6,
                                fontWeight: FontWeight.w700,
                                color: textColor,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: accent.withValues(alpha: 0.22),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: const Text(
                                'NEW',
                                style: TextStyle(
                                  color: Color(0xFFF7A600),
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Temporary Suspension of Selected Fiat Services\nSEPA Beneficiary Details Change',
                          style: TextStyle(
                            fontSize: 12.4,
                            color: secondary,
                            height: 1.4,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right_rounded, color: secondary),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: card,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Action Required',
                  style: TextStyle(
                    fontSize: 14.6,
                    fontWeight: FontWeight.w700,
                    color: textColor,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Identity Verification',
                  style: TextStyle(
                    fontSize: 13.4,
                    fontWeight: FontWeight.w600,
                    color: textColor,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Advanced Verification Failed\nReason: Unaccepted proof of address',
                  style: TextStyle(
                    fontSize: 12.3,
                    color: secondary,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const SubmitCasePage(),
                    ),
                  ),
                  child: const Text('Quick Fixes'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'FAQ',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: textColor,
            ),
          ),
          const SizedBox(height: 8),
          LayoutBuilder(
            builder: (context, constraints) {
              final isCompact = constraints.maxWidth < 680;
              final categories = _faqByCategory.keys.toList();
              final leftPane = Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: card,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: categories.map((cat) {
                    final active = cat == _selectedCategory;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 7),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(10),
                        onTap: () => setState(() => _selectedCategory = cat),
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 9,
                          ),
                          decoration: BoxDecoration(
                            color: active
                                ? accent.withValues(alpha: 0.16)
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            cat,
                            style: TextStyle(
                              fontSize: 12.3,
                              color: active ? accent : textColor,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              );

              final rightPane = Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: card,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ...questions.map((q) {
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        dense: true,
                        title: Text(
                          q,
                          style: TextStyle(fontSize: 13, color: textColor),
                        ),
                        trailing: Icon(
                          Icons.chevron_right_rounded,
                          color: secondary,
                        ),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => const FAQPage(),
                          ),
                        ),
                      );
                    }),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: () => Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => const FAQPage(),
                          ),
                        ),
                        child: const Text('View All'),
                      ),
                    ),
                  ],
                ),
              );

              if (isCompact) {
                return Column(
                  children: [leftPane, const SizedBox(height: 8), rightPane],
                );
              }
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(width: 240, child: leftPane),
                  const SizedBox(width: 8),
                  Expanded(child: rightPane),
                ],
              );
            },
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilledButton.icon(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const SubmitCasePage(),
                  ),
                ),
                style: FilledButton.styleFrom(
                  backgroundColor: accent,
                  foregroundColor: Colors.black,
                ),
                icon: const Icon(Icons.assignment_outlined),
                label: const Text('Submit Case'),
              ),
              OutlinedButton.icon(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const CryptoStatusPage(),
                  ),
                ),
                icon: const Icon(Icons.storage_outlined),
                label: const Text('Crypto Status'),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: card,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: border),
            ),
            child: Column(
              children: [
                const _ExchangeLogoGlyph(size: 28, glowStrength: 0.35),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  alignment: WrapAlignment.center,
                  children: const [
                    Icon(Icons.facebook_rounded, size: 18),
                    Icon(Icons.alternate_email_rounded, size: 18),
                    Icon(Icons.camera_alt_outlined, size: 18),
                    Icon(Icons.play_circle_outline_rounded, size: 18),
                    Icon(Icons.business_center_outlined, size: 18),
                    Icon(Icons.send_rounded, size: 18),
                    Icon(Icons.forum_outlined, size: 18),
                    Icon(Icons.sports_esports_outlined, size: 18),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class ChatSupportPage extends StatelessWidget {
  const ChatSupportPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const SupportBotPage();
  }
}

class SubmitCasePage extends StatelessWidget {
  const SubmitCasePage({super.key});

  @override
  Widget build(BuildContext context) {
    return const HelpCenterHubPage(initialTab: 1);
  }
}

class CryptoStatusPage extends StatelessWidget {
  const CryptoStatusPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const HelpCenterHubPage(initialTab: 2);
  }
}

class FAQPage extends StatelessWidget {
  const FAQPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const HelpCenterHubPage(initialTab: 0);
  }
}

class SupportModerationPanelPage extends StatefulWidget {
  const SupportModerationPanelPage({super.key});

  @override
  State<SupportModerationPanelPage> createState() =>
      _SupportModerationPanelPageState();
}

class _SupportModerationPanelPageState
    extends State<SupportModerationPanelPage> {
  final TextEditingController _announcementController = TextEditingController(
    text:
        'Scheduled maintenance: Fiat services temporarily paused from 02:00 - 02:30 UTC.',
  );

  @override
  void dispose() {
    _announcementController.dispose();
    super.dispose();
  }

  void _approveKyc() {
    _setKycStatus('verified');
    _syncActiveUserState(kycStatus: 'verified', canPostAds: true);
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('KYC approved')));
    setState(() {});
  }

  void _rejectKyc() {
    _setKycStatus('rejected');
    _syncActiveUserState(kycStatus: 'rejected', canPostAds: false);
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('KYC rejected')));
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final bool isLight = Theme.of(context).brightness == Brightness.light;
    final Color card = isLight ? Colors.white : const Color(0xFF141414);
    final Color secondary = isLight
        ? const Color(0xFF6A7282)
        : const Color(0xFFA0A0A0);
    final Color textColor = isLight ? const Color(0xFF10131A) : Colors.white;
    final p2pDisputes = p2pOrdersNotifier.value
        .where(
          (order) =>
              order.orderState == P2POrderState.appealOpened ||
              order.orderState == P2POrderState.underReview,
        )
        .toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Admin Moderation Panel')),
      body: ValueListenableBuilder<List<SubmittedSupportTicket>>(
        valueListenable: submittedSupportTicketsNotifier,
        builder: (context, tickets, child) {
          return ListView(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
            children: [
              Text(
                'Support Tickets',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: textColor,
                ),
              ),
              const SizedBox(height: 8),
              if (tickets.isEmpty)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: card,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF262626)),
                  ),
                  child: Text(
                    'No support tickets yet.',
                    style: TextStyle(color: secondary),
                  ),
                ),
              ...tickets.take(15).map((ticket) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: card,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF262626)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        ticket.ticketId,
                        style: const TextStyle(
                          fontSize: 12.8,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        ticket.subject,
                        style: TextStyle(fontSize: 12.8, color: textColor),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${ticket.category} • ${ticket.subcategory}',
                        style: TextStyle(fontSize: 11.8, color: secondary),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        children: [
                          OutlinedButton(
                            onPressed: () {},
                            child: const Text('Respond'),
                          ),
                          OutlinedButton(
                            onPressed: () {},
                            child: const Text('Resolve'),
                          ),
                          OutlinedButton(
                            onPressed: () {},
                            child: const Text('Escalate'),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              }),
              const SizedBox(height: 14),
              Text(
                'P2P Disputes',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: textColor,
                ),
              ),
              const SizedBox(height: 8),
              ...p2pDisputes.map((order) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: card,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF262626)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${order.id} • ${order.pair}',
                        style: const TextStyle(
                          fontSize: 12.8,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        'Status: ${order.status}',
                        style: TextStyle(fontSize: 11.8, color: secondary),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        children: [
                          OutlinedButton(
                            onPressed: () {},
                            child: const Text('Release Crypto'),
                          ),
                          OutlinedButton(
                            onPressed: () {},
                            child: const Text('Return to Seller'),
                          ),
                          OutlinedButton(
                            onPressed: () {},
                            child: const Text('Freeze Order'),
                          ),
                          OutlinedButton(
                            onPressed: () {},
                            child: const Text('Ban User'),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              }),
              const SizedBox(height: 14),
              Text(
                'Coin Deposit/Withdraw Controls',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: textColor,
                ),
              ),
              const SizedBox(height: 8),
              ...kCoinServiceStatuses.map((coin) {
                return SwitchListTile.adaptive(
                  value: coin.depositEnabled && coin.withdrawEnabled,
                  onChanged: (_) {},
                  title: Text(
                    '${coin.symbol} • ${coin.name}',
                    style: const TextStyle(fontSize: 13),
                  ),
                  subtitle: Text(
                    coin.networkStatus,
                    style: TextStyle(fontSize: 11.8, color: secondary),
                  ),
                  contentPadding: EdgeInsets.zero,
                );
              }),
              const SizedBox(height: 10),
              Text(
                'KYC Moderation',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: textColor,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: card,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF262626)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Current KYC status: ${kycStatusNotifier.value.toUpperCase()}',
                      style: const TextStyle(
                        fontSize: 13.2,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Approve to enable ad posting for verified users.',
                      style: TextStyle(fontSize: 11.8, color: secondary),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: [
                        OutlinedButton(
                          onPressed: _approveKyc,
                          child: const Text('Approve'),
                        ),
                        OutlinedButton(
                          onPressed: _rejectKyc,
                          child: const Text('Reject'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              Text(
                'System Announcement',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: textColor,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _announcementController,
                minLines: 2,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Announcement message',
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Announcement sent to users'),
                      ),
                    );
                  },
                  child: const Text('Send Announcement'),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _SupportMessage {
  const _SupportMessage({
    required this.role,
    required this.text,
    required this.time,
  });

  final String role;
  final String text;
  final DateTime time;
}

class _SupportTicket {
  const _SupportTicket({
    required this.id,
    required this.reason,
    required this.status,
    required this.createdAt,
    required this.alertId,
  });

  final String id;
  final String reason;
  final String status;
  final DateTime createdAt;
  final int alertId;
}

class _PostAdDraft {
  const _PostAdDraft({
    required this.side,
    required this.pair,
    required this.price,
    required this.limits,
    required this.available,
    required this.paymentMethods,
  });

  final String side;
  final String pair;
  final String price;
  final String limits;
  final String available;
  final List<String> paymentMethods;
}

class P2PPostAdPage extends StatefulWidget {
  const P2PPostAdPage({super.key});

  @override
  State<P2PPostAdPage> createState() => _P2PPostAdPageState();
}

class _P2PPostAdPageState extends State<P2PPostAdPage> {
  int _step = 1;
  String _side = 'buy';
  String _asset = 'USDT';
  String _fiat = 'INR';
  String _priceType = 'Fixed';
  final TextEditingController _priceController = TextEditingController(
    text: '91.63',
  );
  final TextEditingController _minController = TextEditingController(
    text: '500',
  );
  final TextEditingController _maxController = TextEditingController(
    text: '5500',
  );
  final TextEditingController _availableController = TextEditingController(
    text: '200.00',
  );
  final TextEditingController _paymentController = TextEditingController(
    text: 'UPI, Paytm, IMPS',
  );
  final TextEditingController _conditionsController = TextEditingController(
    text: 'Payment should be from verified account only.',
  );
  final TextEditingController _remarksController = TextEditingController();

  @override
  void dispose() {
    _priceController.dispose();
    _minController.dispose();
    _maxController.dispose();
    _availableController.dispose();
    _paymentController.dispose();
    _conditionsController.dispose();
    _remarksController.dispose();
    super.dispose();
  }

  void _changePrice(double delta) {
    final current = double.tryParse(_priceController.text.trim()) ?? 0;
    final next = (current + delta).clamp(1, 100000);
    setState(() => _priceController.text = next.toStringAsFixed(2));
  }

  void _next() {
    if (_step < 3) {
      setState(() => _step += 1);
      return;
    }
    final methods = _paymentController.text
        .split(',')
        .map((item) => item.trim())
        .where((item) => item.isNotEmpty)
        .toList();
    final draft = _PostAdDraft(
      side: _side,
      pair: '${_asset.toUpperCase()}/${_fiat.toUpperCase()}',
      price: '${_priceController.text.trim()} ${_fiat.toUpperCase()}',
      limits:
          '${_minController.text.trim()} - ${_maxController.text.trim()} ${_fiat.toUpperCase()}',
      available: '${_availableController.text.trim()} ${_asset.toUpperCase()}',
      paymentMethods: methods.isEmpty ? const ['UPI'] : methods,
    );
    Navigator.of(context).pop(draft);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Post Ad'),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 10),
            child: Icon(Icons.help_outline, size: 20),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 6),
            child: Column(
              children: [
                Row(
                  children: List.generate(3, (index) {
                    final stepNo = index + 1;
                    final active = _step == stepNo;
                    final done = _step > stepNo;
                    return Expanded(
                      child: Row(
                        children: [
                          Container(
                            width: 22,
                            height: 22,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: active || done
                                  ? const Color(0xFFF1CB3E)
                                  : const Color(0xFF293146),
                              shape: BoxShape.circle,
                            ),
                            child: Text(
                              '$stepNo',
                              style: TextStyle(
                                fontSize: 11.2,
                                color: active || done
                                    ? Colors.black
                                    : Colors.white70,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          if (index != 2)
                            Expanded(
                              child: Container(
                                height: 2,
                                color: _step > stepNo
                                    ? const Color(0xFFF1CB3E)
                                    : const Color(0xFF293146),
                              ),
                            ),
                        ],
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 8),
                const Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Set Type & Price',
                        style: TextStyle(fontSize: 10.6),
                      ),
                    ),
                    Expanded(
                      child: Text(
                        'Set Amount & Method',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 10.6, color: Colors.white70),
                      ),
                    ),
                    Expanded(
                      child: Text(
                        'Set Conditions',
                        textAlign: TextAlign.right,
                        style: TextStyle(fontSize: 10.6, color: Colors.white70),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(14),
              children: [
                if (_step == 1) ...[
                  const Text(
                    'I want to',
                    style: TextStyle(fontSize: 16.5, color: Colors.white70),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: ChoiceChip(
                          label: const Text('Buy'),
                          selected: _side == 'buy',
                          onSelected: (_) => setState(() => _side = 'buy'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ChoiceChip(
                          label: const Text('Sell'),
                          selected: _side == 'sell',
                          onSelected: (_) => setState(() => _side = 'sell'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: _asset,
                          decoration: const InputDecoration(labelText: 'Asset'),
                          items: const [
                            DropdownMenuItem(
                              value: 'USDT',
                              child: Text('USDT'),
                            ),
                            DropdownMenuItem(value: 'BTC', child: Text('BTC')),
                            DropdownMenuItem(value: 'ETH', child: Text('ETH')),
                          ],
                          onChanged: (value) {
                            if (value == null) return;
                            setState(() => _asset = value);
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: _fiat,
                          decoration: const InputDecoration(
                            labelText: 'With fiat',
                          ),
                          items: const [
                            DropdownMenuItem(value: 'INR', child: Text('INR')),
                            DropdownMenuItem(value: 'USD', child: Text('USD')),
                          ],
                          onChanged: (value) {
                            if (value == null) return;
                            setState(() => _fiat = value);
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: _priceType,
                    decoration: const InputDecoration(labelText: 'Price Type'),
                    items: const [
                      DropdownMenuItem(value: 'Fixed', child: Text('Fixed')),
                      DropdownMenuItem(
                        value: 'Floating',
                        child: Text('Floating'),
                      ),
                    ],
                    onChanged: (value) {
                      if (value == null) return;
                      setState(() => _priceType = value);
                    },
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F1627),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF24324A)),
                    ),
                    child: Row(
                      children: [
                        IconButton(
                          onPressed: () => _changePrice(-0.10),
                          icon: const Icon(Icons.remove),
                        ),
                        Expanded(
                          child: TextField(
                            controller: _priceController,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            textAlign: TextAlign.center,
                            decoration: const InputDecoration(
                              border: InputBorder.none,
                              isDense: true,
                            ),
                          ),
                        ),
                        IconButton(
                          onPressed: () => _changePrice(0.10),
                          icon: const Icon(Icons.add),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Your Price  ₹${_priceController.text.trim()}',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ] else if (_step == 2) ...[
                  TextField(
                    controller: _minController,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration: const InputDecoration(labelText: 'Min Limit'),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _maxController,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration: const InputDecoration(labelText: 'Max Limit'),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _availableController,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration: const InputDecoration(
                      labelText: 'Available Quantity',
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _paymentController,
                    decoration: const InputDecoration(
                      labelText: 'Payment Methods (comma separated)',
                    ),
                  ),
                ] else ...[
                  TextField(
                    controller: _conditionsController,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'Trading conditions',
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _remarksController,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'Remark for counterparty (optional)',
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10192B),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF24324A)),
                    ),
                    child: const Text(
                      'Tip: Keep payment details accurate and avoid third-party transfers.',
                      style: TextStyle(fontSize: 11.2, color: Colors.white70),
                    ),
                  ),
                ],
              ],
            ),
          ),
          SafeArea(
            top: false,
            minimum: const EdgeInsets.fromLTRB(14, 8, 14, 14),
            child: SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _next,
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFFF1CB3E),
                  foregroundColor: Colors.black,
                  minimumSize: const Size.fromHeight(50),
                ),
                child: Text(
                  _step == 3 ? 'Publish Ad' : 'Next',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

enum _P2PTab { p2p, orders, ads, profile }

class P2PPage extends StatefulWidget {
  const P2PPage({
    super.key,
    this.startInOrders = false,
    this.startInAds = false,
  });

  final bool startInOrders;
  final bool startInAds;

  @override
  State<P2PPage> createState() => _P2PPageState();
}

class _P2PPageState extends State<P2PPage> {
  _P2PTab _activeTab = _P2PTab.p2p;
  List<P2PAdItem> _ads = List<P2PAdItem>.from(p2pMarketplaceAdsNotifier.value);
  List<P2POrderItem> _orders = List<P2POrderItem>.from(p2pOrdersNotifier.value);
  String _orderPrimaryTab = 'ONGOING';
  String _orderSecondaryTab = 'ALL';
  String _adType = 'sell';
  String _marketMainTab = 'BUY';
  String _marketCrypto = 'USDT';
  String _marketCurrency = 'INR';
  String _amountFilter = 'Any Amount';
  String _marketPaymentFilter = 'All Payment Methods';
  final bool _marketPaused = false;
  int _nextOrderNumber = 104500;
  final String _buyerUid = currentUserUid;
  final String _sessionIp = '103.42.19.${28 + Random().nextInt(180)}';
  final P2PApiService _api = P2PApiService();
  final Random _rng = Random();
  final List<P2PAdminLog> _adminLogs = <P2PAdminLog>[];
  final List<P2PAppealTicket> _appeals = <P2PAppealTicket>[];
  final Set<String> _bannedMerchants = <String>{};
  Timer? _offerTicker;

  final TextEditingController _adPairController = TextEditingController(
    text: 'USDT/INR',
  );
  final TextEditingController _adPriceController = TextEditingController(
    text: '89.20 INR',
  );
  final TextEditingController _adLimitsController = TextEditingController(
    text: '5,000 - 50,000 INR',
  );
  final TextEditingController _adAvailableController = TextEditingController(
    text: '8,000 USDT',
  );
  final TextEditingController _adPaymentController = TextEditingController(
    text: 'UPI, IMPS',
  );

  @override
  void initState() {
    super.initState();
    _ads = List<P2PAdItem>.from(p2pMarketplaceAdsNotifier.value);
    _orders = List<P2POrderItem>.from(p2pOrdersNotifier.value);
    p2pMarketplaceAdsNotifier.addListener(_syncAdsFromNotifier);
    p2pOrdersNotifier.addListener(_syncOrdersFromNotifier);
    if (widget.startInOrders) {
      _activeTab = _P2PTab.orders;
    } else if (widget.startInAds) {
      _activeTab = _P2PTab.ads;
    }
    _orders = _orders
        .map(
          (order) => order.copyWith(
            status: p2pOrderStateLabel(order.orderState),
            createdAtMs: order.createdAtMs == 0
                ? DateTime.now().millisecondsSinceEpoch
                : order.createdAtMs,
            expiresAtMs: order.expiresAtMs == 0
                ? DateTime.now()
                      .add(const Duration(minutes: 10))
                      .millisecondsSinceEpoch
                : order.expiresAtMs,
          ),
        )
        .toList();
    _offerTicker = Timer.periodic(const Duration(seconds: 3), (_) {
      if (!mounted || _marketPaused) return;
      if (_activeTab != _P2PTab.p2p && _activeTab != _P2PTab.ads) {
        return;
      }
      setState(() {
        _ads = _ads.map((ad) {
          if (!ad.autoPriceEnabled) return ad;
          final base = ad.priceValue <= 0 ? 98 : ad.priceValue;
          final drift = (_rng.nextDouble() - 0.5) * 0.0045;
          final next = (base * (1 + drift)).clamp(base * 0.96, base * 1.04);
          return ad.copyWith(price: '${next.toStringAsFixed(2)} INR');
        }).toList();
      });
      _publishAds();
    });
  }

  @override
  void dispose() {
    _offerTicker?.cancel();
    p2pMarketplaceAdsNotifier.removeListener(_syncAdsFromNotifier);
    p2pOrdersNotifier.removeListener(_syncOrdersFromNotifier);
    _adPairController.dispose();
    _adPriceController.dispose();
    _adLimitsController.dispose();
    _adAvailableController.dispose();
    _adPaymentController.dispose();
    super.dispose();
  }

  void _syncAdsFromNotifier() {
    if (!mounted) return;
    setState(() {
      _ads = List<P2PAdItem>.from(p2pMarketplaceAdsNotifier.value);
    });
  }

  void _syncOrdersFromNotifier() {
    if (!mounted) return;
    setState(() {
      _orders = List<P2POrderItem>.from(p2pOrdersNotifier.value);
    });
  }

  void _publishAds() {
    p2pMarketplaceAdsNotifier.value = List<P2PAdItem>.from(_ads);
  }

  void _publishOrders() {
    p2pOrdersNotifier.value = List<P2POrderItem>.from(_orders);
  }

  void _appendAdminLog({
    required String action,
    required String target,
    required String meta,
  }) {
    _adminLogs.insert(
      0,
      P2PAdminLog(
        time: DateTime.now(),
        action: action,
        target: target,
        meta: meta,
      ),
    );
  }

  String _orderId() => 'P2P-${_nextOrderNumber++}';

  String _countdownFromMs(int expiryMs) {
    final left = expiryMs - DateTime.now().millisecondsSinceEpoch;
    if (left <= 0) return '00:00';
    final mins = (left ~/ 60000).toString().padLeft(2, '0');
    final sec = ((left % 60000) ~/ 1000).toString().padLeft(2, '0');
    return '$mins:$sec';
  }

  void _upsertOrder(P2POrderItem order) {
    final idx = _orders.indexWhere((element) => element.id == order.id);
    setState(() {
      if (idx < 0) {
        _orders = [order, ..._orders];
      } else {
        _orders[idx] = order;
      }
    });
    _publishOrders();
    if (order.orderState == P2POrderState.appealOpened &&
        order.appealProofPath != null &&
        order.disputeReason != null) {
      final already = _appeals.any((item) => item.orderId == order.id);
      if (!already) {
        _appeals.insert(
          0,
          P2PAppealTicket(
            orderId: order.id,
            buyer: order.buyerWallet,
            seller: order.counterparty,
            amount: '${order.fiatAmount.toStringAsFixed(2)} INR',
            paymentProofPath: order.appealProofPath!,
            appealReason: order.disputeReason!,
            chatSummary:
                'Buyer marked paid. Seller did not release within countdown.',
            createdAt: DateTime.now(),
          ),
        );
      }
    }
  }

  bool _matchesAmountFilter(P2PAdItem ad) {
    if (_amountFilter == 'Any Amount') return true;
    final limits = ad.limitRange;
    final min = limits[0];
    final max = limits[1];
    if (_amountFilter == '0 - 5,000') return min <= 5000;
    if (_amountFilter == '5,000 - 50,000') return min <= 50000 && max >= 5000;
    if (_amountFilter == '50,000+') return max >= 50000;
    return true;
  }

  List<P2PAdItem> _visibleAds() {
    return _ads.where((ad) {
      if (_bannedMerchants.contains(ad.seller)) return false;
      if (_marketCrypto.toUpperCase() !=
          ad.pair.split('/').first.toUpperCase()) {
        return false;
      }
      if (_marketPaymentFilter != 'All Payment Methods' &&
          !ad.paymentMethods.contains(_marketPaymentFilter)) {
        return false;
      }
      if (!_matchesAmountFilter(ad)) return false;
      if (_marketMainTab == 'BUY') {
        return ad.side.toLowerCase() == 'sell';
      }
      if (_marketMainTab == 'SELL') {
        return ad.side.toLowerCase() == 'buy';
      }
      if (_marketMainTab == 'BLOCK TRADE') {
        return false;
      }
      return true;
    }).toList();
  }

  void _createAd() {
    final pair = _adPairController.text.trim();
    final price = _adPriceController.text.trim();
    final limits = _adLimitsController.text.trim();
    final available = _adAvailableController.text.trim();
    final methods = _adPaymentController.text
        .split(',')
        .map((item) => item.trim())
        .where((item) => item.isNotEmpty)
        .toList();
    if (pair.isEmpty || price.isEmpty || limits.isEmpty || available.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Fill all ad fields first')));
      return;
    }

    final nickname = nicknameNotifier.value.isEmpty
        ? 'Merchant'
        : nicknameNotifier.value;

    setState(() {
      _ads.insert(
        0,
        P2PAdItem(
          seller: nickname,
          pair: pair.toUpperCase(),
          price: price,
          limits: limits,
          completed30d: '0',
          completionRate30d: '--',
          avgReleaseTime: '--',
          avgPaymentTime: '--',
          available: available,
          logoUrl: _adType == 'buy'
              ? 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png'
              : 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
          paymentMethods: methods.isEmpty ? const ['UPI'] : methods,
          side: _adType,
          verified: true,
          badge: 'Advertiser',
          timerMinutes: 15,
          reputationScore: 4.6,
        ),
      );
    });
    _publishAds();

    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Ad created')));
  }

  Future<void> _openPostAdWizard() async {
    if (fundingUsdtBalanceNotifier.value <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'You must have USDT balance to create an advertisement.',
          ),
        ),
      );
      return;
    }
    final user = activeExchangeUserNotifier.value;
    if (user == null || !user.canPostAds || !kycVerifiedNotifier.value) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Complete KYC verification before posting ads.'),
        ),
      );
      if (user == null || !kycVerifiedNotifier.value) {
        await Navigator.of(context).push(
          MaterialPageRoute<void>(builder: (_) => const KycVerificationPage()),
        );
      }
      if (!mounted) return;
      final refreshedUser = activeExchangeUserNotifier.value;
      if (!kycVerifiedNotifier.value ||
          refreshedUser == null ||
          !refreshedUser.canPostAds) {
        return;
      }
    }
    final draft = await Navigator.of(context).push<_PostAdDraft>(
      MaterialPageRoute<_PostAdDraft>(builder: (_) => const P2PPostAdPage()),
    );
    if (draft == null) return;
    setState(() {
      _adType = draft.side;
      _adPairController.text = draft.pair;
      _adPriceController.text = draft.price;
      _adLimitsController.text = draft.limits;
      _adAvailableController.text = draft.available;
      _adPaymentController.text = draft.paymentMethods.join(', ');
    });
    _createAd();
  }

  List<String> _marketPaymentFilters() {
    final Set<String> allMethods = {'All Payment Methods'};
    for (final ad in _ads) {
      allMethods.addAll(ad.paymentMethods);
    }
    return allMethods.toList();
  }

  void _openOrderChat(P2POrderItem order) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => P2POrderChatPage(
          seller: order.counterparty,
          pair: order.pair,
          side: order.side,
          orderId: order.id,
          stateLabel: p2pOrderStateLabel(order.orderState),
          paymentDue: order.fiatAmount > 0
              ? order.fiatAmount.toStringAsFixed(2)
              : null,
          expiresAtMs: order.expiresAtMs,
        ),
      ),
    );
  }

  void _openAdChat(P2PAdItem ad, String side) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => P2POrderChatPage(
          seller: ad.seller,
          pair: ad.pair,
          side: side,
          stateLabel: 'PRE ORDER CHAT',
        ),
      ),
    );
  }

  Future<void> _openOrderLifecycle(P2POrderItem order) async {
    final result = await Navigator.of(context).push<P2POrderItem>(
      MaterialPageRoute<P2POrderItem>(
        builder: (_) => P2POrderGeneratedPage(
          order: order,
          api: _api,
          buyerId: _buyerUid,
          onOpenChat: () => _openOrderChat(order),
        ),
      ),
    );
    if (result == null) return;
    _upsertOrder(result);
    _appendAdminLog(
      action: 'order_update',
      target: result.id,
      meta: p2pOrderStateLabel(result.orderState),
    );
  }

  Future<void> _openTradeFlow(P2PAdItem ad, String side) async {
    if (_marketPaused) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('P2P is temporarily paused by admin.')),
      );
      return;
    }
    if (!kycVerifiedNotifier.value) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('KYC required to trade in P2P')),
      );
      await Navigator.of(context).push(
        MaterialPageRoute<void>(builder: (_) => const KycVerificationPage()),
      );
      if (!mounted) return;
      if (!kycVerifiedNotifier.value) return;
    }
    final normalizedSide = side.toUpperCase();
    final hasActiveSameSide = _orders.any((order) {
      final active =
          order.orderState != P2POrderState.completed &&
          order.orderState != P2POrderState.cancelled;
      return active &&
          order.side.toUpperCase() == normalizedSide &&
          order.buyerWallet == _buyerUid;
    });
    if (hasActiveSameSide) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Only 1 active $normalizedSide order allowed per user.',
          ),
        ),
      );
      return;
    }
    final order = await Navigator.of(context).push<P2POrderItem>(
      MaterialPageRoute<P2POrderItem>(
        builder: (_) => P2POrderCreatePage(
          offer: ad,
          side: normalizedSide,
          fiatCurrency: _marketCurrency,
          api: _api,
          buyerId: _buyerUid,
          generateOrderId: _orderId,
          onOpenChat: () => _openAdChat(ad, side),
        ),
      ),
    );
    if (!mounted) return;
    if (order == null) return;
    _upsertOrder(order);
    setState(() {
      _activeTab = _P2PTab.orders;
      _orderPrimaryTab = 'ONGOING';
      _orderSecondaryTab = 'ALL';
    });
    _appendAdminLog(
      action: 'order_create',
      target: order.id,
      meta: '${order.side} ${order.pair} • $side',
    );
    if (order.fraudFlag) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Fraud risk flag raised. Monitoring enabled for this order.',
          ),
        ),
      );
    }
  }

  Widget _buildProfileSummaryCard(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: kycVerifiedNotifier,
      builder: (context, verified, child) {
        final bool basic = kycBasicVerifiedNotifier.value;
        final String identityLabel = verified
            ? 'Identity Verified'
            : (basic ? 'Basic Verified' : 'Identity Pending');
        final Color identityColor = verified
            ? const Color(0xFF9DFB3B)
            : const Color(0xFFFFAE42);
        final P2PAdItem? metricBase = _ads.isNotEmpty ? _ads.first : null;
        final String completedOrders = verified
            ? (metricBase?.completed30d ?? '0')
            : (basic ? '14' : '0');
        final String completionRate = verified
            ? (metricBase?.completionRate30d ?? '--')
            : (basic ? '92.1%' : '--');
        final String avgReleaseTime = verified
            ? (metricBase?.avgReleaseTime ?? '--')
            : '--';
        final String avgPaymentTime = verified
            ? (metricBase?.avgPaymentTime ?? '--')
            : '--';

        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFF0F1A2B),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF22304D)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const UserAvatar(radius: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ValueListenableBuilder<String>(
                          valueListenable: nicknameNotifier,
                          builder: (context, nickname, _) {
                            return Text(
                              nickname,
                              style: const TextStyle(
                                fontSize: 16.8,
                                fontWeight: FontWeight.w700,
                              ),
                            );
                          },
                        ),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 9,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: identityColor.withValues(alpha: 0.14),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: identityColor.withValues(alpha: 0.45),
                            ),
                          ),
                          child: Text(
                            identityLabel,
                            style: TextStyle(
                              fontSize: 11.2,
                              fontWeight: FontWeight.w600,
                              color: identityColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  OutlinedButton(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const DepositPage(),
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(90, 36),
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                    ),
                    child: const Text(
                      'Deposit',
                      style: TextStyle(fontSize: 12.6),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              const Text(
                'Deposit: 0.00 USDT',
                style: TextStyle(color: Colors.white70, fontSize: 12.8),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _P2PMetricTile(
                      title: 'Completed Orders (30D)',
                      value: completedOrders,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _P2PMetricTile(
                      title: 'Completion Rate (30D)',
                      value: completionRate,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _P2PMetricTile(
                      title: 'Average Release Time',
                      value: avgReleaseTime,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _P2PMetricTile(
                      title: 'Average Payment Time',
                      value: avgPaymentTime,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                verified
                    ? 'You can place P2P buy/sell orders now.'
                    : 'KYC required to trade in P2P',
                style: const TextStyle(color: Colors.white70, fontSize: 12.4),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildP2PMainTab(BuildContext context) {
    final List<P2PAdItem> visibleAds = _visibleAds();
    final String actionLabel = _marketMainTab == 'SELL' ? 'SELL' : 'BUY';
    final List<String> paymentFilters = _marketPaymentFilters();
    const amountFilters = [
      'Any Amount',
      '0 - 5,000',
      '5,000 - 50,000',
      '50,000+',
    ];
    const cryptoFilters = ['USDT', 'BTC', 'ETH'];
    const fiatFilters = ['INR', 'USD'];

    return ListView(
      key: const ValueKey<String>('p2p-main'),
      padding: const EdgeInsets.fromLTRB(8, 12, 8, 14),
      children: [
        Row(
          children: [
            const Text(
              'P2P',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: const [
            Expanded(
              child: Text(
                'BUY / SELL / BLOCK TRADE',
                style: TextStyle(fontSize: 10.4, color: Colors.white54),
              ),
            ),
          ],
        ),
        const SizedBox(height: 5),
        Row(
          children: [
            for (final tab in const ['BUY', 'SELL', 'BLOCK TRADE']) ...[
              Expanded(
                child: InkWell(
                  onTap: () => setState(() => _marketMainTab = tab),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    margin: EdgeInsets.only(
                      right: tab == 'BLOCK TRADE' ? 0 : 6,
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: _marketMainTab == tab
                          ? const Color(0xFF353A43)
                          : const Color(0xFF0E1524),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF1D2A44)),
                    ),
                    child: Text(
                      tab,
                      style: TextStyle(
                        fontSize: tab == 'BLOCK TRADE' ? 10 : 10.8,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
        if (_marketMainTab == 'BLOCK TRADE') ...[
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF0C1324),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFF1D2A44)),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Block Trade Desk',
                  style: TextStyle(fontSize: 13.8, fontWeight: FontWeight.w700),
                ),
                SizedBox(height: 5),
                Text(
                  'For large OTC orders, connect with verified desk support. Minimum quote size: 500,000 INR.',
                  style: TextStyle(fontSize: 10.8, color: Colors.white70),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const SupportHomePage()),
            ),
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF111B31),
              minimumSize: const Size.fromHeight(42),
            ),
            child: const Text('Request Block Trade Quote'),
          ),
        ] else ...[
          const SizedBox(height: 9),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
            decoration: BoxDecoration(
              border: Border(
                top: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
                bottom: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
              ),
            ),
            child: Row(
              children: [
                PopupMenuButton<String>(
                  initialValue: _marketCrypto,
                  onSelected: (value) => setState(() => _marketCrypto = value),
                  itemBuilder: (_) => cryptoFilters
                      .map(
                        (item) => PopupMenuItem<String>(
                          value: item,
                          child: Text(
                            item,
                            style: const TextStyle(fontSize: 10.8),
                          ),
                        ),
                      )
                      .toList(),
                  child: Text(
                    '$_marketCrypto ▾',
                    style: const TextStyle(
                      fontSize: 10.8,
                      color: Colors.white70,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                PopupMenuButton<String>(
                  initialValue: _marketCurrency,
                  onSelected: (value) =>
                      setState(() => _marketCurrency = value),
                  itemBuilder: (_) => fiatFilters
                      .map(
                        (item) => PopupMenuItem<String>(
                          value: item,
                          child: Text(
                            item,
                            style: const TextStyle(fontSize: 10.8),
                          ),
                        ),
                      )
                      .toList(),
                  child: Text(
                    '$_marketCurrency ▾',
                    style: const TextStyle(
                      fontSize: 10.8,
                      color: Colors.white70,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                PopupMenuButton<String>(
                  initialValue: _amountFilter,
                  onSelected: (value) => setState(() => _amountFilter = value),
                  itemBuilder: (_) => amountFilters
                      .map(
                        (item) => PopupMenuItem<String>(
                          value: item,
                          child: Text(
                            item,
                            style: const TextStyle(fontSize: 10.8),
                          ),
                        ),
                      )
                      .toList(),
                  child: const Text(
                    'Amount ▾',
                    style: TextStyle(fontSize: 10.8, color: Colors.white70),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: PopupMenuButton<String>(
                    initialValue: _marketPaymentFilter,
                    tooltip: 'Payment filter',
                    color: const Color(0xFF0F1A2B),
                    onSelected: (value) =>
                        setState(() => _marketPaymentFilter = value),
                    itemBuilder: (_) => paymentFilters
                        .map(
                          (item) => PopupMenuItem<String>(
                            value: item,
                            child: Text(
                              item,
                              style: const TextStyle(fontSize: 10.8),
                            ),
                          ),
                        )
                        .toList(),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        '$_marketPaymentFilter ▾',
                        style: const TextStyle(
                          fontSize: 10.8,
                          color: Colors.white70,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          if (visibleAds.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 10),
              child: Text(
                'No ads in this filter',
                style: TextStyle(fontSize: 10.4, color: Colors.white60),
              ),
            ),
          ...visibleAds.map(
            (ad) => _P2PAdCard(
              ad: ad,
              primaryAction: actionLabel,
              onAction: () => _openTradeFlow(ad, actionLabel),
              showTopPick: ad.topPick,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildOrdersTab() {
    final ongoingOrders = _orders
        .where(
          (order) =>
              order.orderState != P2POrderState.completed &&
              order.orderState != P2POrderState.cancelled,
        )
        .toList();
    final fulfilledOrders = _orders
        .where(
          (order) =>
              order.orderState == P2POrderState.completed ||
              order.orderState == P2POrderState.cancelled,
        )
        .toList();
    final bool showingOngoing = _orderPrimaryTab == 'ONGOING';
    final baseOrders = showingOngoing ? ongoingOrders : fulfilledOrders;
    final statusFilters = showingOngoing
        ? const ['ALL', 'UNPAID', 'PAID', 'APPEAL']
        : const ['ALL', 'COMPLETED', 'CANCELLED'];
    final filteredOrders = baseOrders.where((order) {
      if (_orderSecondaryTab == 'ALL') return true;
      if (_orderSecondaryTab == 'UNPAID') {
        return order.orderState == P2POrderState.created ||
            order.orderState == P2POrderState.awaitingPayment;
      }
      if (_orderSecondaryTab == 'PAID') {
        return order.orderState == P2POrderState.paymentSent ||
            order.orderState == P2POrderState.sellerConfirming;
      }
      if (_orderSecondaryTab == 'APPEAL') {
        return order.orderState == P2POrderState.appealOpened ||
            order.orderState == P2POrderState.underReview;
      }
      if (_orderSecondaryTab == 'COMPLETED') {
        return order.orderState == P2POrderState.completed;
      }
      if (_orderSecondaryTab == 'CANCELLED') {
        return order.orderState == P2POrderState.cancelled;
      }
      return true;
    }).toList();

    return ListView(
      key: const ValueKey<String>('p2p-orders'),
      padding: const EdgeInsets.all(14),
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Order History',
                style: TextStyle(fontSize: 15.4, fontWeight: FontWeight.w700),
              ),
            ),
            IconButton(
              onPressed: () {},
              icon: const Icon(Icons.search, size: 20),
              tooltip: 'Search orders',
            ),
            IconButton(
              onPressed: () {},
              icon: const Icon(Icons.filter_alt_outlined, size: 20),
              tooltip: 'Filter orders',
            ),
          ],
        ),
        const SizedBox(height: 4),
        Row(
          children: [
            _OrderHeaderTab(
              label: 'Ongoing',
              active: showingOngoing,
              onTap: () {
                setState(() {
                  _orderPrimaryTab = 'ONGOING';
                  _orderSecondaryTab = 'ALL';
                });
              },
            ),
            const SizedBox(width: 10),
            _OrderHeaderTab(
              label: 'Fulfilled',
              active: !showingOngoing,
              onTap: () {
                setState(() {
                  _orderPrimaryTab = 'FULFILLED';
                  _orderSecondaryTab = 'ALL';
                });
              },
            ),
          ],
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: statusFilters.map((item) {
            final active = _orderSecondaryTab == item;
            return ChoiceChip(
              label: Text(item, style: const TextStyle(fontSize: 10.4)),
              selected: active,
              onSelected: (_) => setState(() => _orderSecondaryTab = item),
            );
          }).toList(),
        ),
        if (!showingOngoing) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
            decoration: BoxDecoration(
              color: const Color(0xFF101827),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFF24324A)),
            ),
            child: Row(
              children: const [
                Icon(Icons.error_outline, size: 16, color: Colors.white70),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'You have unread messages',
                    style: TextStyle(fontSize: 11.2),
                  ),
                ),
                Icon(Icons.chevron_right, size: 18, color: Colors.white38),
              ],
            ),
          ),
        ],
        const SizedBox(height: 8),
        if (filteredOrders.isEmpty)
          Container(
            margin: const EdgeInsets.only(top: 36),
            child: const Column(
              children: [
                Icon(
                  Icons.find_in_page_outlined,
                  size: 72,
                  color: Colors.white30,
                ),
                SizedBox(height: 10),
                Text(
                  'No orders',
                  style: TextStyle(fontSize: 21, color: Colors.white54),
                ),
              ],
            ),
          ),
        ...filteredOrders.map(
          (order) => _P2POrderCard(
            order: order,
            onChat: () => _openOrderChat(order),
            onTap: () => _openOrderLifecycle(order),
            countdown: _countdownFromMs(order.expiresAtMs),
          ),
        ),
      ],
    );
  }

  Widget _buildAdsTab() {
    final myName = nicknameNotifier.value.trim().toLowerCase();
    final myAds = _ads
        .where((ad) => ad.seller.trim().toLowerCase() == myName)
        .toList();

    return ListView(
      key: const ValueKey<String>('p2p-ads'),
      padding: const EdgeInsets.all(14),
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'My Ads',
                style: TextStyle(fontSize: 15.4, fontWeight: FontWeight.w700),
              ),
            ),
            IconButton(
              onPressed: _openPostAdWizard,
              icon: const Icon(Icons.add, size: 22),
              tooltip: 'Post Ad',
            ),
            IconButton(
              onPressed: () {},
              icon: const Icon(Icons.history_outlined, size: 21),
              tooltip: 'Ad history',
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (myAds.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 30, horizontal: 14),
            decoration: BoxDecoration(
              color: const Color(0xFF0C1324),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF1D2A44)),
            ),
            child: Column(
              children: [
                const Icon(
                  Icons.find_in_page_outlined,
                  size: 74,
                  color: Colors.white30,
                ),
                const SizedBox(height: 10),
                const Text(
                  'You do not have any Ads.',
                  style: TextStyle(fontSize: 20, color: Colors.white54),
                ),
                const SizedBox(height: 14),
                FilledButton(
                  onPressed: _openPostAdWizard,
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFFF1CB3E),
                    foregroundColor: Colors.black,
                    minimumSize: const Size(156, 44),
                  ),
                  child: const Text(
                    'Post Ad',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
          ),
        ...myAds.map(
          (ad) => _P2PAdCard(
            ad: ad,
            primaryAction: 'Manage',
            onAction: () {},
            showTopPick: ad.topPick,
          ),
        ),
      ],
    );
  }

  Widget _buildProfileTab(BuildContext context) {
    return ListView(
      key: const ValueKey<String>('p2p-profile'),
      padding: const EdgeInsets.all(16),
      children: [
        _buildProfileSummaryCard(context),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF0D172A),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFF1E2A44)),
          ),
          child: Row(
            children: [
              const Icon(
                Icons.shield_outlined,
                size: 20,
                color: Colors.white70,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Security: KYC ${kycVerifiedNotifier.value ? 'Verified' : 'Pending'} • IP Monitoring Active ($_sessionIp)',
                  style: const TextStyle(fontSize: 12.4, color: Colors.white70),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        _P2PProfileNavTile(
          icon: Icons.verified_user_outlined,
          title: 'Identity Verification',
          subtitle: 'Basic + Advanced KYC',
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => const KycVerificationPage(),
            ),
          ),
        ),
        _P2PProfileNavTile(
          icon: Icons.account_circle_outlined,
          title: 'User Center',
          subtitle: 'Profile, security and preferences',
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => BitegitUserCenterPage(
                accessToken: authAccessTokenNotifier.value,
                onToggleTheme: () {
                  appThemeModeNotifier.value =
                      appThemeModeNotifier.value == ThemeMode.dark
                      ? ThemeMode.light
                      : ThemeMode.dark;
                },
                fallbackIdentity: authIdentityNotifier.value.trim().isNotEmpty
                    ? authIdentityNotifier.value.trim()
                    : nicknameNotifier.value,
                fallbackUid: currentUserUid,
                fallbackNickname: nicknameNotifier.value,
                fallbackAvatarSymbol: avatarSymbolNotifier.value,
                fallbackAvatarPath: profileImagePathNotifier.value,
                onLogout: _logoutActiveSession,
                onNicknameChanged: (value) {
                  final trimmed = value.trim();
                  if (trimmed.isEmpty) return;
                  nicknameNotifier.value = trimmed;
                  avatarSymbolNotifier.value = trimmed
                      .substring(0, 1)
                      .toUpperCase();
                },
              ),
            ),
          ),
        ),
        _P2PProfileNavTile(
          icon: Icons.support_agent_outlined,
          title: 'Customer Support',
          subtitle: 'Connect AI bot or live agent',
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => const SupportHomePage()),
          ),
        ),
      ],
    );
  }

  Widget _buildTabBody(BuildContext context) {
    switch (_activeTab) {
      case _P2PTab.p2p:
        return _buildP2PMainTab(context);
      case _P2PTab.orders:
        return _buildOrdersTab();
      case _P2PTab.ads:
        return _buildAdsTab();
      case _P2PTab.profile:
        return _buildProfileTab(context);
    }
  }

  Widget _bottomNavItem(_P2PTab tab, IconData icon, String label) {
    final bool active = _activeTab == tab;
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => setState(() => _activeTab = tab),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 7),
          decoration: BoxDecoration(
            color: active ? const Color(0xFF9DFB3B) : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 17,
                color: active ? Colors.black : Colors.white70,
              ),
              const SizedBox(height: 3),
              Text(
                label,
                style: TextStyle(
                  fontSize: 10.2,
                  fontWeight: FontWeight.w600,
                  color: active ? Colors.black : Colors.white70,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: const Text(
          'P2P',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: _buildTabBody(context),
            ),
          ),
          SafeArea(
            top: false,
            minimum: const EdgeInsets.only(bottom: 8),
            child: Container(
              margin: const EdgeInsets.fromLTRB(12, 0, 12, 30),
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xCC060A15),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFF1D2A46)),
              ),
              child: Row(
                children: [
                  _bottomNavItem(_P2PTab.p2p, Icons.swap_horiz, 'P2P'),
                  _bottomNavItem(
                    _P2PTab.orders,
                    Icons.receipt_long_outlined,
                    'Orders',
                  ),
                  _bottomNavItem(_P2PTab.ads, Icons.campaign_outlined, 'Ads'),
                  _bottomNavItem(
                    _P2PTab.profile,
                    Icons.account_circle_outlined,
                    'Profile',
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _P2PMetricTile extends StatelessWidget {
  const _P2PMetricTile({required this.title, required this.value});

  final String title;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1323),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFF1E2B46)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(color: Colors.white54, fontSize: 11),
          ),
          const SizedBox(height: 5),
          Text(
            value,
            style: const TextStyle(fontSize: 14.8, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _OrderHeaderTab extends StatelessWidget {
  const _OrderHeaderTab({
    required this.label,
    required this.active,
    required this.onTap,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                color: active ? Colors.white : Colors.white54,
              ),
            ),
            const SizedBox(height: 5),
            Container(
              width: 36,
              height: 3,
              decoration: BoxDecoration(
                color: active ? const Color(0xFFF1CB3E) : Colors.transparent,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _P2PAdCard extends StatelessWidget {
  const _P2PAdCard({
    required this.ad,
    required this.primaryAction,
    required this.onAction,
    this.showTopPick = false,
  });

  final P2PAdItem ad;
  final String primaryAction;
  final VoidCallback onAction;
  final bool showTopPick;

  @override
  Widget build(BuildContext context) {
    final normalized = primaryAction.toLowerCase();
    final bool isBuyAction = normalized == 'buy';
    final bool isSellAction = normalized == 'sell';
    final Color buttonColor = isBuyAction
        ? const Color(0xFF57C97A)
        : (isSellAction ? const Color(0xFFEB4D5D) : const Color(0xFF23314A));
    final Color cardBorderColor = showTopPick
        ? const Color(0xFFE39A2A)
        : const Color(0xFF1D2A44);
    final String price = ad.price.replaceAll(' INR', '');
    final List<Color> methodColors = const [
      Color(0xFFE39A2A),
      Color(0xFF53D983),
      Color(0xFFEF4E5E),
      Color(0xFF5D8CFF),
    ];
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF0C1324),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: cardBorderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 24,
                height: 24,
                alignment: Alignment.center,
                decoration: const BoxDecoration(
                  color: Color(0xFF2A313F),
                  shape: BoxShape.circle,
                ),
                child: Text(
                  ad.seller.substring(0, 1).toUpperCase(),
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            ad.seller,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 10.2,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        if (ad.verified) ...[
                          const SizedBox(width: 4),
                          const Icon(
                            Icons.verified,
                            size: 12,
                            color: Color(0xFF57A2FF),
                          ),
                        ],
                      ],
                    ),
                    Row(
                      children: [
                        Text(
                          '${ad.completed30d} Orders (${ad.completionRate30d})',
                          style: const TextStyle(
                            fontSize: 9.3,
                            color: Colors.white60,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (showTopPick)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFF3D2A12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'Top Pick',
                    style: TextStyle(
                      fontSize: 9.1,
                      color: Color(0xFFF9B13F),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            '₹ $price',
            style: const TextStyle(fontSize: 15.6, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 2),
          Text(
            '${ad.badge} • Rank ${ad.reputationScore.toStringAsFixed(1)}',
            style: const TextStyle(fontSize: 9.2, color: Colors.white60),
          ),
          const SizedBox(height: 4),
          Text(
            'Limits  ${ad.limits}',
            style: const TextStyle(color: Colors.white70, fontSize: 9.6),
          ),
          Text(
            'Quantity  ${ad.available}',
            style: const TextStyle(color: Colors.white70, fontSize: 9.6),
          ),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            runSpacing: 5,
            children: List<Widget>.generate(ad.paymentMethods.length, (index) {
              final method = ad.paymentMethods[index];
              return Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 3,
                    height: 14,
                    decoration: BoxDecoration(
                      color: methodColors[index % methodColors.length],
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    method,
                    style: const TextStyle(
                      fontSize: 9.5,
                      color: Colors.white70,
                    ),
                  ),
                ],
              );
            }),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Text(
                '${ad.timerMinutes}m',
                style: const TextStyle(fontSize: 9.2, color: Colors.white54),
              ),
              const SizedBox(width: 6),
              Text(
                '30D ${ad.avgReleaseTime}',
                style: const TextStyle(fontSize: 9.2, color: Colors.white54),
              ),
              const Spacer(),
              SizedBox(
                width: 92,
                child: FilledButton(
                  onPressed: onAction,
                  style: FilledButton.styleFrom(
                    backgroundColor: buttonColor,
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(34),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                  child: Text(
                    primaryAction,
                    style: const TextStyle(
                      fontSize: 10.8,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _P2POrderCard extends StatelessWidget {
  const _P2POrderCard({
    required this.order,
    required this.onChat,
    required this.onTap,
    this.countdown = '--:--',
  });

  final P2POrderItem order;
  final VoidCallback onChat;
  final VoidCallback onTap;
  final String countdown;

  @override
  Widget build(BuildContext context) {
    final statusColor = p2pStateColor(order.orderState);
    final stateLabel = p2pOrderStateLabel(order.orderState);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: const Color(0xFF0C1324),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF1D2A44)),
        ),
        child: Column(
          children: [
            Row(
              children: [
                CoinLogo(url: order.logoUrl, fallback: order.pair, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${order.pair} • ${order.side}',
                    style: const TextStyle(
                      fontSize: 12.2,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: onChat,
                  icon: const Icon(
                    Icons.chat_bubble_outline,
                    size: 18,
                    color: Colors.white70,
                  ),
                  tooltip: 'Chat seller',
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    stateLabel,
                    style: TextStyle(
                      color: statusColor,
                      fontSize: 10.2,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 7),
            Row(
              children: [
                Expanded(
                  child: Text(
                    order.id,
                    style: const TextStyle(
                      fontSize: 10.3,
                      color: Colors.white60,
                    ),
                  ),
                ),
                Flexible(
                  child: Text(
                    order.amount,
                    textAlign: TextAlign.right,
                    style: const TextStyle(
                      fontSize: 10.8,
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 2,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Text(
                  'Seller: ${order.counterparty}',
                  style: const TextStyle(fontSize: 10.1, color: Colors.white60),
                ),
                const Spacer(),
                Text(
                  order.paymentMethod,
                  style: const TextStyle(fontSize: 10.1, color: Colors.white60),
                ),
              ],
            ),
            if (order.orderState == P2POrderState.awaitingPayment ||
                order.orderState == P2POrderState.created) ...[
              const SizedBox(height: 3),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Pay within $countdown',
                  style: const TextStyle(
                    fontSize: 9.8,
                    color: Color(0xFFFFAE42),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 3),
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                order.createdAt,
                style: const TextStyle(fontSize: 10.1, color: Colors.white60),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

enum _P2PChatMessageType { text, image, system }

class _P2PChatMessage {
  const _P2PChatMessage({
    this.text,
    this.imagePath,
    required this.mine,
    required this.timeLabel,
    this.type = _P2PChatMessageType.text,
  });

  final String? text;
  final String? imagePath;
  final bool mine;
  final String timeLabel;
  final _P2PChatMessageType type;
}

class P2POrderChatPage extends StatefulWidget {
  const P2POrderChatPage({
    super.key,
    required this.seller,
    required this.pair,
    required this.side,
    this.orderId,
    this.stateLabel,
    this.paymentDue,
    this.expiresAtMs,
  });

  final String seller;
  final String pair;
  final String side;
  final String? orderId;
  final String? stateLabel;
  final String? paymentDue;
  final int? expiresAtMs;

  @override
  State<P2POrderChatPage> createState() => _P2POrderChatPageState();
}

class _P2POrderChatPageState extends State<P2POrderChatPage> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<_P2PChatMessage> _messages = <_P2PChatMessage>[];
  final P2PApiService _api = P2PApiService();
  bool _requestingAgent = false;
  Timer? _expiryTimer;
  bool _fiveMinuteWarned = false;

  @override
  void initState() {
    super.initState();
    _loadInitialChat();
    _expiryTimer = Timer.periodic(const Duration(seconds: 20), (_) {
      final expiresAt = widget.expiresAtMs;
      if (expiresAt == null || _fiveMinuteWarned || !mounted) return;
      final leftMs = expiresAt - DateTime.now().millisecondsSinceEpoch;
      if (leftMs <= 5 * 60 * 1000 && leftMs > 0) {
        _fiveMinuteWarned = true;
        setState(() {
          _messages.add(
            _P2PChatMessage(
              text:
                  'System: 5 minutes remaining. Complete payment to avoid auto-cancellation.',
              mine: false,
              timeLabel: _timeLabel(DateTime.now()),
              type: _P2PChatMessageType.system,
            ),
          );
        });
        _scrollToBottom();
      }
    });
  }

  @override
  void dispose() {
    _expiryTimer?.cancel();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  String _timeLabel(DateTime time) {
    final h = time.hour.toString().padLeft(2, '0');
    final m = time.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  Future<void> _loadInitialChat() async {
    final orderId = widget.orderId ?? 'P2P-preview';
    final initial = await _api.getChat(orderId: orderId, seller: widget.seller);
    if (!mounted) return;
    setState(() {
      _messages
        ..clear()
        ..addAll(
          initial.map(
            (item) => _P2PChatMessage(
              text: item['text'],
              mine: false,
              timeLabel: item['time'] ?? _timeLabel(DateTime.now()),
              type: item['type'] == 'system'
                  ? _P2PChatMessageType.system
                  : _P2PChatMessageType.text,
            ),
          ),
        )
        ..add(
          _P2PChatMessage(
            text:
                'Order status: ${widget.stateLabel ?? 'AWAITING PAYMENT'}. Please click paid after transfer.',
            mine: false,
            timeLabel: _timeLabel(DateTime.now()),
            type: _P2PChatMessageType.system,
          ),
        );
    });
  }

  Future<void> _send() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;
    _messageController.clear();
    setState(() {
      _messages.add(
        _P2PChatMessage(
          text: text,
          mine: true,
          timeLabel: _timeLabel(DateTime.now()),
        ),
      );
    });
    await Future<void>.delayed(const Duration(milliseconds: 500));
    if (!mounted) return;
    setState(() {
      _messages.add(
        _P2PChatMessage(
          text: 'Noted. I will verify once payment is visible.',
          mine: false,
          timeLabel: _timeLabel(DateTime.now()),
        ),
      );
    });
    _scrollToBottom();
  }

  Future<void> _sendImageProof() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery);
    if (picked == null) return;
    if (!mounted) return;
    setState(() {
      _messages.add(
        _P2PChatMessage(
          imagePath: picked.path,
          mine: true,
          timeLabel: _timeLabel(DateTime.now()),
          type: _P2PChatMessageType.image,
        ),
      );
      _messages.add(
        _P2PChatMessage(
          text: 'Payment proof image shared.',
          mine: false,
          timeLabel: _timeLabel(DateTime.now()),
          type: _P2PChatMessageType.system,
        ),
      );
    });
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _escalateSupport() async {
    setState(() => _requestingAgent = true);
    final alert = addSupportAgentAlert(
      'P2P escalation from order ${widget.orderId ?? 'N/A'} with ${widget.seller}',
    );
    await Future<void>.delayed(const Duration(milliseconds: 450));
    if (!mounted) return;
    setState(() {
      _requestingAgent = false;
      _messages.add(
        _P2PChatMessage(
          text:
              'Support ticket #${alert.id} created. Agent will join this chat shortly.',
          mine: false,
          timeLabel: _timeLabel(DateTime.now()),
          type: _P2PChatMessageType.system,
        ),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final heading = widget.orderId == null
        ? '${widget.side} ${widget.pair}'
        : '${widget.orderId} • ${widget.side} ${widget.pair}';
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.seller,
              style: const TextStyle(
                fontSize: 13.2,
                fontWeight: FontWeight.w700,
              ),
            ),
            Text(
              heading,
              style: const TextStyle(fontSize: 10.2, color: Colors.white60),
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: _requestingAgent ? null : _escalateSupport,
            icon: const Icon(Icons.support_agent_outlined, size: 20),
            tooltip: 'Escalate to support',
          ),
        ],
      ),
      body: Column(
        children: [
          if (widget.paymentDue != null)
            Container(
              margin: const EdgeInsets.fromLTRB(10, 10, 10, 4),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF0F1A2A),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFF263550)),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.info_outline,
                    size: 16,
                    color: Colors.white70,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'To be paid ₹${widget.paymentDue}. Use secure payment channel only.',
                      style: const TextStyle(
                        fontSize: 10.3,
                        color: Colors.white70,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 18),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                if (msg.type == _P2PChatMessageType.system) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFF121C30),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF273651)),
                    ),
                    child: Text(
                      msg.text ?? '',
                      style: const TextStyle(
                        fontSize: 10.4,
                        color: Colors.white70,
                      ),
                    ),
                  );
                }
                return Align(
                  alignment: msg.mine
                      ? Alignment.centerRight
                      : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.of(context).size.width * 0.74,
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: msg.mine
                          ? const Color(0xFF57C97A)
                          : const Color(0xFF111B2F),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: msg.mine
                            ? const Color(0xFF57C97A)
                            : const Color(0xFF263550),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (msg.type == _P2PChatMessageType.image &&
                            msg.imagePath != null)
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.file(
                              File(msg.imagePath!),
                              height: 140,
                              width: 140,
                              fit: BoxFit.cover,
                            ),
                          )
                        else
                          Text(
                            msg.text ?? '',
                            style: TextStyle(
                              fontSize: 10.8,
                              color: msg.mine ? Colors.black : Colors.white,
                            ),
                          ),
                        const SizedBox(height: 3),
                        Text(
                          msg.timeLabel,
                          style: TextStyle(
                            fontSize: 9.2,
                            color: msg.mine
                                ? Colors.black.withValues(alpha: 0.65)
                                : Colors.white54,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          AnimatedPadding(
            duration: const Duration(milliseconds: 120),
            curve: Curves.easeOut,
            padding: EdgeInsets.only(bottom: bottomInset > 0 ? 18 : 14),
            child: SafeArea(
              top: false,
              minimum: const EdgeInsets.fromLTRB(0, 0, 0, 24),
              child: Container(
                margin: const EdgeInsets.fromLTRB(8, 0, 8, 14),
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
                decoration: BoxDecoration(
                  color: const Color(0xFF080D17),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF24324A)),
                ),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: _sendImageProof,
                      icon: const Icon(
                        Icons.image_outlined,
                        color: Colors.white70,
                      ),
                      tooltip: 'Send proof image',
                    ),
                    Expanded(
                      child: TextField(
                        controller: _messageController,
                        style: const TextStyle(fontSize: 11),
                        decoration: const InputDecoration(
                          hintText: 'Type message',
                          isDense: true,
                        ),
                        onSubmitted: (_) => _send(),
                      ),
                    ),
                    const SizedBox(width: 6),
                    FilledButton(
                      onPressed: _send,
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFF57C97A),
                        foregroundColor: Colors.black,
                        minimumSize: const Size(58, 36),
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                      ),
                      child: const Text(
                        'Send',
                        style: TextStyle(
                          fontSize: 10.8,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class P2POrderCreatePage extends StatefulWidget {
  const P2POrderCreatePage({
    super.key,
    required this.offer,
    required this.side,
    required this.fiatCurrency,
    required this.api,
    required this.buyerId,
    required this.generateOrderId,
    required this.onOpenChat,
  });

  final P2PAdItem offer;
  final String side;
  final String fiatCurrency;
  final P2PApiService api;
  final String buyerId;
  final String Function() generateOrderId;
  final VoidCallback onOpenChat;

  @override
  State<P2POrderCreatePage> createState() => _P2POrderCreatePageState();
}

class _P2POrderCreatePageState extends State<P2POrderCreatePage> {
  late final TextEditingController _amountController;
  late String _paymentMethod;
  bool _fiatInput = true;
  bool _creating = false;

  @override
  void initState() {
    super.initState();
    final min = widget.offer.limitRange.first;
    _amountController = TextEditingController(
      text: min <= 0 ? '500' : min.toStringAsFixed(0),
    );
    _paymentMethod = widget.offer.paymentMethods.first;
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  double get _entered => _parseNumericValue(_amountController.text);
  double get _price =>
      widget.offer.priceValue <= 0 ? 1 : widget.offer.priceValue;

  double get _fiatAmount => _fiatInput ? _entered : _entered * _price;
  double get _usdtAmount => _fiatInput ? _entered / _price : _entered;

  bool get _isAmountValid {
    final range = widget.offer.limitRange;
    if (_fiatAmount <= 0) return false;
    return _fiatAmount >= range.first && _fiatAmount <= range.last;
  }

  Future<void> _createOrder() async {
    if (!_isAmountValid) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Amount must be between ₹${widget.offer.limitRange.first.toStringAsFixed(0)} and ₹${widget.offer.limitRange.last.toStringAsFixed(0)}',
          ),
        ),
      );
      return;
    }
    setState(() => _creating = true);
    try {
      final order = await widget.api.createOrder(
        ad: widget.offer,
        buyerId: widget.buyerId,
        side: widget.side,
        fiatAmount: _fiatAmount,
        fiatCurrency: widget.fiatCurrency,
        paymentMethod: _paymentMethod,
        orderId: widget.generateOrderId(),
        now: DateTime.now(),
      );
      if (!mounted) return;
      final finalOrder = await Navigator.of(context).push<P2POrderItem>(
        MaterialPageRoute<P2POrderItem>(
          builder: (_) => P2POrderGeneratedPage(
            order: order,
            api: widget.api,
            buyerId: widget.buyerId,
            onOpenChat: widget.onOpenChat,
          ),
        ),
      );
      if (!mounted) return;
      Navigator.of(context).pop(finalOrder ?? order);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Unable to create order: $e')));
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final sideLabel = widget.side.toUpperCase() == 'BUY'
        ? 'Buy USDT'
        : 'Sell USDT';
    final buttonLabel = widget.side.toUpperCase() == 'BUY'
        ? 'BUY USDT WITH 0 FEES'
        : 'SELL USDT WITH 0 FEES';
    final sideColor = widget.side.toUpperCase() == 'BUY'
        ? const Color(0xFF53D983)
        : const Color(0xFFEF4E5E);
    final range = widget.offer.limitRange;
    return Scaffold(
      appBar: AppBar(title: Text(sideLabel)),
      body: ListView(
        padding: const EdgeInsets.all(14),
        children: [
          Row(
            children: [
              ChoiceChip(
                label: const Text('Crypto'),
                selected: !_fiatInput,
                onSelected: (_) => setState(() => _fiatInput = false),
              ),
              const SizedBox(width: 6),
              ChoiceChip(
                label: const Text('Fiat'),
                selected: _fiatInput,
                onSelected: (_) => setState(() => _fiatInput = true),
              ),
              const Spacer(),
              Text(
                'Price ₹${_price.toStringAsFixed(2)}',
                style: const TextStyle(fontSize: 12.2, color: Colors.white70),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFF101827),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF1D2A44)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: _amountController,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  decoration: InputDecoration(
                    hintText: _fiatInput ? '500' : '5.09',
                    suffix: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_fiatInput ? widget.fiatCurrency : 'USDT'),
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: () {
                            final maxValue = _fiatInput
                                ? range.last
                                : range.last / _price;
                            _amountController.text = maxValue.toStringAsFixed(
                              _fiatInput ? 0 : 4,
                            );
                            setState(() {});
                          },
                          child: const Text(
                            'Max',
                            style: TextStyle(
                              color: Color(0xFF1BB6D1),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 6),
                Text(
                  'Limit ₹${range.first.toStringAsFixed(0)} - ₹${range.last.toStringAsFixed(0)}',
                  style: const TextStyle(fontSize: 10.3, color: Colors.white60),
                ),
                const SizedBox(height: 4),
                Text(
                  '≈ ${_usdtAmount.toStringAsFixed(4)} USDT',
                  style: const TextStyle(fontSize: 12.2, color: Colors.white70),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          DropdownButtonFormField<String>(
            initialValue: _paymentMethod,
            decoration: const InputDecoration(labelText: 'Payment Method'),
            items: widget.offer.paymentMethods
                .map(
                  (method) => DropdownMenuItem<String>(
                    value: method,
                    child: Text(method),
                  ),
                )
                .toList(),
            onChanged: (value) {
              if (value == null) return;
              setState(() => _paymentMethod = value);
            },
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF1E2A44)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Order Summary',
                  style: TextStyle(fontSize: 12.3, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 6),
                _summaryRow('Price', '₹${_price.toStringAsFixed(2)}'),
                _summaryRow(
                  'Amount',
                  '₹${_fiatAmount.toStringAsFixed(2)} ${widget.fiatCurrency}',
                ),
                _summaryRow(
                  'Quantity',
                  '${_usdtAmount.toStringAsFixed(4)} USDT',
                ),
                _summaryRow('Fee', '0 USDT'),
                _summaryRow('Payment', _paymentMethod),
                const Divider(height: 16, color: Color(0xFF24324A)),
                Row(
                  children: [
                    const CircleAvatar(radius: 12, child: Text('J')),
                    const SizedBox(width: 7),
                    Expanded(
                      child: Text(
                        '${widget.offer.seller} ${widget.offer.verified ? '• Verified' : ''}',
                        style: const TextStyle(
                          fontSize: 11.2,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: widget.onOpenChat,
                      icon: const Icon(Icons.arrow_forward, size: 18),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                _summaryRow(
                  'Pay within',
                  '${widget.offer.timerMinutes > 0 ? widget.offer.timerMinutes : 10} minute(s)',
                ),
                _summaryRow(
                  'Historical orders',
                  '${widget.offer.completed30d} • ${widget.offer.completionRate30d}',
                ),
                _summaryRow('30D avg release', widget.offer.avgReleaseTime),
                _summaryRow('Avg payment time', widget.offer.avgPaymentTime),
              ],
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'Notes',
            style: TextStyle(fontSize: 12.2, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          const Text(
            '* Do not include crypto terms in payment remarks.\n* Complete payment within timer to avoid auto cancellation.\n* Use in-app chat for all communication.',
            style: TextStyle(fontSize: 10.3, color: Colors.white70),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _creating ? null : _createOrder,
            style: FilledButton.styleFrom(
              backgroundColor: sideColor,
              foregroundColor: Colors.black,
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              _creating ? 'Creating...' : buttonLabel,
              style: const TextStyle(
                fontSize: 12.6,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 5),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(fontSize: 10.4, color: Colors.white60),
            ),
          ),
          Text(
            value,
            style: const TextStyle(fontSize: 11.2, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

class P2POrderGeneratedPage extends StatefulWidget {
  const P2POrderGeneratedPage({
    super.key,
    required this.order,
    required this.api,
    required this.buyerId,
    required this.onOpenChat,
  });

  final P2POrderItem order;
  final P2PApiService api;
  final String buyerId;
  final VoidCallback onOpenChat;

  @override
  State<P2POrderGeneratedPage> createState() => _P2POrderGeneratedPageState();
}

class _P2POrderGeneratedPageState extends State<P2POrderGeneratedPage> {
  late P2POrderItem _order;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _order = widget.order;
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String _countdown() {
    final left = _order.expiresAtMs - DateTime.now().millisecondsSinceEpoch;
    if (left <= 0) return '00:00';
    final min = (left ~/ 60000).toString().padLeft(2, '0');
    final sec = ((left % 60000) ~/ 1000).toString().padLeft(2, '0');
    return '$min:$sec';
  }

  Future<void> _openPayment() async {
    final updated = await Navigator.of(context).push<P2POrderItem>(
      MaterialPageRoute<P2POrderItem>(
        builder: (_) => P2PPaymentPage(
          order: _order,
          api: widget.api,
          buyerId: widget.buyerId,
          onOpenChat: widget.onOpenChat,
        ),
      ),
    );
    if (updated == null) return;
    setState(() => _order = updated);
  }

  Future<void> _cancelOrder() async {
    final reason = await Navigator.of(context).push<String>(
      MaterialPageRoute<String>(builder: (_) => const P2PCancelReasonPage()),
    );
    if (reason == null || reason.isEmpty) return;
    try {
      final updated = await widget.api.cancelOrder(
        order: _order,
        reason: reason,
      );
      if (!mounted) return;
      setState(() => _order = updated);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Order cancelled')));
      Navigator.of(context).pop(_order);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Cancel failed: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          onPressed: () => Navigator.of(context).pop(_order),
          icon: const Icon(Icons.arrow_back),
        ),
        title: const Text('Order Generated'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(14),
        children: [
          const Text(
            'The order has been generated. Proceed to payment.',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          Text(
            'Please pay within ${_countdown()}',
            style: const TextStyle(fontSize: 12.6, color: Color(0xFF22BCD5)),
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF24324A)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const CircleAvatar(radius: 12, child: Text('J')),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _order.counterparty,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: widget.onOpenChat,
                      icon: const Icon(Icons.forum_outlined, size: 19),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  '* The cryptocurrency is held in system escrow.\n* Complete payment in timer and click paid.',
                  style: TextStyle(fontSize: 10.4, color: Colors.white70),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF0B1323),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF1E2B46)),
            ),
            child: Column(
              children: [
                _orderDetailRow(
                  'Trading amount',
                  '₹${_order.fiatAmount.toStringAsFixed(2)}',
                ),
                _orderDetailRow(
                  'Price',
                  '₹${_order.pricePerUsdt.toStringAsFixed(2)}',
                ),
                _orderDetailRow(
                  'Quantity',
                  '${_order.usdtAmount.toStringAsFixed(4)} USDT',
                ),
                _orderDetailRow(
                  'Fee',
                  '${_order.feeUsdt.toStringAsFixed(2)} USDT',
                ),
                _orderDetailRow('Payment method', _order.paymentMethod),
                const Divider(height: 16, color: Color(0xFF24324A)),
                _orderDetailRow('Order No', _order.id),
                _orderDetailRow(
                  'Order time',
                  DateTime.fromMillisecondsSinceEpoch(
                    _order.createdAtMs,
                  ).toIso8601String().replaceFirst('T', ' ').substring(0, 19),
                ),
                _orderDetailRow(
                  'Status',
                  p2pOrderStateLabel(_order.orderState),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _openPayment,
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFFE7EDF8),
              foregroundColor: Colors.black,
              minimumSize: const Size.fromHeight(50),
            ),
            child: const Text('Next →', style: TextStyle(fontSize: 13.5)),
          ),
          TextButton(
            onPressed: _cancelOrder,
            child: const Text(
              'Cancel',
              style: TextStyle(fontSize: 13.2, color: Colors.white70),
            ),
          ),
        ],
      ),
    );
  }

  Widget _orderDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 7),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(fontSize: 11, color: Colors.white60),
            ),
          ),
          Text(
            value,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

class P2PPaymentPage extends StatefulWidget {
  const P2PPaymentPage({
    super.key,
    required this.order,
    required this.api,
    required this.buyerId,
    required this.onOpenChat,
  });

  final P2POrderItem order;
  final P2PApiService api;
  final String buyerId;
  final VoidCallback onOpenChat;

  @override
  State<P2PPaymentPage> createState() => _P2PPaymentPageState();
}

class _P2PPaymentPageState extends State<P2PPaymentPage> {
  late P2POrderItem _order;
  bool _payClicked = false;
  bool _processing = false;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _order = widget.order.orderState == P2POrderState.created
        ? widget.order.copyWith(
            orderState: P2POrderState.awaitingPayment,
            status: p2pOrderStateLabel(P2POrderState.awaitingPayment),
          )
        : widget.order;
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String _countdown() {
    final left = _order.expiresAtMs - DateTime.now().millisecondsSinceEpoch;
    if (left <= 0) return '00:00';
    final min = (left ~/ 60000).toString().padLeft(2, '0');
    final sec = ((left % 60000) ~/ 1000).toString().padLeft(2, '0');
    return '$min:$sec';
  }

  Future<void> _uploadProof() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery);
    if (picked == null) return;
    setState(() {
      _order = _order.copyWith(paymentProofPath: picked.path);
    });
  }

  Future<void> _confirmPaid() async {
    if (_processing) return;
    if (_order.orderState == P2POrderState.completed) return;
    final canConfirm =
        _order.orderState == P2POrderState.created ||
        _order.orderState == P2POrderState.awaitingPayment;
    if (!canConfirm) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Payment already submitted')),
      );
      return;
    }
    if (!_payClicked) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tap PAY button before confirming')),
      );
      return;
    }
    if (_order.paymentProofPath == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Upload payment proof screenshot first')),
      );
      return;
    }
    setState(() => _processing = true);
    try {
      var next = await widget.api.markPaid(
        order: _order,
        paymentProofPath: _order.paymentProofPath,
      );
      if (!mounted) return;
      setState(() => _order = next);
      await Future<void>.delayed(const Duration(seconds: 1));
      next = await widget.api.markSellerConfirming(next);
      if (!mounted) return;
      setState(() => _order = next);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Payment sent. Waiting for seller confirmation.'),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Payment flow error: $e')));
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  Future<void> _cancelOrder() async {
    final canCancel =
        _order.orderState == P2POrderState.created ||
        _order.orderState == P2POrderState.awaitingPayment;
    if (!canCancel) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Cancel is allowed only before payment is sent'),
        ),
      );
      return;
    }
    final reason = await Navigator.of(context).push<String>(
      MaterialPageRoute<String>(builder: (_) => const P2PCancelReasonPage()),
    );
    if (reason == null || reason.isEmpty) return;
    try {
      final cancelled = await widget.api.cancelOrder(
        order: _order,
        reason: reason,
      );
      if (!mounted) return;
      setState(() => _order = cancelled);
      Navigator.of(context).pop(_order);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Cancel failed: $e')));
    }
  }

  Future<void> _raiseDispute() async {
    final canAppeal =
        _order.orderState == P2POrderState.paymentSent ||
        _order.orderState == P2POrderState.sellerConfirming;
    if (!canAppeal) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Appeal can be opened after payment is marked sent'),
        ),
      );
      return;
    }
    if (_order.paymentProofPath == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Upload payment proof before appeal')),
      );
      return;
    }
    const reasons = [
      'Seller not releasing crypto',
      'Payment completed but no response',
      'Seller offline',
      'Payment details incorrect',
      'Other issue',
    ];
    final reason = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: const Color(0xFF0C1324),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: reasons
              .map(
                (item) => ListTile(
                  title: Text(item, style: const TextStyle(fontSize: 11.3)),
                  onTap: () => Navigator.of(context).pop(item),
                ),
              )
              .toList(),
        ),
      ),
    );
    if (reason == null) return;
    try {
      final disputed = await widget.api.raiseDispute(
        order: _order,
        reason: reason,
        paymentProofPath: _order.paymentProofPath!,
      );
      if (!mounted) return;
      setState(() => _order = disputed);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Appeal opened. Support team moved order to review.'),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Appeal failed: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final completed = _order.orderState == P2POrderState.completed;
    final canConfirm =
        _order.orderState == P2POrderState.created ||
        _order.orderState == P2POrderState.awaitingPayment;
    final canCancel =
        _order.orderState == P2POrderState.created ||
        _order.orderState == P2POrderState.awaitingPayment;
    final canOpenAppeal =
        _order.orderState == P2POrderState.paymentSent ||
        _order.orderState == P2POrderState.sellerConfirming;
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          onPressed: () => Navigator.of(context).pop(_order),
          icon: const Icon(Icons.arrow_back),
        ),
        title: Text(_order.counterparty),
        actions: [
          IconButton(
            onPressed: widget.onOpenChat,
            icon: const Icon(Icons.forum_outlined),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(14),
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF1E1A12),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF473D2C)),
            ),
            child: const Text(
              'Remember to click paid after transferring funds. Use only verified payment rails.',
              style: TextStyle(fontSize: 10.8, color: Colors.white70),
            ),
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF1E2B46)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'To be paid ₹${_order.fiatAmount.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Please pay within ${_countdown()}',
                        style: const TextStyle(
                          fontSize: 11.2,
                          color: Color(0xFF22BCD5),
                        ),
                      ),
                    ],
                  ),
                ),
                FilledButton(
                  onPressed: completed
                      ? null
                      : () => setState(() => _payClicked = true),
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.black,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('PAY'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _uploadProof,
                  icon: const Icon(Icons.image_outlined, size: 16),
                  label: const Text('Upload Proof'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: widget.onOpenChat,
                  icon: const Icon(Icons.chat_bubble_outline, size: 16),
                  label: const Text('Chat'),
                ),
              ),
            ],
          ),
          if (_order.paymentProofPath != null) ...[
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Image.file(
                File(_order.paymentProofPath!),
                height: 180,
                fit: BoxFit.cover,
              ),
            ),
          ],
          const SizedBox(height: 10),
          _statusLine('Order', p2pOrderStateLabel(_order.orderState)),
          _statusLine('Payment method', _order.paymentMethod),
          _statusLine('Fee', '${_order.feeUsdt.toStringAsFixed(2)} USDT'),
          const SizedBox(height: 14),
          FilledButton(
            onPressed: completed
                ? null
                : _processing
                ? null
                : (canConfirm ? _confirmPaid : null),
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF53D983),
              foregroundColor: Colors.black,
              minimumSize: const Size.fromHeight(47),
            ),
            child: Text(
              completed
                  ? 'COMPLETED'
                  : (canOpenAppeal
                        ? 'PAYMENT SENT'
                        : (_order.orderState == P2POrderState.underReview ||
                                  _order.orderState ==
                                      P2POrderState.appealOpened
                              ? 'UNDER REVIEW'
                              : (_processing
                                    ? 'Processing...'
                                    : 'I HAVE PAID'))),
              style: const TextStyle(
                fontSize: 12.4,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(height: 7),
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: completed || !canOpenAppeal ? null : _raiseDispute,
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFFFFAE42),
                    foregroundColor: Colors.black,
                  ),
                  child: const Text(
                    'OPEN APPEAL',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextButton(
                  onPressed: completed || !canCancel ? null : _cancelOrder,
                  child: const Text('Cancel Order'),
                ),
              ),
            ],
          ),
          if (completed)
            FilledButton(
              onPressed: () => Navigator.of(context).pop(_order),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF111B31),
                minimumSize: const Size.fromHeight(44),
              ),
              child: const Text('Back to Orders'),
            ),
        ],
      ),
    );
  }

  Widget _statusLine(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 5),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(fontSize: 10.8, color: Colors.white60),
            ),
          ),
          Text(
            value,
            style: const TextStyle(fontSize: 11.2, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

class P2PCancelReasonPage extends StatefulWidget {
  const P2PCancelReasonPage({super.key});

  @override
  State<P2PCancelReasonPage> createState() => _P2PCancelReasonPageState();
}

class _P2PCancelReasonPageState extends State<P2PCancelReasonPage> {
  static const reasons = [
    "I don't want to proceed with this order.",
    "Seller requirements issue",
    "I don't know how to make the payment.",
    'I agreed with seller to cancel the order',
    'I could not reach the seller',
    "The seller's payment details are incorrect.",
    'The seller was rude or unprofessional.',
    'Suspected scam',
    'Other',
  ];
  String? _selected;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Cancel Order')),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(14),
              children: [
                const Text(
                  'Please select a reason for cancellation',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Order cancellation tips',
                  style: TextStyle(fontSize: 12, color: Color(0xFF18BDD6)),
                ),
                const SizedBox(height: 10),
                ...reasons.map(
                  (reason) => InkWell(
                    onTap: () => setState(() => _selected = reason),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        children: [
                          Icon(
                            _selected == reason
                                ? Icons.radio_button_checked
                                : Icons.radio_button_off,
                            size: 18,
                            color: _selected == reason
                                ? const Color(0xFF18BDD6)
                                : Colors.white54,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              reason,
                              style: const TextStyle(fontSize: 13.6),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          SafeArea(
            top: false,
            minimum: const EdgeInsets.fromLTRB(14, 8, 14, 34),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  "I have not paid the seller / I have received seller's refund",
                  style: TextStyle(fontSize: 11.6, color: Colors.white60),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _selected != null
                        ? () => Navigator.of(context).pop(_selected)
                        : null,
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFFCAD0DA),
                      foregroundColor: Colors.black54,
                      minimumSize: const Size.fromHeight(46),
                    ),
                    child: const Text(
                      'Confirm',
                      style: TextStyle(fontSize: 14),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class P2PAdminPanelPage extends StatefulWidget {
  const P2PAdminPanelPage({
    super.key,
    required this.orders,
    required this.appeals,
    required this.bannedMerchants,
    required this.logs,
    required this.onFreezeOrder,
    required this.onReleaseEscrow,
    required this.onReturnEscrow,
    required this.onCancelOrder,
    required this.onBanMerchant,
    required this.onTogglePause,
    required this.marketPaused,
  });

  final List<P2POrderItem> orders;
  final List<P2PAppealTicket> appeals;
  final Set<String> bannedMerchants;
  final List<P2PAdminLog> logs;
  final Future<void> Function(String orderId) onFreezeOrder;
  final Future<void> Function(String orderId) onReleaseEscrow;
  final Future<void> Function(String orderId) onReturnEscrow;
  final Future<void> Function(String orderId) onCancelOrder;
  final void Function(String merchant) onBanMerchant;
  final ValueChanged<bool> onTogglePause;
  final bool marketPaused;

  @override
  State<P2PAdminPanelPage> createState() => _P2PAdminPanelPageState();
}

class _P2PAdminPanelPageState extends State<P2PAdminPanelPage> {
  late bool _paused;

  @override
  void initState() {
    super.initState();
    _paused = widget.marketPaused;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('P2P Admin Panel')),
      body: ListView(
        padding: const EdgeInsets.all(14),
        children: [
          SwitchListTile(
            value: _paused,
            onChanged: (value) {
              setState(() => _paused = value);
              widget.onTogglePause(value);
            },
            title: const Text('Emergency P2P Pause'),
            subtitle: const Text('Stops new order creation'),
          ),
          const SizedBox(height: 8),
          const Text(
            'Appeal Queue',
            style: TextStyle(fontSize: 12.8, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          if (widget.appeals.isEmpty)
            const Text(
              'No active appeals',
              style: TextStyle(fontSize: 10.6, color: Colors.white60),
            ),
          ...widget.appeals.take(20).map((appeal) {
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF0D172A),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF22324F)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${appeal.orderId} • ${appeal.status}',
                          style: const TextStyle(
                            fontSize: 11.4,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      Text(
                        '${appeal.createdAt.hour.toString().padLeft(2, '0')}:${appeal.createdAt.minute.toString().padLeft(2, '0')}',
                        style: const TextStyle(
                          fontSize: 10,
                          color: Colors.white60,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 5),
                  Text(
                    'Buyer: ${appeal.buyer} • Seller: ${appeal.seller}',
                    style: const TextStyle(
                      fontSize: 10.3,
                      color: Colors.white70,
                    ),
                  ),
                  Text(
                    'Amount: ${appeal.amount}',
                    style: const TextStyle(
                      fontSize: 10.3,
                      color: Colors.white70,
                    ),
                  ),
                  Text(
                    'Reason: ${appeal.appealReason}',
                    style: const TextStyle(
                      fontSize: 10.3,
                      color: Colors.white70,
                    ),
                  ),
                  Text(
                    'Chat: ${appeal.chatSummary}',
                    style: const TextStyle(
                      fontSize: 10.3,
                      color: Colors.white70,
                    ),
                  ),
                  if (appeal.paymentProofPath.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.file(
                        File(appeal.paymentProofPath),
                        height: 96,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        errorBuilder: (_, error, stackTrace) => Container(
                          height: 64,
                          alignment: Alignment.centerLeft,
                          color: const Color(0xFF131D31),
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          child: Text(
                            'Proof path: ${appeal.paymentProofPath}',
                            style: const TextStyle(
                              fontSize: 10,
                              color: Colors.white60,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      OutlinedButton(
                        onPressed: () async {
                          await widget.onReleaseEscrow(appeal.orderId);
                          if (mounted) setState(() {});
                        },
                        child: const Text('Release To Buyer'),
                      ),
                      OutlinedButton(
                        onPressed: () async {
                          await widget.onReturnEscrow(appeal.orderId);
                          if (mounted) setState(() {});
                        },
                        child: const Text('Return To Seller'),
                      ),
                      OutlinedButton(
                        onPressed: () async {
                          await widget.onFreezeOrder(appeal.orderId);
                          if (mounted) setState(() {});
                        },
                        child: const Text('Freeze Order'),
                      ),
                      OutlinedButton(
                        onPressed: () {
                          widget.onBanMerchant(appeal.seller);
                          if (mounted) setState(() {});
                        },
                        child: const Text('Ban User'),
                      ),
                    ],
                  ),
                ],
              ),
            );
          }),
          const SizedBox(height: 8),
          const Text(
            'Admin Actions',
            style: TextStyle(fontSize: 12.8, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          ...widget.orders.take(12).map((order) {
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF0C1324),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF1D2A44)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${order.id} • ${order.counterparty}',
                    style: const TextStyle(
                      fontSize: 11.7,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${order.side} ${order.pair} • ${p2pOrderStateLabel(order.orderState)}',
                    style: const TextStyle(
                      fontSize: 10.4,
                      color: Colors.white70,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      OutlinedButton(
                        onPressed: () async {
                          await widget.onFreezeOrder(order.id);
                          if (mounted) setState(() {});
                        },
                        child: const Text('Freeze'),
                      ),
                      OutlinedButton(
                        onPressed: () async {
                          await widget.onReleaseEscrow(order.id);
                          if (mounted) setState(() {});
                        },
                        child: const Text('Release Crypto'),
                      ),
                      OutlinedButton(
                        onPressed: () async {
                          await widget.onReturnEscrow(order.id);
                          if (mounted) setState(() {});
                        },
                        child: const Text('Return Crypto'),
                      ),
                      OutlinedButton(
                        onPressed: () async {
                          await widget.onCancelOrder(order.id);
                          if (mounted) setState(() {});
                        },
                        child: const Text('Cancel Order'),
                      ),
                      OutlinedButton(
                        onPressed: () {
                          widget.onBanMerchant(order.counterparty);
                          if (mounted) setState(() {});
                        },
                        child: const Text('Ban Merchant'),
                      ),
                    ],
                  ),
                ],
              ),
            );
          }),
          const SizedBox(height: 8),
          const Text(
            'Banned Merchants',
            style: TextStyle(fontSize: 12.8, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          if (widget.bannedMerchants.isEmpty)
            const Text('No banned merchants', style: TextStyle(fontSize: 10.4)),
          ...widget.bannedMerchants.map(
            (merchant) =>
                Text('• $merchant', style: const TextStyle(fontSize: 10.6)),
          ),
          const SizedBox(height: 10),
          const Text(
            'Transaction Logs',
            style: TextStyle(fontSize: 12.8, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          if (widget.logs.isEmpty)
            const Text('No activity yet', style: TextStyle(fontSize: 10.4)),
          ...widget.logs.take(20).map((log) {
            final t =
                '${log.time.hour.toString().padLeft(2, '0')}:${log.time.minute.toString().padLeft(2, '0')}';
            return Container(
              margin: const EdgeInsets.only(bottom: 6),
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF0E1728),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF1E2B46)),
              ),
              child: Text(
                '[$t] ${log.action} • ${log.target} • ${log.meta}',
                style: const TextStyle(fontSize: 10.2, color: Colors.white70),
              ),
            );
          }),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFF0D172A),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFF22324F)),
            ),
            child: const Text(
              'API Endpoints: GET /p2p/offers, POST /p2p/order/create, POST /p2p/order/pay, POST /p2p/order/release, POST /p2p/order/cancel, POST /p2p/appeal, GET /p2p/chat, GET /p2p/disputes',
              style: TextStyle(fontSize: 10.1, color: Colors.white70),
            ),
          ),
        ],
      ),
    );
  }
}

class _P2PProfileNavTile extends StatelessWidget {
  const _P2PProfileNavTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF0C1324),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFF1D2A44)),
        ),
        child: Row(
          children: [
            Icon(icon, size: 22, color: Colors.white70),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 15.6,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 12.5,
                      color: Colors.white54,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, size: 22, color: Colors.white54),
          ],
        ),
      ),
    );
  }
}
