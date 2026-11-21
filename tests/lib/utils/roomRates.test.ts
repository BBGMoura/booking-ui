import {
  buildRateRequest,
  formatPrice,
  mergeRoomRates,
  validatePrice,
} from '@/lib/utils/roomRates';
import type { DanceClass } from '@/lib/types/danceClass';

const rate = (over: Partial<DanceClass>): DanceClass => ({
  classType: 'PRIVATE',
  active: true,
  pricePerHour: 20,
  role: 'ROLE_USER',
  ...over,
});

describe('mergeRoomRates', () => {
  it('lists every booking type with its label, in order, when there are no rates', () => {
    const rows = mergeRoomRates([]);
    expect(rows.map((r) => r.label)).toEqual(['Private', 'Practice', 'Group', 'Closed', 'Other']);
    expect(rows.every((r) => r.rate === null)).toBe(true);
  });

  it('attaches each rate to its booking type and leaves the others unset', () => {
    const practice = rate({ classType: 'PRACTICE', pricePerHour: 8, role: 'ROLE_ADMIN' });
    const rows = mergeRoomRates([practice]);
    expect(rows.find((r) => r.classType === 'PRACTICE')?.rate).toEqual(practice);
    expect(rows.find((r) => r.classType === 'PRIVATE')?.rate).toBeNull();
    expect(rows).toHaveLength(5);
  });

  it('ignores inactive rates', () => {
    const rows = mergeRoomRates([rate({ active: false })]);
    expect(rows[0].rate).toBeNull();
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

describe('buildRateRequest', () => {
  it('uses ROLE_ADMIN when Admin only is on', () => {
    expect(buildRateRequest('GROUP', '15.50', true)).toEqual({
      classType: 'GROUP',
      pricePerHour: 15.5,
      role: 'ROLE_ADMIN',
    });
  });

  it('uses ROLE_USER when Admin only is off', () => {
    expect(buildRateRequest('GROUP', '15', false).role).toBe('ROLE_USER');
  });
});

describe('formatPrice', () => {
  it('shows pounds with 2 decimals', () => {
    expect(formatPrice(20)).toBe('£20.00');
  });
});
