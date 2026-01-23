/**
 * Tracker Data Hooks
 * React Query hooks for fetching and caching tracker data (MTH-052)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  boardsApi,
  worktreesApi,
  hierarchicalIssuesApi,
  type Issue,
  type Board,
  type WorktreeConfig,
} from '../api/tracker';

/**
 * Fetch all worktrees with caching
 */
export function useWorktrees() {
  return useQuery({
    queryKey: ['worktrees'],
    queryFn: () => worktreesApi.list(),
    staleTime: 60000, // 1 minute - worktrees don't change often
  });
}

/**
 * Fetch boards for a specific worktree with caching
 */
export function useBoards(worktreeId: string) {
  return useQuery({
    queryKey: ['boards', worktreeId],
    queryFn: () => boardsApi.list(worktreeId),
    enabled: !!worktreeId, // Only fetch if worktreeId is provided
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch a specific board with caching
 */
export function useBoard(worktreeId: string, boardId: string) {
  return useQuery({
    queryKey: ['board', worktreeId, boardId],
    queryFn: () => boardsApi.get(worktreeId, boardId),
    enabled: !!(worktreeId && boardId),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch issues for a specific board with caching
 * This is the main data-heavy query
 */
export function useIssues(worktreeId: string, boardId: string) {
  return useQuery({
    queryKey: ['issues', worktreeId, boardId],
    queryFn: () => hierarchicalIssuesApi.list(worktreeId, boardId),
    enabled: !!(worktreeId && boardId),
    staleTime: 30000, // 30 seconds - issues update frequently
  });
}

/**
 * Mutation hook for creating issues
 */
export function useCreateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      worktreeId,
      boardId,
      data,
    }: {
      worktreeId: string;
      boardId: string;
      data: Parameters<typeof hierarchicalIssuesApi.create>[2];
    }) => hierarchicalIssuesApi.create(worktreeId, boardId, data),
    onSuccess: (_, variables) => {
      // Invalidate and refetch issues
      queryClient.invalidateQueries({
        queryKey: ['issues', variables.worktreeId, variables.boardId],
      });
      queryClient.invalidateQueries({
        queryKey: ['board', variables.worktreeId, variables.boardId],
      });
    },
  });
}

/**
 * Mutation hook for moving issues
 */
export function useMoveIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      worktreeId,
      boardId,
      issueId,
      status,
      index,
    }: {
      worktreeId: string;
      boardId: string;
      issueId: string;
      status: string;
      index?: number;
    }) => hierarchicalIssuesApi.move(worktreeId, boardId, issueId, status, index),
    onSuccess: (_, variables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ['issues', variables.worktreeId, variables.boardId],
      });
      queryClient.invalidateQueries({
        queryKey: ['board', variables.worktreeId, variables.boardId],
      });
    },
  });
}

/**
 * Mutation hook for updating issues
 */
export function useUpdateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      worktreeId,
      boardId,
      issueId,
      data,
    }: {
      worktreeId: string;
      boardId: string;
      issueId: string;
      data: Partial<Issue>;
    }) => hierarchicalIssuesApi.update(worktreeId, boardId, issueId, data),
    onSuccess: (_, variables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ['issues', variables.worktreeId, variables.boardId],
      });
    },
  });
}
