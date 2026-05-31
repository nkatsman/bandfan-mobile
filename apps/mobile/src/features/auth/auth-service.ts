import { createUserWithEmailAndPassword, deleteUser, getAdditionalUserInfo, GoogleAuthProvider, linkWithPopup, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut, unlink, User, verifyBeforeUpdateEmail } from 'firebase/auth';
import { z } from 'zod';

import { ApiClientError, apiClient } from '../../lib/api/client';
import { auth } from '../../lib/firebase';
import { hasFirebaseClientConfig } from '../../lib/env';
import { AccountSignInMethods, useSessionStore } from '../../state/session-store';

export type RegistrationMode = 'closed' | 'invite_only' | 'open';

export type RegistrationStatus = {
  registrationEnabled: boolean;
  registrationMode: RegistrationMode;
};

export type LegalDocument = {
  href: string;
  title: string;
  version: string;
};

export type ActiveLegalDocuments = {
  privacy: LegalDocument;
  terms: LegalDocument;
};

export type GoogleSignInResult = {
  isNewUser: boolean;
  user: User;
};

const registrationStatusSchema = z
  .object({
    registrationEnabled: z.boolean().optional(),
    registrationMode: z.string().optional(),
  })
  .passthrough();

const legalDocumentSchema = z.object({
  href: z.string(),
  title: z.string(),
  version: z.string(),
});

const activeLegalDocumentsSchema = z.object({
  privacy: legalDocumentSchema,
  terms: legalDocumentSchema,
});

const syncAuthProvidersSchema = z.object({
  authProviders: z.object({
    google: z.boolean(),
    password: z.boolean(),
  }),
});

const loginIdentifierSchema = z.object({
  email: z.string().email().optional(),
});

const googleSignInAccountSchema = z.object({
  profile: z.object({
    uid: z.string(),
  }),
});

const defaultRegistrationStatus: RegistrationStatus = {
  registrationEnabled: true,
  registrationMode: 'invite_only',
};

const defaultLegalDocuments: ActiveLegalDocuments = {
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
};

function normalizeRegistrationMode(value: string | undefined): RegistrationMode {
  if (value === 'invite_only' || value === 'closed') {
    return value;
  }

  return 'open';
}

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.replace(/^Firebase:\s*/i, '').replace(/^Error:\s*/i, '').trim();
  }

  return null;
}

function extractErrorCode(error: unknown) {
  return typeof error === 'object' && error && 'code' in error && typeof error.code === 'string' ? error.code : null;
}

function isGooglePopupCancel(error: unknown) {
  const code = extractErrorCode(error);

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return true;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('popup-closed-by-user')
    || message.includes('cancelled-popup-request')
    || message.includes('popup closed')
    || message.includes('popup has been closed')
    || message.includes('closed by the user')
    || message.includes('cancelled by the user')
    || message.includes('canceled by the user')
    || message.includes('window.closed')
    || message.includes('cross-origin-opener-policy');
}

function isEmail(value: string) {
  return value.includes('@');
}

function mapSignInError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error && typeof error.code === 'string' ? error.code : null;

  switch (code) {
    case 'auth/invalid-credential':
      return 'Incorrect email, username, or password. Google connection does not change your password.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address or username.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

function mapPasswordResetError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error && typeof error.code === 'string' ? error.code : null;

  switch (code) {
    case 'auth/invalid-credential':
      return 'We could not find an account for that email or username.';
    case 'auth/invalid-email':
      return 'Enter a valid email address to reset your password.';
    default:
      return 'Failed to send reset email. Please try again later.';
  }
}

function mapEmailChangeError(error: unknown) {
  const code = extractErrorCode(error);

  switch (code) {
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/email-already-in-use':
      return 'That email is already used by another account.';
    case 'auth/requires-recent-login':
      return 'Sign out and back in before changing your email.';
    case 'auth/operation-not-allowed':
      return 'Email changes are not enabled for this Firebase project.';
    default:
      return 'Could not send the email change verification. Please try again.';
  }
}

async function resolveIdentifierToEmail(identifier: string) {
  const trimmedIdentifier = identifier.trim();

  if (isEmail(trimmedIdentifier)) {
    return trimmedIdentifier;
  }

  try {
    const response = await apiClient.getPublic(`/api/auth/login-identifier?identifier=${encodeURIComponent(trimmedIdentifier)}`, {
      schema: loginIdentifierSchema,
    });

    if (!response.email) {
      throw new Error('Missing email for identifier lookup.');
    }

    return response.email;
  } catch {
    const invalidCredentialError = new Error('Invalid credential.');
    (invalidCredentialError as Error & { code?: string }).code = 'auth/invalid-credential';
    throw invalidCredentialError;
  }
}

