import { getDemoStore } from '../store';

export function handleAuth(method: string, _segments: string[], _body: unknown) {
  const store = getDemoStore();
  const user = store.getDemoUser();

  // All auth endpoints succeed in demo mode
  if (method === 'POST') {
    return {
      accessToken: 'demo-access-token',
      refreshToken: 'demo-refresh-token',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    };
  }

  return { success: true };
}
