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
import { DigitalClock } from './DigitalClock';

export const Layout = () => {
    const { currentUser, logout } = useAppContext();
    const { theme, toggleTheme } = useTheme();

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="min-h-screen pb-20 md:pb-0 bg-background text-foreground transition-colors duration-300">

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 border-b border-white/10 flex items-center justify-between px-4 z-40 shadow-md">
                <div className="flex items-center gap-2 font-bold text-lg text-blue-400">
                    <Activity size={20} />
                    <span>SIAPPMEN</span>
                </div>
                {/* Optional: User Avatar or small widget could go here */}
            </div>

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


            </div>

            {/* Desktop Sidebar */}
            <div className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-slate-900 text-white p-4">
                <h1 className="text-2xl font-bold mb-2 flex items-center gap-2 text-blue-400">
                    <Activity /> SIAPPMEN
                </h1>
                <div className="mb-8 px-2">
                    <p className="text-xs text-slate-400">Masuk sebagai:</p>
                    <p className="font-semibold">{currentUser.name}</p>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-blue-300 uppercase">{currentUser.role}</span>
                </div>

                <div className="mb-4">
                    <DigitalClock />
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

                    <SidebarBtn icon={<Sparkles />} label="Asisten Lokal" to="/analytics" />

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
            <main className="md:ml-64 min-h-screen p-4 md:p-8 pt-20 md:pt-8">
                <Outlet />
            </main>
        </div>
    );
};
