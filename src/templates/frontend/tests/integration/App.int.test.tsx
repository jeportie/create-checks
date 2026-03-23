import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import App from '../../src/App';

describe('App integration tests', () => {
  it('should render the full landing page', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Vite + React');
    expect(screen.getByAltText('Vite logo')).toBeInTheDocument();
    expect(screen.getByAltText('React logo')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveTextContent('count is 0');
    expect(screen.getByText(/Click on the Vite and React logos/)).toBeInTheDocument();
  });

  it('should increment the counter multiple times', async () => {
    const user = userEvent.setup();
    render(<App />);

    const button = screen.getByRole('button');
    await user.click(button);
    await user.click(button);
    await user.click(button);

    expect(button).toHaveTextContent('count is 3');
  });
});