function mapRegistrationError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error && typeof error.code === 'string' ? error.code : null;

  switch (code) {
    case 'auth/email-already-in-use':
      return 'Registration failed. An account with this email already exists. Please sign in instead.';
    case 'auth/weak-password':
      return 'Registration failed. Use at least 6 characters for your password.';
    case 'auth/missing-password':
      return 'Registration failed. Enter a password to continue.';
    case 'auth/invalid-email':
      return 'Registration failed. Enter a valid email address.';
    case 'auth/network-request-failed':
      return 'Registration failed. Check your connection and try again.';
    default: {
      const message = extractErrorMessage(error);
      if (message) {
        return message.toLowerCase().startsWith('registration failed') ? message : `Registration failed. ${message}`;
      }

      return 'Registration failed. Please try again.';
    }
  }
}

function mapGoogleSignInError(error: unknown) {
  if (isGooglePopupCancel(error)) {
    return null;
  }

  if (error instanceof Error && error.message === 'Google is not connected to this BandFan account. Sign in with email/password, then connect Google from Account.') {
    return error.message;
  }

  const code = typeof error === 'object' && error && 'code' in error && typeof error.code === 'string' ? error.code : null;

  switch (code) {
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked. Please allow popups for this site and try again.';
    default:
      return 'Google sign-in failed. Please try again.';
  }
}

function mapGoogleLinkError(error: unknown) {
  if (isGooglePopupCancel(error)) {
    return null;
  }

  const code = extractErrorCode(error);

  switch (code) {
    case 'auth/credential-already-in-use':
      return 'That Google account is already connected to another BandFan account.';
    case 'auth/account-exists-with-different-credential':
    case 'auth/email-already-in-use':
      return 'That Google email is already used by another BandFan sign-in method.';
    case 'auth/provider-already-linked':
      return 'Google is already connected to this account.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled for this Firebase project.';
    case 'auth/unauthorized-domain':
      return 'This app origin is not authorized for Google sign-in in Firebase.';
    case 'auth/argument-error':
      return 'Google popup setup failed. Refresh the app and try again.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked. Please allow popups for this site and try again.';
    default:
      return 'Google connection failed. Please try again.';
  }
}

function getUserSignInMethods(user: User): AccountSignInMethods {
  const googleProvider = user.providerData.find((provider) => provider.providerId === GoogleAuthProvider.PROVIDER_ID);

  return {
    google: user.providerData.some((provider) => provider.providerId === GoogleAuthProvider.PROVIDER_ID),
    googleEmail: googleProvider?.email ?? null,
    password: user.providerData.some((provider) => provider.providerId === 'password'),
  };
}

function cacheUserSignInMethods(user: User) {
  const signInMethods = getUserSignInMethods(user);
  useSessionStore.getState().setSignInMethods(signInMethods);
  return signInMethods;
}

async function syncBackendSignInMethods() {
  const response = await apiClient.patchAuthed('/api/account/settings', {
    body: { action: 'sync-auth-providers' },
    schema: syncAuthProvidersSchema,
  });

  const signInMethods = auth?.currentUser ? { ...response.authProviders, googleEmail: getUserSignInMethods(auth.currentUser).googleEmail } : response.authProviders;
  useSessionStore.getState().setSignInMethods(signInMethods);
  return signInMethods;
}

async function assertGoogleSignInMatchesBackendAccount(user: User) {
  let response: z.infer<typeof googleSignInAccountSchema>;

  try {
    response = await apiClient.getAuthed('/api/account/settings', {
      schema: googleSignInAccountSchema,
    });
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) {
      await signOut(auth!);
      useSessionStore.getState().setSignedOut();
      throw new Error('Google is not connected to this BandFan account. Sign in with email/password, then connect Google from Account.');
    }

    throw error;
  }

  if (response.profile.uid !== user.uid) {
    await signOut(auth!);
    useSessionStore.getState().setSignedOut();
    throw new Error('Google is not connected to this BandFan account. Sign in with email/password, then connect Google from Account.');
  }
}

