import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils'; // Using our new utility

interface NavBtnProps {
    icon: ReactNode;
    label: string;
    to: string;
}

export const NavBtn = ({ icon, label, to }: NavBtnProps) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            cn(
                "flex flex-col items-center justify-center w-full py-2 rounded-lg transition-colors",
                isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )
        }
    >
        <div className="mb-1">{icon}</div>
        <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
);

export const SidebarBtn = ({ icon, label, to }: NavBtnProps) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )
        }
    >
        <div>{icon}</div>
        <span className="text-sm font-medium">{label}</span>
    </NavLink>
);
