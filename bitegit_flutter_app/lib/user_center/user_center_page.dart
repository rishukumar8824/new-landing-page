// ignore_for_file: use_build_context_synchronously, deprecated_member_use, unnecessary_underscores

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../shared/path_image.dart';
import 'user_center_api.dart';

class BitegitUserCenterPage extends StatefulWidget {
  const BitegitUserCenterPage({
    super.key,
    required this.accessToken,
    required this.onToggleTheme,
    required this.fallbackIdentity,
    required this.fallbackUid,
    required this.fallbackNickname,
    required this.fallbackAvatarSymbol,
    required this.fallbackAvatarPath,
    required this.onLogout,
    this.onNicknameChanged,
  });

  final String accessToken;
  final VoidCallback onToggleTheme;
  final String fallbackIdentity;
  final String fallbackUid;
  final String fallbackNickname;
  final String fallbackAvatarSymbol;
  final String? fallbackAvatarPath;
  final VoidCallback onLogout;
  final ValueChanged<String>? onNicknameChanged;

  @override
  State<BitegitUserCenterPage> createState() => _BitegitUserCenterPageState();
}

class _BitegitUserCenterPageState extends State<BitegitUserCenterPage> {
  late final UserCenterApiService _api;

  bool _loading = true;
  bool _busy = false;
  String _activeTab = 'my-info';
  String _feeTab = 'VIP';

  Map<String, dynamic> _profile = <String, dynamic>{};
  Map<String, dynamic> _security = <String, dynamic>{};
  Map<String, dynamic> _identity = <String, dynamic>{};
  Map<String, dynamic> _preferences = <String, dynamic>{};
  Map<String, dynamic> _fees = <String, dynamic>{};
  List<dynamic> _addresses = <dynamic>[];
  Map<String, dynamic> _gifts = <String, dynamic>{};
  Map<String, dynamic> _referral = <String, dynamic>{};
  Map<String, dynamic> _supportCenter = <String, dynamic>{};
  List<dynamic> _tickets = <dynamic>[];
  List<dynamic> _helpArticles = <dynamic>[];
  Map<String, dynamic> _about = <String, dynamic>{};

  bool get _isLight => Theme.of(context).brightness == Brightness.light;
  Color get _bgColor => _isLight ? const Color(0xFFF5F7FB) : Colors.black;
  Color get _surfaceColor => _isLight ? Colors.white : const Color(0xFF0D0F14);
  Color get _cardBorderColor =>
      _isLight ? const Color(0xFFDCE2ED) : const Color(0xFF20232A);
  Color get _titleColor => _isLight ? const Color(0xFF121722) : Colors.white;
  Color get _subtleColor =>
      _isLight ? const Color(0xFF5F6777) : const Color(0xFF7B818F);
  Color get _mutedIconColor =>
      _isLight ? const Color(0xFF606978) : const Color(0xFF8D94A4);
  Color get _dividerColor =>
      _isLight ? const Color(0xFFE1E6F0) : const Color(0xFF1C1F25);

  @override
  void initState() {
    super.initState();
    _api = UserCenterApiService(accessToken: widget.accessToken);
    _loadAll();
  }

  Future<Map<String, dynamic>?> _safeCall(
    Future<Map<String, dynamic>> call,
  ) async {
    try {
      return await call;
    } catch (_) {
      return null;
    }
  }

  String _errorText(Object error) {
    final raw = error.toString();
    return raw.replaceFirst('Exception: ', '').trim();
  }

  void _showToast(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    return <String, dynamic>{};
  }

  List<dynamic> _asList(dynamic value) {
    if (value is List<dynamic>) {
      return value;
    }
    return <dynamic>[];
  }

  String _asString(dynamic value, [String fallback = '']) {
    final text = (value ?? '').toString().trim();
    return text.isEmpty ? fallback : text;
  }

  String _statusText(String raw) {
    final normalized = raw.trim().toLowerCase();
    if (normalized == 'verified') return 'Lv.1 Verified';
    if (normalized == 'pending') return 'Pending';
    return 'Unverified';
  }

  String _maskedIdentity(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return 'sum***@****';
    if (!trimmed.contains('@')) {
      if (trimmed.length < 4) return '***';
      return '${trimmed.substring(0, 2)}***${trimmed.substring(trimmed.length - 2)}';
    }

    final parts = trimmed.split('@');
    final name = parts.first;
    final domain = parts.last;
    final safeName = name.length <= 2
        ? '${name[0]}*'
        : '${name.substring(0, 2)}***';
    final safeDomain = domain.length <= 2
        ? domain
        : '${domain.substring(0, 2)}***';
    return '$safeName@$safeDomain';
  }

