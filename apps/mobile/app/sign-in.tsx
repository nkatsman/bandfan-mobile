import { router, useRootNavigationState } from 'expo-router';
import type { User } from 'firebase/auth';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as ExpoLinking from 'expo-linking';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GoogleLogo from '../assets/Icons/logo-google.svg';
import LogoDark from '../assets/BandFan/BandFan - Logo Dark.svg';
import LogoLight from '../assets/BandFan/BandFan - Logo Light.svg';
import ContrastIcon from '../assets/Icons/contrast-2-fill.svg';
import SunIcon from '../assets/Icons/sun-line.svg';
import { DsCard } from '../src/components/ui/ds-card';
import { DsInput } from '../src/components/ui/ds-input';
import { DsTabs } from '../src/components/ui/ds-tabs';
import { BlockShadowPressable } from '../src/components/ui/block-shadow';
import { DS, scaleH, scaleW } from '../src/design/ds';
import { useAppTheme } from '../src/design/theme';
import { cancelPendingGoogleAccount, fetchActiveLegalDocuments, fetchRegistrationStatus, initializeGoogleAccount, sendPasswordReset, signInWithEmail, signUpWithInvite, startGoogleSignIn, type ActiveLegalDocuments, type RegistrationStatus } from '../src/features/auth/auth-service';
import { discoverySongsQueryDefaults, discoverySongsQueryKey, fetchDiscoverySongsForPreferences } from '../src/features/discovery/discovery-api';
import { DEFAULT_PLAYER_SETTINGS, fetchPlayerSettings, playerSettingsQueryDefaults, playerSettingsQueryKey, type PlayerSettings } from '../src/features/preferences/player-settings-api';
import { env, hasApiBaseUrl, hasFirebaseClientConfig } from '../src/lib/env';
import { getCachedImageSrc } from '../src/lib/image-cache';
import { queryClient } from '../src/lib/query-client';
import { useSessionStore } from '../src/state/session-store';
import { useThemeStore } from '../src/state/theme-store';

const MIN_LAUNCH_MS = 1000;
const PREFETCH_COVER_LIMIT = 8;

type AuthMode = 'sign-in' | 'sign-up';

type PendingRegistration = {
  email: string;
  password: string;
};

type LaunchPrefetchStatus = 'idle' | 'loading' | 'ready' | 'error';

