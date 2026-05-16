import React from 'react';
import { vi } from 'vitest';

vi.mock('@carbon/react', () => ({
  Button: ({ children, onClick, kind }: { children: React.ReactNode; onClick?: () => void; kind?: string }) => (
    <button type="button" data-kind={kind} onClick={onClick}>
      {children}
    </button>
  ),
  InlineLoading: ({ description }: { description?: string }) => <div role="status">{description}</div>,
}));
