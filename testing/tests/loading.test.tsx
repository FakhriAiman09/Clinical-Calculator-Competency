import { describe, expect, test } from '@jest/globals';
import { getLoadingAriaRole, getLoadingText } from '../../frontend/src/utils/loading-utils';

// This file unit-tests loading accessibility helper values.

describe('Loading unit tests', () => {
  // Ensures spinner role string matches status semantics.
  test('getLoadingAriaRole returns status', () => {
    expect(getLoadingAriaRole()).toBe('status');
  });

  // Ensures hidden text communicates loading state.
  test('getLoadingText returns expected text', () => {
    expect(getLoadingText()).toBe('Loading...');
  });
});
