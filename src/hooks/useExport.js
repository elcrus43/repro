import { useCallback } from 'react';

export function useExport() {
    const exportToCSV = useCallback((data, filename, headers) => {
        const escapeCSV = (val) => {
            if (val === null || val === undefined) return '';
            let stringVal = String(val);
            // Replace double quotes with two double quotes
            stringVal = stringVal.replace(/"/g, '""');
            // Wrap in double quotes if it contains comma, double quote, or newlines
            if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n') || stringVal.includes('\r')) {
                stringVal = `"${stringVal}"`;
            }
            return stringVal;
        };

        const headerLine = headers.map(h => escapeCSV(h.label)).join(',');
        const rows = data.map(item => {
            return headers.map(h => {
                // If a resolver function is passed, use it, otherwise use key lookup
                if (typeof h.resolve === 'function') {
                    return escapeCSV(h.resolve(item));
                }
                return escapeCSV(item[h.key]);
            }).join(',');
        });

        const csvContent = '\uFEFF' + [headerLine, ...rows].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, []);

    return { exportToCSV };
}
