import { useState } from 'react';

export type SortOrder = 'ASC' | 'DESC' | null;

export interface UseTableSortOptions {
  defaultSortBy?: string;
  defaultSortOrder?: SortOrder;
  onSort?: (sortBy: string, sortOrder: SortOrder) => void;
}

export function useTableSort({
  defaultSortBy = '',
  defaultSortOrder = null,
  onSort,
}: UseTableSortOptions = {}) {
  const [sortBy, setSortBy] = useState<string>(defaultSortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder);

  const handleSort = (field: string) => {
    let nextOrder: SortOrder = 'ASC';
    if (sortBy === field) {
      if (sortOrder === 'ASC') {
        nextOrder = 'DESC';
      } else if (sortOrder === 'DESC') {
        nextOrder = null;
      }
    }

    setSortBy(nextOrder ? field : '');
    setSortOrder(nextOrder);

    if (onSort) {
      onSort(nextOrder ? field : '', nextOrder);
    }
  };

  return {
    sortBy,
    sortOrder,
    handleSort,
    setSortBy,
    setSortOrder,
  };
}

export function sortData<T>(
  data: T[],
  sortBy: string,
  sortOrder: SortOrder,
  customSortValues?: Record<string, (row: T) => any>
): T[] {
  if (!sortBy || !sortOrder) return data;

  return [...data].sort((a, b) => {
    let valA: any = customSortValues?.[sortBy]
      ? customSortValues[sortBy](a)
      : (a as any)[sortBy];
    let valB: any = customSortValues?.[sortBy]
      ? customSortValues[sortBy](b)
      : (b as any)[sortBy];

    if (sortBy.includes('.') && !customSortValues?.[sortBy]) {
      const parts = sortBy.split('.');
      valA = parts.reduce((acc: any, part) => acc?.[part], a);
      valB = parts.reduce((acc: any, part) => acc?.[part], b);
    }

    if (valA === undefined || valA === null) valA = '';
    if (valB === undefined || valB === null) valB = '';
    const numA = Number(valA);
    const numB = Number(valB);
    if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
      return sortOrder === 'ASC' ? numA - numB : numB - numA;
    }

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortOrder === 'ASC'
        ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
        : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
    }

    if (valA < valB) return sortOrder === 'ASC' ? -1 : 1;
    if (valA > valB) return sortOrder === 'ASC' ? 1 : -1;
    return 0;
  });
}