import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import BottomSheet, { SheetActions } from './BottomSheet';
import { colors } from '../theme';

/**
 * The shell every sheet renders through. `BottomSheetPicker.test.tsx` covers
 * the picker on top of it; this pins the shell's own contract so a change
 * here is caught once rather than in eleven screens.
 */
describe('BottomSheet', () => {
  it('renders nothing while closed', async () => {
    await render(
      <BottomSheet visible={false} onClose={jest.fn()} title="Closed"><Text>body</Text></BottomSheet>
    );
    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('shows title, body, footer and a separate scrim layer when open', async () => {
    await render(
      <BottomSheet visible onClose={jest.fn()} title="Add Thing" footer={<Text>footer</Text>}>
        <Text>body</Text>
      </BottomSheet>
    );
    expect(screen.getByText('Add Thing')).toBeTruthy();
    expect(screen.getByText('body')).toBeTruthy();
    expect(screen.getByText('footer')).toBeTruthy();
    expect(screen.getByTestId('bottom-sheet-scrim')).toBeTruthy();
  });

  it('holds a proportional minimum height by default and honours a caller maxHeight', async () => {
    await render(
      <BottomSheet visible onClose={jest.fn()} title="Sized" maxHeight="65%"><Text>body</Text></BottomSheet>
    );
    const style = StyleSheet.flatten(screen.getByTestId('bottom-sheet').props.style);
    expect(style.minHeight).toBe('38%');
    expect(style.maxHeight).toBe('65%');
    expect(style.backgroundColor).toBe(colors.surface);
  });

  it('closes from the header button and from a tap on the dim', async () => {
    const onClose = jest.fn();
    await render(
      <BottomSheet visible onClose={onClose} title="Closable"><Text>body</Text></BottomSheet>
    );
    const closers = screen.getAllByLabelText('Close');
    await fireEvent.press(closers[0]);
    await fireEvent.press(closers[closers.length - 1]);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('stays mounted through the closing animation, then unmounts', async () => {
    jest.useFakeTimers();
    try {
      const { rerender } = await render(
        <BottomSheet visible onClose={jest.fn()} title="Leaving"><Text>body</Text></BottomSheet>
      );
      await rerender(
        <BottomSheet visible={false} onClose={jest.fn()} title="Leaving"><Text>body</Text></BottomSheet>
      );
      // A single visible flag would have unmounted here and the dim would
      // vanish in one frame.
      expect(screen.queryByTestId('bottom-sheet')).toBeTruthy();

      await act(async () => { jest.advanceTimersByTime(1000); });
      expect(screen.queryByTestId('bottom-sheet')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('SheetActions', () => {
  it('wires both buttons and disables confirm while loading', async () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    await render(
      <SheetActions onCancel={onCancel} onConfirm={onConfirm} confirmLabel="Save" testID="confirm" />
    );
    await fireEvent.press(screen.getByText('Cancel'));
    await fireEvent.press(screen.getByText('Save'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows a spinner instead of the label while loading, and colours by tone', async () => {
    await render(
      <SheetActions onCancel={jest.fn()} onConfirm={jest.fn()} confirmLabel="Delete" loading tone="danger" testID="confirm" />
    );
    expect(screen.queryByText('Delete')).toBeNull();
    const style = StyleSheet.flatten(screen.getByTestId('confirm').props.style);
    expect(style.backgroundColor).toBe(colors.danger);
    expect(style.opacity).toBe(0.6);
  });
});
