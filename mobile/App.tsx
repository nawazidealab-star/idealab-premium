import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  api,
  AppUser,
  Client,
  Dashboard,
  getBaseUrl,
  Invoice,
  Lead,
  login,
  logout,
  Project,
  Task,
} from './src/api';

type Tab = 'Home' | 'Leads' | 'Clients' | 'Projects' | 'Tasks' | 'Invoices';
const tabs: Tab[] = ['Home', 'Leads', 'Clients', 'Projects', 'Tasks', 'Invoices'];

const money = (value: number, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
};

const when = (value?: string | null) => (value ? new Date(value).toLocaleDateString() : '—');

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>('Home');

  useEffect(() => {
    api.me().then((result) => setUser(result.user)).catch(() => setUser(null)).finally(() => setChecking(false));
  }, []);

  if (checking) {
    return <Centered><ActivityIndicator size="large" color="#ef3b3b" /><Text style={styles.muted}>Opening IDEA LAB…</Text></Centered>;
  }

  if (!user) return <Login onDone={setUser} />;

  const doLogout = async () => {
    await logout();
    setUser(null);
    setTab('Home');
  };

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>IDEA LAB / MOBILE</Text>
          <Text style={styles.title}>{tab}</Text>
        </View>
        <View style={styles.avatar}><Text style={styles.avatarText}>{user.name.slice(0, 2).toUpperCase()}</Text></View>
      </View>
      <View style={styles.body}><Screen tab={tab} user={user} onLogout={doLogout} /></View>
      <View style={styles.tabs}>
        {tabs.map((item) => (
          <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.tabActive]}>
            <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item === 'Home' ? '⌂' : item.slice(0, 2)}</Text>
            <Text style={[styles.tabLabel, tab === item && styles.tabTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

function Login({ onDone }: { onDone: (user: AppUser) => void }) {
  const [serverUrl, setServerUrl] = useState('');
  const [email, setEmail] = useState('nawazidealab@gmail.com');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getBaseUrl().then(setServerUrl).catch(() => undefined);
  }, []);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      onDone(await login(email, password, serverUrl));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.login}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.loginInner}>
        <View style={styles.logo}><Text style={styles.logoText}>IL</Text></View>
        <Text style={styles.loginTitle}>IDEA LAB Admin</Text>
        <Text style={styles.loginSub}>Secure mobile access to your CRM operations.</Text>
        <Text style={styles.fieldLabel}>IDEA LAB server</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder="https://your-idealab-domain.com"
          placeholderTextColor="#6f7480"
          style={styles.input}
        />
        <Text style={styles.fieldHint}>Use the same HTTPS hostname where your IDEA LAB admin/API is deployed.</Text>
        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#6f7480"
          style={styles.input}
        />
        <Text style={styles.fieldLabel}>Password</Text>
        <TextInput
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#6f7480"
          style={styles.input}
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Pressable disabled={busy} onPress={submit} style={[styles.primary, busy && styles.disabled]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Sign in</Text>}
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Screen({ tab, user, onLogout }: { tab: Tab; user: AppUser; onLogout: () => Promise<void> }) {
  if (tab === 'Home') return <Home user={user} onLogout={onLogout} />;
  if (tab === 'Leads') return <ListScreen load={() => api.leads().then((x) => x.results)} render={(x: Lead) => <Card title={x.name} meta={[x.company, x.service, x.status].filter(Boolean).join(' · ')} detail={x.next_action || x.email || x.phone || 'No next action'} />} />;
  if (tab === 'Clients') return <ListScreen load={() => api.clients().then((x) => x.results)} render={(x: Client) => <Card title={x.name} meta={[x.company, x.status].filter(Boolean).join(' · ')} detail={x.email || x.phone || x.country || 'No contact details'} />} />;
  if (tab === 'Projects') return <ListScreen load={() => api.projects().then((x) => x.results)} render={(x: Project) => <Card title={x.name} meta={[x.client_name, x.status].filter(Boolean).join(' · ')} detail={`${x.progress || 0}% complete · due ${when(x.due_date)}`} />} />;
  if (tab === 'Tasks') return <ListScreen load={() => api.tasks().then((x) => x.results)} render={(x: Task) => <Card title={x.title} meta={[x.priority, x.status].join(' · ')} detail={[x.project_name, x.client_name, `due ${when(x.due_at)}`].filter(Boolean).join(' · ')} />} />;
  return <ListScreen load={() => api.invoices().then((x) => x.results)} render={(x: Invoice) => <Card title={x.invoice_no} meta={[x.client_name, x.status].filter(Boolean).join(' · ')} detail={`${money(x.amount, x.currency)} · due ${when(x.due_date)}`} />} />;
}

