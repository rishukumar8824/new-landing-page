import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import 'auth_api.dart';

typedef AuthSuccessCallback = Future<void> Function(
  String email,
  OtpVerifyResult verifyResult,
);

class LoginScreen extends StatefulWidget {
  const LoginScreen({
    super.key,
    required this.onAuthSuccess,
    required this.onOpenSignup,
  });

  final AuthSuccessCallback onAuthSuccess;
  final VoidCallback onOpenSignup;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _emailController = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleNext() async {
    final messenger = ScaffoldMessenger.of(context);
    final email = _emailController.text.trim().toLowerCase();
    if (!_isValidEmail(email)) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Enter a valid email address.')),
      );
      return;
    }

    final geetest = await showDialog<GeetestValidatePayload>(
      context: context,
      barrierDismissible: false,
      builder: (_) => const GeetestCaptchaDialog(),
    );
    if (geetest == null) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Captcha verification is required.')),
      );
      return;
    }

    setState(() => _loading = true);
    try {
      final sendResult = await AuthApiService.sendOtp(
        email: email,
        geetest: geetest,
      );
      if (!sendResult.success) {
        messenger.showSnackBar(SnackBar(content: Text(sendResult.message)));
        return;
      }

      if (!mounted) return;
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => OtpVerificationScreen(
            email: email,
            onAuthSuccess: widget.onAuthSuccess,
          ),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Welcome back!',
      emailController: _emailController,
      loading: _loading,
      nextEnabled: _isValidEmail(_emailController.text.trim()),
      onNext: _handleNext,
      bottomLinkText: 'Sign up',
      onBottomLinkTap: widget.onOpenSignup,
      showReferral: false,
      onChanged: () => setState(() {}),
      showTerms: false,
    );
  }
}

class SignupScreen extends StatefulWidget {
  const SignupScreen({
    super.key,
    required this.onAuthSuccess,
    required this.onOpenLogin,
  });

  final AuthSuccessCallback onAuthSuccess;
  final VoidCallback onOpenLogin;

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _referralController = TextEditingController();
  bool _loading = false;
  bool _acceptedTerms = false;

  @override
  void dispose() {
    _emailController.dispose();
    _referralController.dispose();
    super.dispose();
  }

  Future<void> _handleNext() async {
    final messenger = ScaffoldMessenger.of(context);
    final email = _emailController.text.trim().toLowerCase();
    if (!_isValidEmail(email)) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Enter a valid email address.')),
      );
      return;
    }
    if (!_acceptedTerms) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Please accept the User Agreement.')),
      );
      return;
    }

    final geetest = await showDialog<GeetestValidatePayload>(
      context: context,
      barrierDismissible: false,
      builder: (_) => const GeetestCaptchaDialog(),
    );
    if (geetest == null) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Captcha verification is required.')),
      );
      return;
    }

    setState(() => _loading = true);
    try {
      final sendResult = await AuthApiService.sendOtp(
        email: email,
        geetest: geetest,
        referralCode: _referralController.text.trim(),
      );
      if (!sendResult.success) {
        messenger.showSnackBar(SnackBar(content: Text(sendResult.message)));
        return;
      }

      if (!mounted) return;
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => OtpVerificationScreen(
            email: email,
            onAuthSuccess: widget.onAuthSuccess,
          ),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Welcome to Bitegit',
      emailController: _emailController,
      loading: _loading,
      nextEnabled:
          _isValidEmail(_emailController.text.trim()) && _acceptedTerms,
      onNext: _handleNext,
      bottomLinkText: 'Log in',
      onBottomLinkTap: widget.onOpenLogin,
      showReferral: true,
      referralController: _referralController,
      showTerms: true,
      acceptedTerms: _acceptedTerms,
      onTermsChanged: (value) => setState(() => _acceptedTerms = value),
      onChanged: () => setState(() {}),
    );
  }
}

class OtpVerificationScreen extends StatefulWidget {
  const OtpVerificationScreen({
    super.key,
    required this.email,
    required this.onAuthSuccess,
  });

  final String email;
  final AuthSuccessCallback onAuthSuccess;

  @override
  State<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends State<OtpVerificationScreen> {
  final TextEditingController _otpController = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _verifyOtp() async {
    final messenger = ScaffoldMessenger.of(context);
    final otp = _otpController.text.replaceAll(RegExp(r'\D'), '').trim();
    if (!RegExp(r'^\d{6}$').hasMatch(otp)) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Enter a valid 6-digit OTP.')),
      );
      return;
    }

