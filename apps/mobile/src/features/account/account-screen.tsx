import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import GoogleLogo from '../../../assets/Icons/logo-google.svg';
import CheckIcon from '../../../assets/Icons/check-line.svg';
import PencilIcon from '../../../assets/Icons/pencil-line.svg';
import SaveIcon from '../../../assets/Icons/save-fill.svg';
import XIcon from '../../../assets/Icons/x-line.svg';
import { AppSidebar } from '../../components/app-sidebar';
import { ScreenHeader } from '../../components/screen-header';
import { SurfaceCard } from '../../components/surface-card';
import { ThemeSelector } from '../../components/theme-selector';
import { MusicPreferenceControls } from '../../components/music-preference-controls';
import { AppButton } from '../../components/ui/app-button';
import { DsInput } from '../../components/ui/ds-input';
import { SwitchControl } from '../../components/ui/switch-control';
import { spacing, typeScale } from '../../design/tokens';
import { useAppTheme } from '../../design/theme';
import { useDebugStore } from '../../state/debug-store';
import { connectGoogleAccount, disconnectGoogleAccount, sendEmailChangeVerification, sendPasswordReset, signOutCurrentSession } from '../auth/auth-service';
import { accountProfileQueryDefaults, fetchAccountProfile, updateAccountDisplayName, updateAccountUsername } from './account-api';
import { getUsernameValidationError, normalizeUsername } from './username';
import { useSessionStore } from '../../state/session-store';

