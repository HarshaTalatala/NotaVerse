import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock useAuth to control scenarios
vi.mock('@/contexts/AuthContext', () => {
  return {
    useAuth: vi.fn(),
    AuthProvider: ({ children }: any) => <>{children}</>
  };
});

import { useAuth } from '@/contexts/AuthContext';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  function renderWithRouter(element: React.ReactNode, initialPath = '/secure') {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<div>LoginPage</div>} />
          <Route path="/secure" element={element} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('redirects unauthenticated users to login', () => {
    (useAuth as any).mockReturnValue({ user: null, role: null, loading: false });
    renderWithRouter(<ProtectedRoute><div>Secret</div></ProtectedRoute>);
    expect(screen.getByText('LoginPage')).toBeInTheDocument();
  });

  it('shows forbidden page when role not allowed', () => {
    (useAuth as any).mockReturnValue({ user: { uid: '1' }, role: 'student', loading: false });
    renderWithRouter(<ProtectedRoute requiredRoles={['admin']}><div>AdminArea</div></ProtectedRoute>);
    expect(screen.getByText(/Access Restricted/i)).toBeInTheDocument();
    expect(screen.queryByText('AdminArea')).not.toBeInTheDocument();
  });

  it('renders content when role allowed', () => {
    (useAuth as any).mockReturnValue({ user: { uid: '1' }, role: 'admin', loading: false });
    renderWithRouter(<ProtectedRoute requiredRoles={['admin']}><div>AdminArea</div></ProtectedRoute>);
    expect(screen.getByText('AdminArea')).toBeInTheDocument();
  });
});
