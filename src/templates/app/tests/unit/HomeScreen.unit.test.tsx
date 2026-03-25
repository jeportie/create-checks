import { fireEvent, render, screen } from '@testing-library/react-native';

import HomeScreen from '../../src/screens/HomeScreen';

describe('HomeScreen', () => {
  it('renders the title', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Welcome to Your App')).toBeTruthy();
  });

  it('renders the subtitle', () => {
    render(<HomeScreen />);
    expect(screen.getByText('React Native + Expo + TypeScript')).toBeTruthy();
  });

  it('starts the counter at 0', () => {
    render(<HomeScreen />);
    expect(screen.getByText('count is 0')).toBeTruthy();
  });

  it('increments the counter on press', () => {
    render(<HomeScreen />);
    const button = screen.getByText('count is 0');
    fireEvent.press(button);
    expect(screen.getByText('count is 1')).toBeTruthy();
  });

  it('renders get started steps', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Get Started')).toBeTruthy();
    expect(screen.getByText(/Scan the QR code/)).toBeTruthy();
  });
});
