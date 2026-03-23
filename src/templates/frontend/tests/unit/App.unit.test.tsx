import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import App from '../../src/App';

describe('App component', () => {
  it('should render the heading', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Vite + React');
  });

  it('should render both logos', () => {
    render(<App />);

    expect(screen.getByAltText('Vite logo')).toBeInTheDocument();
    expect(screen.getByAltText('React logo')).toBeInTheDocument();
  });

  it('should start the counter at 0', () => {
    render(<App />);

    expect(screen.getByRole('button')).toHaveTextContent('count is 0');
  });

  it('should increment the counter on click', async () => {
    const user = userEvent.setup();
    render(<App />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(button).toHaveTextContent('count is 1');
  });
});
