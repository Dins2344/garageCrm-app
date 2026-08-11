import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import ResponsiveScreen, { CONTENT_MAX_WIDTH } from './ResponsiveScreen';

let mockWidth = 400;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockWidth, height: 800 }),
}));

describe('ResponsiveScreen', () => {
  it('does not cap width on a phone-sized viewport', async () => {
    mockWidth = 400;
    await render(
      <ResponsiveScreen>
        <Text testID="inner">content</Text>
      </ResponsiveScreen>
    );

    const inner = screen.getByTestId('inner').parent;
    const flatStyle = Array.isArray(inner?.props.style) ? Object.assign({}, ...inner.props.style) : inner?.props.style;
    expect(flatStyle?.maxWidth).toBeUndefined();
  });

  it('caps width to CONTENT_MAX_WIDTH on a tablet-sized viewport', async () => {
    mockWidth = 1024;
    await render(
      <ResponsiveScreen>
        <Text testID="inner">content</Text>
      </ResponsiveScreen>
    );

    const inner = screen.getByTestId('inner').parent;
    const flatStyle = Array.isArray(inner?.props.style) ? Object.assign({}, ...inner.props.style) : inner?.props.style;
    expect(flatStyle?.maxWidth).toBe(CONTENT_MAX_WIDTH);
  });
});
