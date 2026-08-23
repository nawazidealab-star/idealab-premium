import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  api,
  CURRENCIES,
  DEFAULT_API_BASE_URL,
  getDefaultCurrency,
  login,
  logout,
  setDefaultCurrency,
  type AppUser,
  type Client,
  type CurrencyCode,
  type Dashboard,
  type Invoice,
  type Lead,
  type Project,
  type Task,
} from './src/api';

type Tab = 'Home' | 'Leads' | 'Clients' | 'Projects' | 'Tasks' | 'Invoices';
type PrimaryTab = 'Home' | 'Leads' | 'Clients' | 'Projects';

type Field = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'datetime';
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
};

const primaryTabs: Array<{ key: PrimaryTab; short: string; label: string }> = [
  { key: 'Home', short: 'H', label: 'Home' },
  { key: 'Leads', short: 'L', label: 'Leads' },
  { key: 'Clients', short: 'C', label: 'Clients' },
  { key: 'Projects', short: 'P', label: 'Projects' },
];

const money = (value = 0, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  } catch {
    return `${currency} ${Number(value || 0).toLocaleString()}`;
  }
};

const when = (value?: string | null) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : date.toLocaleDateString();
};

const text = (value: unknown) => value === null || value === undefined ? '' : String(value);
const statusOpts = (values: string[]) => values.map(value => ({ label: value.replaceAll('_', ' '), value }));
const currencyOpts = CURRENCIES.map(code => ({ label: code, value: code }));

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>('Home');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [moreOpen, setMoreOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);

  useEffect(() => {
    Promise.all([api.me().catch(() => null), getDefaultCurrency()])
      .then(([me, saved]) => {
        if (me) setUser(me.user);
        setCurrency(saved);
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return <Centered dark><ActivityIndicator size="large" color="#ef3b3b" /><Text style={styles.loadingText}>Opening IDEA LAB…</Text></Centered>;
  }

  if (!user) return <Login onDone={setUser} />;

  const changeCurrency = async (code: CurrencyCode) => {
    await setDefaultCurrency(code);
    setCurrency(code);
    setCurrencyOpen(false);
  };

  const doLogout = async () => {
    await logout();
    setUser(null);
    setTab('Home');
    setMoreOpen(false);
  };

  const navigate = (next: Tab) => {
    setTab(next);
    setMoreOpen(false);
  };

  const moreActive = tab === 'Tasks' || tab === 'Invoices';

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="light" backgroundColor="#0b0d11" />
      <AppHeader tab={tab} />
      <View style={styles.body}>
        <Screen
          tab={tab}
          user={user}
          currency={currency}
          onNavigate={navigate}
          onCurrency={() => setCurrencyOpen(true)}
        />
      </View>
      <View style={styles.bottomBar}>
        {primaryTabs.map(item => {
          const active = tab === item.key;
          return (
            <Pressable key={item.key} onPress={() => navigate(item.key)} style={styles.bottomItem}>
              <View style={[styles.navGlyph, active && styles.navGlyphActive]}><Text style={[styles.navGlyphText, active && styles.navGlyphTextActive]}>{item.short}</Text></View>
              <Text style={[styles.bottomLabel, active && styles.bottomLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
        <Pressable onPress={() => setMoreOpen(true)} style={styles.bottomItem}>
          <View style={[styles.navGlyph, moreActive && styles.navGlyphActive]}><Text style={[styles.navGlyphText, moreActive && styles.navGlyphTextActive]}>•••</Text></View>
          <Text style={[styles.bottomLabel, moreActive && styles.bottomLabelActive]}>More</Text>
        </Pressable>
      </View>

      <MoreSheet
        visible={moreOpen}
        user={user}
        current={tab}
        currency={currency}
        onClose={() => setMoreOpen(false)}
        onNavigate={navigate}
        onCurrency={() => { setMoreOpen(false); setCurrencyOpen(true); }}
        onLogout={doLogout}
      />
      <CurrencySheet visible={currencyOpen} value={currency} onClose={() => setCurrencyOpen(false)} onSelect={changeCurrency} />
    </SafeAreaView>
  );
}

function AppHeader({ tab }: { tab: Tab }) {
  const subtitle = tab === 'Home' ? 'IDEA LAB / MOBILE' : 'IDEA LAB / OPERATIONS';
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={styles.kicker}>{subtitle}</Text>
        <Text style={styles.screenTitle}>{tab}</Text>
      </View>
      <Image source={{ uri: `${DEFAULT_API_BASE_URL}/idealab-logo.jpg` }} style={styles.headerLogo} />
    </View>
  );
}

function Login({ onDone }: { onDone: (user: AppUser) => void }) {
  const [email, setEmail] = useState('nawazidealab@gmail.com');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      onDone(await login(email, password));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.login}>
      <StatusBar style="light" backgroundColor="#0b0d11" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.loginInner}>
        <Image source={{ uri: `${DEFAULT_API_BASE_URL}/idealab-logo.jpg` }} style={styles.loginLogo} />
        <Text style={styles.loginEyebrow}>IDEA LAB OPERATIONS</Text>
        <Text style={styles.loginTitle}>Admin portal</Text>
        <Text style={styles.loginSub}>Secure mobile access to your live CRM.</Text>
        <Text style={styles.darkFieldLabel}>Email</Text>
        <TextInput autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} style={styles.darkInput} />
        <Text style={styles.darkFieldLabel}>Password</Text>
        <TextInput secureTextEntry value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#6f7480" style={styles.darkInput} />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Pressable disabled={busy} onPress={submit} style={[styles.primaryButton, busy && styles.disabled]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Sign in</Text>}
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Screen({ tab, user, currency, onNavigate, onCurrency }: {
  tab: Tab;
  user: AppUser;
  currency: CurrencyCode;
  onNavigate: (tab: Tab) => void;
  onCurrency: () => void;
}) {
  if (tab === 'Home') return <Home user={user} currency={currency} onNavigate={onNavigate} onCurrency={onCurrency} />;
  if (tab === 'Leads') return <Leads currency={currency} />;
  if (tab === 'Clients') return <Clients />;
  if (tab === 'Projects') return <Projects currency={currency} />;
  if (tab === 'Tasks') return <Tasks />;
  return <Invoices currency={currency} />;
}

function Home({ user, currency, onNavigate, onCurrency }: {
  user: AppUser;
  currency: CurrencyCode;
  onNavigate: (tab: Tab) => void;
  onCurrency: () => void;
}) {
  const { width } = useWindowDimensions();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const cardWidth = Math.max(140, (width - 42) / 2);

  const load = useCallback(async () => {
    try {
      setData(await api.dashboard());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user.name.trim().split(/\s+/)[0] || 'Admin';

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      contentContainerStyle={styles.homeScroll}
    >
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>COMMAND CENTER</Text>
        <Text style={styles.heroTitle}>{greeting}, {firstName}.</Text>
        <Text style={styles.heroSub}>Your live IDEA LAB operations at a glance.</Text>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {data ? (
        <View style={styles.statGrid}>
          <Stat width={cardWidth} label="Leads" value={String(data.leads)} hint="Pipeline" />
          <Stat width={cardWidth} label="Clients" value={String(data.clients)} hint="Active records" />
          <Stat width={cardWidth} label="Projects" value={String(data.projects)} hint="Delivery" />
          <Stat width={cardWidth} label="Revenue" value={money(data.revenue)} hint="CRM total" />
        </View>
      ) : <View style={styles.dashboardLoader}><ActivityIndicator color="#ef3b3b" /></View>}

      <View style={styles.sectionHead}>
        <View><Text style={styles.sectionTitle}>Quick actions</Text><Text style={styles.sectionSub}>Jump straight into today’s work.</Text></View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
        <QuickAction label="New lead" caption="Pipeline" onPress={() => onNavigate('Leads')} />
        <QuickAction label="Tasks" caption="Team work" onPress={() => onNavigate('Tasks')} />
        <QuickAction label="Invoices" caption="Billing" onPress={() => onNavigate('Invoices')} />
        <QuickAction label="Projects" caption="Delivery" onPress={() => onNavigate('Projects')} />
      </ScrollView>

      <View style={styles.currencyCard}>
        <View style={styles.currencyCopy}>
          <Text style={styles.sectionTitle}>Default currency</Text>
          <Text style={styles.sectionSub}>Used when you create new financial records.</Text>
        </View>
        <Pressable onPress={onCurrency} style={styles.currencyButton}>
          <Text style={styles.currencyCode}>{currency}</Text>
          <Text style={styles.currencyChange}>Change</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Stat({ label, value, hint, width }: { label: string; value: string; hint: string; width: number }) {
  return (
    <View style={[styles.statCard, { width }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.statValue}>{value}</Text>
      <Text style={styles.statHint}>{hint}</Text>
    </View>
  );
}

function QuickAction({ label, caption, onPress }: { label: string; caption: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.quickCard}>
      <View style={styles.quickDot} />
      <Text style={styles.quickTitle}>{label}</Text>
      <Text style={styles.quickCaption}>{caption}</Text>
    </Pressable>
  );
}

function MoreSheet({ visible, user, current, currency, onClose, onNavigate, onCurrency, onLogout }: {
  visible: boolean;
  user: AppUser;
  current: Tab;
  currency: CurrencyCode;
  onClose: () => void;
  onNavigate: (tab: Tab) => void;
  onCurrency: () => void;
  onLogout: () => Promise<void>;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>More</Text>
          <View style={styles.profileRow}>
            <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{user.name.slice(0, 1).toUpperCase()}</Text></View>
            <View style={styles.profileText}><Text style={styles.profileName}>{user.name}</Text><Text style={styles.profileRole}>{user.role.replaceAll('_', ' ')}</Text></View>
          </View>
          <Pressable onPress={() => onNavigate('Tasks')} style={[styles.menuRow, current === 'Tasks' && styles.menuRowActive]}>
            <View><Text style={styles.menuTitle}>Tasks</Text><Text style={styles.menuSub}>Team workload and deadlines</Text></View><Text style={styles.menuArrow}>›</Text>
          </Pressable>
          <Pressable onPress={() => onNavigate('Invoices')} style={[styles.menuRow, current === 'Invoices' && styles.menuRowActive]}>
            <View><Text style={styles.menuTitle}>Invoices</Text><Text style={styles.menuSub}>Billing and payment tracking</Text></View><Text style={styles.menuArrow}>›</Text>
          </Pressable>
          <Pressable onPress={onCurrency} style={styles.menuRow}>
            <View><Text style={styles.menuTitle}>Currency</Text><Text style={styles.menuSub}>Current default: {currency}</Text></View><Text style={styles.menuArrow}>›</Text>
          </Pressable>
          <Pressable onPress={() => void onLogout()} style={styles.signOutRow}><Text style={styles.signOutText}>Sign out</Text></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CurrencySheet({ visible, value, onClose, onSelect }: {
  visible: boolean;
  value: CurrencyCode;
  onClose: () => void;
  onSelect: (code: CurrencyCode) => Promise<void>;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeaderRow}><View><Text style={styles.sheetTitle}>Default currency</Text><Text style={styles.sheetSubtitle}>Choose the currency for new records.</Text></View><Pressable onPress={onClose} style={styles.closeCircle}><Text style={styles.closeCircleText}>×</Text></Pressable></View>
          <View style={styles.currencyGrid}>
            {CURRENCIES.map(code => (
              <Pressable key={code} onPress={() => void onSelect(code)} style={[styles.currencyOption, value === code && styles.currencyOptionActive]}>
                <Text style={[styles.currencyOptionText, value === code && styles.currencyOptionTextActive]}>{code}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function EntityModal({ visible, title, fields, initial, onClose, onSave }: {
  visible: boolean;
  title: string;
  fields: Field[];
  initial: Record<string, string>;
  onClose: () => void;
  onSave: (values: Record<string, string>) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setForm(initial);
      setError('');
    }
  }, [visible, initial]);

  const save = async () => {
    for (const field of fields) {
      if (field.required && !form[field.key]?.trim()) {
        setError(`${field.label} is required`);
        return;
      }
    }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalCard}>
          <View style={styles.modalHead}>
            <View><Text style={styles.modalEyebrow}>IDEA LAB</Text><Text style={styles.modalTitle}>{title}</Text></View>
            <Pressable onPress={onClose} style={styles.closeCircle}><Text style={styles.closeCircleText}>×</Text></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
            {fields.map(field => (
              <View key={field.key} style={styles.formGroup}>
                <Text style={styles.darkFieldLabel}>{field.label}{field.required ? ' *' : ''}</Text>
                {field.options ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
                    {field.options.map(option => (
                      <Pressable key={option.value} onPress={() => setForm({ ...form, [field.key]: option.value })} style={[styles.option, form[field.key] === option.value && styles.optionActive]}>
                        <Text style={[styles.optionText, form[field.key] === option.value && styles.optionTextActive]}>{option.label}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : (
                  <TextInput
                    value={form[field.key] || ''}
                    onChangeText={next => setForm({ ...form, [field.key]: next })}
                    keyboardType={field.type === 'number' ? 'decimal-pad' : 'default'}
                    placeholder={field.placeholder || (field.type === 'date' ? 'YYYY-MM-DD' : field.type === 'datetime' ? 'YYYY-MM-DD HH:mm' : '')}
                    placeholderTextColor="#69707c"
                    style={styles.darkInput}
                    multiline={field.key === 'notes'}
                  />
                )}
              </View>
            ))}
            {!!error && <Text style={styles.error}>{error}</Text>}
            <Pressable disabled={saving} onPress={() => void save()} style={[styles.primaryButton, saving && styles.disabled]}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Save</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function ListShell<T extends { id: number }>({ rows, loading, error, refreshing, onRefresh, onAdd, render, searchableText }: {
  rows: T[];
  loading: boolean;
  error: string;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  onAdd: () => void;
  render: (item: T) => React.ReactNode;
  searchableText: (item: T) => string;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter(item => searchableText(item).toLowerCase().includes(q)) : rows;
  }, [rows, query, searchableText]);

  if (loading) return <Centered><ActivityIndicator color="#ef3b3b" /></Centered>;

  return (
    <View style={styles.listPage}>
      <View style={styles.listHeader}>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search" placeholderTextColor="#969ca5" style={styles.searchInput} />
        <Pressable onPress={onAdd} style={styles.addButton}><Text style={styles.addButtonText}>＋ Add</Text></Pressable>
      </View>
      {!!error && <Text style={[styles.error, styles.listError]}>{error}</Text>}
      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => <>{render(item)}</>}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        ListEmptyComponent={<View style={styles.emptyCard}><Text style={styles.emptyTitle}>Nothing here yet</Text><Text style={styles.emptySub}>Tap Add to create the first record.</Text></View>}
      />
    </View>
  );
}

function RecordCard({ title, meta, detail, status, onEdit }: { title: string; meta: string; detail: string; status?: string; onEdit: () => void }) {
  return (
    <Pressable onPress={onEdit} style={styles.recordCard}>
      <View style={styles.recordMain}>
        <View style={styles.recordTitleRow}><Text numberOfLines={1} style={styles.recordTitle}>{title}</Text>{status ? <StatusBadge value={status} /> : null}</View>
        {!!meta && <Text numberOfLines={1} style={styles.recordMeta}>{meta}</Text>}
        {!!detail && <Text numberOfLines={2} style={styles.recordDetail}>{detail}</Text>}
      </View>
      <View style={styles.editPill}><Text style={styles.editPillText}>Edit</Text></View>
    </Pressable>
  );
}

function StatusBadge({ value }: { value: string }) {
  const positive = ['active','paid','won','done','completed'].includes(value);
  const warning = ['due','urgent','high','blocked'].includes(value);
  return <View style={[styles.statusBadge, positive && styles.statusPositive, warning && styles.statusWarning]}><Text style={[styles.statusText, positive && styles.statusTextPositive, warning && styles.statusTextWarning]}>{value.replaceAll('_', ' ')}</Text></View>;
}

function useList<T>(loader: () => Promise<{ results: T[] }>) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setRows((await loader()).results || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load');
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => { void load(); }, [load]);
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  return { rows, loading, refreshing, error, load, refresh };
}

function Leads({ currency }: { currency: CurrencyCode }) {
  const data = useList<Lead>(api.leads);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [open, setOpen] = useState(false);
  const fields: Field[] = [
    { key:'name', label:'Name', required:true }, { key:'company', label:'Company' }, { key:'email', label:'Email' }, { key:'phone', label:'Phone' },
    { key:'service', label:'Service' }, { key:'source', label:'Source' }, { key:'status', label:'Status', options:statusOpts(['new','contacted','qualified','proposal','warm','follow_up','won','lost']) },
    { key:'value', label:'Value', type:'number' }, { key:'currency', label:'Currency', options:currencyOpts }, { key:'next_action', label:'Next action' }, { key:'notes', label:'Notes' },
  ];
  const initial = useMemo(() => editing ? {
    name:text(editing.name), company:text(editing.company), email:text(editing.email), phone:text(editing.phone), service:text(editing.service), source:text(editing.source), status:text(editing.status),
    value:text(editing.value), currency:text(editing.currency || currency), next_action:text(editing.next_action), notes:text(editing.notes),
  } : { name:'', company:'', email:'', phone:'', service:'', source:'', status:'new', value:'', currency, next_action:'', notes:'' }, [editing, currency]);
  const save = async (form: Record<string,string>) => {
    const payload = { ...form, value:Number(form.value || 0) };
    editing ? await api.updateLead(editing.id, payload) : await api.createLead(payload);
    await data.load();
  };
  return <><ListShell {...data} onRefresh={data.refresh} onAdd={() => { setEditing(null); setOpen(true); }} searchableText={item => `${item.name} ${item.company || ''} ${item.service || ''} ${item.status}`} render={item => <RecordCard title={item.name} meta={[item.company,item.service].filter(Boolean).join(' · ')} detail={`${item.currency || currency} ${item.value || 0} · ${item.next_action || item.email || item.phone || 'No next action'}`} status={item.status} onEdit={() => { setEditing(item); setOpen(true); }} />} /><EntityModal visible={open} title={editing ? 'Edit lead' : 'Add lead'} fields={fields} initial={initial} onClose={() => setOpen(false)} onSave={save} /></>;
}

function Clients() {
  const data = useList<Client>(api.clients);
  const [editing, setEditing] = useState<Client | null>(null);
  const [open, setOpen] = useState(false);
  const fields: Field[] = [
    { key:'name', label:'Name', required:true }, { key:'company', label:'Company' }, { key:'email', label:'Email' }, { key:'phone', label:'Phone' }, { key:'country', label:'Country' },
    { key:'status', label:'Status', options:statusOpts(['active','paused','inactive']) }, { key:'notes', label:'Notes' },
  ];
  const initial = useMemo(() => editing ? { name:text(editing.name), company:text(editing.company), email:text(editing.email), phone:text(editing.phone), country:text(editing.country), status:text(editing.status), notes:text(editing.notes) } : { name:'', company:'', email:'', phone:'', country:'', status:'active', notes:'' }, [editing]);
  const save = async (form: Record<string,string>) => { editing ? await api.updateClient(editing.id, form) : await api.createClient(form); await data.load(); };
  return <><ListShell {...data} onRefresh={data.refresh} onAdd={() => { setEditing(null); setOpen(true); }} searchableText={item => `${item.name} ${item.company || ''} ${item.email || ''} ${item.status}`} render={item => <RecordCard title={item.name} meta={item.company || 'No company'} detail={item.email || item.phone || item.country || 'No contact details'} status={item.status} onEdit={() => { setEditing(item); setOpen(true); }} />} /><EntityModal visible={open} title={editing ? 'Edit client' : 'Add client'} fields={fields} initial={initial} onClose={() => setOpen(false)} onSave={save} /></>;
}

function Projects({ currency }: { currency: CurrencyCode }) {
  const data = useList<Project>(api.projects);
  const [clients, setClients] = useState<Client[]>([]);
  const [editing, setEditing] = useState<Project | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { api.clients().then(result => setClients(result.results || [])).catch(() => undefined); }, []);
  const fields: Field[] = [
    { key:'client_id', label:'Client', required:true, options:clients.map(client => ({ label:client.name, value:String(client.id) })) }, { key:'name', label:'Project name', required:true }, { key:'type', label:'Type' },
    { key:'status', label:'Status', options:statusOpts(['planned','active','blocked','review','done','cancelled']) }, { key:'progress', label:'Progress %', type:'number' }, { key:'start_date', label:'Start date', type:'date' }, { key:'due_date', label:'Due date', type:'date' },
    { key:'budget', label:'Budget', type:'number' }, { key:'currency', label:'Currency', options:currencyOpts },
  ];
  const initial = useMemo(() => editing ? {
    client_id:text(editing.client_id), name:text(editing.name), type:text(editing.type), status:text(editing.status), progress:text(editing.progress), start_date:text(editing.start_date), due_date:text(editing.due_date), budget:text(editing.budget), currency:text(editing.currency || currency),
  } : { client_id:'', name:'', type:'', status:'planned', progress:'0', start_date:'', due_date:'', budget:'', currency }, [editing, currency]);
  const save = async (form: Record<string,string>) => {
    const payload = { ...form, client_id:Number(form.client_id), progress:Number(form.progress || 0), budget:Number(form.budget || 0) };
    editing ? await api.updateProject(editing.id, payload) : await api.createProject(payload);
    await data.load();
  };
  return <><ListShell {...data} onRefresh={data.refresh} onAdd={() => { setEditing(null); setOpen(true); }} searchableText={item => `${item.name} ${item.client_name || ''} ${item.status} ${item.type || ''}`} render={item => <RecordCard title={item.name} meta={[item.client_name,item.type].filter(Boolean).join(' · ')} detail={`${item.progress || 0}% complete · due ${when(item.due_date)}`} status={item.status} onEdit={() => { setEditing(item); setOpen(true); }} />} /><EntityModal visible={open} title={editing ? 'Edit project' : 'Add project'} fields={fields} initial={initial} onClose={() => setOpen(false)} onSave={save} /></>;
}

function Tasks() {
  const data = useList<Task>(api.tasks);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [editing, setEditing] = useState<Task | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { Promise.all([api.projects(), api.clients()]).then(([p,c]) => { setProjects(p.results || []); setClients(c.results || []); }).catch(() => undefined); }, []);
  const fields: Field[] = [
    { key:'title', label:'Task title', required:true }, { key:'project_id', label:'Project', options:[{label:'No project',value:''},...projects.map(project => ({label:project.name,value:String(project.id)}))] },
    { key:'client_id', label:'Client', options:[{label:'No client',value:''},...clients.map(client => ({label:client.name,value:String(client.id)}))] }, { key:'priority', label:'Priority', options:statusOpts(['low','medium','high','urgent']) },
    { key:'status', label:'Status', options:statusOpts(['todo','in_progress','review','done']) }, { key:'due_at', label:'Due', type:'datetime' },
  ];
  const initial = useMemo(() => editing ? { title:text(editing.title), project_id:text(editing.project_id), client_id:text(editing.client_id), priority:text(editing.priority), status:text(editing.status), due_at:text(editing.due_at) } : { title:'', project_id:'', client_id:'', priority:'medium', status:'todo', due_at:'' }, [editing]);
  const save = async (form: Record<string,string>) => {
    const payload = { ...form, project_id:form.project_id ? Number(form.project_id) : null, client_id:form.client_id ? Number(form.client_id) : null };
    editing ? await api.updateTask(editing.id, payload) : await api.createTask(payload);
    await data.load();
  };
  return <><ListShell {...data} onRefresh={data.refresh} onAdd={() => { setEditing(null); setOpen(true); }} searchableText={item => `${item.title} ${item.project_name || ''} ${item.client_name || ''} ${item.status} ${item.priority}`} render={item => <RecordCard title={item.title} meta={[item.project_name || item.client_name,item.assignee_name].filter(Boolean).join(' · ')} detail={`${item.priority} priority · due ${when(item.due_at)}`} status={item.status} onEdit={() => { setEditing(item); setOpen(true); }} />} /><EntityModal visible={open} title={editing ? 'Edit task' : 'Add task'} fields={fields} initial={initial} onClose={() => setOpen(false)} onSave={save} /></>;
}

function Invoices({ currency }: { currency: CurrencyCode }) {
  const data = useList<Invoice>(api.invoices);
  const [clients, setClients] = useState<Client[]>([]);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { api.clients().then(result => setClients(result.results || [])).catch(() => undefined); }, []);
  const fields: Field[] = [
    { key:'client_id', label:'Client', required:true, options:clients.map(client => ({label:client.name,value:String(client.id)})) }, { key:'invoice_no', label:'Invoice number', required:true },
    { key:'status', label:'Status', options:statusOpts(['draft','sent','due','paid','void']) }, { key:'amount', label:'Amount', type:'number' }, { key:'currency', label:'Currency', options:currencyOpts }, { key:'due_date', label:'Due date', type:'date' }, { key:'notes', label:'Notes' },
  ];
  const initial = useMemo(() => editing ? { client_id:text(editing.client_id), invoice_no:text(editing.invoice_no), status:text(editing.status), amount:text(editing.amount), currency:text(editing.currency || currency), due_date:text(editing.due_date), notes:text(editing.notes) } : { client_id:'', invoice_no:`INV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`, status:'draft', amount:'', currency, due_date:'', notes:'' }, [editing, currency]);
  const save = async (form: Record<string,string>) => {
    const payload = { ...form, client_id:Number(form.client_id), amount:Number(form.amount || 0) };
    editing ? await api.updateInvoice(editing.id, payload) : await api.createInvoice(payload);
    await data.load();
  };
  return <><ListShell {...data} onRefresh={data.refresh} onAdd={() => { setEditing(null); setOpen(true); }} searchableText={item => `${item.invoice_no} ${item.client_name || ''} ${item.status} ${item.currency}`} render={item => <RecordCard title={item.invoice_no} meta={item.client_name || 'No client'} detail={`${money(item.amount,item.currency)} · due ${when(item.due_date)}`} status={item.status} onEdit={() => { setEditing(item); setOpen(true); }} />} /><EntityModal visible={open} title={editing ? 'Edit invoice' : 'Create invoice'} fields={fields} initial={initial} onClose={() => setOpen(false)} onSave={save} /></>;
}

function Centered({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return <SafeAreaView style={[styles.centered, dark && styles.centeredDark]}>{children}</SafeAreaView>;
}

const androidTop = Platform.OS === 'android' ? (NativeStatusBar.currentHeight ?? 24) : 0;

const styles = StyleSheet.create({
  app: { flex:1, backgroundColor:'#0b0d11' },
  body: { flex:1, backgroundColor:'#f5f6f8' },
  header: { minHeight:86 + androidTop, paddingTop:androidTop + 10, paddingHorizontal:20, paddingBottom:14, flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:'#0b0d11', borderBottomWidth:1, borderBottomColor:'#1c2027' },
  headerCopy: { flex:1, paddingRight:12 },
  kicker: { color:'#858c98', fontSize:9, fontWeight:'800', letterSpacing:1.5 },
  screenTitle: { color:'#fff', fontSize:25, lineHeight:30, fontWeight:'900', marginTop:3 },
  headerLogo: { width:40, height:40, borderRadius:12, backgroundColor:'#fff' },

  bottomBar: { minHeight:68, paddingTop:7, paddingBottom:Platform.OS === 'ios' ? 16 : 8, paddingHorizontal:8, flexDirection:'row', alignItems:'center', backgroundColor:'#0b0d11', borderTopWidth:1, borderTopColor:'#1d2128' },
  bottomItem: { flex:1, alignItems:'center', justifyContent:'center', minHeight:50, gap:3 },
  navGlyph: { minWidth:28, height:25, paddingHorizontal:6, borderRadius:8, alignItems:'center', justifyContent:'center' },
  navGlyphActive: { backgroundColor:'#2a171b' },
  navGlyphText: { color:'#777f8b', fontSize:11, fontWeight:'900' },
  navGlyphTextActive: { color:'#ff5558' },
  bottomLabel: { color:'#777f8b', fontSize:9, fontWeight:'700' },
  bottomLabelActive: { color:'#ff5558' },

  login: { flex:1, backgroundColor:'#0b0d11' },
  loginInner: { flex:1, justifyContent:'center', paddingHorizontal:24, paddingTop:androidTop },
  loginLogo: { width:68, height:68, borderRadius:19, backgroundColor:'#fff', marginBottom:22 },
  loginEyebrow: { color:'#ef4a4d', fontSize:10, fontWeight:'900', letterSpacing:1.5 },
  loginTitle: { color:'#fff', fontSize:32, fontWeight:'900', marginTop:7 },
  loginSub: { color:'#9399a3', fontSize:14, lineHeight:21, marginTop:8, marginBottom:26 },
  darkFieldLabel: { color:'#c8ccd3', fontSize:12, fontWeight:'800', marginBottom:7 },
  darkInput: { minHeight:50, borderWidth:1, borderColor:'#2b3039', backgroundColor:'#15181e', borderRadius:13, paddingHorizontal:14, paddingVertical:12, color:'#fff', fontSize:15, marginBottom:13 },
  primaryButton: { minHeight:50, borderRadius:13, backgroundColor:'#ef3b3b', alignItems:'center', justifyContent:'center', marginTop:6 },
  primaryButtonText: { color:'#fff', fontWeight:'900', fontSize:15 },
  disabled: { opacity:.6 },
  error: { color:'#b92f35', backgroundColor:'#fff0f0', borderWidth:1, borderColor:'#ffdadd', padding:11, borderRadius:10, marginVertical:8, fontSize:12, lineHeight:18 },

  centered: { flex:1, backgroundColor:'#f5f6f8', alignItems:'center', justifyContent:'center', gap:12 },
  centeredDark: { backgroundColor:'#0b0d11' },
  loadingText: { color:'#8a919d' },

  homeScroll: { paddingHorizontal:16, paddingTop:16, paddingBottom:28, gap:15 },
  hero: { backgroundColor:'#111318', borderRadius:20, paddingHorizontal:19, paddingVertical:19, borderWidth:1, borderColor:'#1e2229' },
  heroEyebrow: { color:'#ff5558', fontSize:9, fontWeight:'900', letterSpacing:1.5 },
  heroTitle: { color:'#fff', fontSize:24, lineHeight:30, fontWeight:'900', marginTop:8 },
  heroSub: { color:'#9299a5', fontSize:13, lineHeight:19, marginTop:6 },
  statGrid: { flexDirection:'row', flexWrap:'wrap', gap:10 },
  statCard: { minHeight:124, backgroundColor:'#fff', borderWidth:1, borderColor:'#e4e7eb', borderRadius:17, padding:15, justifyContent:'space-between' },
  statLabel: { color:'#747b86', fontSize:11, fontWeight:'800' },
  statValue: { color:'#15171c', fontSize:23, lineHeight:28, fontWeight:'900', marginVertical:6 },
  statHint: { color:'#a0a5ad', fontSize:10 },
  dashboardLoader: { minHeight:110, alignItems:'center', justifyContent:'center', backgroundColor:'#fff', borderRadius:17 },
  sectionHead: { marginTop:2 },
  sectionTitle: { color:'#17191e', fontSize:16, fontWeight:'900' },
  sectionSub: { color:'#7c838d', fontSize:11, lineHeight:17, marginTop:3 },
  quickRow: { gap:9, paddingRight:4 },
  quickCard: { width:126, minHeight:90, padding:13, backgroundColor:'#fff', borderWidth:1, borderColor:'#e4e7eb', borderRadius:15 },
  quickDot: { width:8, height:8, borderRadius:4, backgroundColor:'#ef3b3b', marginBottom:10 },
  quickTitle: { color:'#181a1f', fontSize:13, fontWeight:'900' },
  quickCaption: { color:'#8a9099', fontSize:10, marginTop:4 },
  currencyCard: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', gap:12, backgroundColor:'#fff', borderWidth:1, borderColor:'#e4e7eb', borderRadius:17, padding:16 },
  currencyCopy: { flex:1 },
  currencyButton: { minWidth:78, alignItems:'center', justifyContent:'center', backgroundColor:'#f0f2f5', borderRadius:12, paddingVertical:10, paddingHorizontal:12 },
  currencyCode: { color:'#16181d', fontSize:15, fontWeight:'900' },
  currencyChange: { color:'#ef3b3b', fontSize:9, fontWeight:'800', marginTop:2 },

  sheetBackdrop: { flex:1, backgroundColor:'rgba(4,6,9,.6)', justifyContent:'flex-end' },
  sheet: { backgroundColor:'#111318', borderTopLeftRadius:24, borderTopRightRadius:24, borderWidth:1, borderColor:'#282d36', paddingHorizontal:18, paddingTop:10, paddingBottom:Platform.OS === 'ios' ? 30 : 20 },
  sheetHandle: { alignSelf:'center', width:38, height:4, borderRadius:2, backgroundColor:'#363c46', marginBottom:14 },
  sheetTitle: { color:'#fff', fontSize:20, fontWeight:'900' },
  sheetSubtitle: { color:'#878e99', fontSize:11, marginTop:4 },
  sheetHeaderRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:15 },
  profileRow: { flexDirection:'row', alignItems:'center', paddingVertical:14, borderBottomWidth:1, borderBottomColor:'#242931', marginBottom:3 },
  profileAvatar: { width:38, height:38, borderRadius:12, backgroundColor:'#242a32', alignItems:'center', justifyContent:'center' },
  profileAvatarText: { color:'#fff', fontWeight:'900' },
  profileText: { marginLeft:11 },
  profileName: { color:'#fff', fontSize:13, fontWeight:'800' },
  profileRole: { color:'#858c97', fontSize:10, marginTop:2, textTransform:'capitalize' },
  menuRow: { minHeight:64, flexDirection:'row', alignItems:'center', justifyContent:'space-between', borderBottomWidth:1, borderBottomColor:'#22272f', paddingVertical:11 },
  menuRowActive: { backgroundColor:'#171a20', marginHorizontal:-8, paddingHorizontal:8, borderRadius:11 },
  menuTitle: { color:'#fff', fontSize:14, fontWeight:'800' },
  menuSub: { color:'#7f8792', fontSize:10, marginTop:3 },
  menuArrow: { color:'#777f8b', fontSize:25 },
  signOutRow: { marginTop:14, minHeight:48, borderWidth:1, borderColor:'#3a2528', borderRadius:12, alignItems:'center', justifyContent:'center' },
  signOutText: { color:'#ff6063', fontWeight:'800' },
  closeCircle: { width:34, height:34, borderRadius:10, backgroundColor:'#242830', alignItems:'center', justifyContent:'center' },
  closeCircleText: { color:'#fff', fontSize:22, lineHeight:24 },
  currencyGrid: { flexDirection:'row', flexWrap:'wrap', gap:8 },
  currencyOption: { width:'22.8%', minHeight:44, alignItems:'center', justifyContent:'center', backgroundColor:'#191c22', borderWidth:1, borderColor:'#2b3039', borderRadius:11 },
  currencyOptionActive: { backgroundColor:'#ef3b3b', borderColor:'#ef3b3b' },
  currencyOptionText: { color:'#a5abb4', fontSize:12, fontWeight:'900' },
  currencyOptionTextActive: { color:'#fff' },

  listPage: { flex:1 },
  listHeader: { flexDirection:'row', gap:9, paddingHorizontal:13, paddingTop:13, paddingBottom:9, backgroundColor:'#f5f6f8' },
  searchInput: { flex:1, height:44, backgroundColor:'#fff', borderWidth:1, borderColor:'#e0e3e7', borderRadius:12, paddingHorizontal:13, color:'#17191e', fontSize:14 },
  addButton: { height:44, paddingHorizontal:16, backgroundColor:'#ef3b3b', borderRadius:12, alignItems:'center', justifyContent:'center' },
  addButtonText: { color:'#fff', fontSize:12, fontWeight:'900' },
  listError: { marginHorizontal:13 },
  listContent: { paddingHorizontal:13, paddingTop:4, paddingBottom:24, gap:9 },
  emptyCard: { marginTop:28, padding:24, alignItems:'center', backgroundColor:'#fff', borderWidth:1, borderColor:'#e4e7eb', borderRadius:16 },
  emptyTitle: { color:'#26292f', fontSize:14, fontWeight:'900' },
  emptySub: { color:'#8c929b', fontSize:11, marginTop:5 },
  recordCard: { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:'#fff', borderWidth:1, borderColor:'#e3e6ea', borderRadius:15, padding:14 },
  recordMain: { flex:1, minWidth:0 },
  recordTitleRow: { flexDirection:'row', alignItems:'center', gap:8 },
  recordTitle: { flexShrink:1, color:'#181a1f', fontSize:15, fontWeight:'900' },
  recordMeta: { color:'#6f7680', fontSize:11, marginTop:5 },
  recordDetail: { color:'#9399a2', fontSize:11, lineHeight:16, marginTop:5 },
  editPill: { backgroundColor:'#f2f3f5', paddingHorizontal:9, paddingVertical:7, borderRadius:9 },
  editPillText: { color:'#d6383d', fontSize:10, fontWeight:'900' },
  statusBadge: { backgroundColor:'#f1f2f4', paddingHorizontal:7, paddingVertical:4, borderRadius:999 },
  statusText: { color:'#606772', fontSize:8, fontWeight:'900', textTransform:'capitalize' },
  statusPositive: { backgroundColor:'#eaf7ef' },
  statusTextPositive: { color:'#2d7d4f' },
  statusWarning: { backgroundColor:'#fff1ec' },
  statusTextWarning: { color:'#bd5130' },

  modalBackdrop: { flex:1, backgroundColor:'rgba(4,6,9,.66)', justifyContent:'flex-end' },
  modalCard: { maxHeight:'90%', backgroundColor:'#0f1116', borderTopLeftRadius:24, borderTopRightRadius:24, borderWidth:1, borderColor:'#292e37', paddingBottom:Platform.OS === 'ios' ? 22 : 12 },
  modalHead: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:18, paddingTop:15, paddingBottom:13, borderBottomWidth:1, borderBottomColor:'#252a33' },
  modalEyebrow: { color:'#ef4b4e', fontSize:8, fontWeight:'900', letterSpacing:1.4 },
  modalTitle: { color:'#fff', fontSize:20, fontWeight:'900', marginTop:3 },
  form: { padding:18, paddingBottom:35 },
  formGroup: { marginBottom:5 },
  optionRow: { gap:7, paddingBottom:13, paddingRight:6 },
  option: { minHeight:38, justifyContent:'center', paddingHorizontal:12, borderRadius:10, borderWidth:1, borderColor:'#303641', backgroundColor:'#171a20' },
  optionActive: { backgroundColor:'#ef3b3b', borderColor:'#ef3b3b' },
  optionText: { color:'#adb3bc', fontSize:11, fontWeight:'800', textTransform:'capitalize' },
  optionTextActive: { color:'#fff' },
});