  Future<void> _runBusy(
    Future<void> Function() handler, {
    String? successMessage,
  }) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await handler();
      if (successMessage != null && successMessage.trim().isNotEmpty) {
        _showToast(successMessage);
      }
    } catch (error) {
      _showToast(_errorText(error));
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _loadAll() async {
    if (mounted) {
      setState(() => _loading = true);
    }

    final responses = await Future.wait<Map<String, dynamic>?>([
      _safeCall(_api.getMe()),
      _safeCall(_api.getIdentity()),
      _safeCall(_api.getPreferences()),
      _safeCall(_api.getFees()),
      _safeCall(_api.addresses()),
      _safeCall(_api.listGifts()),
      _safeCall(_api.referral()),
      _safeCall(_api.supportCenter()),
      _safeCall(_api.listTickets()),
      _safeCall(_api.helpArticles()),
      _safeCall(_api.about()),
    ]);

    if (!mounted) {
      return;
    }

    final meRes = responses[0];
    final identityRes = responses[1];
    final prefRes = responses[2];
    final feesRes = responses[3];
    final addressesRes = responses[4];
    final giftsRes = responses[5];
    final referralRes = responses[6];
    final supportRes = responses[7];
    final ticketsRes = responses[8];
    final helpRes = responses[9];
    final aboutRes = responses[10];

    final summary = _asMap(meRes?['data']);
    final profile = _asMap(summary['profile']);
    final security = _asMap(summary['security']);

    setState(() {
      _profile = profile;
      _security = security;
      _identity = _asMap(identityRes?['identity']);
      _preferences = _asMap(prefRes?['preferences']);
      _fees = _asMap(feesRes?['fees']);
      _addresses = _asList(addressesRes?['items']);
      _gifts = _asMap(giftsRes?['gifts']);
      _referral = _asMap(referralRes?['referral']);
      _supportCenter = <String, dynamic>{
        'announcements': _asList(supportRes?['announcements']),
        'tools': _asList(supportRes?['tools']),
      };
      _tickets = _asList(ticketsRes?['tickets']);
      _helpArticles = _asList(helpRes?['items']);
      _about = _asMap(aboutRes?['about']);
      _loading = false;
    });
  }

  Future<void> _copyUid() async {
    final uid = _asString(_profile['uid'], widget.fallbackUid);
    if (uid.isEmpty) {
      _showToast('UID unavailable');
      return;
    }
    await Clipboard.setData(ClipboardData(text: uid));
    _showToast('UID copied');
  }

  Future<void> _openProfileSheet() async {
    final nicknameController = TextEditingController(
      text: _asString(_profile['nickname'], widget.fallbackNickname),
    );
    final avatarController = TextEditingController(
      text: _asString(_profile['avatar']),
    );

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F1013),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            16,
            14,
            16,
            MediaQuery.of(sheetContext).viewInsets.bottom + 16,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Profile Management',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 12),
              _sheetInput(controller: nicknameController, label: 'Nickname'),
              const SizedBox(height: 10),
              _sheetInput(
                controller: avatarController,
                label: 'Profile image URL',
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _busy
                      ? null
                      : () {
                          _runBusy(() async {
                            await _api.updateProfile(<String, dynamic>{
                              'nickname': nicknameController.text.trim(),
                              'avatar': avatarController.text.trim(),
                            });
                            widget.onNicknameChanged?.call(
                              nicknameController.text.trim(),
                            );
                            await _loadAll();
                            if (mounted) {
                              Navigator.of(sheetContext).pop();
                            }
                          }, successMessage: 'Profile updated');
                        },
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.black,
                    minimumSize: const Size.fromHeight(46),
                  ),
                  child: const Text('Save Profile'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _openIdentitySheet() async {
    final countryController = TextEditingController(
      text: _asString(_identity['country']),
    );
    final nameController = TextEditingController(
      text: _asString(_identity['name']),
    );
    final idController = TextEditingController(
      text: _asString(_identity['idNumberMasked']),
    );
    String kycStatus = _asString(
      _identity['kycStatus'],
      'pending',
    ).toLowerCase();

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F1013),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: EdgeInsets.fromLTRB(
                16,
                14,
                16,
                MediaQuery.of(sheetContext).viewInsets.bottom + 16,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Identity Verification',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _sheetInput(controller: countryController, label: 'Country'),
                  const SizedBox(height: 10),
                  _sheetInput(controller: nameController, label: 'Name'),
                  const SizedBox(height: 10),
                  _sheetInput(
                    controller: idController,
                    label: 'ID number (masked)',
                  ),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<String>(
                    value: kycStatus,
                    dropdownColor: const Color(0xFF17191E),
                    style: const TextStyle(color: Colors.white),
                    items: const [
                      DropdownMenuItem(
                        value: 'unverified',
                        child: Text('Unverified'),
                      ),
                      DropdownMenuItem(
                        value: 'pending',
                        child: Text('Pending'),
                      ),
                      DropdownMenuItem(
                        value: 'verified',
                        child: Text('Verified'),
                      ),
                    ],
                    decoration: _sheetDecoration('KYC status'),
                    onChanged: (value) {
                      setSheetState(() {
                        kycStatus = (value ?? 'pending').trim().toLowerCase();
                      });
                    },
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _busy
                          ? null
                          : () {
                              _runBusy(() async {
                                await _api.updateIdentity(<String, dynamic>{
                                  'country': countryController.text.trim(),
                                  'name': nameController.text.trim(),
                                  'idNumberMasked': idController.text.trim(),
                                  'kycStatus': kycStatus,
                                });
                                await _loadAll();
                                if (mounted) {
                                  Navigator.of(sheetContext).pop();
                                }
                              }, successMessage: 'Identity updated');
                            },
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: Colors.black,
                        minimumSize: const Size.fromHeight(46),
                      ),
                      child: const Text('Save Identity'),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _openSecuritySheet() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F1013),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            16,
            14,
            16,
            MediaQuery.of(sheetContext).viewInsets.bottom + 16,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Security level ${_asString(_security['level'], 'Low')}',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 12),
              _securityActionTile(
                title: 'Change login password',
                onTap: _changePasswordDialog,
              ),
              _securityActionTile(
                title: 'Change phone number',
                onTap: _changePhoneDialog,
              ),
              _securityActionTile(
                title: 'Change email',
                onTap: _changeEmailDialog,
              ),
              _securityActionTile(
                title: 'Google Authenticator',
                onTap: _twoFaDialog,
              ),
              _securityActionTile(
                title: 'Set fund code',
                onTap: _fundCodeDialog,
              ),
              _securityActionTile(
                title: 'Login history',
                onTap: _loginHistoryDialog,
              ),
              _securityActionTile(
                title: 'Delete account',
                onTap: _deleteAccountDialog,
                danger: true,
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _securityActionTile({
    required String title,
    required Future<void> Function() onTap,
    bool danger = false,
  }) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(
        title,
        style: TextStyle(
          color: danger ? const Color(0xFFFF7E8D) : Colors.white,
        ),
      ),
      trailing: const Icon(Icons.chevron_right_rounded, color: Colors.white38),
      onTap: _busy ? null : onTap,
    );
  }

  Future<void> _changePasswordDialog() async {
    final current = TextEditingController();
    final next = TextEditingController();
    await _simpleDialog(
      title: 'Change Password',
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _sheetInput(
            controller: current,
            label: 'Current password',
            obscure: true,
          ),
          const SizedBox(height: 10),
          _sheetInput(controller: next, label: 'New password', obscure: true),
        ],
      ),
      onSubmit: () async {
        await _api.changePassword(<String, dynamic>{
          'currentPassword': current.text.trim(),
          'newPassword': next.text.trim(),
        });
      },
      successMessage: 'Password updated',
    );
  }

  Future<void> _changePhoneDialog() async {
    final controller = TextEditingController();
    await _simpleDialog(
      title: 'Change Phone Number',
      child: _sheetInput(controller: controller, label: 'Phone number'),
      onSubmit: () async {
        await _api.changePhone(<String, dynamic>{
          'phone': controller.text.trim(),
        });
        await _loadAll();
      },
      successMessage: 'Phone updated',
    );
  }

  Future<void> _changeEmailDialog() async {
    final controller = TextEditingController();
    await _simpleDialog(
      title: 'Change Email',
      child: _sheetInput(controller: controller, label: 'Email'),
      onSubmit: () async {
        await _api.changeEmail(<String, dynamic>{
          'email': controller.text.trim(),
        });
        await _loadAll();
      },
      successMessage: 'Email updated',
    );
  }

  Future<void> _fundCodeDialog() async {
    final controller = TextEditingController();
    await _simpleDialog(
      title: 'Set Fund Code',
      child: _sheetInput(
        controller: controller,
        label: '6-digit fund code',
        obscure: true,
      ),
      onSubmit: () async {
        await _api.setFundCode(<String, dynamic>{
          'fundCode': controller.text.trim(),
        });
      },
      successMessage: 'Fund code updated',
    );
  }

  Future<void> _twoFaDialog() async {
    final codeController = TextEditingController();

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          backgroundColor: const Color(0xFF111216),
          title: const Text(
            'Google Authenticator',
            style: TextStyle(color: Colors.white),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Generate secret QR, then verify with 6-digit code.',
                style: TextStyle(color: Colors.white70, fontSize: 12),
              ),
              const SizedBox(height: 10),
              _sheetInput(controller: codeController, label: '6-digit code'),
            ],
          ),
          actions: [
            TextButton(
              onPressed: _busy ? null : () => Navigator.of(dialogContext).pop(),
              child: const Text('Close'),
            ),
            TextButton(
              onPressed: _busy
                  ? null
                  : () {
                      _runBusy(() async {
                        await _api.link2fa(<String, dynamic>{
                          'action': 'generate',
                        });
                        if (mounted) Navigator.of(dialogContext).pop();
                      }, successMessage: '2FA secret generated');
                    },
              child: const Text('Generate'),
            ),
            FilledButton(
              onPressed: _busy
                  ? null
                  : () {
                      _runBusy(() async {
                        await _api.link2fa(<String, dynamic>{
                          'action': 'verify',
                          'code': codeController.text.trim(),
                        });
                        if (mounted) Navigator.of(dialogContext).pop();
                      }, successMessage: '2FA enabled');
                    },
              child: const Text('Verify'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _loginHistoryDialog() async {
    await _runBusy(() async {
      final res = await _api.loginHistory();
      final items = _asList(res['items']);

      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (dialogContext) {
          return AlertDialog(
            backgroundColor: const Color(0xFF111216),
            title: const Text(
              'Login History',
              style: TextStyle(color: Colors.white),
            ),
            content: SizedBox(
              width: 420,
              child: items.isEmpty
                  ? const Text(
                      'No login history',
                      style: TextStyle(color: Colors.white70),
                    )
                  : ListView.separated(
                      shrinkWrap: true,
                      itemCount: items.length,
                      separatorBuilder: (_, __) =>
                          const Divider(color: Color(0xFF24262D)),
                      itemBuilder: (context, index) {
                        final row = _asMap(items[index]);
                        return Text(
                          '${_asString(row['loginTime'])}\n${_asString(row['device'])} • ${_asString(row['ip'])}',
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 12,
                          ),
                        );
                      },
                    ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(),
                child: const Text('Close'),
              ),
            ],
          );
        },
      );
    });
  }

  Future<void> _deleteAccountDialog() async {
    final controller = TextEditingController();
    await _simpleDialog(
      title: 'Delete Account',
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Type DELETE to confirm permanent account deletion. Recovery window is 50 days.',
            style: TextStyle(color: Colors.white70, fontSize: 12),
          ),
          const SizedBox(height: 10),
          _sheetInput(controller: controller, label: 'Type DELETE'),
        ],
      ),
      onSubmit: () async {
        await _api.deleteAccount(<String, dynamic>{
          'confirmation': controller.text.trim(),
        });
      },
      successMessage: 'Account deletion requested',
      danger: true,
    );
  }

  Future<void> _openVipSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: const Color(0xFF0F1013),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'VIP Level',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 10),
              _infoCard(
                'Current level',
                _asString(_profile['vipLevel'], 'Non-VIP'),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _openFeesSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F1013),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final feeTabs = _fees.keys.map((e) => e.toString()).toList();
            final selectedTab = feeTabs.contains(_feeTab)
                ? _feeTab
                : (feeTabs.isEmpty ? 'VIP' : feeTabs.first);
            final feeRows = _asList(_fees[selectedTab]);

            return Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
              child: SizedBox(
                height: MediaQuery.of(context).size.height * 0.75,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'My Fee Rates',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: feeTabs
                          .map(
                            (tab) => ChoiceChip(
                              label: Text(tab),
                              selected: selectedTab == tab,
                              selectedColor: Colors.white,
                              labelStyle: TextStyle(
                                color: selectedTab == tab
                                    ? Colors.black
                                    : Colors.white70,
                              ),
                              backgroundColor: const Color(0xFF1A1D23),
                              onSelected: (_) {
                                setSheetState(() {
                                  _feeTab = tab;
                                });
                              },
                            ),
                          )
                          .toList(),
                    ),
                    const SizedBox(height: 10),
                    Expanded(
                      child: ListView.separated(
                        itemCount: feeRows.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final row = _asMap(feeRows[index]);
                          return Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFF15171C),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: const Color(0xFF262A31),
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _asString(row['tierLabel'], '-'),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Maker: ${_asString(row['makerFee'])} • Taker: ${_asString(row['takerFee'])}',
                                  style: const TextStyle(
                                    color: Colors.white70,
                                    fontSize: 12,
                                  ),
                                ),
                                Text(
                                  'Withdrawal: ${_asString(row['withdrawalFee'])} • Min: ${_asString(row['minWithdrawal'])}',
                                  style: const TextStyle(
                                    color: Colors.white54,
                                    fontSize: 12,
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
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _openAddressesSheet() async {
    final addressController = TextEditingController();
    final labelController = TextEditingController();
    final networkController = TextEditingController(text: 'TRC20');
    String coin = 'USDT';

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F1013),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: EdgeInsets.fromLTRB(
                16,
                16,
                16,
                MediaQuery.of(sheetContext).viewInsets.bottom + 16,
              ),
              child: SizedBox(
                height: MediaQuery.of(context).size.height * 0.8,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Addresses',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: coin,
                            dropdownColor: const Color(0xFF17191E),
                            style: const TextStyle(color: Colors.white),
                            items:
                                const [
                                      'BTC',
                                      'USDT',
                                      'ETH',
                                      'LTC',
                                      'BCH',
                                      'TRX',
                                      'DOGE',
                                      'XRP',
                                      'SOL',
                                      'BNB',
                                    ]
                                    .map(
                                      (c) => DropdownMenuItem(
                                        value: c,
                                        child: Text(c),
                                      ),
                                    )
                                    .toList(),
                            decoration: _sheetDecoration('Coin'),
                            onChanged: (value) {
                              setSheetState(() {
                                coin = (value ?? 'USDT').trim().toUpperCase();
                              });
                            },
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _sheetInput(
                            controller: networkController,
                            label: 'Network',
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    _sheetInput(
                      controller: addressController,
                      label: 'Address',
                    ),
                    const SizedBox(height: 8),
                    _sheetInput(controller: labelController, label: 'Label'),
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: _busy
                            ? null
                            : () {
                                _runBusy(() async {
                                  await _api.addAddress(<String, dynamic>{
                                    'coin': coin,
                                    'network': networkController.text.trim(),
                                    'address': addressController.text.trim(),
                                    'label': labelController.text.trim(),
                                  });
                                  await _loadAll();
                                  if (mounted) Navigator.of(sheetContext).pop();
                                }, successMessage: 'Address added');
                              },
                        style: FilledButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: Colors.black,
                          minimumSize: const Size.fromHeight(44),
                        ),
                        child: const Text('Add Address'),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Expanded(
                      child: _addresses.isEmpty
                          ? const Center(
                              child: Text(
                                'No addresses added',
                                style: TextStyle(color: Colors.white54),
                              ),
                            )
                          : ListView.separated(
                              itemCount: _addresses.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(height: 8),
                              itemBuilder: (context, index) {
                                final row = _asMap(_addresses[index]);
                                return Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF15171C),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: const Color(0xFF262A31),
                                    ),
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Text(
                                            '${_asString(row['coin'])} - ${_asString(row['network'])}',
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                          const Spacer(),
                                          InkWell(
                                            onTap: _busy
                                                ? null
                                                : () {
                                                    _runBusy(
                                                      () async {
                                                        final id =
                                                            int.tryParse(
                                                              _asString(
                                                                row['id'],
                                                              ),
                                                            ) ??
                                                            0;
                                                        if (id > 0) {
                                                          await _api
                                                              .removeAddress(
                                                                id,
                                                              );
                                                          await _loadAll();
                                                        }
                                                      },
                                                      successMessage:
                                                          'Address deleted',
                                                    );
                                                  },
                                            child: const Text(
                                              'Delete',
                                              style: TextStyle(
                                                color: Color(0xFFFF7E8D),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        _asString(row['address']),
                                        style: const TextStyle(
                                          color: Colors.white70,
                                          fontSize: 12,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        _asString(row['label']),
                                        style: const TextStyle(
                                          color: Colors.white54,
                                          fontSize: 11,
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
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _openPreferencesSheet() async {
    final languageController = TextEditingController(
      text: _asString(_preferences['language'], 'en'),
    );
    final currencyController = TextEditingController(
      text: _asString(_preferences['currency'], 'USD'),
    );
    String theme = _asString(_preferences['theme'], 'dark').toLowerCase();
    String trend = _asString(
      _preferences['trendColors'],
      'green-up',
    ).toLowerCase();
    bool push = _preferences['pushNotifications'] == true;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F1013),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: EdgeInsets.fromLTRB(
                16,
                14,
                16,
                MediaQuery.of(sheetContext).viewInsets.bottom + 16,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Preferences',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _sheetInput(
                    controller: languageController,
                    label: 'Language',
                  ),
                  const SizedBox(height: 10),
                  _sheetInput(
                    controller: currencyController,
                    label: 'Currency',
                  ),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<String>(
                    value: theme,
                    dropdownColor: const Color(0xFF17191E),
                    style: const TextStyle(color: Colors.white),
                    decoration: _sheetDecoration('Theme'),
                    items: const [
                      DropdownMenuItem(value: 'dark', child: Text('dark')),
                      DropdownMenuItem(value: 'light', child: Text('light')),
                    ],
                    onChanged: (value) {
                      setSheetState(() {
                        theme = (value ?? 'dark').trim().toLowerCase();
                      });
                    },
                  ),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<String>(
                    value: trend,
                    dropdownColor: const Color(0xFF17191E),
                    style: const TextStyle(color: Colors.white),
                    decoration: _sheetDecoration('Trend colors'),
                    items: const [
                      DropdownMenuItem(
                        value: 'green-up',
                        child: Text('green-up'),
                      ),
                      DropdownMenuItem(value: 'red-up', child: Text('red-up')),
                    ],
                    onChanged: (value) {
                      setSheetState(() {
                        trend = (value ?? 'green-up').trim().toLowerCase();
                      });
                    },
                  ),
                  SwitchListTile.adaptive(
                    value: push,
                    contentPadding: EdgeInsets.zero,
                    title: const Text(
                      'Push notifications',
                      style: TextStyle(color: Colors.white),
                    ),
                    onChanged: (value) {
                      setSheetState(() {
                        push = value;
                      });
                    },
                  ),
                  const SizedBox(height: 6),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _busy
                          ? null
                          : () {
                              _runBusy(() async {
                                await _api.updatePreferences(<String, dynamic>{
                                  'language': languageController.text.trim(),
                                  'currency': currencyController.text.trim(),
                                  'theme': theme,
                                  'trendColors': trend,
                                  'pushNotifications': push,
                                });
                                await _loadAll();
                                if (mounted) {
                                  Navigator.of(sheetContext).pop();
                                }
                              }, successMessage: 'Preferences updated');
                            },
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: Colors.black,
                        minimumSize: const Size.fromHeight(46),
                      ),
                      child: const Text('Save Preferences'),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _openGiftSheet() async {
    final assetController = TextEditingController(text: 'USDT');
    final amountController = TextEditingController();
    final claimController = TextEditingController();

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F1013),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) {
        final created = _asList(_gifts['created']);
        return Padding(
          padding: EdgeInsets.fromLTRB(
            16,
            16,
            16,
            MediaQuery.of(sheetContext).viewInsets.bottom + 16,
          ),
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.82,
            child: ListView(
              children: [
                const Text(
                  'Crypto Gift',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 10),
                _sheetInput(
                  controller: assetController,
                  label: 'Asset (USDT/BTC/ETH...)',
                ),
                const SizedBox(height: 8),
                _sheetInput(controller: amountController, label: 'Amount'),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _busy
                        ? null
                        : () {
                            _runBusy(() async {
                              await _api.createGift(<String, dynamic>{
                                'asset': assetController.text.trim(),
                                'amount':
                                    double.tryParse(
                                      amountController.text.trim(),
                                    ) ??
                                    0,
                              });
                              await _loadAll();
                              if (mounted) Navigator.of(sheetContext).pop();
                            }, successMessage: 'Gift created');
                          },
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: Colors.black,
                    ),
                    child: const Text('Create Gift'),
                  ),
                ),
                const SizedBox(height: 14),
                _sheetInput(controller: claimController, label: 'Gift code'),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: _busy
                        ? null
                        : () {
                            _runBusy(() async {
                              await _api.claimGift(<String, dynamic>{
                                'giftCode': claimController.text.trim(),
                              });
                              await _loadAll();
                              if (mounted) Navigator.of(sheetContext).pop();
                            }, successMessage: 'Gift claimed');
                          },
                    child: const Text('Claim Gift'),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Created gifts',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                if (created.isEmpty)
                  const Text(
                    'No gifts created yet.',
                    style: TextStyle(color: Colors.white54),
                  ),
                ...created.map((item) {
                  final row = _asMap(item);
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF15171C),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF262A31)),
                    ),
                    child: Text(
                      '${_asString(row['asset'])} ${_asString(row['amount'])} • ${_asString(row['giftCode'])} • ${_asString(row['status'])}',
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 12,
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _openReferralSheet() async {
    final invites = _asList(_referral['invites']);
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F1013),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.75,
            child: ListView(
              children: [
                const Text(
                  'Referral',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 10),
                _infoCard(
                  'Referral code',
                  _asString(_referral['referralCode'], '-'),
                ),
                const SizedBox(height: 8),
                _infoCard('Invites', _asString(_referral['totalInvites'], '0')),
                const SizedBox(height: 8),
                _infoCard('Rewards', _asString(_referral['totalRewards'], '0')),
                const SizedBox(height: 12),
                const Text(
                  'Recent invites',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                if (invites.isEmpty)
                  const Text(
                    'No invite records.',
                    style: TextStyle(color: Colors.white54),
                  ),
                ...invites.map((item) {
                  final row = _asMap(item);
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF15171C),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF262A31)),
                    ),
                    child: Text(
                      '${_asString(row['referredUser'])} • Reward ${_asString(row['rewardAmount'])} • ${_asString(row['createdAt'])}',
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 12,
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _openSupportSheet() async {
    final announcements = _asList(_supportCenter['announcements']);
    final tools = _asList(_supportCenter['tools']);
    final subjectController = TextEditingController();
    final messageController = TextEditingController();

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F1013),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            16,
            16,
            16,
            MediaQuery.of(sheetContext).viewInsets.bottom + 16,
          ),
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.85,
            child: ListView(
              children: [
                const Text(
                  'Support Center',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Announcements',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                ...announcements.map((item) {
                  final row = _asMap(item);
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF15171C),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF262A31)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _asString(row['title']),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _asString(row['body']),
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  );
                }),
                const SizedBox(height: 8),
                const Text(
                  'Self-service tools',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: tools
                      .map((item) {
                        final row = _asMap(item);
                        return Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFF15171C),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0xFF262A31)),
                          ),
                          child: Text(
                            _asString(row['label'], 'Tool'),
                            style: const TextStyle(color: Colors.white70),
                          ),
                        );
                      })
                      .toList()
                      .cast<Widget>(),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Create ticket',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                _sheetInput(controller: subjectController, label: 'Subject'),
                const SizedBox(height: 8),
                _sheetInput(controller: messageController, label: 'Message'),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _busy
                        ? null
                        : () {
                            _runBusy(() async {
                              await _api.createTicket(<String, dynamic>{
                                'subject': subjectController.text.trim(),
                                'category': 'general',
                                'message': messageController.text.trim(),
                              });
                              await _loadAll();
                              if (mounted) Navigator.of(sheetContext).pop();
                            }, successMessage: 'Ticket created');
                          },
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: Colors.black,
                    ),
                    child: const Text('Submit Ticket'),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'My tickets',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                if (_tickets.isEmpty)
                  const Text(
                    'No support tickets.',
                    style: TextStyle(color: Colors.white54),
                  ),
                ..._tickets.map((item) {
                  final row = _asMap(item);
                  final ticketId = int.tryParse(_asString(row['id'])) ?? 0;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF15171C),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF262A31)),
                    ),
                    child: ListTile(
                      title: Text(
                        '#${_asString(row['id'])} ${_asString(row['subject'])}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                        ),
                      ),
                      subtitle: Text(
                        _asString(row['status']),
                        style: const TextStyle(color: Colors.white54),
                      ),
                      trailing: const Icon(
                        Icons.chevron_right_rounded,
                        color: Colors.white38,
                      ),
                      onTap: ticketId <= 0
                          ? null
                          : () async {
                              await _openTicketChat(ticketId);
                            },
                    ),
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _openTicketChat(int ticketId) async {
    final messageController = TextEditingController();
    List<dynamic> messages = <dynamic>[];

    await _runBusy(() async {
      final res = await _api.listTicketMessages(ticketId);
      messages = _asList(res['messages']);
    });

    if (!mounted) return;

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: const Color(0xFF111216),
              title: Text(
                'Ticket #$ticketId',
                style: const TextStyle(color: Colors.white),
              ),
              content: SizedBox(
                width: 420,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      height: 260,
                      child: messages.isEmpty
                          ? const Center(
                              child: Text(
                                'No messages',
                                style: TextStyle(color: Colors.white54),
                              ),
                            )
                          : ListView.separated(
                              itemCount: messages.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(height: 6),
                              itemBuilder: (context, index) {
                                final row = _asMap(messages[index]);
                                final sender = _asString(
                                  row['senderType'],
                                  'user',
                                );
                                return Align(
                                  alignment: sender == 'user'
                                      ? Alignment.centerLeft
                                      : Alignment.centerRight,
                                  child: Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: sender == 'user'
                                          ? const Color(0xFF252932)
                                          : (sender == 'agent'
                                                ? const Color(0xFF173A63)
                                                : const Color(0xFF23472F)),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      '${_asString(row['message'])}\n${_asString(row['createdAt'])}',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: messageController,
                      style: const TextStyle(color: Colors.white),
                      decoration: _sheetDecoration('Type message'),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(),
                  child: const Text('Close'),
                ),
                FilledButton(
                  onPressed: _busy
                      ? null
                      : () {
                          _runBusy(() async {
                            await _api.sendTicketMessage(
                              ticketId,
                              <String, dynamic>{
                                'message': messageController.text.trim(),
                              },
                            );
                            final res = await _api.listTicketMessages(ticketId);
                            final fresh = _asList(res['messages']);
                            setDialogState(() {
                              messages = fresh;
                              messageController.clear();
                            });
                            await _loadAll();
                          });
                        },
                  child: const Text('Send'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _openHelpSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F1013),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.8,
            child: ListView(
              children: [
                const Text(
                  'Help Center',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 10),
                if (_helpArticles.isEmpty)
                  const Text(
                    'No help articles',
                    style: TextStyle(color: Colors.white54),
                  ),
                ..._helpArticles.map((item) {
                  final row = _asMap(item);
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF15171C),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF262A31)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _asString(row['topic']),
                          style: const TextStyle(
                            color: Colors.white54,
                            fontSize: 11,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _asString(row['title']),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _asString(row['content']),
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _openAboutSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: const Color(0xFF0F1013),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'About',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 10),
              _infoCard('Name', _asString(_about['name'], 'Bitegit')),
              const SizedBox(height: 8),
              _infoCard('Version', _asString(_about['version'], '1.0.0')),
              const SizedBox(height: 8),
              _infoCard(
                'Description',
                _asString(_about['description'], 'Bitegit User Center'),
              ),
              const SizedBox(height: 8),
              _infoCard(
                'Support',
                _asString(_about['supportEmail'], 'support@bitegit.com'),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _openSocialsSheet() async {
    const links = <Map<String, String>>[
      <String, String>{'label': 'X (Twitter)', 'url': 'https://x.com/bitegit'},
      <String, String>{'label': 'Telegram', 'url': 'https://t.me/bitegit'},
      <String, String>{'label': 'Discord', 'url': 'https://discord.gg/bitegit'},
    ];

    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: const Color(0xFF0F1013),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Socials',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 10),
              ...links.map((item) {
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    item['label']!,
                    style: const TextStyle(color: Colors.white),
                  ),
                  subtitle: Text(
                    item['url']!,
                    style: const TextStyle(color: Colors.white54, fontSize: 12),
                  ),
                  trailing: const Icon(
                    Icons.copy_rounded,
                    color: Colors.white38,
                  ),
                  onTap: () async {
                    await Clipboard.setData(ClipboardData(text: item['url']!));
                    _showToast('Link copied');
                  },
                );
              }),
            ],
          ),
        );
      },
    );
  }

  Future<void> _openEventsSheet() async {
    final announcements = _asList(_supportCenter['announcements']);
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F1013),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.72,
            child: ListView(
              children: [
                const Text(
                  'Events',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 10),
                if (announcements.isEmpty)
                  const Text(
                    'No active events.',
                    style: TextStyle(color: Colors.white54),
                  ),
                ...announcements.map((item) {
                  final row = _asMap(item);
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF15171C),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF262A31)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _asString(row['title']),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _asString(row['body']),
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _simpleDialog({
    required String title,
    required Widget child,
    required Future<void> Function() onSubmit,
    String? successMessage,
    bool danger = false,
  }) async {
    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          backgroundColor: const Color(0xFF111216),
          title: Text(title, style: const TextStyle(color: Colors.white)),
          content: child,
          actions: [
            TextButton(
              onPressed: _busy ? null : () => Navigator.of(dialogContext).pop(),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: _busy
                  ? null
                  : () {
                      _runBusy(() async {
                        await onSubmit();
                        if (mounted) Navigator.of(dialogContext).pop();
                      }, successMessage: successMessage);
                    },
              style: FilledButton.styleFrom(
                backgroundColor: danger
                    ? const Color(0xFFFF4D5A)
                    : Colors.white,
                foregroundColor: danger ? Colors.white : Colors.black,
              ),
              child: Text(danger ? 'Delete' : 'Save'),
            ),
          ],
        );
      },
    );
  }

  InputDecoration _sheetDecoration(String label) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: Colors.white54),
      filled: true,
      fillColor: const Color(0xFF16181D),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF2B2E35)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Colors.white54),
      ),
    );
  }

  Widget _sheetInput({
    required TextEditingController controller,
    required String label,
    bool obscure = false,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      style: const TextStyle(color: Colors.white),
      decoration: _sheetDecoration(label),
    );
  }

  Widget _infoCard(String title, String value) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFF15171C),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF262A31)),
      ),
      child: Row(
        children: [
          Text(title, style: const TextStyle(color: Colors.white70)),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAvatar() {
    final avatarUrl = _asString(_profile['avatar']);
    final nickname = _asString(_profile['nickname'], widget.fallbackNickname);

    if (avatarUrl.isNotEmpty) {
      return ClipOval(
        child: Image.network(
          avatarUrl,
          width: 42,
          height: 42,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _avatarFallback(nickname),
        ),
      );
    }

    final localPath = (widget.fallbackAvatarPath ?? '').trim();
    if (localPath.isNotEmpty) {
      final localAvatar = imageWidgetForPath(
        localPath,
        width: 42,
        height: 42,
        fit: BoxFit.cover,
      );
      if (localAvatar is! SizedBox) {
        return ClipOval(child: localAvatar);
      }
    }

    return _avatarFallback(nickname);
  }

  Widget _avatarFallback(String nickname) {
    final symbol = nickname.isNotEmpty
        ? nickname.substring(0, 1).toUpperCase()
        : widget.fallbackAvatarSymbol.trim().isNotEmpty
        ? widget.fallbackAvatarSymbol.trim().substring(0, 1).toUpperCase()
        : 'B';

    return Container(
      width: 42,
      height: 42,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: _isLight ? const Color(0xFFE6EAF3) : const Color(0xFF2A2D33),
      ),
      alignment: Alignment.center,
      child: Text(
        symbol,
        style: TextStyle(
          color: _isLight ? const Color(0xFF162033) : Colors.white,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  Widget _row({
    required IconData icon,
    required String title,
    required String value,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: _dividerColor)),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 20,
              color: _isLight
                  ? const Color(0xFF4F5868)
                  : const Color(0xFFA3A7AF),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: TextStyle(color: _titleColor, fontSize: 16.5),
              ),
            ),
            if (value.isNotEmpty)
              Flexible(
                child: Text(
                  value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: _isLight
                        ? const Color(0xFF6D7685)
                        : const Color(0xFF747A86),
                    fontSize: 13.2,
                  ),
                ),
              ),
            const SizedBox(width: 6),
            Icon(
              Icons.chevron_right_rounded,
              size: 19,
              color: _isLight
                  ? const Color(0xFF788293)
                  : const Color(0xFF5F6673),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _myInfoRows() {
    final uid = _asString(_profile['uid'], widget.fallbackUid);
    final nickname = _asString(_profile['nickname'], widget.fallbackNickname);
    final kycStatus = _asString(
      _identity['kycStatus'],
      _asString(_profile['kycStatus'], 'pending'),
    );

    return [
      _row(
        icon: Icons.account_circle_outlined,
        title: 'Profile Picture',
        value: '',
        onTap: _openProfileSheet,
      ),
      _row(
        icon: Icons.badge_outlined,
        title: 'Nickname',
        value: nickname,
        onTap: _openProfileSheet,
      ),
      _row(
        icon: Icons.perm_identity_outlined,
        title: 'UID',
        value: uid,
        onTap: _copyUid,
      ),
      _row(
        icon: Icons.verified_user_outlined,
        title: 'Identity Verification',
        value: _statusText(kycStatus),
        onTap: _openIdentitySheet,
      ),
      _row(
        icon: Icons.security_outlined,
        title: 'Security',
        value: 'Set up 2FA Verification',
        onTap: _openSecuritySheet,
      ),
      _row(
        icon: Icons.workspace_premium_outlined,
        title: 'VIP Level',
        value: _asString(_profile['vipLevel'], 'Non-VIP'),
        onTap: _openVipSheet,
      ),
      _row(
        icon: Icons.percent_outlined,
        title: 'My Fee Rates',
        value: '',
        onTap: _openFeesSheet,
      ),
    ];
  }

  List<Widget> _preferenceRows() {
    return [
      _row(
        icon: Icons.account_balance_wallet_outlined,
        title: 'Addresses',
        value: _addresses.length.toString(),
        onTap: _openAddressesSheet,
      ),
      _row(
        icon: Icons.tune_rounded,
        title: 'Preferences',
        value: _asString(_preferences['theme'], 'dark'),
        onTap: _openPreferencesSheet,
      ),
      _row(
        icon: Icons.redeem_outlined,
        title: 'Gift',
        value: '',
        onTap: _openGiftSheet,
      ),
      _row(
        icon: Icons.group_add_outlined,
        title: 'Referral',
        value: _asString(_referral['referralCode']),
        onTap: _openReferralSheet,
      ),
    ];
  }

  List<Widget> _generalRows() {
    return [
      _row(
        icon: Icons.share_outlined,
        title: 'Socials',
        value: '',
        onTap: _openSocialsSheet,
      ),
      _row(
        icon: Icons.event_available_outlined,
        title: 'Events',
        value: '',
        onTap: _openEventsSheet,
      ),
      _row(
        icon: Icons.support_agent_outlined,
        title: 'Support',
        value: _tickets.length.toString(),
        onTap: _openSupportSheet,
      ),
      _row(
        icon: Icons.help_outline,
        title: 'Help',
        value: _helpArticles.length.toString(),
        onTap: _openHelpSheet,
      ),
      _row(
        icon: Icons.info_outline,
        title: 'About',
        value: _asString(_about['name'], 'Bitegit'),
        onTap: _openAboutSheet,
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final maskedEmail = _asString(
      _profile['maskedEmail'],
      _maskedIdentity(widget.fallbackIdentity),
    );
    final uid = _asString(_profile['uid'], widget.fallbackUid);
    final securityLevel = _asString(_security['level'], 'Low');
    final verificationBadge = _statusText(
      _asString(
        _identity['kycStatus'],
        _asString(_profile['kycStatus'], 'pending'),
      ),
    );
    final vipBadge = _asString(_profile['vipLevel'], 'Non-VIP');

    final headingSize = MediaQuery.of(context).size.width < 390 ? 38.0 : 42.0;

    return Scaffold(
      backgroundColor: _bgColor,
      body: SafeArea(
        child: RefreshIndicator(
          color: _isLight ? Colors.white : Colors.black,
          backgroundColor: _isLight ? const Color(0xFF101522) : Colors.white,
          onRefresh: _loadAll,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 18),
            children: [
              if (_loading)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      minHeight: 3.5,
                      backgroundColor: _isLight
                          ? const Color(0xFFD8DFED)
                          : const Color(0xFF222A36),
                      color: _isLight
                          ? const Color(0xFF111522)
                          : Colors.white70,
                    ),
                  ),
                ),
              Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: Icon(
                      Icons.arrow_back_ios_new_rounded,
                      size: 20,
                      color: _titleColor,
                    ),
                  ),
                  Expanded(
                    child: Text(
                      'User Center',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: _titleColor,
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: widget.onToggleTheme,
                    icon: Icon(
                      _isLight
                          ? Icons.nightlight_round
                          : Icons.light_mode_outlined,
                      size: 20,
                      color: _mutedIconColor,
                    ),
                  ),
                  IconButton(
                    onPressed: _openPreferencesSheet,
                    icon: Icon(
                      Icons.language,
                      size: 20,
                      color: _mutedIconColor,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _buildAvatar(),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          maskedEmail,
                          style: TextStyle(
                            color: _titleColor,
                            fontSize: headingSize,
                            fontWeight: FontWeight.w700,
                            height: 1.05,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Bitegit · Bitegit Global',
                          style: TextStyle(color: _subtleColor, fontSize: 12),
                        ),
                        const SizedBox(height: 5),
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: [
                            _headerBadge(
                              icon: Icons.verified_user_outlined,
                              label: verificationBadge,
                            ),
                            _headerBadge(
                              icon: Icons.workspace_premium_outlined,
                              label: vipBadge,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.fromLTRB(11, 10, 11, 9),
                decoration: BoxDecoration(
                  color: _surfaceColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: _cardBorderColor),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          RichText(
                            text: TextSpan(
                              children: [
                                const TextSpan(
                                  text: 'Security level ',
                                  style: TextStyle(fontSize: 14.4),
                                ),
                                TextSpan(
                                  text: securityLevel,
                                  style: TextStyle(
                                    color: _isLight
                                        ? const Color(0xFFD64252)
                                        : const Color(0xFFFF5B70),
                                    fontSize: 14.4,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                              style: TextStyle(color: _titleColor),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'At least 1 authentication methods need to be enabled.',
                            style: TextStyle(
                              color: _subtleColor,
                              fontSize: 12.2,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      Icons.chevron_right_rounded,
                      color: _isLight
                          ? const Color(0xFF80899B)
                          : const Color(0xFF575D69),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  _tabChip('My info', 'my-info'),
                  const SizedBox(width: 14),
                  _tabChip('Preference', 'preference'),
                  const SizedBox(width: 14),
                  _tabChip('General', 'general'),
                ],
              ),
              const SizedBox(height: 4),
              if (_activeTab == 'my-info') ..._myInfoRows(),
              if (_activeTab == 'preference') ..._preferenceRows(),
              if (_activeTab == 'general') ..._generalRows(),
              const SizedBox(height: 14),
              OutlinedButton(
                onPressed: _busy
                    ? null
                    : () {
                        widget.onLogout();
                        Navigator.of(
                          context,
                        ).popUntil((route) => route.isFirst);
                      },
                style: OutlinedButton.styleFrom(
                  foregroundColor: _titleColor,
                  side: BorderSide(
                    color: _isLight
                        ? const Color(0xFFD4DBE8)
                        : const Color(0xFF30343E),
                  ),
                  minimumSize: const Size.fromHeight(48),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(22),
                  ),
                ),
                child: const Text('Log Out', style: TextStyle(fontSize: 19)),
              ),
              if (uid.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    'UID: $uid',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: _subtleColor, fontSize: 11),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _tabChip(String label, String key) {
    final active = _activeTab == key;
    return InkWell(
      onTap: () => setState(() => _activeTab = key),
      child: Text(
        label,
        style: TextStyle(
          color: active ? _titleColor : _subtleColor,
          fontSize: 16,
          fontWeight: active ? FontWeight.w700 : FontWeight.w500,
        ),
      ),
    );
  }

  Widget _headerBadge({required IconData icon, required String label}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: _isLight ? const Color(0xFFF2F5FB) : const Color(0xFF10131A),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: _isLight ? const Color(0xFFD5DCEA) : const Color(0xFF2A2F3A),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            color: _isLight ? const Color(0xFF5D6778) : const Color(0xFFCDD2DB),
            size: 13,
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: _isLight
                  ? const Color(0xFF4B5567)
                  : const Color(0xFFCDD2DB),
              fontSize: 10.5,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
