import { NavigationContainer } from '@react-navigation/native';

import { RootNavigator } from './navigation/index';

export default function App() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}
