import React from 'react';
import { Text } from 'react-native';
import { render, screen, act, renderHook } from '@testing-library/react-native';
import { GlobalLoaderProvider, useGlobalLoader } from './GlobalLoaderContext';

/** A promise the test resolves by hand, so the overlay can be observed mid-flight. */
const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

const wrapper = ({ children }: { children: React.ReactNode }) => <GlobalLoaderProvider>{children}</GlobalLoaderProvider>;

describe('GlobalLoaderProvider', () => {
  it('shows the overlay with its label while the action runs, then clears it', async () => {
    const { result } = await renderHook(() => useGlobalLoader(), { wrapper });
    expect(screen.queryByTestId('global-loader')).toBeNull();

    const work = deferred<string>();
    let outcome: Promise<string>;
    await act(async () => { outcome = result.current.withLoader(() => work.promise, 'Generating invoice...'); });

    expect(screen.getByTestId('global-loader')).toBeTruthy();
    expect(screen.getByText('Generating invoice...')).toBeTruthy();
    expect(result.current.busy).toBe(true);

    await act(async () => { work.resolve('done'); await outcome; });

    expect(screen.queryByTestId('global-loader')).toBeNull();
    expect(result.current.busy).toBe(false);
    await expect(outcome!).resolves.toBe('done');
  });

  it('clears the overlay and rethrows when the action fails', async () => {
    const { result } = await renderHook(() => useGlobalLoader(), { wrapper });
    const work = deferred<void>();
    let outcome: Promise<void>;
    await act(async () => { outcome = result.current.withLoader(() => work.promise); });
    expect(screen.getByTestId('global-loader')).toBeTruthy();

    await act(async () => { work.reject(new Error('boom')); await outcome.catch(() => {}); });

    expect(screen.queryByTestId('global-loader')).toBeNull();
    await expect(outcome!).rejects.toThrow('boom');
  });

  it('keeps one overlay up until the last of two overlapping actions finishes', async () => {
    const { result } = await renderHook(() => useGlobalLoader(), { wrapper });
    const a = deferred<void>();
    const b = deferred<void>();
    let pa: Promise<void>, pb: Promise<void>;
    await act(async () => {
      pa = result.current.withLoader(() => a.promise);
      pb = result.current.withLoader(() => b.promise);
    });
    expect(screen.getAllByTestId('global-loader')).toHaveLength(1);

    await act(async () => { a.resolve(); await pa; });
    expect(screen.getByTestId('global-loader')).toBeTruthy();

    await act(async () => { b.resolve(); await pb; });
    expect(screen.queryByTestId('global-loader')).toBeNull();
  });

  it('is a passthrough when no provider is mounted', async () => {
    const { result } = await renderHook(() => useGlobalLoader());
    await expect(result.current.withLoader(async () => 42)).resolves.toBe(42);
    expect(result.current.busy).toBe(false);
  });

  it('renders its children', async () => {
    await render(<GlobalLoaderProvider><Text>child</Text></GlobalLoaderProvider>);
    expect(screen.getByText('child')).toBeTruthy();
  });
});
