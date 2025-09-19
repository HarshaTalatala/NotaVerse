/// <reference types="vitest" />
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import React from 'react';

// Component that throws
const Boom: React.FC<{ msg?: string }> = ({ msg = 'Boom' }) => { throw new Error(msg); };

describe('ErrorBoundary', () => {
  it('renders fallback UI when child throws', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Boom msg="Exploded" />
      </ErrorBoundary>
    );
    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('Exploded')).toBeTruthy();
  });
});
