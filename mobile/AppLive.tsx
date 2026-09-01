import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import { DEFAULT_API_BASE_URL } from './src/api';

const PORTAL_URL = `${DEFAULT_API_BASE_URL}/admin`;
const UPDATE_MANIFEST_URL = `${DEFAULT_API_BASE_URL}/mobile-update.json`;
const CURRENT_VERSION = '0.3.0';
const CURRENT_VERSION_CODE = 3;

type UpdateManifest = {
  version: string;
  versionCode: number;
  apkUrl: string;
  required?: boolean;
  notes?: string;
  publishedAt?: string;
};

export default function AppLive() {
  const webRef = useRef<any>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [webKey, setWebKey] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [update, setUpdate] = useState<UpdateManifest | null>(null);
  const [updateOpen, setUpdateOpen] = useState(false);

  const checkForUpdate = useCallback(async () => {
    try {
      const response = await fetch(`${UPDATE_MANIFEST_URL}?t=${Date.now()}`, {
        headers: { accept: 'application/json' },
      });
      if (!response.ok) return;
      const manifest = await response.json() as UpdateManifest;
      if (Number(manifest.versionCode || 0) > CURRENT_VERSION_CODE && manifest.apkUrl) {
        setUpdate(manifest);
        setUpdateOpen(true);
      }
    } catch {
      // Update checking must never block the CRM.
    }
  }, []);

  useEffect(() => {
    void checkForUpdate();
  }, [checkForUpdate]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack) {
        webRef.current?.goBack?.();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  const retry = () => {
    setLoadError('');
    setWebKey(value => value + 1);
  };

  const installUpdate = async () => {
    if (!update?.apkUrl) return;
    try {
      await Linking.openURL(update.apkUrl);
    } catch {
      // Keep the update sheet visible so the user can try again.
    }
  };

  const shouldStart = (request: { url: string }) => {
    const url = request.url || '';
    if (
      url.startsWith(DEFAULT_API_BASE_URL) ||
      url.startsWith('about:blank') ||
      url.startsWith('data:')
    ) return true;

    if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('https://') || url.startsWith('http://')) {
      void Linking.openURL(url).catch(() => undefined);
      return false;
    }
    return true;
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" backgroundColor="#0b0d11" />
      <View style={styles.statusSafe} />

      {loadError ? (
        <View style={styles.errorScreen}>
          <Image source={{ uri: `${DEFAULT_API_BASE_URL}/idealab-logo.jpg` }} style={styles.logo} />
          <Text style={styles.eyebrow}>IDEA LAB / MOBILE</Text>
          <Text style={styles.errorTitle}>Portal is not reachable</Text>
          <Text style={styles.errorText}>{loadError}</Text>
          <Pressable onPress={retry} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Try again</Text>
          </Pressable>
          <Pressable onPress={() => void checkForUpdate()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Check app update</Text>
          </Pressable>
        </View>
      ) : (
        <WebView
          key={webKey}
          ref={webRef}
          source={{ uri: PORTAL_URL }}
          style={styles.web}
          originWhitelist={['https://*', 'http://*', 'about:*', 'data:*']}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          cacheEnabled
          pullToRefreshEnabled
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures
          startInLoadingState
          onShouldStartLoadWithRequest={shouldStart}
          onNavigationStateChange={state => setCanGoBack(state.canGoBack)}
          onLoadStart={() => setLoadError('')}
          onError={event => setLoadError(event.nativeEvent.description || 'Unable to connect to IDEA LAB.')}
          renderLoading={() => (
            <View style={styles.loader}>
              <Image source={{ uri: `${DEFAULT_API_BASE_URL}/idealab-logo.jpg` }} style={styles.logo} />
              <ActivityIndicator size="large" color="#ef3b3b" />
              <Text style={styles.loaderTitle}>Opening IDEA LAB</Text>
              <Text style={styles.loaderSub}>Syncing your live workspace…</Text>
            </View>
          )}
        />
      )}

      {update && (
        <Modal visible={updateOpen} transparent animationType="fade" onRequestClose={() => !update.required && setUpdateOpen(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.updateCard}>
              <View style={styles.updateIcon}><Text style={styles.updateIconText}>IL</Text></View>
              <Text style={styles.updateEyebrow}>APP UPDATE</Text>
              <Text style={styles.updateTitle}>IDEA LAB {update.version} is ready</Text>
              <Text style={styles.updateText}>{update.notes || 'A newer native app shell is available.'}</Text>
              <View style={styles.versionRow}>
                <Text style={styles.versionLabel}>Installed</Text><Text style={styles.versionValue}>{CURRENT_VERSION}</Text>
                <Text style={styles.versionArrow}>→</Text>
                <Text style={styles.versionLabel}>Latest</Text><Text style={styles.versionValue}>{update.version}</Text>
              </View>
              <Pressable onPress={() => void installUpdate()} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Update app</Text>
              </Pressable>
              {!update.required && (
                <Pressable onPress={() => setUpdateOpen(false)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Later</Text>
                </Pressable>
              )}
              <Text style={styles.updateHint}>Android will ask you to confirm installation. Your CRM data stays on the server.</Text>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const androidTop = Platform.OS === 'android' ? (NativeStatusBar.currentHeight ?? 24) : 0;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0d11' },
  statusSafe: { height: Platform.OS === 'android' ? Math.max(0, androidTop - 1) : 0, backgroundColor: '#0b0d11' },
  web: { flex: 1, backgroundColor: '#f4f6f8' },
  loader: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 13, padding: 28, backgroundColor: '#0b0d11' },
  logo: { width: 58, height: 58, borderRadius: 16, backgroundColor: '#fff', marginBottom: 5 },
  loaderTitle: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  loaderSub: { color: '#858c98', fontSize: 12, fontWeight: '600' },
  errorScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#0b0d11' },
  eyebrow: { marginTop: 14, color: '#ef4b4e', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  errorTitle: { marginTop: 8, color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  errorText: { marginTop: 8, marginBottom: 20, maxWidth: 330, color: '#939aa5', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  primaryButton: { width: '100%', minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#ef3b3b', marginTop: 10 },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  secondaryButton: { width: '100%', minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: '#303641', backgroundColor: '#171a20', marginTop: 8 },
  secondaryButtonText: { color: '#d7dbe1', fontSize: 12, fontWeight: '800' },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', padding: 14, paddingBottom: Platform.OS === 'ios' ? 30 : 18, backgroundColor: 'rgba(2,4,7,.72)' },
  updateCard: { width: '100%', maxWidth: 520, padding: 22, borderRadius: 24, borderWidth: 1, borderColor: '#2b3039', backgroundColor: '#11141a' },
  updateIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#ef3b3b' },
  updateIconText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  updateEyebrow: { marginTop: 16, color: '#ef4b4e', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  updateTitle: { marginTop: 6, color: '#fff', fontSize: 22, lineHeight: 27, fontWeight: '900' },
  updateText: { marginTop: 8, color: '#949ba6', fontSize: 12, lineHeight: 18 },
  versionRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 18, padding: 12, borderRadius: 12, backgroundColor: '#0b0d11' },
  versionLabel: { color: '#777f8b', fontSize: 9, fontWeight: '700' },
  versionValue: { color: '#fff', fontSize: 10, fontWeight: '900' },
  versionArrow: { color: '#ef4b4e', fontSize: 12, fontWeight: '900' },
  updateHint: { marginTop: 12, color: '#707782', fontSize: 9, lineHeight: 14, textAlign: 'center' },
});
