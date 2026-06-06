import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { queryClient } from '../lib/queryClient';
import toast from 'react-hot-toast';

export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser);
  const connect = useNotificationStore((s) => s.connect);

  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      authApi.login(data.email, data.password).then((r) => r.data),
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setUser(data.user);
      connect(data.accessToken);
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Login failed');
    },
  });
}

export function useRegister() {
  const setUser = useAuthStore((s) => s.setUser);
  const connect = useNotificationStore((s) => s.connect);

  return useMutation({
    mutationFn: (data: { email: string; password: string; fullName: string; companyDomain: string }) =>
      authApi.register(data.email, data.password, data.fullName, data.companyDomain).then((r) => r.data),
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setUser(data.user);
      connect(data.accessToken);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Registration failed');
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  const disconnect = useNotificationStore((s) => s.disconnect);

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      logout();
      disconnect();
      queryClient.clear();
    },
  });
}

export function useCurrentUser() {
  const { isAuthenticated, setUser, setLoading } = useAuthStore();
  const connect = useNotificationStore((s) => s.connect);
  const user = useAuthStore((s) => s.user);

  const query = useQuery({
    queryKey: ['current-user'],
    queryFn: () => authApi.getMe().then((r) => r.data),
    enabled: isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    if (query.data && !user) {
      setUser(query.data);
      const token = localStorage.getItem('accessToken');
      if (token) connect(token);
    }
  }, [query.data, user, setUser, connect]);

  useEffect(() => {
    setLoading(query.isLoading && isAuthenticated);
  }, [query.isLoading, isAuthenticated, setLoading]);

  useEffect(() => {
    if (query.isError || query.isSuccess) setLoading(false);
  }, [query.isError, query.isSuccess, setLoading]);

  return query;
}

export function useAuth() {
  const login = useLogin();
  const register = useRegister();
  const logout = useLogout();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return {
    user,
    isAuthenticated,
    login: (email: string, password: string) => login.mutateAsync({ email, password }),
    register: (email: string, password: string, fullName: string, companyDomain: string) =>
      register.mutateAsync({ email, password, fullName, companyDomain }),
    logout: () => logout.mutateAsync(),
    loginState: login,
  };
}
