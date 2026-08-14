import React, { useState, useEffect, ComponentProps } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView, StatusBar, KeyboardTypeOptions, Image, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../components/toastConfig';
import { getErrorMessage } from '../utils/errors';
import { forgotPassword } from '../api/authService';
import ResponsiveScreen, { SHEET_MAX_WIDTH } from '../components/ResponsiveScreen';
import type { RootStackScreenProps } from '../types/navigation';

type Props = RootStackScreenProps<'Login'>;
type IconName = ComponentProps<typeof Ionicons>['name'];

// ─── Logo ──────────────────────────────────────────────────────────────────────
function Logo({ size = 52 }: { size?: number }) {
  return (
    <View style={[styles.logoWrap, { width: size, height: size, borderRadius: size * 0.24 }]}>
      <Image
        // Metro needs a static require() to resolve local image assets —
        // there's no ambient `*.png` module declaration here for an ES import.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        source={require('../../assets/transFavi.png')}
        style={{ width: size * 0.78, height: size * 0.78 }}
        resizeMode="contain"
      />
    </View>
  );
}

// ─── Input Field ───────────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
  icon: IconName;
}

function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize, secureTextEntry, icon }: FieldProps) {
  const [show, setShow] = useState(false);
  const isPwd = secureTextEntry !== undefined;
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <Ionicons name={icon} size={18} color="#9ca3af" style={{ marginRight: 10 }} />
        <TextInput
          style={styles.inputField}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'sentences'}
          secureTextEntry={isPwd ? !show : false}
          autoCorrect={false}
        />
        {isPwd && (
          <TouchableOpacity onPress={() => setShow(s => !s)} style={{ padding: 4 }}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Forgot Password Modal ─────────────────────────────────────────────────────
interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

// Defined at module scope — see AddBranchModal in SettingsScreen.tsx for why:
// a component defined inside another component's render body loses focus/text
// on every keystroke because React treats it as a brand-new type each render.
type ForgotPasswordStep = 'confirm' | 'not-owner' | 'email';

function ForgotPasswordModal({ visible, onClose }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<ForgotPasswordStep>('confirm');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) { setStep('confirm'); setEmail(''); }
  }, [visible]);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter your email address' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await forgotPassword(email.trim());
      Toast.show({ type: 'success', text1: res.message, visibilityTime: 5000 });
      onClose();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e, 'Failed to send reset link') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={forgotPwdStyles.overlay}>
        <View style={forgotPwdStyles.sheet}>
          <View style={forgotPwdStyles.handle} />
          <View style={forgotPwdStyles.header}>
            <Text style={forgotPwdStyles.title}>Forgot Password</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#6b7280" /></TouchableOpacity>
          </View>

          {/* ── Step 1: confirm role ── */}
          {step === 'confirm' && (
            <View style={forgotPwdStyles.body}>
              <Text style={forgotPwdStyles.helperText}>Are you the owner of your garage account?</Text>
              <TouchableOpacity style={forgotPwdStyles.choiceBtnPrimary} onPress={() => setStep('email')}>
                <Text style={forgotPwdStyles.choiceBtnPrimaryText}>Yes, I'm the owner</Text>
              </TouchableOpacity>
              <TouchableOpacity style={forgotPwdStyles.choiceBtnSecondary} onPress={() => setStep('not-owner')}>
                <Text style={forgotPwdStyles.choiceBtnSecondaryText}>No, I'm a staff member</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Not the owner: no email collected, no request sent ── */}
          {step === 'not-owner' && (
            <View style={forgotPwdStyles.body}>
              <View style={forgotPwdStyles.noticeBox}>
                <Text style={forgotPwdStyles.noticeText}>
                  Staff passwords are managed by the garage. Ask your owner or an admin to reset your password from Settings → Staff.
                </Text>
              </View>
              <TouchableOpacity style={[forgotPwdStyles.choiceBtnSecondary, { marginTop: 16 }]} onPress={() => setStep('confirm')}>
                <Text style={forgotPwdStyles.choiceBtnSecondaryText}>Back</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 2: owner enters email ── */}
          {step === 'email' && (
            <>
              <ScrollView style={forgotPwdStyles.body} keyboardShouldPersistTaps="handled">
                <Text style={forgotPwdStyles.helperText}>
                  Enter your account email and we'll send you a link to reset your password.
                </Text>
                <Field label="Email Address" value={email} onChangeText={setEmail}
                  placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" icon="mail-outline" />
              </ScrollView>
              <View style={forgotPwdStyles.footer}>
                <TouchableOpacity style={forgotPwdStyles.cancelBtn} onPress={() => setStep('confirm')}>
                  <Text style={forgotPwdStyles.cancelBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[forgotPwdStyles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
                  {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={forgotPwdStyles.submitBtnText}>Send Link</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
      {/* Modal-scoped Toast — RN's Modal renders above the app-root Toast in
          App.tsx, so the root Toast would be hidden behind this sheet. */}
      <Toast config={toastConfig} />
    </Modal>
  );
}

const forgotPwdStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', width: '100%', maxWidth: SHEET_MAX_WIDTH },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginTop: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  body: { padding: 20 },
  helperText: { fontSize: 14, color: '#6b7280', lineHeight: 20, marginBottom: 16 },
  footer: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', backgroundColor: '#f3f4f6' },
  cancelBtnText: { color: '#374151', fontWeight: '600' },
  submitBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', backgroundColor: '#3b5ff8' },
  submitBtnText: { color: '#fff', fontWeight: '700' },
  noticeBox: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 12, padding: 16 },
  noticeText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  // Standalone full-width choice buttons (confirm/not-owner steps) — deliberately
  // NOT flex:1 like submitBtn/cancelBtn above, which only works inside the
  // row-direction footer; flex:1 in a plain column View collapses to zero height.
  choiceBtnPrimary: { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3b5ff8' },
  choiceBtnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  choiceBtnSecondary: { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', marginTop: 10 },
  choiceBtnSecondaryText: { color: '#374151', fontWeight: '600', fontSize: 15 },
});

// ─── Features list (shown on register) ────────────────────────────────────────
const FEATURES = [
  { icon: '📋', label: 'Job Card Management' },
  { icon: '💰', label: 'Billing & Invoices' },
  { icon: '📦', label: 'Inventory Tracking' },
  { icon: '👥', label: 'Staff Management' },
];

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function LoginScreen(_props: Props) {
  const { login, register } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState(1);       // register multi-step: 1 | 2
  const [loading, setLoading] = useState(false);
  const [forgotPwdVisible, setForgotPwdVisible] = useState(false);

  // Shared
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register only
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [garageName, setGarageName] = useState('');

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setStep(1);
    setEmail(''); setPassword(''); setName(''); setPhone(''); setGarageName('');
  };

  // ── Login ──
  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Toast.show({ type: 'error', text1: 'Please enter your email and password' });
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      Toast.show({ type: 'success', text1: 'Welcome back! 👋' });
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e, 'Login failed') });
    } finally {
      setLoading(false);
    }
  };

  // ── Register step 1 → 2 ──
  const handleNextStep = () => {
    if (!name.trim()) { Toast.show({ type: 'error', text1: 'Please enter your name' }); return; }
    if (!phone.trim() || phone.length < 10) { Toast.show({ type: 'error', text1: 'Enter a valid 10-digit phone number' }); return; }
    if (!email.trim()) { Toast.show({ type: 'error', text1: 'Please enter your email' }); return; }
    if (!password || password.length < 6) { Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' }); return; }
    setStep(2);
  };

  // ── Register step 2 → submit ──
  const handleRegister = async () => {
    if (!garageName.trim()) { Toast.show({ type: 'error', text1: 'Please enter your garage name' }); return; }
    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim(), phone: phone.trim(), password, garageName: garageName.trim() });
      Toast.show({ type: 'success', text1: 'Garage registered! Welcome 🎉' });
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e, 'Registration failed') });
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#3b5ff8" />
      <ResponsiveScreen backgroundColor="#3b5ff8">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header banner ── */}
        <View style={styles.banner}>
          <View style={styles.bannerCircle1} />
          <View style={styles.bannerCircle2} />
          <Logo size={56} />
          <Text style={styles.bannerTitle}>GaragePulse</Text>
          <Text style={styles.bannerSub}>
            {mode === 'login' ? 'Sign in to manage your workshop' : 'Register your garage & go digital'}
          </Text>
        </View>

        {/* ── Card ── */}
        <View style={styles.card}>

          {/* ──── LOGIN FORM ──── */}
          {mode === 'login' && (
            <>
              <Text style={styles.cardTitle}>Welcome back 👋</Text>
              <Text style={styles.cardSub}>Enter your credentials to continue</Text>

              <Field label="Email Address" value={email} onChangeText={setEmail}
                placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" icon="mail-outline" />
              <Field label="Password" value={password} onChangeText={setPassword}
                placeholder="••••••••" secureTextEntry autoCapitalize="none" icon="lock-closed-outline" />

              <TouchableOpacity onPress={() => setForgotPwdVisible(true)} style={styles.forgotPwdRow}>
                <Text style={styles.forgotPwdLink}>Forgot password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && { opacity: 0.65 }]}
                onPress={handleLogin} disabled={loading} activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <><Ionicons name="log-in-outline" size={20} color="#fff" /><Text style={styles.primaryBtnText}>Sign In</Text></>
                }
              </TouchableOpacity>

              <View style={styles.switchRow}>
                <Text style={styles.switchText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => switchMode('register')}>
                  <Text style={styles.switchLink}>Register your garage</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ──── REGISTER: STEP 1 (Personal + Account) ──── */}
          {mode === 'register' && step === 1 && (
            <>
              {/* Progress */}
              <View style={styles.progressRow}>
                <View style={styles.stepWrap}>
                  <View style={[styles.stepDot, styles.stepDotActive]}><Text style={styles.stepDotNum}>1</Text></View>
                  <Text style={[styles.stepLabel, { color: '#3b5ff8' }]}>Your Info</Text>
                </View>
                <View style={styles.stepLine} />
                <View style={styles.stepWrap}>
                  <View style={styles.stepDot}><Text style={styles.stepDotNum}>2</Text></View>
                  <Text style={styles.stepLabel}>Garage Info</Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>Create your account</Text>
              <Text style={styles.cardSub}>We'll set up your garage in the next step</Text>

              <Field label="Full Name *" value={name} onChangeText={setName}
                placeholder="John Doe" icon="person-outline" />
              <Field label="Phone Number *" value={phone} onChangeText={setPhone}
                placeholder="9876543210" keyboardType="phone-pad" autoCapitalize="none" icon="call-outline" />
              <Field label="Email Address *" value={email} onChangeText={setEmail}
                placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" icon="mail-outline" />
              <Field label="Password *" value={password} onChangeText={setPassword}
                placeholder="Min. 6 characters" secureTextEntry autoCapitalize="none" icon="lock-closed-outline" />

              <TouchableOpacity style={styles.primaryBtn} onPress={handleNextStep} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>

              <View style={styles.switchRow}>
                <Text style={styles.switchText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => switchMode('login')}>
                  <Text style={styles.switchLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ──── REGISTER: STEP 2 (Garage Details) ──── */}
          {mode === 'register' && step === 2 && (
            <>
              {/* Progress */}
              <View style={styles.progressRow}>
                <View style={styles.stepWrap}>
                  <View style={[styles.stepDot, styles.stepDotDone]}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                  <Text style={styles.stepLabel}>Your Info</Text>
                </View>
                <View style={[styles.stepLine, { backgroundColor: '#3b5ff8' }]} />
                <View style={styles.stepWrap}>
                  <View style={[styles.stepDot, styles.stepDotActive]}><Text style={styles.stepDotNum}>2</Text></View>
                  <Text style={[styles.stepLabel, { color: '#3b5ff8' }]}>Garage Info</Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>Name your garage 🏪</Text>
              <Text style={styles.cardSub}>This will appear on all your documents</Text>

              <Field label="Garage Name *" value={garageName} onChangeText={setGarageName}
                placeholder="Speed Auto Works" icon="business-outline" />

              {/* Feature pills */}
              <View style={styles.featuresWrap}>
                <Text style={styles.featuresLabel}>You'll get access to:</Text>
                <View style={styles.featureGrid}>
                  {FEATURES.map((f, i) => (
                    <View key={i} style={styles.featurePill}>
                      <Text style={styles.featureEmoji}>{f.icon}</Text>
                      <Text style={styles.featureText}>{f.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.stepBtns}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)} activeOpacity={0.8}>
                  <Ionicons name="arrow-back" size={18} color="#6b7280" />
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 1 }, loading && { opacity: 0.65 }]}
                  onPress={handleRegister} disabled={loading} activeOpacity={0.85}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={styles.primaryBtnText}>Create Garage</Text></>
                  }
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <Text style={styles.footer}>© 2026 GaragePulse. All rights reserved.</Text>
      </ScrollView>
      </ResponsiveScreen>
      <ForgotPasswordModal visible={forgotPwdVisible} onClose={() => setForgotPwdVisible(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#3b5ff8' },
  content: { flexGrow: 1, paddingBottom: 32 },

  // Banner
  banner: {
    alignItems: 'center', paddingTop: 56, paddingBottom: 40,
    paddingHorizontal: 24, position: 'relative', overflow: 'hidden',
  },
  bannerCircle1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -80, right: -60,
  },
  bannerCircle2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.06)', bottom: 0, left: -40,
  },
  logoWrap: {
    backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center',
    marginBottom: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  bannerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', letterSpacing: 0.5 },
  bannerSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 6, textAlign: 'center' },

  // Card
  card: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    marginHorizontal: 16, padding: 24,
    shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  cardSub: { fontSize: 14, color: '#6b7280', marginBottom: 24 },

  // Progress stepper
  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  stepWrap: { alignItems: 'center', gap: 4 },
  stepDot: {
    width: 28, height: 28, borderRadius: 16, backgroundColor: '#e5e7eb',
    justifyContent: 'center', alignItems: 'center',
  },
  stepDotActive: { backgroundColor: '#3b5ff8' },
  stepDotDone: { backgroundColor: '#10b981' },
  stepDotNum: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  stepLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#e5e7eb', marginHorizontal: 8, marginBottom: 12 },

  // Form fields
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fdfcfb', borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 16, paddingHorizontal: 14, height: 50,
  },
  inputField: { flex: 1, fontSize: 15, color: '#1f2937' },

  // Forgot password link
  forgotPwdRow: { alignSelf: 'flex-end', marginTop: -8, marginBottom: 4 },
  forgotPwdLink: { fontSize: 13, fontWeight: '600', color: '#3b5ff8' },

  // Buttons
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#3b5ff8', borderRadius: 16, paddingVertical: 15, marginTop: 8,
    shadowColor: '#3b5ff8', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  stepBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 15, paddingHorizontal: 16, borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  backBtnText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },

  // Switch link
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  switchText: { fontSize: 14, color: '#6b7280' },
  switchLink: { fontSize: 14, fontWeight: 'bold', color: '#3b5ff8' },

  // Features
  featuresWrap: { backgroundColor: '#fdfcfb', borderRadius: 16, padding: 16, marginVertical: 16 },
  featuresLabel: { fontSize: 12, fontWeight: '700', color: '#9ca3af', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  featurePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 160, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#e5e7eb' },
  featureEmoji: { fontSize: 14 },
  featureText: { fontSize: 12, fontWeight: '600', color: '#374151' },

  footer: { textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 24, paddingHorizontal: 24 },
});
