import { Navigate, Outlet } from 'react-router-dom';
import {
    Box,
    ClipboardCheck,
    Activity,
    Stethoscope,
    LogOut,
    Sparkles,
    Settings,
    Moon,
    Sun,
    ScrollText,
    User
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Role } from '../types';
import { NavBtn, SidebarBtn } from './Navigation';

export const Layout = () => {
    const { currentUser, logout } = useAppContext();
    const { theme, toggleTheme } = useTheme();

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="min-h-screen pb-20 md:pb-0 bg-background text-foreground transition-colors duration-300">

            {/* Mobile Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border flex justify-around p-2 z-40 shadow-lg">
                {(currentUser.role === Role.ADMIN || currentUser.role === Role.CSSD) && (
                    <NavBtn icon={<Box />} label="CSSD" to="/cssd" />
                )}

                {(currentUser.role === Role.ADMIN || currentUser.role === Role.NURSE) && (
                    <NavBtn icon={<Stethoscope />} label="Perawat" to="/nurse" />
                )}

                <NavBtn icon={<ClipboardCheck />} label="Inv" to="/inventory" />

                {currentUser.role === Role.ADMIN && (
                    <NavBtn icon={<Settings />} label="Admin" to="/admin" />
                )}

                <NavBtn icon={<User />} label="Profil" to="/profile" />


                <button onClick={toggleTheme} className="flex flex-col items-center justify-center w-full py-2 rounded-lg transition-colors text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800">
                    {theme === 'dark' ? <Sun className="mb-1" size={20} /> : <Moon className="mb-1" size={20} />}
                    <span className="text-[10px] font-medium">{theme === 'dark' ? 'Terang' : 'Gelap'}</span>
                </button>

                <button onClick={logout} className="flex flex-col items-center justify-center w-full py-2 rounded-lg transition-colors text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800">
                    <LogOut className="mb-1" />
                    <span className="text-[10px] font-medium">Keluar</span>
                </button>
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-slate-900 text-white p-4">
                <h1 className="text-2xl font-bold mb-2 flex items-center gap-2 text-blue-400">
                    <Activity /> SteriTrack
                </h1>
                <div className="mb-8 px-2">
                    <p className="text-xs text-slate-400">Masuk sebagai:</p>
                    <p className="font-semibold">{currentUser.name}</p>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-blue-300 uppercase">{currentUser.role}</span>
                </div>

                <nav className="flex flex-col gap-2">
                    {(currentUser.role === Role.ADMIN || currentUser.role === Role.CSSD) && (
                        <SidebarBtn icon={<Box />} label="Operasional CSSD" to="/cssd" />
                    )}

                    {(currentUser.role === Role.ADMIN || currentUser.role === Role.NURSE) && (
                        <SidebarBtn icon={<Stethoscope />} label="Stasiun Perawat" to="/nurse" />
                    )}

                    <SidebarBtn icon={<ClipboardCheck />} label="Inventaris" to="/inventory" />

                    <SidebarBtn icon={<ScrollText />} label="Log Aktivitas" to="/activity" />

                    {currentUser.role === Role.ADMIN && (
                        <>
                            <div className="border-t border-slate-700 my-2"></div>
                            <SidebarBtn icon={<Settings />} label="Panel Admin" to="/admin" />
                        </>
                    )}

                    {/* <SidebarBtn icon={<Sparkles />} label="Asisten Lokal" to="/analytics" /> */}

                    <SidebarBtn icon={<User />} label="Profil Saya" to="/profile" />
                </nav>
                <div className="mt-auto">
                    <button
                        onClick={toggleTheme}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-300 w-full transition mb-2"
                    >
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        <span className="text-sm font-medium">{theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}</span>
                    </button>

                    <button onClick={logout} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-900/50 text-red-300 w-full transition">
                        <LogOut size={20} />
                        <span className="text-sm font-medium">Keluar</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="md:ml-64 min-h-screen p-4 md:p-8">
                <Outlet />
            </main>
        </div>
    );
};