    setState(() => _loading = true);
    try {
      final result = await AuthApiService.verifyOtp(
        email: widget.email,
        otp: otp,
      );
      if (!result.success) {
        messenger.showSnackBar(SnackBar(content: Text(result.message)));
        return;
      }
      final accessToken = (result.accessToken ?? '').trim();
      if (accessToken.isEmpty) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Session token missing. Please retry login.'),
          ),
        );
        return;
      }

      await widget.onAuthSuccess(widget.email, result);
      if (!mounted) return;
      Navigator.of(context).popUntil((route) => route.isFirst);
      messenger.showSnackBar(
        const SnackBar(content: Text('Authentication successful.')),
      );
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'OTP Verification',
                style: TextStyle(
                  fontSize: 42,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Code sent to ${widget.email}',
                style: const TextStyle(fontSize: 16, color: Colors.white70),
              ),
              const SizedBox(height: 28),
              TextField(
                controller: _otpController,
                keyboardType: TextInputType.number,
                maxLength: 6,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  letterSpacing: 6,
                ),
                decoration: _authFieldDecoration('Enter 6-digit code'),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _loading || _otpController.text.length != 6
                      ? null
                      : _verifyOtp,
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.black,
                    disabledBackgroundColor: const Color(0xFF232323),
                    minimumSize: const Size.fromHeight(58),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(30),
                    ),
                  ),
                  child: Text(
                    _loading ? 'Verifying...' : 'Verify',
                    style: const TextStyle(
                      fontSize: 30,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class AuthScaffold extends StatelessWidget {
  const AuthScaffold({
    super.key,
    required this.title,
    required this.emailController,
    required this.loading,
    required this.nextEnabled,
    required this.onNext,
    required this.bottomLinkText,
    required this.onBottomLinkTap,
    required this.showReferral,
    required this.onChanged,
    required this.showTerms,
    this.referralController,
    this.acceptedTerms = false,
    this.onTermsChanged,
  });

  final String title;
  final TextEditingController emailController;
  final TextEditingController? referralController;
  final bool loading;
  final bool nextEnabled;
  final VoidCallback onNext;
  final String bottomLinkText;
  final VoidCallback onBottomLinkTap;
  final bool showReferral;
  final bool showTerms;
  final bool acceptedTerms;
  final ValueChanged<bool>? onTermsChanged;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 58,
                fontWeight: FontWeight.w800,
                height: 1.05,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 44),
            const Text(
              'Email / Phone number',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: emailController,
              keyboardType: TextInputType.emailAddress,
              style: const TextStyle(color: Colors.white, fontSize: 18),
              decoration: _authFieldDecoration('Email/Phone number'),
              onChanged: (_) => onChanged(),
            ),
            if (showReferral) ...[
              const SizedBox(height: 20),
              const Text(
                'Referral code (optional)',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: referralController,
                style: const TextStyle(color: Colors.white, fontSize: 17),
                decoration: _authFieldDecoration('Referral code'),
              ),
            ],
            if (showTerms) ...[
              const SizedBox(height: 18),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Checkbox(
                    value: acceptedTerms,
                    onChanged: (value) {
                      if (onTermsChanged != null) {
                        onTermsChanged!(value == true);
                      }
                    },
                    checkColor: Colors.black,
                    fillColor: WidgetStateProperty.resolveWith((states) {
                      return states.contains(WidgetState.selected)
                          ? Colors.white
                          : Colors.transparent;
                    }),
                    side: const BorderSide(color: Colors.white54),
                  ),
                  const Expanded(
                    child: Padding(
                      padding: EdgeInsets.only(top: 10),
                      child: Text(
                        'I have read and agree to the Bitegit User Agreement.',
                        style: TextStyle(fontSize: 17, color: Colors.white70),
                      ),
                    ),
                  )
                ],
              ),
            ],
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: loading || !nextEnabled ? null : onNext,
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.black,
                  disabledBackgroundColor: const Color(0xFF232323),
                  minimumSize: const Size.fromHeight(58),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30),
                  ),
                ),
                child: Text(
                  loading ? 'Please wait...' : 'Next',
                  style: const TextStyle(
                    fontSize: 30,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 22),
            Center(
              child: TextButton(
                onPressed: onBottomLinkTap,
                child: Text(
                  bottomLinkText,
                  style: const TextStyle(
                    fontSize: 22,
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 76),
            const _SocialRow(),
          ],
        ),
      ),
    );
  }
}

class GeetestCaptchaDialog extends StatefulWidget {
  const GeetestCaptchaDialog({super.key});

  @override
  State<GeetestCaptchaDialog> createState() => _GeetestCaptchaDialogState();
}

class _GeetestCaptchaDialogState extends State<GeetestCaptchaDialog> {
  static const String _captchaId = String.fromEnvironment(
    'BITEGIT_GEETEST_CAPTCHA_ID',
    defaultValue: '',
  );
  bool _loading = true;
  String? _error;

