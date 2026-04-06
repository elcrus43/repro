import { useCallback, useMemo, useState } from 'react';

/**
 * Хук для пагинации списков
 * @param {Array} items - Массив элементов для пагинации
 * @param {number} itemsPerPage - Количество элементов на странице
 * @returns {{ paginatedItems: Array, currentPage: number, totalPages: number, hasNext: boolean, hasPrev: boolean, nextPage: Function, prevPage: Function, goToPage: Function, resetPage: Function }}
 */
export function usePagination(items, itemsPerPage = 20) {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.ceil(items.length / itemsPerPage);

    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        return items.slice(start, end);
    }, [items, currentPage, itemsPerPage]);

    const hasNext = currentPage < totalPages;
    const hasPrev = currentPage > 1;

    const nextPage = useCallback(() => setCurrentPage(p => Math.min(p + 1, totalPages)), [totalPages]);
    const prevPage = useCallback(() => setCurrentPage(p => Math.max(p - 1, 1)), []);
    const goToPage = useCallback((page) => setCurrentPage(Math.max(1, Math.min(page, totalPages))), [totalPages]);
    const resetPage = useCallback(() => setCurrentPage(1), []);

    return {
        paginatedItems,
        currentPage,
        totalPages,
        hasNext,
        hasPrev,
        nextPage,
        prevPage,
        goToPage,
        resetPage
    };
}
