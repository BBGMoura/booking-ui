import { act, renderHook } from '@testing-library/react';
import { useAdminUsers } from '@/hooks/use-admin-users';
import { getUsers } from '@/lib/api/user';

jest.mock('@/lib/api/user', () => ({ getUsers: jest.fn() }));
let mockSearch = '';
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/admin/users',
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

const mockGetUsers = jest.mocked(getUsers);

const page = (number = 0) => ({
  content: [],
  page: { size: 10, number, totalElements: 30, totalPages: 3 },
});

beforeEach(() => {
  mockSearch = '';
  mockReplace.mockReset();
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

  it('starts from the search and page in the URL', async () => {
    mockSearch = 'search=jane&page=2';
    const { result } = renderHook(() => useAdminUsers());
    await act(async () => {});

    expect(result.current.search).toBe('jane');
    expect(mockGetUsers).toHaveBeenCalledWith({ page: 1, size: 10, search: 'jane' });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('keeps the search and page in the URL', async () => {
    const { result } = renderHook(() => useAdminUsers());
    await act(async () => {});

    act(() => result.current.setSearch('jane'));
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(mockReplace).toHaveBeenLastCalledWith('/admin/users?search=jane', { scroll: false });
    expect(result.current.listQuery).toBe('search=jane');

    act(() => result.current.setPageIndex(1));
    await act(async () => {});
    expect(mockReplace).toHaveBeenLastCalledWith('/admin/users?search=jane&page=2', {
      scroll: false,
    });
  });
});
