import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from '../../src/renderer/src/App';

describe('App component', () => {
  it('should render the heading', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Electron');
  });
});
