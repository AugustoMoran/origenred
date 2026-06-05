import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  email: string;
  roles: string[];
  role?: string;
  permissions: Record<string, boolean>;
  branch?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

const AUTH_STORAGE_KEY = 'facturaapp_auth';

const loadPersistedAuth = (): AuthState | null => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.user || !parsed?.token) return null;

    return {
      user: parsed.user,
      token: parsed.token,
      isAuthenticated: true,
    };
  } catch {
    return null;
  }
};

const persistAuth = (state: AuthState) => {
  try {
    if (!state.user || !state.token) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ user: state.user, token: state.token })
    );
  } catch {
    // no-op
  }
};

const defaultState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

const initialState: AuthState = loadPersistedAuth() || defaultState;

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      persistAuth(state);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      persistAuth(state);
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
