import { create } from 'zustand';

type SessionStatus = 'loading' | 'preview' | 'signed-in' | 'signed-out';

type SessionUser = {
  displayName: string;
  email: string;
  id: string;
};

export type AccountSignInMethods = {
  google: boolean;
  googleEmail?: string | null;
  password: boolean;
};

type SessionState = {
  error: string | null;
  setSignInMethods: (signInMethods: AccountSignInMethods | null) => void;
  setPreview: (user: SessionUser) => void;
  setSignedIn: (user: SessionUser, signInMethods: AccountSignInMethods) => void;
  setSignedOut: () => void;
  signInMethods: AccountSignInMethods | null;
  status: SessionStatus;
  user: SessionUser | null;
};

export const useSessionStore = create<SessionState>((set) => ({
  error: null,
  setSignInMethods: (signInMethods) => set(() => ({ signInMethods })),
  setPreview: (user) => set(() => ({ error: null, signInMethods: { google: false, password: true }, status: 'preview', user })),
  setSignedIn: (user, signInMethods) => set(() => ({ error: null, signInMethods, status: 'signed-in', user })),
  setSignedOut: () => set(() => ({ error: null, signInMethods: null, status: 'signed-out', user: null })),
  signInMethods: null,
  status: 'loading',
  user: null,
}));