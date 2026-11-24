import { renderHook, waitFor } from '@testing-library/react';
import { useBookingFormData } from '@/hooks/use-booking-form-data';
import { getClassTypes, getDanceClass } from '@/lib/api/danceClass';
import type { ClassType } from '@/lib/types/booking';

jest.mock('@/lib/api/danceClass', () => ({ getClassTypes: jest.fn(), getDanceClass: jest.fn() }));

const danceClass = (classType: ClassType, pricePerHour: number) => ({
  classType,
  active: true,
  pricePerHour,
  role: 'ROLE_USER' as const,
});

beforeEach(() => {
  jest.mocked(getClassTypes).mockReset().mockResolvedValue(['PRIVATE', 'PRACTICE']);
  jest.mocked(getDanceClass).mockReset().mockResolvedValue(danceClass('PRIVATE', 20));
});

describe('useBookingFormData', () => {
  it('loads the class types once', async () => {
    const { result, rerender } = renderHook(({ c }) => useBookingFormData(c), {
      initialProps: { c: undefined as ClassType | undefined },
    });
    expect(result.current.classTypes).toBeNull();

    await waitFor(() => expect(result.current.classTypes).toEqual(['PRIVATE', 'PRACTICE']));
    rerender({ c: 'PRIVATE' });
    await waitFor(() => expect(result.current.pricePerHour).toBe(20));

    expect(getClassTypes).toHaveBeenCalledTimes(1);
    expect(result.current.classTypesFailed).toBe(false);
  });

  it('never offers Group class, even if the backend sends it', async () => {
    jest.mocked(getClassTypes).mockResolvedValue(['PRIVATE', 'GROUP', 'UNAVAILABLE']);
    const { result } = renderHook(() => useBookingFormData(undefined));

    await waitFor(() => expect(result.current.classTypes).toEqual(['PRIVATE', 'UNAVAILABLE']));
  });

  it('says when the class types could not be loaded', async () => {
    jest.mocked(getClassTypes).mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useBookingFormData(undefined));

    await waitFor(() => expect(result.current.classTypesFailed).toBe(true));
    expect(result.current.classTypes).toBeNull();
  });

  it('has no price until a class type is chosen', async () => {
    const { result } = renderHook(() => useBookingFormData(undefined));
    await waitFor(() => expect(result.current.classTypes).not.toBeNull());

    expect(getDanceClass).not.toHaveBeenCalled();
    expect(result.current.pricePerHour).toBeNull();
  });

  it('never gives the previous class type’s price while the new one loads', async () => {
    let resolveGroup: (value: ReturnType<typeof danceClass>) => void = () => {};
    jest
      .mocked(getDanceClass)
      .mockResolvedValueOnce(danceClass('PRIVATE', 20))
      .mockReturnValueOnce(new Promise((resolve) => (resolveGroup = resolve)));
    const { result, rerender } = renderHook(({ c }) => useBookingFormData(c), {
      initialProps: { c: 'PRIVATE' as ClassType },
    });
    await waitFor(() => expect(result.current.pricePerHour).toBe(20));

    rerender({ c: 'GROUP' });
    expect(result.current.pricePerHour).toBeNull();

    resolveGroup(danceClass('GROUP', 10));
    await waitFor(() => expect(result.current.pricePerHour).toBe(10));
  });

  it('has no price when it could not be loaded', async () => {
    jest.mocked(getDanceClass).mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useBookingFormData('PRIVATE'));

    await waitFor(() => expect(result.current.classTypes).not.toBeNull());
    expect(getDanceClass).toHaveBeenCalledWith('PRIVATE');
    expect(result.current.pricePerHour).toBeNull();
  });
});