export async function fetchRegistrationStatus(): Promise<RegistrationStatus> {
  try {
    const response = await apiClient.getPublic('/api/registration', {
      schema: registrationStatusSchema,
    });

    return {
      registrationEnabled: response.registrationEnabled !== false,
      registrationMode: normalizeRegistrationMode(response.registrationMode),
    };
  } catch {
    return defaultRegistrationStatus;
  }
}

export async function fetchActiveLegalDocuments(): Promise<ActiveLegalDocuments> {
  try {
    return await apiClient.getPublic('/api/legal/active', {
      schema: activeLegalDocumentsSchema,
    });
  } catch {
    return defaultLegalDocuments;
  }
}

export function bootstrapAuth() {
  const store = useSessionStore.getState();

  if (!hasFirebaseClientConfig || !auth) {
    store.setSignedOut();
    return () => undefined;
  }

  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      store.setSignedOut();
      return;
    }

    store.setSignedIn({
      displayName: user.displayName ?? 'BandFan Listener',
      email: user.email ?? 'listener@bandfan.space',
      id: user.uid,
    }, getUserSignInMethods(user));
  });
}

export async function signInWithEmail(email: string, password: string) {
  if (!auth || !hasFirebaseClientConfig) {
    throw new Error('Firebase client config is missing. Add the EXPO_PUBLIC Firebase keys before signing in.');
  }

  const trimmedIdentifier = email.trim();

  if (!trimmedIdentifier || !password) {
    throw new Error('Enter both email and password.');
  }

  try {
    const resolvedEmail = await resolveIdentifierToEmail(trimmedIdentifier);
    await signInWithEmailAndPassword(auth, resolvedEmail, password);
  } catch (error) {
    if (error instanceof Error && error.message === 'Enter both email and password.') {
      throw error;
    }

    throw new Error(mapSignInError(error));
  }
}

export async function sendPasswordReset(email: string) {
  if (!auth || !hasFirebaseClientConfig) {
    throw new Error('Firebase client config is missing. Add the EXPO_PUBLIC Firebase keys before resetting your password.');
  }

  const trimmedIdentifier = email.trim();

  if (!trimmedIdentifier) {
    throw new Error('Enter your email to reset your password.');
  }

  try {
    const resolvedEmail = await resolveIdentifierToEmail(trimmedIdentifier);
    await sendPasswordResetEmail(auth, resolvedEmail);
  } catch (error) {
    if (error instanceof Error && error.message === 'Enter your email to reset your password.') {
      throw error;
    }

    throw new Error(mapPasswordResetError(error));
  }
}

export async function sendEmailChangeVerification(nextEmail: string) {
  if (!auth?.currentUser || !hasFirebaseClientConfig) {
    throw new Error('Sign in before changing your email.');
  }

  const email = nextEmail.trim();

  if (!email) {
    throw new Error('Enter the new email address.');
  }

  try {
    await verifyBeforeUpdateEmail(auth.currentUser, email);
  } catch (error) {
    throw new Error(mapEmailChangeError(error));
  }
}

export async function signUpWithInvite(input: {
  email: string;
  inviteCode: string;
  legalDocuments: ActiveLegalDocuments;
  password: string;
}) {
  if (!auth || !hasFirebaseClientConfig) {
    throw new Error('Firebase client config is missing. Add the EXPO_PUBLIC Firebase keys before creating an account.');
  }

  const email = input.email.trim();
  const password = input.password;
  const inviteCode = input.inviteCode.trim();
  const registrationStatus = await fetchRegistrationStatus();

  if (!registrationStatus.registrationEnabled || registrationStatus.registrationMode === 'closed') {
    throw new Error('New account registration is currently disabled.');
  }

  if (!email.includes('@')) {
    throw new Error('Create account requires an email address. Usernames can be added later in account settings.');
  }

  if (!password) {
    throw new Error('Registration failed. Enter a password to continue.');
  }

  if (registrationStatus.registrationMode === 'invite_only' && !inviteCode) {
    throw new Error('An invite code is required to create an account right now.');
  }

  let createdUser = null;

  try {
    createdUser = (await createUserWithEmailAndPassword(auth, email, password)).user;

    await apiClient.patchAuthed('/api/account/settings', {
      body: {
        action: 'initialize-account',
        displayName: createdUser.email?.split('@')[0] ?? '',
        email: createdUser.email,
        inviteCode: inviteCode || null,
        legalAcceptance: {
          acceptedAt: Date.now(),
          privacyVersion: input.legalDocuments.privacy.version,
          termsVersion: input.legalDocuments.terms.version,
        },
      },
    });

    return createdUser;
  } catch (error) {
    if (createdUser) {
      try {
        await deleteUser(createdUser);
        await signOut(auth);
      } catch {
        // Keep the original registration error.
      }
    }

    throw new Error(mapRegistrationError(error));
  }
}

