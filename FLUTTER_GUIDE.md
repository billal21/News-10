# CN10 Flutter Integration Guide

আপনার এই React Web App টিকে অ্যান্ড্রয়েড APK বানাতে চাইলে নিচের ধাপগুলো অনুসরণ করুন:

### ১. Flutter প্রজেক্ট তৈরি করুন
আপনার কম্পিউটারে টার্মিনাল ওপেন করে লিখুন:
```bash
flutter create cn10_app
cd cn10_app
```

### ২. ডিপেন্ডেন্সি যোগ করুন
`pubspec.yaml` ফাইলে নিচের প্যাকেজটি যোগ করুন:
```yaml
dependencies:
  flutter:
    sdk: flutter
  webview_flutter: ^4.4.2
```

### ৩. কোড আপডেট করুন
`lib/main.dart` ফাইলে নিচের কোডটি ব্যবহার করুন:

```dart
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

void main() {
  runApp(const MaterialApp(
    debugShowCheckedModeBanner: false,
    home: CN10App(),
  ));
}

class CN10App extends StatefulWidget {
  const CN10App({super.key});

  @override
  State<CN10App> createState() => _CN10AppState();
}

class _CN10AppState extends State<CN10App> {
  late final WebViewController controller;

  @override
  void initState() {
    super.initState();
    controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {
            // Update loading bar.
          },
        ),
      )
      ..loadRequest(Uri.parse('https://ais-dev-spmjlntqtljh3i2xjfz4vf-286792576748.asia-southeast1.run.app')); // আপনার লাইভ লিঙ্ক এখানে দিন
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: WebViewWidget(controller: controller),
      ),
    );
  }
}
```

### ৪. APK বিল্ড করুন
টার্মিনালে লিখুন:
```bash
flutter build apk --release
```
আপনার `build/app/outputs/flutter-apk/app-release.apk` ফাইলে APK টি পেয়ে যাবেন।

---
**টিপস:** 
আপনি যদি PWA হিসেবে ব্যবহার করতে চান তবে মোবাইলের Chrome ব্রাউজারে গিয়ে "Add to Home Screen" বাটনে ক্লিক করলেই হবে, কোনো কোডিং লাগবে না।
