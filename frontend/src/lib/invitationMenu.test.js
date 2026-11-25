import assert from 'node:assert/strict';
import test from 'node:test';
import { buildInvitationMenuItems } from './invitationMenu.js';

test('builds invitation menu with lazygyu as final item', () => {
  const menuItems = buildInvitationMenuItems({ showGuestbook: false });

  assert.deepEqual(menuItems.at(-1), {
    id: 'lazygyu',
    label: '레이지규',
    path: '/games/lazygyu',
  });
});

test('keeps lazygyu as final item when guestbook sections are visible', () => {
  const menuItems = buildInvitationMenuItems({ showGuestbook: true });

  assert.equal(menuItems.at(-1).label, '레이지규');
  assert.equal(menuItems.at(-1).path, '/games/lazygyu');
  assert.equal(menuItems.some((item) => item.id === 'guestbook'), true);
});