export function AccountScreen() {
  const queryClient = useQueryClient();
  const theme = useAppTheme();
  const session = useSessionStore((state) => state.user);
  const debugModeEnabled = useDebugStore((state) => state.debugModeEnabled);
  const setDebugModeEnabled = useDebugStore((state) => state.setDebugModeEnabled);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState('');
  const [emailDraft, setEmailDraft] = useState('');
  const [emailEditing, setEmailEditing] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [googleDisconnectConfirmVisible, setGoogleDisconnectConfirmVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const styles = useMemo(() => createStyles(theme.ui), [theme]);
  const signInMethods = useSessionStore((state) => state.signInMethods);
  const profileQuery = useQuery({
    ...accountProfileQueryDefaults,
    queryFn: fetchAccountProfile,
    queryKey: ['account-profile'],
  });
  const profile = profileQuery.data;
  const hasPasswordSignIn = Boolean(signInMethods?.password);
  const googleLinked = Boolean(signInMethods?.google);
  const googleEmail = signInMethods?.googleEmail?.trim() || null;
  const savedDisplayName = profile?.displayName ?? session?.displayName ?? '';
  const savedEmail = profile?.email ?? session?.email ?? '';
  const connectedGoogleEmail = googleEmail ?? savedEmail;
  const savedUsername = profile?.username ?? '';
  const accountTitle = savedDisplayName.trim() || savedUsername || 'User';
  const displayNameChanged = displayNameDraft.trim() !== savedDisplayName;
  const normalizedUsernameDraft = normalizeUsername(usernameDraft);
  const normalizedEmailDraft = emailDraft.trim();
  const usernameValidationError = getUsernameValidationError(normalizedUsernameDraft);
  const emailChanged = normalizedEmailDraft !== savedEmail;
  const usernameChanged = normalizedUsernameDraft !== savedUsername;
  const isAdmin = Boolean(profile && Object.entries(profile.roles).some(([role, enabled]) => enabled && role.toLowerCase() === 'admin'));
  const displayNameMutation = useMutation({
    mutationFn: updateAccountDisplayName,
    onError: (error) => {
      setStatusMessage(null);
      setErrorMessage(error instanceof Error ? error.message : 'Display name update failed.');
    },
    onSuccess: (response) => {
      setDisplayNameDraft(response.displayName);
      setErrorMessage(null);
      setStatusMessage('Display name saved.');
      void queryClient.invalidateQueries({ queryKey: ['account-profile'] });
    },
  });
  const usernameMutation = useMutation({
    mutationFn: updateAccountUsername,
    onError: (error) => {
      setStatusMessage(null);
      setErrorMessage(error instanceof Error ? error.message : 'Username update failed.');
    },
    onSuccess: (response) => {
      const nextUsername = response.username ?? '';
      setUsernameDraft(nextUsername);
      setErrorMessage(null);
      setStatusMessage(nextUsername ? 'Username saved.' : 'Username cleared.');
      void queryClient.invalidateQueries({ queryKey: ['account-profile'] });
    },
  });
  const passwordResetMutation = useMutation({
    mutationFn: () => sendPasswordReset(profile?.email ?? session?.email ?? ''),
    onError: (error) => {
      setStatusMessage(null);
      setErrorMessage(error instanceof Error ? error.message : 'Password reset failed.');
    },
    onSuccess: () => {
      setErrorMessage(null);
      setStatusMessage(hasPasswordSignIn ? 'Password reset email sent.' : 'Password setup email sent.');
    },
  });
  const emailChangeMutation = useMutation({
    mutationFn: () => sendEmailChangeVerification(normalizedEmailDraft),
    onError: (error) => {
      setStatusMessage(null);
      setErrorMessage(error instanceof Error ? error.message : 'Email change failed.');
    },
    onSuccess: () => {
      setEmailEditing(false);
      setErrorMessage(null);
      setStatusMessage('Verification email sent. Check the new address to finish changing email.');
    },
  });
  const googleMutation = useMutation({
    mutationFn: async () => {
      if (googleLinked) {
        return disconnectGoogleAccount();
      }

      return connectGoogleAccount();
    },
    onError: (error) => {
      setStatusMessage(null);
      setErrorMessage(error instanceof Error ? error.message : 'Google account update failed.');
    },
    onSuccess: (nextSignInMethods) => {
      if (!nextSignInMethods) {
        setErrorMessage(null);
        setStatusMessage(null);
        return;
      }

      setErrorMessage(null);
      setStatusMessage(nextSignInMethods.google ? 'Google connected. Email/password sign-in is unchanged.' : 'Google disconnected.');
    },
  });

  useEffect(() => {
    if (profile || session) {
      setDisplayNameDraft(profile?.displayName || session?.displayName || '');
      setEmailDraft(profile?.email || session?.email || '');
      setUsernameDraft(profile?.username ?? '');
    }
  }, [profile, session?.displayName, session?.email]);

  const saveDisplayName = () => {
    setStatusMessage(null);
    setErrorMessage(null);
    displayNameMutation.mutate(displayNameDraft.trim());
  };

  const saveUsername = () => {
    setStatusMessage(null);
    setErrorMessage(null);

    if (usernameValidationError) {
      setErrorMessage(usernameValidationError);
      return;
    }

    usernameMutation.mutate(normalizedUsernameDraft);
  };

  const cancelEmailEdit = () => {
    setEmailDraft(savedEmail);
    setEmailEditing(false);
    setErrorMessage(null);
    setStatusMessage(null);
  };

  const saveEmail = () => {
    setStatusMessage(null);
    setErrorMessage(null);

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmailDraft)) {
      setErrorMessage('Enter a valid email address.');
      return;
    }

    emailChangeMutation.mutate();
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} style={styles.scrollArea}>
        <ScreenHeader counter={session?.email ?? 'Signed out'} onLogoPress={() => setSidebarVisible(true)} title={accountTitle} />

        <View style={styles.body}>
          <SurfaceCard>
            <Text style={styles.sectionTitle}>Core Account</Text>

            <View style={styles.fieldBlock}>
              <View style={styles.editRow}>
                <View style={styles.editInput}>
                  <DsInput
                    autoCapitalize="words"
                    editable={!displayNameMutation.isPending}
                    label="Display Name"
                    onChangeText={setDisplayNameDraft}
                    placeholder="BandFan Listener"
                    value={displayNameDraft}
                  />
                </View>
                <AppButton
                  disabled={displayNameMutation.isPending || !displayNameChanged}
                  icon={<SaveIcon color={theme.ui.textPrimary} height={22} width={22} />}
                  iconOnly
                  label="Save display name"
                  onPress={saveDisplayName}
                  square
                  tone="secondary"
                />
              </View>

              <View style={styles.editRow}>
                <View style={styles.editInput}>
                  <DsInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!usernameMutation.isPending}
                    label="Login Username"
                    onChangeText={setUsernameDraft}
                    placeholder="username"
                    value={usernameDraft}
                  />
                </View>
                <AppButton
                  disabled={usernameMutation.isPending || !usernameChanged || Boolean(usernameValidationError)}
                  icon={<SaveIcon color={theme.ui.textPrimary} height={22} width={22} />}
                  iconOnly
                  label="Save username"
                  onPress={saveUsername}
                  square
                  tone="secondary"
                />
              </View>

              <View style={styles.editRow}>
                <View style={styles.editInput}>
                  <DsInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={emailEditing && !emailChangeMutation.isPending}
                    keyboardType="email-address"
                    label="Email"
                    onChangeText={setEmailDraft}
                    style={!emailEditing ? styles.readOnlyInput : undefined}
                    value={emailDraft}
                  />
                </View>
                <AppButton
                  disabled={emailChangeMutation.isPending}
                  icon={emailEditing ? emailChanged ? <CheckIcon color={theme.ui.textPrimary} height={22} width={22} /> : <XIcon color={theme.ui.textPrimary} height={22} width={22} /> : <PencilIcon color={theme.ui.textPrimary} height={22} width={22} />}
                  iconOnly
                  label={emailEditing ? emailChanged ? 'Send email verification' : 'Cancel email edit' : 'Edit email'}
                  onPress={() => {
                    if (!emailEditing) {
                      setEmailEditing(true);
                      setStatusMessage(null);
                      setErrorMessage(null);
                      return;
                    }

                    if (!emailChanged) {
                      cancelEmailEdit();
                      return;
                    }

                    saveEmail();
                  }}
                  square
                  tone="secondary"
                />
              </View>
            </View>

            {usernameValidationError ? <Text style={styles.errorText}>{usernameValidationError}</Text> : null}
            {statusMessage ? <Text style={styles.infoText}>{statusMessage}</Text> : null}
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <View style={styles.actionStack}>
              {!hasPasswordSignIn ? <Text style={styles.helperText}>Password not set</Text> : null}
              <AppButton
                disabled={passwordResetMutation.isPending || !(profile?.email ?? session?.email)}
                label={passwordResetMutation.isPending ? 'SENDING' : hasPasswordSignIn ? 'RESET PASSWORD' : 'SET PASSWORD'}
                onPress={() => passwordResetMutation.mutate()}
                tone="secondary"
              />
              <AppButton
                disabled={googleMutation.isPending}
                icon={<GoogleLogo height={20} width={20} />}
                label={googleMutation.isPending ? 'UPDATING GOOGLE' : googleLinked ? 'DISCONNECT GOOGLE' : 'CONNECT GOOGLE'}
                onPress={() => {
                  setErrorMessage(null);
                  setStatusMessage(null);

                  if (googleLinked) {
                    setGoogleDisconnectConfirmVisible(true);
                    return;
                  }

                  googleMutation.mutate();
                }}
                tone="secondary"
              />
              {googleLinked && connectedGoogleEmail ? <Text style={styles.helperText}>Connected as {connectedGoogleEmail}</Text> : null}
            </View>
          </SurfaceCard>

          <SurfaceCard>
            <Text style={styles.sectionTitle}>Music Defaults</Text>
            <View style={styles.musicControlsGrid}>
              <MusicPreferenceControls />
            </View>
          </SurfaceCard>

          <SurfaceCard>
            <Text style={styles.sectionTitle}>Theme</Text>
            <ThemeSelector />
          </SurfaceCard>

          {isAdmin ? (
            <SurfaceCard>
              <View style={styles.toggleRow}>
                <Text style={styles.debugModeTitle}>Debug Mode</Text>
                <View style={styles.toggleControlSlot}>
                  <SwitchControl checked={debugModeEnabled} label="Debug Mode" onCheckedChange={setDebugModeEnabled} />
                </View>
              </View>
            </SurfaceCard>
          ) : null}

          <AppButton label="SIGN OUT" onPress={signOutCurrentSession} style={styles.bottomSignOutButton} tone="danger" />
        </View>
      </ScrollView>
      <Modal animationType="fade" onRequestClose={() => setGoogleDisconnectConfirmVisible(false)} transparent visible={googleDisconnectConfirmVisible}>
        <View style={styles.confirmRoot}>
          <Pressable accessibilityRole="button" onPress={() => setGoogleDisconnectConfirmVisible(false)} style={styles.confirmBackdrop} />
          <View style={styles.confirmPanel}>
            <Text style={styles.confirmTitle}>Disconnect Google?</Text>
            <Text style={styles.confirmText}>{hasPasswordSignIn ? 'Google is only a sign-in method. Your email/password sign-in stays separate.' : 'Google is your only sign-in method. Set a password before disconnecting it.'}</Text>
            <View style={styles.confirmActions}>
              <AppButton label="CANCEL" onPress={() => setGoogleDisconnectConfirmVisible(false)} style={styles.confirmButton} tone="secondary" />
              <AppButton
                disabled={!hasPasswordSignIn}
                label="DISCONNECT"
                onPress={() => {
                  setGoogleDisconnectConfirmVisible(false);
                  googleMutation.mutate();
                }}
                style={styles.confirmButton}
                tone="danger"
              />
            </View>
          </View>
        </View>
      </Modal>
      <AppSidebar onClose={() => setSidebarVisible(false)} visible={sidebarVisible} />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['ui']) {
  return StyleSheet.create({
    body: {
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    content: {
      gap: spacing.sm,
      paddingBottom: 196,
      paddingTop: spacing.sm,
    },
    root: {
      backgroundColor: colors.appBackground,
      flex: 1,
    },
    scrollArea: {
      flex: 1,
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: typeScale.title,
      fontWeight: '900',
      marginBottom: spacing.sm,
    },
    fieldBlock: {
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    editRow: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    editInput: {
      flex: 1,
      minWidth: 0,
    },
    readOnlyInput: {
      color: colors.textInputHint,
    },
    actionStack: {
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    bottomSignOutButton: {
      marginTop: spacing.sm,
    },
    confirmActions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    confirmBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlayScrim,
    },
    confirmButton: {
      flex: 1,
    },
    confirmPanel: {
      backgroundColor: colors.surfaceCard,
      borderColor: colors.borderStrong,
      borderWidth: 2,
      gap: spacing.md,
      marginHorizontal: spacing.md,
      maxWidth: 420,
      padding: spacing.md,
      shadowColor: '#000000',
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 0,
      width: '100%',
    },
    confirmRoot: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      padding: spacing.md,
    },
    confirmText: {
      color: colors.textSecondary,
      fontSize: typeScale.body,
      fontWeight: '700',
      lineHeight: 22,
    },
    confirmTitle: {
      color: colors.textPrimary,
      fontSize: typeScale.title,
      fontWeight: '900',
    },
    musicControlsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: spacing.md,
    },
    helperText: {
      color: colors.textSecondary,
      fontSize: typeScale.caption,
      fontWeight: '700',
      lineHeight: 18,
    },
    infoText: {
      color: colors.buttonVoteActive,
      fontSize: typeScale.caption,
      fontWeight: '900',
      marginTop: spacing.xs,
    },
    errorText: {
      color: colors.buttonDanger,
      fontSize: typeScale.caption,
      fontWeight: '900',
      marginTop: spacing.xs,
    },
    toggleRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'space-between',
    },
    debugModeTitle: {
      color: colors.textPrimary,
      flex: 1,
      fontSize: typeScale.title,
      fontWeight: '900',
      minWidth: 0,
    },
    toggleControlSlot: {
      alignItems: 'center',
      flexShrink: 0,
      paddingHorizontal: 4,
    },
  });
}
