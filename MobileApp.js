import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  StatusBar,
  BackHandler,
  Platform,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { CITRUSENSE_HTML } from './src/citrusenseHtml';

// ============================================================================
// KONFIGURASI URL CITRUSENSE
// ============================================================================
// 1. Jika sudah di-deploy ke Vercel atau domain lain, masukkan link-nya di sini:
//    const REMOTE_WEB_URL = 'https://citrusense.vercel.app';
// 2. Jika dibiarkan kosong (''), aplikasi otomatis memuat tampilan lokal offline.
const REMOTE_WEB_URL = '';

export default function MobileApp() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Handle tombol Back fisik Android agar navigasi mundur di dalam WebView
  useEffect(() => {
    if (Platform.OS === 'android') {
      const onBackPress = () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }
  }, [canGoBack]);

  const source = REMOTE_WEB_URL
    ? { uri: REMOTE_WEB_URL }
    : { html: CITRUSENSE_HTML, baseUrl: 'https://citrusense.local' };

  return (
    <SafeAreaProvider>
      {/* edges top & bottom memastikan pas di bawah status bar dan pas di atas navigasi HP */}
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#0C150E" />

        {hasError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Gagal Memuat CitruSense</Text>
            <Text style={styles.errorSubtitle}>
              Periksa koneksi internet Anda atau pastikan server dapat dijangkau.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setHasError(false);
                if (webViewRef.current) webViewRef.current.reload();
              }}
            >
              <Text style={styles.retryText}>Muat Ulang</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            source={source}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            allowFileAccess={true}
            allowFileAccessFromFileURLs={true}
            allowUniversalAccessFromFileURLs={true}
            originWhitelist={['*']}
            overScrollMode="always"
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            bounces={true}
            nestedScrollEnabled={true}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Memuat CitruSense…</Text>
              </View>
            )}
            onNavigationStateChange={(navState) => {
              setCanGoBack(navState.canGoBack);
            }}
            onError={() => {
              if (REMOTE_WEB_URL) setHasError(true);
            }}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#142216', // Warna dasar serasi dengan bottom nav bar
  },
  webview: {
    flex: 1,
    backgroundColor: '#0C150E',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0C150E',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: '#90A48E',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '700',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0C150E',
  },
  errorTitle: {
    color: '#FF7043',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorSubtitle: {
    color: '#90A48E',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