  late final WebViewController _controller;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel(
        'CaptchaChannel',
        onMessageReceived: (message) {
          try {
            final decoded = jsonDecode(message.message);
            if (decoded is! Map<String, dynamic>) {
              throw const FormatException('Invalid captcha payload');
            }

            final payload = GeetestValidatePayload(
              lotNumber: (decoded['lot_number'] ?? '').toString().trim(),
              captchaOutput: (decoded['captcha_output'] ?? '')
                  .toString()
                  .trim(),
              passToken: (decoded['pass_token'] ?? '').toString().trim(),
              genTime: (decoded['gen_time'] ?? '').toString().trim(),
            );

            if (!mounted) return;
            Navigator.of(context).pop(payload);
          } catch (_) {
            setState(() {
              _error = 'Captcha failed. Please try again.';
            });
          }
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) {
            if (mounted) {
              setState(() => _loading = false);
            }
          },
        ),
      );

    if (_captchaId.isEmpty) {
      _error =
          'Geetest captcha ID is missing. Build with --dart-define=BITEGIT_GEETEST_CAPTCHA_ID=<id>';
      _loading = false;
      return;
    }

    _controller.loadHtmlString(_captchaHtml(_captchaId));
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF111319),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: SizedBox(
        height: 520,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 8, 10),
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Complete security captcha',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close, color: Colors.white70),
                  )
                ],
              ),
            ),
            const Divider(height: 1, color: Color(0xFF242833)),
            Expanded(
              child: _error != null
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Text(
                          _error!,
                          style: const TextStyle(color: Colors.redAccent),
                        ),
                      ),
                    )
                  : Stack(
                      children: [
                        WebViewWidget(controller: _controller),
                        if (_loading)
                          const Positioned.fill(
                            child: ColoredBox(
                              color: Color(0xCC111319),
                              child: Center(
                                child: CircularProgressIndicator(),
                              ),
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

  String _captchaHtml(String captchaId) {
    return '''
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0d1016; color: #fff; }
    .container { padding: 12px; }
    .title { font-size: 16px; margin-bottom: 10px; color: #e7e7ea; }
    #captcha-box { min-height: 360px; border-radius: 12px; background: #11141d; border: 1px solid #242833; }
  </style>
</head>
<body>
  <div class="container">
    <div class="title">Geetest verification</div>
    <div id="captcha-box"></div>
  </div>

  <script src="https://static.geetest.com/v4/gt4.js"></script>
  <script>
    window.onload = function () {
      if (!window.initGeetest4) {
        CaptchaChannel.postMessage(JSON.stringify({ error: 'geetest_sdk_missing' }));
        return;
      }

      initGeetest4({
        captchaId: '${captchaId.replaceAll("'", "")}',
        product: 'bind',
        language: 'en'
      }, function (captchaObj) {
        captchaObj.appendTo('#captcha-box');
        captchaObj.onSuccess(function () {
          var result = captchaObj.getValidate();
          CaptchaChannel.postMessage(JSON.stringify(result || {}));
        });
      });
    };
  </script>
</body>
</html>
''';
  }
}

class _SocialRow extends StatelessWidget {
  const _SocialRow();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: const [
            Expanded(child: Divider(color: Color(0xFF2A2D36), thickness: 1)),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: Text('Or', style: TextStyle(color: Colors.white54)),
            ),
            Expanded(child: Divider(color: Color(0xFF2A2D36), thickness: 1)),
          ],
        ),
        const SizedBox(height: 24),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            _SocialIcon(label: 'G'),
            SizedBox(width: 18),
            _SocialIcon(label: 'T'),
            SizedBox(width: 18),
            _SocialIcon(label: ''),
          ],
        ),
      ],
    );
  }
}

class _SocialIcon extends StatelessWidget {
  const _SocialIcon({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 64,
      width: 64,
      decoration: BoxDecoration(
        color: const Color(0xFF151821),
        borderRadius: BorderRadius.circular(32),
      ),
      alignment: Alignment.center,
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 26,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

InputDecoration _authFieldDecoration(String hint) {
  return InputDecoration(
    hintText: hint,
    hintStyle: const TextStyle(color: Colors.white38, fontSize: 19),
    filled: true,
    fillColor: const Color(0xFF171A22),
    contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 17),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(22),
      borderSide: const BorderSide(color: Color(0xFF262A34)),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(22),
      borderSide: const BorderSide(color: Color(0xFF3C4251)),
    ),
    counterText: '',
  );
}

bool _isValidEmail(String value) {
  return RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(
    value.trim().toLowerCase(),
  );
}
