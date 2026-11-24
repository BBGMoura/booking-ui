import {
  buildDanceClassRequest,
  formatPrice,
  mergeFloorFees,
  nextPriceInput,
  validatePrice,
} from '@/lib/utils/floorFees';
import type { DanceClass } from '@/lib/types/danceClass';

const fee = (over: Partial<DanceClass>): DanceClass => ({
  classType: 'PRIVATE',
  active: true,
  pricePerHour: 20,
  role: 'ROLE_USER',
  ...over,
});

describe('mergeFloorFees', () => {
  it('lists every room-hire booking type with its label, in order, when there are no floor fees', () => {
    const rows = mergeFloorFees([]);
    expect(rows.map((r) => r.label)).toEqual(['Private', 'Practice', 'Other']);
    expect(rows.every((r) => r.fee === null)).toBe(true);
  });

  it('attaches each floor fee to its booking type and leaves the others unset', () => {
    const practice = fee({ classType: 'PRACTICE', pricePerHour: 8, role: 'ROLE_ADMIN' });
    const rows = mergeFloorFees([practice]);
    expect(rows.find((r) => r.classType === 'PRACTICE')?.fee).toEqual(practice);
    expect(rows.find((r) => r.classType === 'PRIVATE')?.fee).toBeNull();
    expect(rows).toHaveLength(3);
  });

  it('leaves out Group class and Closed even when the backend sends them', () => {
    const rows = mergeFloorFees([
      fee({ classType: 'PRACTICE', pricePerHour: 0, role: 'ROLE_ADMIN' }),
      fee({ classType: 'UNAVAILABLE', pricePerHour: 0, role: 'ROLE_ADMIN' }),
    ]);
    expect(rows.map((r) => r.classType)).toEqual(['PRIVATE', 'PRACTICE', 'OTHER']);
  });

  it('ignores inactive floor fees', () => {
    const rows = mergeFloorFees([fee({ active: false })]);
    expect(rows[0].fee).toBeNull();
  });
});

describe('validatePrice', () => {
  it.each(['0', '0.00', '20', '20.5', '20.50', '999.99', ' 12.00 '])('accepts %s', (v) => {
    expect(validatePrice(v)).toBeNull();
  });

  it.each(['', '  ', '-1', '1000', '1000.00', '12.345', 'abc', '1,50', '.5', '£5'])(
    'rejects %s',
    (v) => {
      expect(validatePrice(v)).not.toBeNull();
    }
  );
});

describe('nextPriceInput', () => {
  it.each([
    ['', '1', '1'],
    ['1', '12.', '12.'],
    ['12.5', '12.50', '12.50'],
    ['', '£20', '20'],
    ['', ' 1 5 ', '15'],
    ['12', '12a', '12'],
    ['', 'abc', ''],
    ['999', '9999', '999'],
    ['1.25', '1.255', '1.25'],
    ['1.2', '1.2.', '1.2'],
    ['', '-5', ''],
    ['', '1e3', ''],
  ])('from %p, typing %p gives %p', (current, typed, expected) => {
    expect(nextPriceInput(current, typed)).toBe(expected);
  });
});

describe('buildDanceClassRequest', () => {
  it('uses ROLE_ADMIN when Admin only is on', () => {
    expect(buildDanceClassRequest('PRACTICE', '15.50', true)).toEqual({
      classType: 'PRACTICE',
      pricePerHour: 15.5,
      role: 'ROLE_ADMIN',
    });
  });

  it('uses ROLE_USER when Admin only is off', () => {
    expect(buildDanceClassRequest('PRACTICE', '15', false).role).toBe('ROLE_USER');
  });
});

describe('formatPrice', () => {
  it('shows pounds with 2 decimals', () => {
    expect(formatPrice(20)).toBe('£20.00');
  });
});
