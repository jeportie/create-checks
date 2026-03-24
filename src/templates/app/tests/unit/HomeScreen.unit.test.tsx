import { render, screen } from '@testing-library/react-native';

import HomeScreen from '../../src/screens/HomeScreen';

describe('HomeScreen', () => {
  it('renders welcome text', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Welcome')).toBeTruthy();
  });

  it('renders subtitle', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Your app is ready!')).toBeTruthy();
  });
});
