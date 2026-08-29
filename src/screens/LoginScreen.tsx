import React, { useState, useEffect, ComponentProps } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView, StatusBar, KeyboardTypeOptions, Image, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useForm, useController, useWatch, type Control, type FieldValues, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../components/toastConfig';
import { getErrorMessage } from '../utils/errors';
import { forgotPassword } from '../api/authService';
import ResponsiveScreen, { SHEET_MAX_WIDTH } from '../components/ResponsiveScreen';
import { ControlledPicker } from '../components/FormControls';
import {
  loginSchema, registerSchema, forgotPasswordSchema,
  type LoginFormValues, type RegisterFormValues, type ForgotPasswordFormValues,
} from '../utils/validation';
import { useCountries } from '../hooks/useCountries';
import { DEFAULT_LOCALE, timezoneChoicesFor } from '../utils/locale';
import type { RootStackScreenProps } from '../types/navigation';
import { colors, palette, radius } from '../theme';

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
interface FieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
  icon: IconName;
}

// Bound with `useController`, not `register`: a TextInput has no DOM ref and
// emits no native change event, so `register` typechecks and then never sees a
// keystroke. See ControlledField in components/FormControls.tsx.
function Field<T extends FieldValues>({ control, name, label, placeholder, keyboardType, autoCapitalize, secureTextEntry, icon }: FieldProps<T>) {
  const [show, setShow] = useState(false);
  const { field, fieldState } = useController({ control, name });
  const isPwd = secureTextEntry !== undefined;
  const invalid = !!fieldState.error;
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputRow, invalid && styles.inputRowError]}>
        <Ionicons name={icon} size={18} color={colors.textFaint} style={{ marginRight: 10 }} />
        <TextInput
          accessibilityLabel={label}
          style={styles.inputField}
          value={field.value == null ? '' : String(field.value)}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'sentences'}
          secureTextEntry={isPwd ? !show : false}
          autoCorrect={false}
        />
        {isPwd && (
          <TouchableOpacity onPress={() => setShow(s => !s)} style={{ padding: 4 }}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textFaint} />
          </TouchableOpacity>
        )}
      </View>
      {invalid ? <Text style={styles.fieldError}>{fieldState.error?.message}</Text> : null}
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
  const {
    control, handleSubmit: submitForm, reset,
    formState: { isSubmitting: submitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (visible) { setStep('confirm'); reset({ email: '' }); }
  }, [visible, reset]);

  const handleSubmit = async (values: ForgotPasswordFormValues) => {
    try {
      const res = await forgotPassword(values.email);
      Toast.show({ type: 'success', text1: res.message, visibilityTime: 5000 });
      onClose();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e, 'Failed to send reset link') });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={forgotPwdStyles.overlay}>
        <View style={forgotPwdStyles.sheet}>
          <View style={forgotPwdStyles.handle} />
          <View style={forgotPwdStyles.header}>
            <Text style={forgotPwdStyles.title}>Forgot Password</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textMuted} /></TouchableOpacity>
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
                <Field control={control} name="email" label="Email Address"
                  placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" icon="mail-outline" />
              </ScrollView>
              <View style={forgotPwdStyles.footer}>
                <TouchableOpacity style={forgotPwdStyles.cancelBtn} onPress={() => setStep('confirm')}>
                  <Text style={forgotPwdStyles.cancelBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[forgotPwdStyles.submitBtn, submitting && { opacity: 0.6 }]} onPress={submitForm(handleSubmit)} disabled={submitting}>
                  {submitting ? <ActivityIndicator color={colors.textOnPrimary} size="small" /> : <Text style={forgotPwdStyles.submitBtnText}>Send Link</Text>}
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
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', width: '100%', maxWidth: SHEET_MAX_WIDTH },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted },
  title: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  body: { padding: 20 },
  helperText: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: 16 },
  footer: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: colors.surfaceMuted },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.surfaceMuted },
  cancelBtnText: { color: colors.textSecondary, fontWeight: '600' },
  submitBtn: { flex: 1, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.primary },
  submitBtnText: { color: colors.textOnPrimary, fontWeight: '700' },
  noticeBox: { backgroundColor: colors.warningSoft, borderWidth: 1, borderColor: palette.amber200, borderRadius: radius.md, padding: 16 },
  noticeText: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  // Standalone full-width choice buttons (confirm/not-owner steps) — deliberately
  // NOT flex:1 like submitBtn/cancelBtn above, which only works inside the
  // row-direction footer; flex:1 in a plain column View collapses to zero height.
  choiceBtnPrimary: { width: '100%', paddingVertical: 14, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  choiceBtnPrimaryText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
  choiceBtnSecondary: { width: '100%', paddingVertical: 14, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted, marginTop: 10 },
  choiceBtnSecondaryText: { color: colors.textSecondary, fontWeight: '600', fontSize: 15 },
});

