// @expo/vector-icons pulls in expo-font -> expo-asset, which touch native
// asset-loading machinery that isn't available (and isn't meaningful to
// exercise) under Jest. Every screen/component imports Ionicons, so this is
// mocked globally rather than per test file.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const MockIcon = ({ name }: { name?: string }) => React.createElement(Text, null, name);
  return { Ionicons: MockIcon };
});

// AsyncStorage's real native module is unavailable under Jest — use the
// package's own official mock everywhere.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
