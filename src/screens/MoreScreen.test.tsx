import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import MoreScreen from './MoreScreen';
import type { MainTabScreenProps } from '../types/navigation';

// A mechanic sees the fewest More entries, so if Requests shows here it shows for everyone.
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { _id: 'u1', name: 'Dinson C', email: 'd@example.com', role: 'mechanic' },
    signOut: jest.fn(),
  }),
}));

const navigate = jest.fn();
const props = { navigation: { navigate } } as unknown as MainTabScreenProps<'More'>;

describe('MoreScreen', () => {
  beforeEach(() => navigate.mockClear());

  it('offers every role the Requests entry', async () => {
    const user = userEvent.setup();
    await render(<MoreScreen {...props} />);

    await user.press(screen.getByText('Requests'));

    expect(navigate).toHaveBeenCalledWith('Requests');
  });
});
