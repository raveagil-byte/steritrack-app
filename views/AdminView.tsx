import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { AdminUsers } from './admin/AdminUsers';
import { AdminInstruments } from './admin/AdminInstruments';
import { AdminUnits } from './admin/AdminUnits';
import { AdminSets } from './admin/AdminSets';
import { AdminSettings } from './admin/AdminSettings';
import { AdminDashboard } from './admin/AdminDashboard';
import { cn } from '../lib/utils';

const AdminNavBtn = ({ to, label }: { to: string, label: string }) => (
    <NavLink
        to={to}
        className={({ isActive }) => cn(
            "px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all",
            isActive
                ? "bg-blue-600 text-white shadow-md"
                : "hover:bg-slate-100 text-slate-600 dark:hover:bg-slate-800 dark:text-slate-400"
        )}
    >
        {label}
    </NavLink>
);

const AdminView = () => {
    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <header className="mb-6">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Shield className="text-blue-600" />
                    Panel Kontrol Admin
                </h2>
                <p className="text-slate-500">Kelola pengguna sistem, data master, dan konfigurasi.</p>
            </header>

            <div className="flex gap-2 overflow-x-auto pb-4 border-b border-slate-200 dark:border-slate-700">
                <AdminNavBtn to="/admin/dashboard" label="Dashboard" />
                <AdminNavBtn to="/admin/users" label="Manajemen User" />
                <AdminNavBtn to="/admin/instruments" label="Master Instrumen" />
                <AdminNavBtn to="/admin/sets" label="Set Instrumen" />
                <AdminNavBtn to="/admin/units" label="Master Unit" />
                <AdminNavBtn to="/admin/settings" label="Pengaturan" />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 min-h-[500px]">
                <Routes>
                    <Route path="/" element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="instruments" element={<AdminInstruments />} />
                    <Route path="sets" element={<AdminSets />} />
                    <Route path="units" element={<AdminUnits />} />
                    <Route path="settings" element={<AdminSettings />} />
                </Routes>
            </div>
        </div>
    );
};

export default AdminView;
