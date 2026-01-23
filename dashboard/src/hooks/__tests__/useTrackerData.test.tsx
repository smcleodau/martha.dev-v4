/**
 * useTrackerData Hook Tests
 * Tests for React Query hooks that fetch tracker data
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useWorktrees,
  useBoards,
  useBoard,
  useIssues,
  useCreateIssue,
  useMoveIssue,
  useUpdateIssue,
} from '../useTrackerData';
import * as trackerApi from '../../api/tracker';
import { createMockWorktree, createMockBoard, createMockIssues } from '../../test/mocks';

// Mock the tracker API
vi.mock('../../api/tracker', () => ({
  worktreesApi: {
    list: vi.fn(),
  },
  boardsApi: {
    list: vi.fn(),
    get: vi.fn(),
  },
  hierarchicalIssuesApi: {
    list: vi.fn(),
    create: vi.fn(),
    move: vi.fn(),
    update: vi.fn(),
  },
}));

// Helper to create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useWorktrees', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches worktrees successfully', async () => {
    const mockWorktrees = [createMockWorktree(), createMockWorktree({ id: 'wt-2' })];
    vi.mocked(trackerApi.worktreesApi.list).mockResolvedValue(mockWorktrees);

    const { result } = renderHook(() => useWorktrees(), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for data to load
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockWorktrees);
    expect(trackerApi.worktreesApi.list).toHaveBeenCalledTimes(1);
  });

  it('handles errors', async () => {
    vi.mocked(trackerApi.worktreesApi.list).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useWorktrees(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
  });

  it('caches results with 60 second stale time', async () => {
    const mockWorktrees = [createMockWorktree()];
    vi.mocked(trackerApi.worktreesApi.list).mockResolvedValue(mockWorktrees);

    const { result, rerender } = renderHook(() => useWorktrees(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Rerender should use cache
    rerender();

    expect(trackerApi.worktreesApi.list).toHaveBeenCalledTimes(1);
  });
});

describe('useBoards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches boards for a worktree', async () => {
    const mockBoards = [createMockBoard(), createMockBoard({ id: 'board-2' })];
    vi.mocked(trackerApi.boardsApi.list).mockResolvedValue(mockBoards);

    const { result } = renderHook(() => useBoards('test-worktree'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockBoards);
    expect(trackerApi.boardsApi.list).toHaveBeenCalledWith('test-worktree');
  });

  it('does not fetch when worktreeId is empty', () => {
    renderHook(() => useBoards(''), {
      wrapper: createWrapper(),
    });

    expect(trackerApi.boardsApi.list).not.toHaveBeenCalled();
  });

  it('handles errors', async () => {
    vi.mocked(trackerApi.boardsApi.list).mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useBoards('invalid-worktree'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches a specific board', async () => {
    const mockBoard = createMockBoard();
    vi.mocked(trackerApi.boardsApi.get).mockResolvedValue(mockBoard);

    const { result } = renderHook(() => useBoard('test-worktree', 'test-board'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockBoard);
    expect(trackerApi.boardsApi.get).toHaveBeenCalledWith('test-worktree', 'test-board');
  });

  it('does not fetch when ids are missing', () => {
    renderHook(() => useBoard('', ''), {
      wrapper: createWrapper(),
    });

    expect(trackerApi.boardsApi.get).not.toHaveBeenCalled();
  });
});

describe('useIssues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches issues for a board', async () => {
    const mockIssues = createMockIssues(5);
    vi.mocked(trackerApi.hierarchicalIssuesApi.list).mockResolvedValue(mockIssues);

    const { result } = renderHook(() => useIssues('test-worktree', 'test-board'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockIssues);
    expect(trackerApi.hierarchicalIssuesApi.list).toHaveBeenCalledWith('test-worktree', 'test-board');
  });

  it('does not fetch when ids are missing', () => {
    renderHook(() => useIssues('', ''), {
      wrapper: createWrapper(),
    });

    expect(trackerApi.hierarchicalIssuesApi.list).not.toHaveBeenCalled();
  });

  it('handles empty issue list', async () => {
    vi.mocked(trackerApi.hierarchicalIssuesApi.list).mockResolvedValue([]);

    const { result } = renderHook(() => useIssues('test-worktree', 'test-board'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });
});

describe('useCreateIssue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an issue successfully', async () => {
    const mockIssue = createMockIssues(1)[0];
    vi.mocked(trackerApi.hierarchicalIssuesApi.create).mockResolvedValue(mockIssue);

    const { result } = renderHook(() => useCreateIssue(), {
      wrapper: createWrapper(),
    });

    const issueData = {
      title: 'New Issue',
      type: 'task' as const,
      status: 'todo',
      priority: 'medium' as const,
    };

    await result.current.mutateAsync({
      worktreeId: 'test-worktree',
      boardId: 'test-board',
      data: issueData,
    });

    expect(trackerApi.hierarchicalIssuesApi.create).toHaveBeenCalledWith(
      'test-worktree',
      'test-board',
      issueData
    );
  });

  it('handles creation errors', async () => {
    vi.mocked(trackerApi.hierarchicalIssuesApi.create).mockRejectedValue(new Error('Creation failed'));

    const { result } = renderHook(() => useCreateIssue(), {
      wrapper: createWrapper(),
    });

    try {
      await result.current.mutateAsync({
        worktreeId: 'test-worktree',
        boardId: 'test-board',
        data: { title: 'Test', type: 'task', status: 'todo', priority: 'medium' },
      });
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });
});

describe('useMoveIssue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('moves an issue successfully', async () => {
    const mockIssue = createMockIssues(1)[0];
    vi.mocked(trackerApi.hierarchicalIssuesApi.move).mockResolvedValue(mockIssue);

    const { result } = renderHook(() => useMoveIssue(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      worktreeId: 'test-worktree',
      boardId: 'test-board',
      issueId: 'TEST-1',
      status: 'in_progress',
      index: 0,
    });

    expect(trackerApi.hierarchicalIssuesApi.move).toHaveBeenCalledWith(
      'test-worktree',
      'test-board',
      'TEST-1',
      'in_progress',
      0
    );
  });

  it('moves without index', async () => {
    const mockIssue = createMockIssues(1)[0];
    vi.mocked(trackerApi.hierarchicalIssuesApi.move).mockResolvedValue(mockIssue);

    const { result } = renderHook(() => useMoveIssue(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      worktreeId: 'test-worktree',
      boardId: 'test-board',
      issueId: 'TEST-1',
      status: 'done',
    });

    expect(trackerApi.hierarchicalIssuesApi.move).toHaveBeenCalledWith(
      'test-worktree',
      'test-board',
      'TEST-1',
      'done',
      undefined
    );
  });
});

describe('useUpdateIssue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates an issue successfully', async () => {
    const mockIssue = createMockIssues(1)[0];
    vi.mocked(trackerApi.hierarchicalIssuesApi.update).mockResolvedValue(mockIssue);

    const { result } = renderHook(() => useUpdateIssue(), {
      wrapper: createWrapper(),
    });

    const updates = { title: 'Updated Title', priority: 'high' as const };

    await result.current.mutateAsync({
      worktreeId: 'test-worktree',
      boardId: 'test-board',
      issueId: 'TEST-1',
      data: updates,
    });

    expect(trackerApi.hierarchicalIssuesApi.update).toHaveBeenCalledWith(
      'test-worktree',
      'test-board',
      'TEST-1',
      updates
    );
  });

  it('handles partial updates', async () => {
    const mockIssue = createMockIssues(1)[0];
    vi.mocked(trackerApi.hierarchicalIssuesApi.update).mockResolvedValue(mockIssue);

    const { result } = renderHook(() => useUpdateIssue(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      worktreeId: 'test-worktree',
      boardId: 'test-board',
      issueId: 'TEST-1',
      data: { priority: 'critical' as const },
    });

    expect(trackerApi.hierarchicalIssuesApi.update).toHaveBeenCalledWith(
      'test-worktree',
      'test-board',
      'TEST-1',
      { priority: 'critical' }
    );
  });
});