export async function startGoogleSignIn(registrationStatus: RegistrationStatus): Promise<GoogleSignInResult | null> {
  if (!auth || !hasFirebaseClientConfig) {
    throw new Error('Firebase client config is missing. Add the EXPO_PUBLIC Firebase keys before signing in.');
  }

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    const additionalInfo = getAdditionalUserInfo(result);
    const isNewUser = Boolean(additionalInfo?.isNewUser);

    if (!isNewUser) {
      await assertGoogleSignInMatchesBackendAccount(result.user);
      cacheUserSignInMethods(result.user);
    }

    if (isNewUser && (!registrationStatus.registrationEnabled || registrationStatus.registrationMode === 'closed')) {
      try {
        await deleteUser(result.user);
        await signOut(auth);
      } catch {
        // Best-effort cleanup after a blocked new Google account.
      }

      throw new Error('New account registration is currently disabled.');
    }

    return {
      isNewUser,
      user: result.user,
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'New account registration is currently disabled.') {
      throw error;
    }

    const message = mapGoogleSignInError(error);

    if (!message) {
      return null;
    }

    throw new Error(message);
  }
}

export async function initializeGoogleAccount(input: {
  inviteCode: string;
  legalDocuments: ActiveLegalDocuments;
  user: User;
}) {
  const { user } = input;

  try {
    await apiClient.patchAuthed('/api/account/settings', {
      body: {
        action: 'initialize-account',
        displayName: (user.displayName || user.email?.split('@')[0]) ?? '',
        email: user.email,
        inviteCode: input.inviteCode.trim() || null,
        legalAcceptance: {
          acceptedAt: Date.now(),
          privacyVersion: input.legalDocuments.privacy.version,
          termsVersion: input.legalDocuments.terms.version,
        },
      },
    });

    return user;
  } catch (error) {
    try {
      await deleteUser(user);
      if (auth) {
        await signOut(auth);
      }
    } catch {
      // Keep the original initialization error.
    }

    throw new Error(mapRegistrationError(error));
  }
}

export async function cancelPendingGoogleAccount(user: User | null) {
  if (!user) {
    return;
  }

  try {
    await deleteUser(user);
    if (auth) {
      await signOut(auth);
    }
  } catch {
    // Best-effort cleanup when Google account creation is cancelled.
  }
}

export function isGoogleAccountLinked() {
  return Boolean(auth?.currentUser?.providerData.some((provider) => provider.providerId === 'google.com'));
}

export async function connectGoogleAccount() {
  if (!auth?.currentUser || !hasFirebaseClientConfig) {
    throw new Error('Sign in before connecting Google.');
  }

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await linkWithPopup(auth.currentUser, provider);
    await result.user.reload();
    cacheUserSignInMethods(result.user);
    return syncBackendSignInMethods();
  } catch (error) {
    const message = mapGoogleLinkError(error);

    if (!message) {
      return null;
    }

    throw new Error(message);
  }
}

export async function disconnectGoogleAccount() {
  if (!auth?.currentUser || !hasFirebaseClientConfig) {
    throw new Error('Sign in before disconnecting Google.');
  }

  if (auth.currentUser.providerData.length <= 1) {
    throw new Error('Add another sign-in method before disconnecting Google.');
  }

  try {
    await unlink(auth.currentUser, 'google.com');
    await auth.currentUser.reload();
    cacheUserSignInMethods(auth.currentUser);
    return syncBackendSignInMethods();
  } catch {
    throw new Error('Google disconnect failed. Please try again.');
  }
}

export function beginPreviewSession() {
  useSessionStore.getState().setPreview({
    displayName: 'Preview Listener',
    email: 'preview@bandfan.space',
    id: 'preview-user',
  });
}

export async function signOutCurrentSession() {
  const store = useSessionStore.getState();

  if (store.status === 'preview' || !auth) {
    store.setSignedOut();
    return;
  }

  await signOut(auth);
  store.setSignedOut();
}