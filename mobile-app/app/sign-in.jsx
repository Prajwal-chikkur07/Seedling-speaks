import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOAuth, useSignIn, useSignUp, useAuth, useUser } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { COLORS } from '../src/constants/colors';
import api from '../src/services/api';

WebBrowser.maybeCompleteAuthSession();

const FEATURES = [
  { icon: '🎙️', text: 'Transcribe in 10 Indian languages' },
  { icon: '🌐', text: 'Translate to any native language' },
  { icon: '✦',  text: 'AI tone rewriting for emails & Slack' },
  { icon: '📷', text: 'Vision translate from photos' },
  { icon: '👂', text: 'Continuous hands-free listening' },
];

export default function SignInScreen() {
  const insets = useSafeAreaInsets();

  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();
  const { isSignedIn, getToken } = useAuth();
  const { user: clerkUser } = useUser();

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [mode,         setMode]           = useState('signin');
  const [email,        setEmail]          = useState('');
  const [password,     setPassword]       = useState('');
  const [firstName,    setFirstName]      = useState('');
  const [lastName,     setLastName]       = useState('');
  const [loading,      setLoading]        = useState(false);
  const [oauthLoading, setOauthLoading]   = useState(false);
  const [error,        setError]          = useState('');
  const syncedRef = useRef(false);

  useEffect(() => {
    if (isSignedIn && clerkUser && !syncedRef.current) {
      syncedRef.current = true;
      syncUserToBackend();
    }
  }, [isSignedIn, clerkUser]);

  async function syncUserToBackend() {
    try {
      const token = await getToken();
      if (token) api.setAuthToken?.(token);
      await api.syncUser({
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress,
        first_name: clerkUser.firstName,
        last_name: clerkUser.lastName,
        avatar_url: clerkUser.imageUrl,
        consent_given: true,
      });
    } catch {}
    router.replace('/(drawer)');
  }

  const handleGoogleOAuth = useCallback(async () => {
    setOauthLoading(true);
    setError('');
    try {
      const { createdSessionId, setActive } = await startGoogleOAuth({
        redirectUrl: Linking.createURL('/(drawer)'),
      });
      if (createdSessionId && setActive) await setActive({ session: createdSessionId });
    } catch (e) {
      setError(e.errors?.[0]?.longMessage || e.errors?.[0]?.message || 'Google sign-in failed.');
    } finally {
      setOauthLoading(false);
    }
  }, [startGoogleOAuth]);

  const handleSignIn = useCallback(async () => {
    if (!signInLoaded || !email.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await signIn.create({ identifier: email.trim(), password });
      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
      } else {
        setError('Sign in incomplete. Please try again.');
      }
    } catch (e) {
      setError(e.errors?.[0]?.longMessage || e.errors?.[0]?.message || 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  }, [signIn, signInLoaded, email, password, setSignInActive]);

  const handleSignUp = useCallback(async () => {
    if (!signUpLoaded || !email.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await signUp.create({
        emailAddress: email.trim(), password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });
      if (result.status === 'complete') {
        await setSignUpActive({ session: result.createdSessionId });
      } else {
        setError('Please verify your email to continue.');
      }
    } catch (e) {
      setError(e.errors?.[0]?.longMessage || e.errors?.[0]?.message || 'Sign up failed.');
    } finally {
      setLoading(false);
    }
  }, [signUp, signUpLoaded, email, password, firstName, lastName, setSignUpActive]);

  const isSignUp = mode === 'signup';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[st.root, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={[st.scroll, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand hero ── */}
          <View style={st.hero}>
            <View style={st.logoWrap}>
              <Image source={require('../assets/logo.png')} style={st.logo} />
            </View>
            <Text style={st.appName}>SeedlingSpeaks</Text>
            <Text style={st.tagline}>Your voice, every language, every tone.</Text>
          </View>

          {/* ── Feature pills ── */}
          <View style={st.features}>
            {FEATURES.map((f) => (
              <View key={f.text} style={st.featureRow}>
                <View style={st.featureIconWrap}>
                  <Text style={{ fontSize: 14 }}>{f.icon}</Text>
                </View>
                <Text style={st.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>

          {/* ── Auth card ── */}
          <View style={st.card}>
            <Text style={st.cardTitle}>{isSignUp ? 'Create account' : 'Welcome back'}</Text>
            <Text style={st.cardSub}>
              {isSignUp ? 'Sign up to get started for free' : 'Sign in to continue translating'}
            </Text>

            {error ? (
              <View style={st.errorBox}>
                <Text style={st.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Google OAuth */}
            <TouchableOpacity
              style={st.googleBtn}
              onPress={handleGoogleOAuth}
              disabled={oauthLoading}
              activeOpacity={0.85}
            >
              {oauthLoading ? (
                <ActivityIndicator color={COLORS.ink} size="small" />
              ) : (
                <>
                  <Text style={st.googleG}>G</Text>
                  <Text style={st.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={st.divider}>
              <View style={st.dividerLine} />
              <Text style={st.dividerText}>or</Text>
              <View style={st.dividerLine} />
            </View>

            {/* Email section */}
            {!showEmailForm ? (
              <TouchableOpacity
                style={st.emailToggleBtn}
                onPress={() => setShowEmailForm(true)}
                activeOpacity={0.8}
              >
                <Text style={st.emailToggleText}>Continue with email</Text>
              </TouchableOpacity>
            ) : (
              <View>
                {isSignUp && (
                  <View style={st.nameRow}>
                    <TextInput
                      style={[st.input, { flex: 1 }]}
                      placeholder="First name"
                      placeholderTextColor={COLORS.faded}
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCapitalize="words"
                    />
                    <TextInput
                      style={[st.input, { flex: 1 }]}
                      placeholder="Last name"
                      placeholderTextColor={COLORS.faded}
                      value={lastName}
                      onChangeText={setLastName}
                      autoCapitalize="words"
                    />
                  </View>
                )}
                <TextInput
                  style={st.input}
                  placeholder="Email address"
                  placeholderTextColor={COLORS.faded}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextInput
                  style={st.input}
                  placeholder="Password"
                  placeholderTextColor={COLORS.faded}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                <TouchableOpacity
                  style={[st.submitBtn, (loading || !email.trim() || !password.trim()) && st.submitBtnDisabled]}
                  onPress={isSignUp ? handleSignUp : handleSignIn}
                  disabled={loading || !email.trim() || !password.trim()}
                  activeOpacity={0.85}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={st.submitBtnText}>{isSignUp ? 'Create account' : 'Sign in'}</Text>
                  }
                </TouchableOpacity>
              </View>
            )}

            {/* Mode toggle */}
            <TouchableOpacity
              style={st.toggleBtn}
              onPress={() => { setMode(isSignUp ? 'signin' : 'signup'); setError(''); }}
            >
              <Text style={st.toggleText}>
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <Text style={st.toggleLink}>{isSignUp ? 'Sign in' : 'Sign up free'}</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={st.footer}>Powered by Seedlinglabs · v2.5</Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#110900' },
  scroll: { paddingHorizontal: 24, paddingTop: 32 },

  // Hero
  hero: { alignItems: 'center', marginBottom: 32 },
  logoWrap: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: 'rgba(232,130,12,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(232,130,12,0.25)',
  },
  logo: { width: 52, height: 52, borderRadius: 12 },
  appName: {
    fontSize: 30, fontWeight: '800',
    color: '#E8820C', letterSpacing: -0.6, marginBottom: 6,
  },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center' },

  // Features
  features: { marginBottom: 28, gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIconWrap: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: 'rgba(232,130,12,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(232,130,12,0.2)',
  },
  featureText: { fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 20, fontWeight: '500' },

  // Auth card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24, padding: 24, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 10,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: COLORS.ink, marginBottom: 4 },
  cardSub: { fontSize: 14, color: COLORS.muted, marginBottom: 22, lineHeight: 20 },

  errorBox: {
    backgroundColor: COLORS.redBg, borderRadius: 12, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: 'rgba(192,57,43,0.2)',
  },
  errorText: { fontSize: 13, color: COLORS.redSoft, lineHeight: 18 },

  // Google button
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: '#fff', borderRadius: 14,
    paddingVertical: 15, borderWidth: 1.5, borderColor: COLORS.border,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  googleG: { fontSize: 18, fontWeight: '900', color: '#4285F4' },
  googleBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.ink },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { paddingHorizontal: 12, fontSize: 13, color: COLORS.faded, fontWeight: '600' },

  // Email toggle
  emailToggleBtn: {
    borderRadius: 14, paddingVertical: 15, alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 16,
  },
  emailToggleText: { fontSize: 15, fontWeight: '600', color: COLORS.warm },

  // Form
  nameRow: { flexDirection: 'row', gap: 10 },
  input: {
    backgroundColor: COLORS.bg, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: COLORS.ink,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: COLORS.saffron, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 4, marginBottom: 16,
    shadowColor: COLORS.saffron, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.55 },
  submitBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  // Mode toggle
  toggleBtn: { alignItems: 'center', paddingTop: 4 },
  toggleText: { fontSize: 14, color: COLORS.muted },
  toggleLink: { color: COLORS.saffronHover, fontWeight: '700' },

  footer: { textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 8 },
});
