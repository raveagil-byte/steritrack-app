import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Shield, Filter, Download, Search, Calendar, User, Activity, AlertTriangle } from 'lucide-react';

interface AuditLog {
    id: string;
    timestamp: number;
    userId: string;
    userName: string;
    action: string;
    entityType: string;
    entityId: string;
    changes: any;
    ipAddress: string;
    userAgent: string;
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
}

export const AuditLogView = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLogs, setTotalLogs] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);

    // Note: Filter options might ideally be fetched separately, 
    // but for now we'll derive them from the current page or keep them static/empty if needed.
    // To properly support "All Users" in dropdown, we might need a separate API call. 
    // For this implementation, we will rely on what's available or manual text input for search.

    const [filters, setFilters] = useState({
        userId: '',
        action: '',
        entityType: '',
        severity: '',
        dateFrom: '',
        dateTo: '',
        search: '',
        limit: 20 // Default smaller limit for pagination
    });

    useEffect(() => {
        // Debounce search
        const timer = setTimeout(() => {
            fetchLogs();
        }, 500);
        return () => clearTimeout(timer);
    }, [filters, currentPage]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.userId) params.append('userId', filters.userId);
            if (filters.action) params.append('action', filters.action);
            if (filters.entityType) params.append('entityType', filters.entityType);
            if (filters.severity) params.append('severity', filters.severity);
            if (filters.dateFrom) params.append('dateFrom', new Date(filters.dateFrom).getTime().toString());
            if (filters.dateTo) params.append('dateTo', new Date(filters.dateTo).getTime().toString());
            if (filters.search) params.append('search', filters.search);

            params.append('limit', filters.limit.toString());
            params.append('page', currentPage.toString());

            const response = await fetch(`/api/audit-logs?${params}`);
            if (response.ok) {
                const result = await response.json();
                // Handle both old array format and new pagination format for backward compat if needed
                if (Array.isArray(result)) {
                    setLogs(result);
                } else {
                    setLogs(result.data);
                    setTotalPages(result.pagination.totalPages);
                    setTotalLogs(result.pagination.total);
                }
            }
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    // Reset page when filters change (except pagination itself)
    useEffect(() => {
        setCurrentPage(1);
    }, [filters.userId, filters.action, filters.entityType, filters.severity, filters.dateFrom, filters.dateTo, filters.search, filters.limit]);

    const exportToExcel = () => {
        const data = logs.map(log => ({
            'Timestamp': new Date(log.timestamp).toLocaleString('id-ID'),
            'User': log.userName || log.userId,
            'Action': log.action,
            'Entity Type': log.entityType,
            'Entity ID': log.entityId || '-',
            'Severity': log.severity,
            'Changes': typeof log.changes === 'string' ? log.changes : JSON.stringify(log.changes)
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Audit Logs");
        XLSX.writeFile(wb, `audit-logs-${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'CRITICAL': return 'bg-red-100 text-red-700 border-red-300';
            case 'ERROR': return 'bg-orange-100 text-orange-700 border-orange-300';
            case 'WARNING': return 'bg-amber-100 text-amber-700 border-amber-300';
            default: return 'bg-slate-100 text-slate-700 border-slate-300';
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'CRITICAL':
            case 'ERROR':
            case 'WARNING':
                return <AlertTriangle size={14} />;
            default:
                return <Activity size={14} />;
        }
    };

    // Calculate unique values from CURRENT logs for dropdowns (imperfect but functional without extra API)
    const uniqueActions = useMemo(() => Array.from(new Set(logs.map(l => l.action))).sort(), [logs]);
    const uniqueEntityTypes = useMemo(() => Array.from(new Set(logs.map(l => l.entityType))).sort(), [logs]);
    const uniqueUsers = useMemo(() => Array.from(new Set(logs.map(l => l.userName || l.userId).filter(Boolean))).sort(), [logs]);

    const renderChanges = (changes: any) => {
        try {
            if (typeof changes === 'string') {
                return JSON.stringify(JSON.parse(changes), null, 2);
            }
            return JSON.stringify(changes, null, 2);
        } catch (e) {
            return String(changes);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-600 text-white rounded-lg">
                            <Shield size={28} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900">Audit Log</h2>
                            <p className="text-slate-500">Comprehensive system activity tracking (Server-side Search & Pagination)</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={exportToExcel}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all shadow-lg shadow-green-200"
                >
                    <Download size={18} />
                    Export Page
                </button>
            </div>

            {/* Stats Cards (Based on visible page) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="text-sm text-slate-500 mb-1">Total Logs (Total)</div>
                    <div className="text-2xl font-bold text-slate-900">{totalLogs}</div>
                </div>
                <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                    <div className="text-sm text-amber-600 mb-1">Warnings (Page)</div>
                    <div className="text-2xl font-bold text-amber-700">
                        {logs.filter(l => l.severity === 'WARNING').length}
                    </div>
                </div>
                <div className="bg-red-50 rounded-xl border border-red-200 p-4">
                    <div className="text-sm text-red-600 mb-1">Errors (Page)</div>
                    <div className="text-2xl font-bold text-red-700">
                        {logs.filter(l => l.severity === 'ERROR' || l.severity === 'CRITICAL').length}
                    </div>
                </div>
                <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                    <div className="text-sm text-blue-600 mb-1">Unique Users (Page)</div>
                    <div className="text-2xl font-bold text-blue-700">{uniqueUsers.length}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Filter size={20} className="text-slate-600" />
                    <h3 className="font-bold text-slate-900">Filters</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {/* Search */}
                    <div className="lg:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Search</label>
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                placeholder="User, action, entity..."
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Limit */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Logs per Page</label>
                        <select
                            value={filters.limit}
                            onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        >
                            <option value="20">20 logs</option>
                            <option value="50">50 logs</option>
                            <option value="100">100 logs</option>
                            <option value="500">500 logs</option>
                        </select>
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={() => setFilters({
                                userId: '',
                                action: '',
                                entityType: '',
                                severity: '',
                                dateFrom: '',
                                dateTo: '',
                                search: '',
                                limit: 20
                            })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-all font-medium text-slate-700"
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                        <p className="mt-4 text-slate-500">Loading audit logs...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <Shield size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No audit logs found</p>
                        <p className="text-sm">Try adjusting your filters</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="p-3 text-left font-bold text-slate-700">Timestamp</th>
                                    <th className="p-3 text-left font-bold text-slate-700">User</th>
                                    <th className="p-3 text-left font-bold text-slate-700">Action</th>
                                    <th className="p-3 text-left font-bold text-slate-700">Entity</th>
                                    <th className="p-3 text-left font-bold text-slate-700">Severity</th>
                                    <th className="p-3 text-left font-bold text-slate-700">Changes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {logs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-3">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <Calendar size={14} className="text-slate-400" />
                                                <span className="font-mono text-xs">
                                                    {new Date(log.timestamp).toLocaleString('id-ID', {
                                                        year: 'numeric', month: '2-digit', day: '2-digit',
                                                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <User size={14} className="text-slate-400" />
                                                <span className="font-medium text-slate-900">{log.userName || log.userId || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">{log.action}</span>
                                        </td>
                                        <td className="p-3">
                                            <div className="text-slate-700">
                                                <div className="font-medium">{log.entityType}</div>
                                                {log.entityId && <div className="text-xs text-slate-400 font-mono">{log.entityId.substring(0, 12)}...</div>}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border ${getSeverityColor(log.severity)}`}>
                                                {getSeverityIcon(log.severity)}
                                                {log.severity}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <details className="cursor-pointer">
                                                <summary className="text-blue-600 hover:underline text-xs font-medium">View Details</summary>
                                                <pre className="mt-2 text-xs bg-slate-50 p-3 rounded border border-slate-200 overflow-x-auto max-w-md">
                                                    {renderChanges(log.changes || {})}
                                                </pre>
                                            </details>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                        Page {currentPage} of {totalPages} ({totalLogs} items)
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 bg-white border rounded text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
                            className="px-3 py-1 bg-white border rounded text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
