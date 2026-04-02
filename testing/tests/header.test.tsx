import { describe, expect, test } from '@jest/globals';
import { getNavButtonClass, getNavItemsByRole } from '../../frontend/src/utils/header-nav-utils';

// This file unit-tests header navigation role mapping and button class helpers.

describe('Header navigation unit tests', () => {
  // Ensures student role receives student navigation links.
  test('getNavItemsByRole returns student links for student role', () => {
    const links = getNavItemsByRole({
      userRoleStudent: true,
      userRoleAuthorized: false,
      userRoleRater: false,
      userRoleDev: false,
    });

    expect(links.some((l) => l.label === 'Dashboard')).toBe(true);
    expect(links.some((l) => l.label === 'Request Assessment')).toBe(true);
    expect(links.some((l) => l.label === 'About Us')).toBe(true);
  });

  // Ensures rater-only role gets Home link and not admin links.
  test('getNavItemsByRole returns rater-only home link for non-admin rater', () => {
    const links = getNavItemsByRole({
      userRoleStudent: false,
      userRoleAuthorized: false,
      userRoleRater: true,
      userRoleDev: false,
    });

    expect(links.some((l) => l.label === 'Home')).toBe(true);
    expect(links.some((l) => l.label === 'Manage Users')).toBe(false);
  });

  // Ensures developer role includes Tickets.
  test('getNavItemsByRole includes tickets for dev role', () => {
    const links = getNavItemsByRole({
      userRoleStudent: false,
      userRoleAuthorized: false,
      userRoleRater: false,
      userRoleDev: true,
    });

    expect(links.some((l) => l.label === 'Tickets')).toBe(true);
  });

  // Ensures nav button style reflects active route.
  test('getNavButtonClass returns active/inactive button classes', () => {
    expect(getNavButtonClass('/dashboard', '/dashboard')).toBe('btn btn-secondary');
    expect(getNavButtonClass('/dashboard', '/dashboard/student/report')).toBe('btn btn-outline-secondary');
  });
});
