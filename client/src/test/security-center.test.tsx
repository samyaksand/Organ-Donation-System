import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActiveSessions } from '@/features/security-center/components/active-sessions';
import { SecurityActivityTimeline } from '@/features/security-center/components/security-activity-timeline';

function mockFetch(responses: Record<string, { status: number; body: unknown }>) {
  const fn = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const match = Object.entries(responses).find(([key]) => {
      const [keyMethod, keyPath] = key.split(' ', 2) as [string, string];
      return keyMethod === method && url.includes(keyPath);
    });
    if (!match) throw new Error(`Unmocked request: ${method} ${url}`);
    const entry = match[1];
    return Promise.resolve(
      new Response(entry.body === undefined ? null : JSON.stringify(entry.body), {
        status: entry.status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

function renderWithQuery(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

afterEach(() => vi.unstubAllGlobals());

const currentSession = {
  id: 'sess_current',
  browser: 'Chrome',
  os: 'Windows',
  deviceLabel: 'Chrome · Windows',
  createdAt: new Date().toISOString(),
  lastUsedAt: new Date().toISOString(),
  isCurrent: true,
};
const otherSession = {
  id: 'sess_other',
  browser: 'Firefox',
  os: 'macOS',
  deviceLabel: 'Firefox · macOS',
  createdAt: new Date().toISOString(),
  lastUsedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
  isCurrent: false,
};

describe('ActiveSessions', () => {
  it('renders sessions and identifies the current one', async () => {
    mockFetch({ 'GET /me/sessions': { status: 200, body: { data: [currentSession, otherSession] } } });
    renderWithQuery(<ActiveSessions />);

    await waitFor(() => expect(screen.getByText('Firefox · macOS')).toBeInTheDocument());
    expect(screen.getByText('Current device')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revoke' })).toBeInTheDocument();
  });

  it('shows an empty state with no sessions', async () => {
    mockFetch({ 'GET /me/sessions': { status: 200, body: { data: [] } } });
    renderWithQuery(<ActiveSessions />);
    await waitFor(() => expect(screen.getByText('No active sessions')).toBeInTheDocument());
  });

  it('revokes a session via its Revoke button', async () => {
    const fetchMock = mockFetch({
      'GET /me/sessions': { status: 200, body: { data: [currentSession, otherSession] } },
      'DELETE /me/sessions/sess_other': { status: 204, body: undefined },
    });
    renderWithQuery(<ActiveSessions />);
    await waitFor(() => expect(screen.getByText('Firefox · macOS')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Revoke' }));

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find((c) => c[1]?.method === 'DELETE');
      expect(deleteCall).toBeDefined();
      expect(deleteCall![0]).toContain('/me/sessions/sess_other');
    });
  });

  it('shows a confirmation dialog before "sign out of all other sessions"', async () => {
    mockFetch({ 'GET /me/sessions': { status: 200, body: { data: [currentSession, otherSession] } } });
    renderWithQuery(<ActiveSessions />);
    await waitFor(() => expect(screen.getByText('Sign out of all other sessions')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /Sign out of all other sessions/ }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/Sign out of 1 other device\?/)).toBeInTheDocument();
  });

  it('revoke-others leaves the current session active in the resulting list', async () => {
    mockFetch({
      'GET /me/sessions': { status: 200, body: { data: [currentSession, otherSession] } },
      'POST /me/sessions/revoke-others': { status: 200, body: { data: { revokedCount: 1 } } },
    });
    renderWithQuery(<ActiveSessions />);
    await waitFor(() => expect(screen.getByText('Sign out of all other sessions')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /Sign out of all other sessions/ }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sign out other sessions' }));

    await waitFor(() => expect(screen.getByText('Current device')).toBeInTheDocument());
  });
});

describe('SecurityActivityTimeline', () => {
  it('renders ALLOW and DENY events distinctly', async () => {
    mockFetch({
      'GET /me/security/activity': {
        status: 200,
        body: {
          data: [
            { id: 'e1', action: 'LOGIN', resource: 'auth-session', decision: 'ALLOW', reason: 'Signed in successfully.', createdAt: new Date().toISOString() },
            { id: 'e2', action: 'VIEW', resource: 'donor-medical-info', decision: 'DENY', reason: 'Ownership requirements were not satisfied.', createdAt: new Date().toISOString() },
          ],
        },
      },
    });
    renderWithQuery(<SecurityActivityTimeline />);
    await waitFor(() => expect(screen.getByText('Signed in')).toBeInTheDocument());
    expect(screen.getByText('Ownership requirements were not satisfied.')).toBeInTheDocument();
  });

  it('shows an empty state with no activity', async () => {
    mockFetch({ 'GET /me/security/activity': { status: 200, body: { data: [] } } });
    renderWithQuery(<SecurityActivityTimeline />);
    await waitFor(() => expect(screen.getByText('No activity yet')).toBeInTheDocument());
  });
});