// ─── Features list (shown on register) ────────────────────────────────────────
// Ionicons rather than emoji: emoji render differently on every platform and
// OS version, and at pill size they read as clip art next to the rest of the
// app's icon set.
const FEATURES: { icon: IconName; label: string }[] = [
  { icon: 'clipboard-outline', label: 'Job Card Management' },
  { icon: 'card-outline', label: 'Billing & Invoices' },
  { icon: 'cube-outline', label: 'Inventory Tracking' },
  { icon: 'people-outline', label: 'Staff Management' },
];

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function LoginScreen(_props: Props) {
  const { login, register } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState(1);       // register multi-step: 1 | 2
  const [loading, setLoading] = useState(false);
  const [forgotPwdVisible, setForgotPwdVisible] = useState(false);

  // Two separate forms rather than one with optional halves: the login form
  // must not carry `name`/`garageName` rules that a signing-in user can never
  // satisfy, and switching modes should discard whatever was half-typed.
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '', garageName: '', email: '', phone: '', password: '',
      // India by default, matching the server: every garage created before the
      // picker existed is Indian, and it stays the common case.
      country: DEFAULT_LOCALE.country, timezone: '',
    },
  });

  // `useWatch`, not the `watch()` from useForm — the React Compiler lint rule
  // rejects `watch()` as unmemoizable (react-hooks/incompatible-library).
  const country = useWatch({ control: registerForm.control, name: 'country' });

  const { countries } = useCountries();
  const selectedCountry = countries.find(c => c.code === country);
  const timezoneOptions = timezoneChoicesFor(country);
  // Only ask for a zone when the country genuinely spans several. The server
  // ignores it otherwise, so hiding the field keeps the form honest.
  const needsTimezone = (selectedCountry?.requiresTimezoneChoice ?? false) && timezoneOptions.length > 0;
  // Until the list loads, offer the default so the picker is never empty and
  // signup is never blocked by a failed reference-data fetch.
  const countryOptions = countries.length
    ? countries.map(c => ({ value: c.code, label: c.name }))
    : [{ value: DEFAULT_LOCALE.country, label: 'India' }];

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setStep(1);
    loginForm.reset();
    registerForm.reset();
  };

  // ── Login ──
  const handleLogin = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      Toast.show({ type: 'success', text1: 'Welcome back!' });
    } catch (e) {
      // A rejected credential is the server's answer about the request, not a
      // rule this form could have checked — so it stays a toast.
      Toast.show({ type: 'error', text1: getErrorMessage(e, 'Login failed') });
    } finally {
      setLoading(false);
    }
  };

  // ── Register step 1 → 2 ──
  //
  // Only step 1's fields are validated here. `trigger` with an explicit list is
  // what keeps `garageName` — which lives on step 2 and is legitimately empty
  // at this point — from blocking the Continue button.
  const handleNextStep = async () => {
    const ok = await registerForm.trigger(['name', 'country', 'phone', 'email', 'password']);
    if (!ok) return;
    // Conditional on the chosen country, so the schema cannot express it: only
    // multi-zone countries ask for a zone at all.
    if (needsTimezone && !registerForm.getValues('timezone')) {
      registerForm.setError('timezone', { message: 'Select your timezone' });
      return;
    }
    setStep(2);
  };

  // ── Register step 2 → submit ──
  const handleRegister = async (values: RegisterFormValues) => {
    setLoading(true);
    try {
      await register({
        name: values.name, email: values.email, phone: values.phone, password: values.password,
        garageName: values.garageName, country: values.country,
        ...(needsTimezone && values.timezone ? { timezone: values.timezone } : {})
      });
      Toast.show({ type: 'success', text1: 'Garage registered!' });
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e, 'Registration failed') });
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <ResponsiveScreen backgroundColor={colors.primary}>
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
              <Text style={styles.cardTitle}>Welcome back</Text>
              <Text style={styles.cardSub}>Enter your credentials to continue</Text>

              <Field control={loginForm.control} name="email" label="Email Address"
                placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" icon="mail-outline" />
              <Field control={loginForm.control} name="password" label="Password"
                placeholder="••••••••" secureTextEntry autoCapitalize="none" icon="lock-closed-outline" />

              <TouchableOpacity onPress={() => setForgotPwdVisible(true)} style={styles.forgotPwdRow}>
                <Text style={styles.forgotPwdLink}>Forgot password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && { opacity: 0.65 }]}
                onPress={loginForm.handleSubmit(handleLogin)} disabled={loading} activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color={colors.textOnPrimary} />
                  : <><Ionicons name="log-in-outline" size={20} color={colors.textOnPrimary} /><Text style={styles.primaryBtnText}>Sign In</Text></>
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
                  <Text style={[styles.stepLabel, { color: colors.primary }]}>Your Info</Text>
                </View>
                <View style={styles.stepLine} />
                <View style={styles.stepWrap}>
                  <View style={styles.stepDot}><Text style={styles.stepDotNum}>2</Text></View>
                  <Text style={styles.stepLabel}>Garage Info</Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>Create your account</Text>
              <Text style={styles.cardSub}>We'll set up your garage in the next step</Text>

              <Field control={registerForm.control} name="name" label="Full Name *"
                placeholder="John Doe" icon="person-outline" />
              {/* Country comes before phone on purpose: it decides what a
                  valid phone number looks like, so the placeholder and the
                  check below both follow it. */}
              <ControlledPicker
                control={registerForm.control}
                name="country"
                label="Country"
                required
                searchable
                options={countryOptions}
                // Clear any zone picked for the previous country — 'America/Denver'
                // on a garage that just switched to Australia is worse than none.
                onAfterChange={() => registerForm.setValue('timezone', '')}
              />
              {needsTimezone && (
                <ControlledPicker
                  control={registerForm.control}
                  name="timezone"
                  label="Timezone"
                  required
                  options={timezoneOptions.map(tz => ({ value: tz.value, label: tz.label }))}
                  placeholder="Select your timezone"
                />
              )}
              <Field control={registerForm.control} name="phone" label="Phone Number *"
                placeholder={selectedCountry?.phoneExample ?? DEFAULT_LOCALE.phoneExample}
                keyboardType="phone-pad" autoCapitalize="none" icon="call-outline" />
              <Field control={registerForm.control} name="email" label="Email Address *"
                placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" icon="mail-outline" />
              <Field control={registerForm.control} name="password" label="Password *"
                placeholder="Min. 6 characters" secureTextEntry autoCapitalize="none" icon="lock-closed-outline" />

              <TouchableOpacity style={styles.primaryBtn} onPress={handleNextStep} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.textOnPrimary} />
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
                    <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} />
                  </View>
                  <Text style={styles.stepLabel}>Your Info</Text>
                </View>
                <View style={[styles.stepLine, { backgroundColor: colors.primary }]} />
                <View style={styles.stepWrap}>
                  <View style={[styles.stepDot, styles.stepDotActive]}><Text style={styles.stepDotNum}>2</Text></View>
                  <Text style={[styles.stepLabel, { color: colors.primary }]}>Garage Info</Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>Name your garage</Text>
              <Text style={styles.cardSub}>This will appear on all your documents</Text>

              <Field control={registerForm.control} name="garageName" label="Garage Name *"
                placeholder="Speed Auto Works" icon="business-outline" />

              {/* Feature pills */}
              <View style={styles.featuresWrap}>
                <Text style={styles.featuresLabel}>You'll get access to:</Text>
                <View style={styles.featureGrid}>
                  {FEATURES.map((f, i) => (
                    <View key={i} style={styles.featurePill}>
                      <Ionicons name={f.icon} size={14} color={colors.primary} />
                      <Text style={styles.featureText}>{f.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.stepBtns}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)} activeOpacity={0.8}>
                  <Ionicons name="arrow-back" size={18} color={colors.textMuted} />
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 1 }, loading && { opacity: 0.65 }]}
                  onPress={registerForm.handleSubmit(handleRegister)} disabled={loading} activeOpacity={0.85}
                >
                  {loading
                    ? <ActivityIndicator color={colors.textOnPrimary} />
                    : <><Ionicons name="checkmark-circle-outline" size={20} color={colors.textOnPrimary} /><Text style={styles.primaryBtnText}>Create Garage</Text></>
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
  container: { flex: 1, backgroundColor: colors.primary },
  content: { flexGrow: 1, paddingBottom: 32 },

  // Banner
  banner: {
    alignItems: 'center', paddingTop: 56, paddingBottom: 40,
    paddingHorizontal: 24, position: 'relative', overflow: 'hidden',
  },
  bannerCircle1: {
    position: 'absolute', width: 300, height: 300, borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -80, right: -60,
  },
  bannerCircle2: {
    position: 'absolute', width: 200, height: 200, borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.06)', bottom: 0, left: -40,
  },
  logoWrap: {
    backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center',
    marginBottom: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  bannerTitle: { fontSize: 28, fontWeight: 'bold', color: colors.textOnPrimary, letterSpacing: 0.5 },
  bannerSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 6, textAlign: 'center' },

  // Card
  card: {
    backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    marginHorizontal: 16, padding: 24,
    shadowColor: colors.shadowAmbient, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  cardSub: { fontSize: 14, color: colors.textMuted, marginBottom: 24 },

  // Progress stepper
  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  stepWrap: { alignItems: 'center', gap: 4 },
  stepDot: {
    width: 28, height: 28, borderRadius: radius.lg, backgroundColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  stepDotActive: { backgroundColor: colors.primary },
  stepDotDone: { backgroundColor: colors.success },
  stepDotNum: { color: colors.textOnPrimary, fontSize: 12, fontWeight: 'bold' },
  stepLabel: { fontSize: 11, color: colors.textFaint, fontWeight: '600' },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 8, marginBottom: 12 },

  // Form fields
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.borderStrong,
    borderRadius: radius.lg, paddingHorizontal: 14, height: 50,
  },
  inputRowError: { borderColor: colors.danger },
  inputField: { flex: 1, fontSize: 15, color: colors.textStrong },
  fieldError: { fontSize: 12, color: colors.danger, marginTop: 5 },

  // Forgot password link
  forgotPwdRow: { alignSelf: 'flex-end', marginTop: -8, marginBottom: 4 },
  forgotPwdLink: { fontSize: 13, fontWeight: '600', color: colors.primary },

  // Buttons
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 15, marginTop: 8,
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  primaryBtnText: { color: colors.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
  stepBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 15, paddingHorizontal: 16, borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  backBtnText: { fontSize: 15, fontWeight: '600', color: colors.textMuted },

  // Switch link
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  switchText: { fontSize: 14, color: colors.textMuted },
  switchLink: { fontSize: 14, fontWeight: 'bold', color: colors.primary },

  // Features
  featuresWrap: { backgroundColor: colors.background, borderRadius: radius.lg, padding: 16, marginVertical: 16 },
  featuresLabel: { fontSize: 12, fontWeight: '700', color: colors.textFaint, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  featurePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
  featureText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },

  footer: { textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 24, paddingHorizontal: 24 },
});
