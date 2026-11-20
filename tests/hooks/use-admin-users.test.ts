import { act, renderHook } from '@testing-library/react';
import { useAdminUsers } from '@/hooks/use-admin-users';
import { getUsers } from '@/lib/api/user';

jest.mock('@/lib/api/user', () => ({ getUsers: jest.fn() }));
const mockGetUsers = jest.mocked(getUsers);

const page = (number = 0) => ({
  content: [],
  page: { size: 10, number, totalElements: 30, totalPages: 3 },
});

beforeEach(() => {
  jest.useFakeTimers();
  mockGetUsers.mockReset();
  mockGetUsers.mockResolvedValue(page());
});
afterEach(() => jest.useRealTimers());

describe('useAdminUsers', () => {
  it('loads page 1 with 10 users and no search', async () => {
    renderHook(() => useAdminUsers());
    await act(async () => {});
    expect(mockGetUsers).toHaveBeenCalledWith({ page: 0, size: 10 });
  });

  it('waits 300 ms after the last keystroke before searching', async () => {
    const { result } = renderHook(() => useAdminUsers());
    await act(async () => {});
    mockGetUsers.mockClear();

    act(() => result.current.setSearch('c'));
    act(() => jest.advanceTimersByTime(200));
    act(() => result.current.setSearch('co'));
    act(() => jest.advanceTimersByTime(299));
    expect(mockGetUsers).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(mockGetUsers).toHaveBeenCalledTimes(1);
    expect(mockGetUsers).toHaveBeenCalledWith({ page: 0, size: 10, search: 'co' });
  });

  it('goes back to page 1 when the search changes', async () => {
    const { result } = renderHook(() => useAdminUsers());
    await act(async () => {});
    act(() => result.current.setPageIndex(2));
    await act(async () => {});
    expect(mockGetUsers).toHaveBeenLastCalledWith({ page: 2, size: 10 });

    act(() => result.current.setSearch('cooper'));
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(mockGetUsers).toHaveBeenLastCalledWith({ page: 0, size: 10, search: 'cooper' });
  });
});
