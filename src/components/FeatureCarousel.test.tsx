import React from 'react';
import { render, screen, fireEvent, userEvent } from '@testing-library/react-native';
import FeatureCarousel from './FeatureCarousel';
import { TOUR_SLIDES } from './tourSlides';

/**
 * A note on what these assert, because the obvious version of this file is a
 * test that proves nothing:
 *
 * **Never assert on slide presence.** `FlatList` renders `initialNumToRender`
 * (10) items, so at index 0 all four slide titles are already in the tree and
 * `getByText(slides[1].title)` passes without anything having moved. Assert on
 * the step indicator and the button label instead — those genuinely track
 * `index`.
 */

const PAGE = 400;

/**
 * Tell the carousel how wide a page is, then settle a scroll onto page `i`.
 * Both events are awaited — firing them back to back synchronously produces
 * "overlapping act() calls" and the second one does not take effect.
 */
const scrollToPage = async (i: number) => {
  const list = screen.getByTestId('feature-carousel-list');
  await fireEvent(list, 'layout', {
    nativeEvent: { layout: { width: PAGE, height: 800, x: 0, y: 0 } },
  });
  await fireEvent(list, 'momentumScrollEnd', {
    nativeEvent: {
      contentOffset: { x: PAGE * i, y: 0 },
      contentSize: { width: PAGE * TOUR_SLIDES.length, height: 800 },
      layoutMeasurement: { width: PAGE, height: 800 },
    },
  });
};

describe('FeatureCarousel', () => {
  it('renders the first slide and a dot per slide', async () => {
    await render(<FeatureCarousel slides={TOUR_SLIDES} onDone={jest.fn()} />);

    expect(screen.getByText(TOUR_SLIDES[0].title)).toBeTruthy();
    // @expo/vector-icons is globally mocked to a Text of the icon name.
    expect(screen.getAllByText('clipboard-outline').length).toBeGreaterThan(0);
    expect(screen.getByLabelText(`Step 1 of ${TOUR_SLIDES.length}`)).toBeTruthy();
  });

  it('advances the indicator when Next is pressed', async () => {
    const user = userEvent.setup();
    await render(<FeatureCarousel slides={TOUR_SLIDES} onDone={jest.fn()} />);

    await user.press(screen.getByText('Next'));

    expect(screen.getByLabelText(`Step 2 of ${TOUR_SLIDES.length}`)).toBeTruthy();
  });

  it('follows a swipe', async () => {
    await render(<FeatureCarousel slides={TOUR_SLIDES} onDone={jest.fn()} />);

    await scrollToPage(2);

    expect(screen.getByLabelText(`Step 3 of ${TOUR_SLIDES.length}`)).toBeTruthy();
  });

  it('swaps Next for the done label on the last slide and fires onDone once', async () => {
    const onDone = jest.fn();
    const user = userEvent.setup();
    await render(<FeatureCarousel slides={TOUR_SLIDES} onDone={onDone} doneLabel="Get started" />);

    await scrollToPage(TOUR_SLIDES.length - 1);
    expect(screen.queryByText('Next')).toBeNull();

    await user.press(screen.getByText('Get started'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('shows Skip only when onSkip is given', async () => {
    const onSkip = jest.fn();
    const user = userEvent.setup();

    const { unmount } = await render(<FeatureCarousel slides={TOUR_SLIDES} onDone={jest.fn()} />);
    expect(screen.queryByTestId('feature-carousel-skip')).toBeNull();
    unmount();

    await render(<FeatureCarousel slides={TOUR_SLIDES} onDone={jest.fn()} onSkip={onSkip} />);
    await user.press(screen.getByTestId('feature-carousel-skip'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