export default function SignInScreen() {
  const theme = useAppTheme();
  const rootNavigationState = useRootNavigationState();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const isDark = theme.mode === 'dark';
  const hasThemeHydrated = useThemeStore((state) => state.hasHydrated);
  const launchUsesDarkFallback = !hasThemeHydrated;
  const visualIsDark = isDark || launchUsesDarkFallback;
  const placeholderColor = isDark ? '#6EA06E' : DS.color.progressFill;
  const status = useSessionStore((state) => state.status);
  const error = useSessionStore((state) => state.error);
  const styles = useMemo(() => createStyles(screenWidth, screenHeight, visualIsDark), [screenWidth, screenHeight, visualIsDark]);
  const backgroundPatternItems = useMemo(() => buildSignInPatternItems(screenWidth, screenHeight, visualIsDark), [screenHeight, screenWidth, visualIsDark]);
  const logoPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toggleMode = useThemeStore((state) => state.toggleMode);
  const BrandLogo = isDark || launchUsesDarkFallback ? LogoDark : LogoLight;
  const ThemeIcon = visualIsDark ? SunIcon : ContrastIcon;

  // Logo SVG dimensions scaled from 440-px reference canvas
  const logoW = Math.round(scaleW(272.47, screenWidth));
  const logoH = Math.round(scaleW(51.68,  screenWidth));
  const formCardHeight = Math.round(Math.max(500, Math.min(scaleH(560, screenHeight), 620)));

  const [authMode, setAuthMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [legalDocuments, setLegalDocuments] = useState<ActiveLegalDocuments>({
    privacy: {
      href: '/legal/privacy',
      title: 'Privacy Policy',
      version: 'v1.0',
    },
    terms: {
      href: '/legal/terms',
      title: 'Terms of Service',
      version: 'v1.0',
    },
  });
  const [password, setPassword] = useState('');
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus>({
    registrationEnabled: true,
    registrationMode: 'invite_only',
  });
  const [pendingRegistration, setPendingRegistration] = useState<PendingRegistration | null>(null);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<User | null>(null);
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoPressed, setLogoPressed] = useState(false);
  const [processingDotCount, setProcessingDotCount] = useState(1);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showGoogleInviteOnlyDialog, setShowGoogleInviteOnlyDialog] = useState(false);
  const [showRegistrationConfirm, setShowRegistrationConfirm] = useState(false);
  const [hasLaunchMinimumElapsed, setHasLaunchMinimumElapsed] = useState(false);
  const [launchPrefetchStatus, setLaunchPrefetchStatus] = useState<LaunchPrefetchStatus>('idle');
  const [launchPrefetchError, setLaunchPrefetchError] = useState<string | null>(null);
  const [bypassAuthenticatedLaunchShell, setBypassAuthenticatedLaunchShell] = useState(false);
  const submitLabel = isSubmitting ? Array.from({ length: processingDotCount }, () => '.').join(' ') : 'ENTER';
  const isLaunchReady = hasLaunchMinimumElapsed && hasThemeHydrated && status !== 'loading';
  const isAuthenticatedLaunch = status === 'signed-in' || status === 'preview';
  const isDiscoverReady = !hasApiBaseUrl || launchPrefetchStatus === 'ready';
  const shouldShowLaunchShell = !isLaunchReady || (isAuthenticatedLaunch && !bypassAuthenticatedLaunchShell);
  const launchDotCount = useLoadingDotCount(!isLaunchReady || (isAuthenticatedLaunch && launchPrefetchStatus === 'loading'));

  useEffect(() => {
    const timeout = setTimeout(() => {
      setHasLaunchMinimumElapsed(true);
    }, MIN_LAUNCH_MS);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    let isCanceled = false;

    setLaunchPrefetchStatus('loading');
    setLaunchPrefetchError(null);

    void prefetchDiscoverLaunchData()
      .then(() => {
        if (!isCanceled) {
          setLaunchPrefetchStatus('ready');
        }
      })
      .catch((prefetchError) => {
        if (!isCanceled) {
          if (status === 'signed-in' || status === 'preview') {
            setLaunchPrefetchStatus('error');
            setLaunchPrefetchError(prefetchError instanceof Error ? prefetchError.message : 'Discover could not initialize.');
          } else {
            setLaunchPrefetchStatus('idle');
          }
        }
      });

    return () => {
      isCanceled = true;
    };
  }, [status]);

  useEffect(() => {
    if (!isSubmitting) {
      setProcessingDotCount(1);
      return undefined;
    }

    const interval = setInterval(() => {
      setProcessingDotCount((current) => (current >= 3 ? 1 : current + 1));
    }, 420);

    return () => clearInterval(interval);
  }, [isSubmitting]);

  useEffect(() => {
    if (!bypassAuthenticatedLaunchShell || status !== 'signed-in' || !rootNavigationState?.key) {
      return;
    }

    router.replace('/(tabs)');
  }, [bypassAuthenticatedLaunchShell, rootNavigationState?.key, status]);

  useEffect(() => {
    void (async () => {
      const [nextRegistrationStatus, nextLegalDocuments] = await Promise.all([fetchRegistrationStatus(), fetchActiveLegalDocuments()]);

      setRegistrationStatus(nextRegistrationStatus);
      setLegalDocuments(nextLegalDocuments);
    })();
  }, []);

  useEffect(() => {
    setLocalError(null);
    setInfoMessage(null);
    setShowRegistrationConfirm(false);
    setPendingRegistration(null);
    void cancelPendingGoogleAccount(pendingGoogleUser);
    setPendingGoogleUser(null);
    setHasAcceptedLegal(false);
  }, [authMode]);

  useEffect(() => () => {
    if (logoPressTimeoutRef.current) {
      clearTimeout(logoPressTimeoutRef.current);
    }
  }, []);

  const onLogoPressIn = () => {
    if (logoPressTimeoutRef.current) {
      clearTimeout(logoPressTimeoutRef.current);
      logoPressTimeoutRef.current = null;
    }

    setLogoPressed(true);
  };

  const onLogoPressOut = () => {
    logoPressTimeoutRef.current = setTimeout(() => {
      setLogoPressed(false);
      logoPressTimeoutRef.current = null;
    }, 160);
  };

  const onLogoPress = () => {
    toggleMode();
  };

  const legalBaseUrl = useMemo(() => {
    if (!hasApiBaseUrl) {
      return 'https://bandfan.space';
    }

    try {
      return new URL(env.apiBaseUrl).origin;
    } catch {
      return 'https://bandfan.space';
    }
  }, []);

  const openLegalLink = async (href: string) => {
    const url = href.startsWith('http') ? href : `${legalBaseUrl}${href}`;
    await ExpoLinking.openURL(url);
  };

  const onSignIn = async () => {
    setLocalError(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    try {
      await signInWithEmail(email.trim(), password);
      setBypassAuthenticatedLaunchShell(true);
    } catch (signInError) {
      const message = signInError instanceof Error ? signInError.message : 'Unable to sign in.';
      setLocalError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onForgotPassword = async () => {
    setLocalError(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    try {
      await sendPasswordReset(email.trim());
      setInfoMessage('Reset email sent. Check your inbox.');
    } catch (resetError) {
      const message = resetError instanceof Error ? resetError.message : 'Failed to send reset email.';
      setLocalError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onBeginSignUp = () => {
    const trimmedEmail = email.trim();

    setLocalError(null);
    setInfoMessage(null);

    if (!registrationStatus.registrationEnabled || registrationStatus.registrationMode === 'closed') {
      setLocalError('New account registration is currently disabled.');
      return;
    }

    if (!trimmedEmail.includes('@')) {
      setLocalError('Create account requires an email address. Usernames can be added later in account settings.');
      return;
    }

    if (!password.trim()) {
      setLocalError('Registration failed. Enter a password to continue.');
      return;
    }

    if (password.trim().length < 6) {
      setLocalError('Registration failed. Use at least 6 characters for your password.');
      return;
    }

    if (registrationStatus.registrationMode === 'invite_only' && !inviteCode.trim()) {
      setLocalError('An invite code is required to create an account right now.');
      return;
    }

    setPendingRegistration({
      email: trimmedEmail,
      password,
    });
    setHasAcceptedLegal(false);
    setShowRegistrationConfirm(true);
  };

  const onConfirmSignUp = async () => {
    if (!pendingRegistration && !pendingGoogleUser) {
      return;
    }

    if (!hasAcceptedLegal) {
      setLocalError('You must accept the Terms and Privacy Policy before creating an account.');
      return;
    }

    setLocalError(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    try {
      if (pendingGoogleUser) {
        await initializeGoogleAccount({
          inviteCode,
          legalDocuments,
          user: pendingGoogleUser,
        });
      } else if (pendingRegistration) {
        await signUpWithInvite({
          email: pendingRegistration.email,
          inviteCode,
          legalDocuments,
          password: pendingRegistration.password,
        });
      }
      setShowRegistrationConfirm(false);
      setPendingRegistration(null);
      setPendingGoogleUser(null);
      setBypassAuthenticatedLaunchShell(true);
    } catch (signUpError) {
      const message = signUpError instanceof Error ? signUpError.message : 'Registration failed.';
      setLocalError(message);
      setShowRegistrationConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onGoogleSignIn = async () => {
    setLocalError(null);
    setInfoMessage(null);

    setIsSubmitting(true);

    try {
      const googleResult = await startGoogleSignIn(registrationStatus);

      if (googleResult?.isNewUser) {
        if (registrationStatus.registrationMode === 'invite_only' && !inviteCode.trim()) {
          setShowGoogleInviteOnlyDialog(true);
          await cancelPendingGoogleAccount(googleResult.user);
          return;
        }

        setPendingGoogleUser(googleResult.user);
        setPendingRegistration(null);
        setHasAcceptedLegal(false);
        setShowRegistrationConfirm(true);
      } else {
        setBypassAuthenticatedLaunchShell(true);
      }
    } catch (googleError) {
      const message = googleError instanceof Error ? googleError.message : 'Google sign-in failed.';
      setLocalError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCancelRegistrationConfirm = () => {
    setShowRegistrationConfirm(false);
    setPendingRegistration(null);
    void cancelPendingGoogleAccount(pendingGoogleUser);
    setPendingGoogleUser(null);
    setHasAcceptedLegal(false);
  };

  const onSubmit = async () => {
    if (authMode === 'sign-up') {
      onBeginSignUp();
      return;
    }

    await onSignIn();
  };

  const renderLogoCard = (shellStyle?: ViewStyle, pressedStyle: ViewStyle = styles.logoCardPressed) => (
    <DsCard
      fixedHeight={Math.round(scaleW(113.7, screenWidth))}
      reserveShadowSize="thick"
      shadowSize={logoPressed ? 'thin' : 'thick'}
      style={[styles.logoCardShell, shellStyle, logoPressed && pressedStyle]}
      width={Math.round(scaleW(334.73, screenWidth))}
    >
      <Pressable
        accessibilityRole="button"
        onPress={onLogoPress}
        onPressIn={onLogoPressIn}
        onPressOut={onLogoPressOut}
        style={styles.logoTapArea}
      >
        <BrandLogo height={logoH} style={styles.logoGraphic} width={logoW} />
        <View style={styles.themeIconSlot}>
          <ThemeIcon color={visualIsDark ? '#FFFFFF' : DS.color.ink} height={15} width={15} />
        </View>
      </Pressable>
    </DsCard>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View pointerEvents="none" style={styles.backgroundPattern}>
        {backgroundPatternItems.map((itemStyle, index) => <View key={index} style={itemStyle} />)}
      </View>
      {shouldShowLaunchShell ? (
        <View style={styles.launchShell}>
          {renderLogoCard(styles.launchLogoCard, styles.launchLogoCardPressed)}
          {!isLaunchReady || (isAuthenticatedLaunch && !isDiscoverReady && launchPrefetchStatus !== 'error') ? (
            <Text style={styles.launchText}>Initialization{Array.from({ length: launchDotCount }, () => '.').join(' ')}</Text>
          ) : isAuthenticatedLaunch && launchPrefetchStatus === 'error' ? (
            <View style={styles.launchErrorBlock}>
              <Text style={styles.launchText}>Initialization failed.</Text>
              {launchPrefetchError ? <Text style={styles.launchErrorText}>{launchPrefetchError}</Text> : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setLaunchPrefetchStatus('loading');
                  setLaunchPrefetchError(null);
                  void prefetchDiscoverLaunchData()
                    .then(() => setLaunchPrefetchStatus('ready'))
                    .catch((prefetchError) => {
                      setLaunchPrefetchStatus('error');
                      setLaunchPrefetchError(prefetchError instanceof Error ? prefetchError.message : 'Discover could not initialize.');
                    });
                }}
                style={({ pressed }) => [styles.launchSignInButton, pressed && styles.buttonPressed]}
              >
                <Text style={styles.launchSignInButtonText}>RETRY</Text>
              </Pressable>
            </View>
          ) : (
            <BlockShadowPressable
              accessibilityRole="button"
              contentStyle={[styles.launchEnterButton, !hasFirebaseClientConfig && styles.buttonDisabled]}
              disabled={isAuthenticatedLaunch ? !rootNavigationState?.key : !hasFirebaseClientConfig}
              onPress={() => {
                if (isAuthenticatedLaunch) {
                  router.replace('/(tabs)');
                }
              }}
              pressedContentStyle={styles.launchEnterButtonPressed}
              shadowOffset={5}
              shadowVisible={hasFirebaseClientConfig}
              style={styles.launchEnterShadow}
            >
              <Text style={styles.launchEnterButtonText}>ENTER</Text>
            </BlockShadowPressable>
          )}
        </View>
      ) : (
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.scrollArea}>
        {/* ── Logo card ─────────────────────────────────────────────────
            Reference proportions (440-px canvas):
              Card face  : 334.73 × 113.7 px, thick border (7 px)
              Shadow     : thick (14 px offset, solid black)
              Visual unit: (334.73+14) wide — centred as whole (card+shadow)
              Logo       : 281.47 × 51.68 px, centred then −3 px left, +2 px down
        ──────────────────────────────────────────────────────────────── */}
        {renderLogoCard()}

        {/* ── Form card ─────────────────────────────────────────────────
            Reference proportions (440-px canvas):
              Card face  : 344 px wide, fixed height for stable CTA position
              Shadow     : thin (6 px offset, solid black)
              Border     : thick (7 px)
              Visual unit: (344+6) wide — centred as whole
              Inner inset: 26 px horizontal, 32 px bottom (ENTER button gap)
        ──────────────────────────────────────────────────────────────── */}
        <DsCard
          fixedHeight={formCardHeight}
          shadowSize="thin"
          style={styles.formCardShell}
          width={Math.round(scaleW(344, screenWidth))}
        >
          <View style={styles.formContent}>
            <View style={styles.formTop}>
              {/* LOGIN / REGISTER connected tabs */}
              <DsTabs
                onChange={(next) => {
                  if (next === 'sign-up' && (!registrationStatus.registrationEnabled || registrationStatus.registrationMode === 'closed')) {
                    setLocalError('New account registration is currently disabled.');
                    return;
                  }

                  setAuthMode(next as AuthMode);
                }}
                options={[
                  {
                    disabled: isSubmitting,
                    label: 'LOGIN',
                    value: 'sign-in',
                  },
                  {
                    disabled: isSubmitting || registrationStatus.registrationMode === 'closed',
                    label: 'REGISTER',
                    value: 'sign-up',
                  },
                ]}
                style={styles.modeRow}
                value={authMode}
              />

              {/* Fields */}
              <DsInput
                keyboardType="email-address"
                label={authMode === 'sign-up' ? 'EMAIL' : 'EMAIL / LOGIN'}
                onChangeText={setEmail}
                placeholder={authMode === 'sign-up' ? 'Email' : 'Username or email'}
                placeholderTextColor={placeholderColor}
                stackGap={14}
                value={email}
              />

              <DsInput
                label="PASSWORD"
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={placeholderColor}
                secureTextEntry
                stackGap={14}
                value={password}
              />

              {authMode === 'sign-up' && registrationStatus.registrationMode === 'invite_only' ? (
                <View style={styles.inviteWrap}>
                  <DsInput
                    autoCapitalize="characters"
                    autoCorrect={false}
                    label="INVITE CODE"
                    onChangeText={(value) => setInviteCode(value.toUpperCase())}
                    placeholder="####-####"
                    placeholderTextColor={placeholderColor}
                    stackGap={0}
                    value={inviteCode}
                  />
                </View>
              ) : null}

              {authMode === 'sign-up' && registrationStatus.registrationMode === 'closed' ? (
                <Text style={styles.inviteCopy}>Admins have temporarily disabled self-registration.</Text>
              ) : null}

              {authMode === 'sign-in' ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting || !email.trim()}
                  onPress={onForgotPassword}
                  style={styles.ghostButton}
                >
                  <Text style={styles.ghostButtonText}>Forgot password?</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.formBottom}>
              {(localError ?? error) ? <Text style={styles.errorText}>{localError ?? error}</Text> : null}
              <View style={styles.ctaRow}>
                <Pressable
                  accessibilityLabel="Sign in with Google"
                  accessibilityRole="button"
                  disabled={!hasFirebaseClientConfig || isSubmitting}
                  onPress={onGoogleSignIn}
                  style={({ pressed }) => [
                    styles.googleButtonOuter,
                    pressed && styles.buttonPressed,
                    (!hasFirebaseClientConfig || isSubmitting) && styles.buttonDisabled,
                  ]}
                >
                  <View style={styles.googleButtonShadow} />
                  <View style={styles.googleButtonFace}>
                    <GoogleLogo height={22} width={22} />
                  </View>
                </Pressable>

                {/* ENTER button — anchored lower for one-thumb reach and stable between modes */}
                <Pressable
                  accessibilityRole="button"
                  disabled={!hasFirebaseClientConfig || isSubmitting}
                  onPress={onSubmit}
                  style={({ pressed }) => [
                    styles.enterButtonOuter,
                    pressed && styles.buttonPressed,
                    (!hasFirebaseClientConfig || isSubmitting) && styles.buttonDisabled,
                  ]}
                >
                  <View style={styles.enterButtonShadow} />
                  <View style={styles.enterButtonFace}>
                    <Text style={styles.enterButtonText}>{submitLabel}</Text>
                  </View>
                </Pressable>
              </View>

              {!hasFirebaseClientConfig ? (
                <Text style={styles.helperText}>Firebase client config is missing for real sign-in on this build.</Text>
              ) : null}
              {infoMessage ? <Text style={styles.infoText}>{infoMessage}</Text> : null}
            </View>
          </View>
        </DsCard>
      </ScrollView>
      )}

      <Modal animationType="fade" onRequestClose={() => setShowGoogleInviteOnlyDialog(false)} transparent visible={showGoogleInviteOnlyDialog}>
        <View style={styles.modalRoot}>
          <Pressable onPress={() => setShowGoogleInviteOnlyDialog(false)} style={styles.modalBackdrop} />
          <View style={styles.modalPanel}>
            <Text style={styles.modalTitle}>Google sign-in unavailable</Text>
            <Text style={styles.modalCopy}>Create the account with email and password first, then connect Google from account settings.</Text>
            <View style={styles.modalActions}>
              <Pressable accessibilityRole="button" onPress={() => setShowGoogleInviteOnlyDialog(false)} style={({ pressed }) => [styles.modalPrimaryButton, pressed && styles.buttonPressed]}>
                <Text style={styles.modalPrimaryButtonText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" onRequestClose={onCancelRegistrationConfirm} transparent visible={showRegistrationConfirm}>
        <View style={styles.modalRoot}>
          <Pressable onPress={onCancelRegistrationConfirm} style={styles.modalBackdrop} />
          <View style={styles.modalPanel}>
            <Text style={styles.modalTitle}>Create new account?</Text>
            <Text style={styles.modalCopy}>
              Would you like to create a new account with {pendingGoogleUser?.email ?? pendingRegistration?.email ?? email.trim()}?
            </Text>
            {registrationStatus.registrationMode === 'invite_only' ? (
              <Text style={styles.modalInvite}>Invite code: {inviteCode.trim() || 'missing'}</Text>
            ) : null}

            <Pressable
              accessibilityRole="checkbox"
              onPress={() => setHasAcceptedLegal((current) => !current)}
              style={styles.legalRow}
            >
              <View style={[styles.legalCheckbox, hasAcceptedLegal && styles.legalCheckboxActive]}>
                {hasAcceptedLegal ? <Text style={styles.legalCheckboxMark}>✓</Text> : null}
              </View>
              <View style={styles.legalCopyWrap}>
                <Text style={styles.modalCopy}>I agree to the</Text>
                <View style={styles.legalLinksRow}>
                  <Pressable onPress={() => void openLegalLink(legalDocuments.terms.href)}>
                    <Text style={styles.legalLink}>{legalDocuments.terms.title}</Text>
                  </Pressable>
                  <Text style={styles.modalCopy}>and</Text>
                  <Pressable onPress={() => void openLegalLink(legalDocuments.privacy.href)}>
                    <Text style={styles.legalLink}>{legalDocuments.privacy.title}</Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={onCancelRegistrationConfirm}
                style={({ pressed }) => [styles.modalSecondaryButton, pressed && styles.buttonPressed]}
              >
                <Text style={styles.modalSecondaryButtonText}>No</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={!hasAcceptedLegal || isSubmitting}
                onPress={onConfirmSignUp}
                style={({ pressed }) => [
                  styles.modalPrimaryButton,
                  (!hasAcceptedLegal || isSubmitting) && styles.buttonDisabled,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.modalPrimaryButtonText}>Yes</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function useLoadingDotCount(isActive: boolean) {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    if (!isActive) {
      setDotCount(1);
      return undefined;
    }

    const interval = setInterval(() => {
      setDotCount((current) => (current >= 3 ? 1 : current + 1));
    }, 420);

    return () => clearInterval(interval);
  }, [isActive]);

  return dotCount;
}

async function prefetchDiscoverLaunchData() {
  if (!hasApiBaseUrl) {
    return;
  }

  const playerSettings = await queryClient.fetchQuery<PlayerSettings>({
    queryFn: fetchPlayerSettings,
    queryKey: playerSettingsQueryKey,
    ...playerSettingsQueryDefaults,
  }).catch(() => DEFAULT_PLAYER_SETTINGS);
  const discoveryQueryKey = [...discoverySongsQueryKey, { includeAiAssisted: playerSettings.showAiAssistedDiscoverSongs }] as const;

  await queryClient.fetchQuery({
    queryFn: () => fetchDiscoverySongsForPreferences({ includeAiAssisted: playerSettings.showAiAssistedDiscoverSongs }),
    queryKey: discoveryQueryKey,
    ...discoverySongsQueryDefaults,
  });

  const songs = queryClient.getQueryData<Awaited<ReturnType<typeof fetchDiscoverySongsForPreferences>>>(discoveryQueryKey) ?? [];

  void Promise.all(
    songs
      .slice(0, PREFETCH_COVER_LIMIT)
      .map((song) => song.coverArtUrl)
      .filter((coverArtUrl): coverArtUrl is string => Boolean(coverArtUrl))
      .map((coverArtUrl) => Image.prefetch(getCachedImageSrc(coverArtUrl)).catch(() => false)),
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function createStyles(screenWidth: number, screenHeight: number, isDark: boolean) {
  void screenWidth;
  const logoToFormGap = Math.round(Math.max(56, Math.min(scaleH(100, screenHeight), 104)));
  const cardShift = Math.round(logoToFormGap / 4);

  return StyleSheet.create({
    // Shell
    safeArea: {
      backgroundColor: isDark ? '#1A1A19' : DS.color.background,
      flex: 1,
    },
    backgroundPattern: {
      ...StyleSheet.absoluteFillObject,
      opacity: 1,
      zIndex: 0,
    },
    scrollArea: {
      position: 'relative',
      zIndex: 1,
    },
    scrollContent: {
      alignItems: 'center',
      flexGrow: 1,
      paddingBottom: 40,
      paddingTop: 12,
    },
    launchShell: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
      position: 'relative',
      zIndex: 1,
    },
    launchLogoCard: {
      marginBottom: 28,
      transform: [],
    },
    launchLogoCardPressed: {
      transform: [{ translateX: 8 }, { translateY: 8 }],
    },
    launchText: {
      color: isDark ? '#F4F4F4' : DS.color.ink,
      fontFamily: DS.font.family,
      fontSize: DS.font.size.body,
      fontWeight: DS.font.weight.bold,
      minHeight: 24,
      textAlign: 'center',
    },
    launchErrorBlock: {
      alignItems: 'center',
      gap: 12,
      maxWidth: Math.round(scaleW(320, screenWidth)),
    },
    launchErrorText: {
      color: isDark ? '#F4F4F4' : DS.color.ink,
      fontFamily: DS.font.family,
      fontSize: DS.font.size.small,
      fontWeight: DS.font.weight.bold,
      lineHeight: 18,
      textAlign: 'center',
    },
    launchSignInButton: {
      alignItems: 'center',
      backgroundColor: DS.color.enterFill,
      borderColor: DS.stroke.color,
      borderWidth: DS.stroke.thin,
      justifyContent: 'center',
      minHeight: 58,
      width: Math.round(scaleW(196, screenWidth)),
    },
    launchSignInButtonText: {
      color: DS.color.cardSurface,
      fontFamily: DS.font.family,
      fontSize: DS.font.size.body,
      fontWeight: DS.font.weight.bold,
    },
    launchEnterShadow: {
      width: Math.round(scaleW(216, screenWidth)) + 5,
    },
    launchEnterButton: {
      alignItems: 'center',
      backgroundColor: DS.color.enterFill,
      borderColor: DS.stroke.color,
      borderWidth: DS.stroke.thin,
      justifyContent: 'center',
      minHeight: 64,
      width: Math.round(scaleW(216, screenWidth)),
    },
    launchEnterButtonPressed: {
      transform: [{ translateX: 2 }, { translateY: 2 }],
    },
    launchEnterButtonText: {
      color: DS.color.cardSurface,
      fontFamily: DS.font.family,
      fontSize: 22,
      fontWeight: '900',
      letterSpacing: 0.8,
    },

    // Card shells (margins between cards)
    logoCardShell: {
      marginBottom: logoToFormGap,
      transform: [{ translateY: cardShift }],
    },
    logoCardPressed: {
      transform: [{ translateX: 8 }, { translateY: cardShift + 8 }],
    },
    formCardShell: {
      marginBottom: 20,
      transform: [{ translateY: -cardShift }],
    },

    // Logo tap area — fills the card face, centres the SVG
    logoTapArea: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      position: 'relative',
    },
    logoGraphic: {
      // Visual-balance nudge applied here on top of the centred position
      marginLeft: -3,
      marginTop: 2,
    },
    themeIconSlot: {
      alignItems: 'center',
      backgroundColor: 'transparent',
      height: 34,
      justifyContent: 'center',
      position: 'absolute',
      right: 0,
      top: 12,
      width: 38,
    },

    // Form content wrapper
    formContent: {
      flex: 1,
      justifyContent: 'space-between',
      paddingHorizontal: DS.layout.cardInsetH,   // 26 px
      paddingTop: 22,
      paddingBottom: DS.layout.enterBottomGap,   // 32 px — ENTER btn to card edge
    },
    formTop: {
      flexShrink: 1,
    },
    formBottom: {
      gap: 8,
      marginTop: 28,
    },
    ctaRow: {
      alignItems: 'stretch',
      flexDirection: 'row',
      gap: 10,
    },

    // Mode toggle (LOGIN / REGISTER)
    modeRow: {
      marginBottom: 20,
    },

    // Invite-only extra field
    inviteWrap: {
      marginBottom: 20,
    },
    inviteCopy: {
      color: isDark ? '#8F8F8F' : '#4A4A44',
      fontFamily: DS.font.family,
      fontSize: DS.font.size.body,
      fontWeight: '500',
    },
    // Forgot-password ghost button
    ghostButton: {
      alignSelf: 'flex-start',
      marginBottom: 20,
    },
    ghostButtonText: {
      color: isDark ? '#86ABD6' : '#4C79AE',
      fontFamily: DS.font.family,
      fontSize: DS.font.size.body,
      fontWeight: DS.font.weight.regular,
    },

    // ENTER button (shadow: 4 px solid black per Figma export)
    enterButtonOuter: {
      flex: 1,
      position: 'relative',
    },
    enterButtonShadow: {
      backgroundColor: DS.color.shadow,
      bottom: -4,
      left: 4,
      position: 'absolute',
      right: -4,
      top: 4,
    },
    enterButtonFace: {
      alignItems: 'center',
      backgroundColor: DS.color.enterFill,
      borderColor: DS.stroke.color,
      borderRadius: 0,
      borderWidth: DS.stroke.thin,
      justifyContent: 'center',
      minHeight: 64,
    },
    enterButtonText: {
      color: DS.color.cardSurface,
      fontFamily: DS.font.family,
      fontSize: DS.font.size.body,
      fontWeight: DS.font.weight.bold,
    },
    googleButtonOuter: {
      height: 64,
      position: 'relative',
      width: 64,
    },
    googleButtonShadow: {
      backgroundColor: DS.color.shadow,
      bottom: -4,
      left: 4,
      position: 'absolute',
      right: -4,
      top: 4,
    },
    googleButtonFace: {
      alignItems: 'center',
      backgroundColor: isDark ? '#FFFFFF' : DS.color.cardSurface,
      borderColor: DS.stroke.color,
      borderRadius: 0,
      borderWidth: DS.stroke.thin,
      height: 64,
      justifyContent: 'center',
      width: 64,
    },

    // State helpers
    buttonPressed: {
      transform: [{ translateX: 2 }, { translateY: 2 }],
    },
    buttonDisabled: {
      opacity: 0.45,
    },

    // Feedback text
    helperText: {
      color: isDark ? '#8F8F8F' : '#4A4A44',
      fontFamily: DS.font.family,
      fontSize: 13,
      fontWeight: DS.font.weight.bold,
      marginTop: 8,
    },
    infoText: {
      color: DS.color.accent,
      fontFamily: DS.font.family,
      fontSize: 13,
      fontWeight: DS.font.weight.bold,
      marginTop: 8,
    },
    errorText: {
      color: DS.color.enterFill,
      fontFamily: DS.font.family,
      fontSize: 13,
      fontWeight: DS.font.weight.bold,
      marginTop: 8,
    },

    // Modal
    modalRoot: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    modalBackdrop: {
      backgroundColor: 'rgba(0,0,0,0.55)',
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    modalPanel: {
      backgroundColor: isDark ? '#333333' : DS.color.cardSurface,
      borderColor: DS.stroke.color,
      borderRadius: 0,
      borderWidth: DS.stroke.thick,
      maxWidth: 380,
      paddingHorizontal: DS.layout.cardInsetH,
      paddingVertical: 22,
      width: '100%',
    },
    modalTitle: {
      color: isDark ? DS.color.cardSurface : DS.color.ink,
      fontFamily: DS.font.family,
      fontSize: 22,
      fontWeight: '900',
      marginBottom: 12,
    },
    modalCopy: {
      color: isDark ? '#8F8F8F' : '#4A4A44',
      fontFamily: DS.font.family,
      fontSize: DS.font.size.body,
      fontWeight: '600',
      lineHeight: 22,
    },
    modalInvite: {
      backgroundColor: isDark ? '#222220' : DS.color.background,
      borderColor: DS.stroke.color,
      borderWidth: DS.stroke.fine,
      color: isDark ? DS.color.cardSurface : DS.color.ink,
      fontFamily: DS.font.family,
      fontSize: 15,
      fontWeight: DS.font.weight.bold,
      marginTop: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    legalRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    legalCheckbox: {
      alignItems: 'center',
      backgroundColor: isDark ? '#222220' : DS.color.background,
      borderColor: DS.stroke.color,
      borderWidth: DS.stroke.fine,
      height: 22,
      justifyContent: 'center',
      marginTop: 2,
      width: 22,
    },
    legalCheckboxActive: {
      backgroundColor: DS.color.progressFill,
    },
    legalCheckboxMark: {
      color: DS.color.ink,
      fontSize: 13,
      fontWeight: '900',
    },
    legalCopyWrap: {
      flex: 1,
      gap: 6,
    },
    legalLinksRow: {
      alignItems: 'center',
      columnGap: 6,
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: 4,
    },
    legalLink: {
      color: isDark ? '#86ABD6' : '#4A4A44',
      fontFamily: DS.font.family,
      fontSize: DS.font.size.body,
      fontWeight: DS.font.weight.bold,
      textDecorationLine: 'underline',
    },
    modalActions: {
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'flex-end',
      marginTop: 20,
    },
    modalSecondaryButton: {
      alignItems: 'center',
      backgroundColor: isDark ? '#222220' : DS.color.background,
      borderColor: DS.stroke.color,
      borderWidth: DS.stroke.thin,
      justifyContent: 'center',
      minHeight: 44,
      minWidth: 88,
      paddingHorizontal: 16,
    },
    modalSecondaryButtonText: {
      color: isDark ? DS.color.cardSurface : DS.color.ink,
      fontFamily: DS.font.family,
      fontSize: 17,
      fontWeight: DS.font.weight.bold,
    },
    modalPrimaryButton: {
      alignItems: 'center',
      backgroundColor: DS.color.progressFill,
      borderColor: DS.stroke.color,
      borderWidth: DS.stroke.thin,
      justifyContent: 'center',
      minHeight: 44,
      minWidth: 88,
      paddingHorizontal: 16,
    },
    modalPrimaryButtonText: {
      color: DS.color.ink,
      fontFamily: DS.font.family,
      fontSize: 17,
      fontWeight: '900',
    },
  });
}

function buildSignInPatternItems(screenWidth: number, screenHeight: number, isDark: boolean): ViewStyle[] {
  if (isDark) {
    const gap = 20;
    const columns = Math.ceil(screenWidth / gap) + 1;
    const rows = Math.ceil(screenHeight / gap) + 1;

    return Array.from({ length: columns * rows }, (_, index) => ({
      backgroundColor: 'rgba(255, 249, 239, 0.12)',
      borderRadius: 1,
      height: 2,
      left: (index % columns) * gap + 1,
      position: 'absolute',
      top: Math.floor(index / columns) * gap + 1,
      width: 2,
    }));
  }

  const stripeCycle = 4;
  const rows = Math.ceil(screenHeight / stripeCycle) + 1;

  return Array.from({ length: rows }, (_, index) => ({
    backgroundColor: 'rgba(34, 34, 32, 0.02)',
    height: 2,
    left: 0,
    position: 'absolute',
    right: 0,
    top: index * stripeCycle,
  }));
}