function Home({ user, onLogout }: { user: AppUser; onLogout: () => Promise<void> }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.dashboard());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />} contentContainerStyle={styles.scroll}>
      <View style={styles.hero}>
        <Text style={styles.kickerRed}>COMMAND CENTER</Text>
        <Text style={styles.heroTitle}>Welcome back, {user.name.split(' ')[0]}.</Text>
        <Text style={styles.heroSub}>Live IDEA LAB operations from the same Cloudflare D1 backend.</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : !data ? <ActivityIndicator color="#ef3b3b" /> : (
        <View style={styles.stats}>
          <Stat label="Leads" value={String(data.leads)} />
          <Stat label="Clients" value={String(data.clients)} />
          <Stat label="Projects" value={String(data.projects)} />
          <Stat label="Revenue" value={money(data.revenue)} />
        </View>
      )}
      <Pressable style={styles.logout} onPress={() => void onLogout()}><Text style={styles.logoutText}>Sign out from this device</Text></Pressable>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>;
}

function Card({ title, meta, detail }: { title: string; meta: string; detail: string }) {
  return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardMeta}>{meta}</Text><Text style={styles.cardDetail}>{detail}</Text></View>;
}

function ListScreen<T>({ load, render }: { load: () => Promise<T[]>; render: (item: T) => React.ReactNode }) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const go = async () => {
    try {
      setRows(await load());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void go(); }, []);
  if (loading) return <Centered><ActivityIndicator color="#ef3b3b" /></Centered>;

  return (
    <FlatList
      data={rows as any[]}
      keyExtractor={(item: any) => String(item.id)}
      renderItem={({ item }) => <>{render(item as T)}</>}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await go(); setRefreshing(false); }} />}
      ListEmptyComponent={<Text style={styles.muted}>{error || 'No records yet.'}</Text>}
    />
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <SafeAreaView style={styles.center}>{children}</SafeAreaView>;
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#0b0d11' },
  header: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#20242c' },
  kicker: { color: '#7f8794', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 3 },
  avatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#ef3b3b', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '900' },
  body: { flex: 1, backgroundColor: '#f5f6f8' },
  tabs: { height: 72, backgroundColor: '#0b0d11', borderTopWidth: 1, borderTopColor: '#20242c', flexDirection: 'row', paddingBottom: 6 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabActive: { backgroundColor: '#151820' },
  tabText: { color: '#747b87', fontSize: 12, fontWeight: '800' },
  tabTextActive: { color: '#ff5759' },
  tabLabel: { color: '#747b87', fontSize: 8, fontWeight: '700' },
  login: { flex: 1, backgroundColor: '#0b0d11' },
  loginInner: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#ef3b3b', alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  logoText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  loginTitle: { color: '#fff', fontSize: 32, fontWeight: '900' },
  loginSub: { color: '#9399a3', fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 22 },
  fieldLabel: { color: '#c7cbd2', fontSize: 11, fontWeight: '800', marginBottom: 6, marginTop: 4 },
  fieldHint: { color: '#6f7480', fontSize: 10, lineHeight: 15, marginTop: -5, marginBottom: 10 },
  input: { height: 52, borderWidth: 1, borderColor: '#2a2f38', backgroundColor: '#14171c', borderRadius: 13, paddingHorizontal: 14, color: '#fff', fontSize: 16, marginBottom: 12 },
  primary: { height: 52, borderRadius: 13, backgroundColor: '#ef3b3b', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  disabled: { opacity: 0.65 },
  primaryText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  error: { color: '#c52f35', backgroundColor: '#fff0f0', padding: 12, borderRadius: 10, marginVertical: 8 },
  center: { flex: 1, backgroundColor: '#f5f6f8', alignItems: 'center', justifyContent: 'center', gap: 12 },
  muted: { color: '#7d838c', textAlign: 'center' },
  scroll: { padding: 16, gap: 16 },
  hero: { backgroundColor: '#111318', borderRadius: 20, padding: 20 },
  kickerRed: { color: '#ff5558', fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
  heroTitle: { color: '#fff', fontSize: 27, fontWeight: '900', marginTop: 8 },
  heroSub: { color: '#9097a2', fontSize: 14, lineHeight: 21, marginTop: 8 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '48%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6e8ec', borderRadius: 16, padding: 16 },
  statLabel: { color: '#777e89', fontSize: 12, fontWeight: '700' },
  statValue: { color: '#15171c', fontSize: 24, fontWeight: '900', marginTop: 8 },
  logout: { borderWidth: 1, borderColor: '#dddfe3', borderRadius: 13, padding: 15, alignItems: 'center', backgroundColor: '#fff' },
  logoutText: { color: '#b42d32', fontWeight: '800' },
  list: { padding: 14, gap: 10 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16 },
  cardTitle: { color: '#15171c', fontSize: 17, fontWeight: '900' },
  cardMeta: { color: '#c43236', fontSize: 11, fontWeight: '800', textTransform: 'capitalize', marginTop: 5 },
  cardDetail: { color: '#707680', fontSize: 13, lineHeight: 18, marginTop: 7 },
});
