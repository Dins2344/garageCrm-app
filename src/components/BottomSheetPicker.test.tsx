import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import BottomSheetPicker, { PickerOption } from './BottomSheetPicker';

const OPTIONS: PickerOption[] = [
  { value: 'service', label: 'Service' },
  { value: 'repair', label: 'Repair' },
];

describe('BottomSheetPicker', () => {
  it('keeps the sheet closed until the trigger is pressed', async () => {
    await render(
      <BottomSheetPicker label="Service Type" options={OPTIONS} onValueChange={jest.fn()} />
    );

    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('opens the sheet and lists the options', async () => {
    await render(
      <BottomSheetPicker label="Service Type" options={OPTIONS} onValueChange={jest.fn()} />
    );

    await fireEvent.press(screen.getByText('Select...'));

    expect(screen.getByTestId('bottom-sheet')).toBeTruthy();
    expect(screen.getByText('Service')).toBeTruthy();
    expect(screen.getByText('Repair')).toBeTruthy();
  });

  it('reports the chosen value', async () => {
    const onValueChange = jest.fn();
    await render(
      <BottomSheetPicker label="Service Type" options={OPTIONS} onValueChange={onValueChange} />
    );

    await fireEvent.press(screen.getByText('Select...'));
    await fireEvent.press(screen.getByText('Repair'));

    expect(onValueChange).toHaveBeenCalledWith('repair');
  });

  it('holds a minimum height so a two-option sheet is not a sliver', async () => {
    await render(
      <BottomSheetPicker label="Service Type" options={OPTIONS} onValueChange={jest.fn()} />
    );
    await fireEvent.press(screen.getByText('Select...'));

    const style = StyleSheet.flatten(screen.getByTestId('bottom-sheet').props.style);

    // Proportional, not a pixel value — a flat 200 left about two rows of list
    // after the handle and header, which read as a glitch rather than a sheet.
    expect(style.minHeight).toBe('38%');
    expect(style.maxHeight).toBe('65%');
  });

  it('animates the dim separately from the sheet', async () => {
    await render(
      <BottomSheetPicker label="Service Type" options={OPTIONS} onValueChange={jest.fn()} />
    );
    await fireEvent.press(screen.getByText('Select...'));

    // The scrim has to be its own layer. While it was the overlay's own
    // background colour, Modal's built-in "slide" dragged it up from the bottom
    // edge with the sheet instead of fading it in place.
    expect(screen.getByTestId('bottom-sheet-scrim')).toBeTruthy();
  });

  it('stays mounted through the closing animation, then unmounts', async () => {
    jest.useFakeTimers();
    try {
      const onValueChange = jest.fn();
      await render(
        <BottomSheetPicker label="Service Type" options={OPTIONS} onValueChange={onValueChange} />
      );

      await fireEvent.press(screen.getByText('Select...'));
      await fireEvent.press(screen.getByText('Repair'));

      // Still on screen: the exit animation is in flight. A single visible flag
      // would have unmounted here and the dim would vanish in one frame.
      expect(screen.queryByTestId('bottom-sheet')).toBeTruthy();

      await act(async () => { jest.advanceTimersByTime(1000); });

      expect(screen.queryByTestId('bottom-sheet')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});
