import { create } from 'zustand';

interface UserInfo {
  id: number;
  username: string;
  role: 'merchant' | 'admin';
}

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  initialToken: string | null;
  initialUser: UserInfo | null;
  setAuth: (token: string, user: UserInfo) => void;
  logout: () => void;
}

const useAuthStore = create<AuthState>((set) => {
  const initialToken = localStorage.getItem('token');
  const initialUser = (() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })();

  return {
    token: initialToken,
    user: initialUser,
    initialToken,
    initialUser,
    setAuth: (token, user) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ token, user, initialToken: token, initialUser: user });
    },
    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ token: null, user: null, initialToken: null, initialUser: null });
    },
  };
});

export default useAuthStore;
