import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store";
import { logout } from "../store/authSlice";

const brandLogo = "/brand-logo.png";

const NAV_MAIN = [
	{
		to: "/",
		label: "Dashboard",
		icon: (
			<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
			</svg>
		),
	},
	{
		to: "/pos",
		label: "Punto de Venta",
		icon: (
			<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
			</svg>
		),
		highlight: true,
	},
	{
		to: "/inventory",
		label: "Inventario",
		icon: (
			<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
			</svg>
		),
	},
	{
		to: "/sales",
		label: "Ventas",
		icon: (
			<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
			</svg>
		),
	},
];

const NAV_ADMIN = [
	{
		to: "/admin/users",
		label: "Usuarios",
		icon: (
			<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
			</svg>
		),
	},
	{
		to: "/admin/catalog",
		label: "Cat. y Sucursales",
		icon: (
			<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
		),
	},
	{
		to: "/admin/profit-report",
		label: "Informe Ganancias",
		icon: (
			<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
		),
	},
	{
		to: "/admin/supplier-ledger",
		label: "Compras y Deuda",
		icon: (
			<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 10v2m9-6a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
		),
	},
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const { user } = useSelector((state: RootState) => state.auth);
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const location = useLocation();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	const handleLogout = () => {
		dispatch(logout());
		navigate("/login");
	};

	const isActive = (to: string) =>
		to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

	const goTo = (to: string) => {
		navigate(to);
		setMobileMenuOpen(false);
	};

	if (!user) return <>{children}</>;

	const companyName = (import.meta as any).env?.VITE_COMPANY_NAME || "FacturaApp";

	return (
		<div className="flex h-screen bg-[#030712] overflow-hidden text-slate-300">

			{/* ── Mobile Topbar ── */}
			<div className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-[#060D1F]/95 backdrop-blur border-b border-white/[0.06] px-4 flex items-center justify-between">
				<button
					onClick={() => setMobileMenuOpen(true)}
					className="btn-icon !w-9 !h-9"
					aria-label="Abrir menú"
				>
					<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				</button>
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-lg bg-white/90 flex items-center justify-center ring-1 ring-white/30 overflow-hidden">
						<img src={brandLogo} alt="Logo" className="w-6 h-6 object-contain" />
					</div>
					<p className="text-sm font-semibold text-white">{companyName}</p>
				</div>
				<button
					onClick={handleLogout}
					title="Cerrar sesión"
					className="btn-icon !w-9 !h-9"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
					</svg>
				</button>
			</div>

			{/* ── Mobile Overlay ── */}
			{mobileMenuOpen && (
				<button
					className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]"
					onClick={() => setMobileMenuOpen(false)}
					aria-label="Cerrar menú"
				/>
			)}

			{/* ── Sidebar ── */}
			<aside className={`fixed lg:static top-0 left-0 z-50 h-full w-72 lg:w-60 flex-shrink-0 flex flex-col bg-[#060D1F] border-r border-white/[0.05] transition-transform duration-300 ${
				mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
			}`}>

				{/* Logo */}
				<div className="px-5 py-5 flex items-center gap-3 border-b border-white/[0.04]">
					<div className="w-9 h-9 rounded-lg bg-white/90 flex items-center justify-center ring-1 ring-white/25 shadow-glow-sm overflow-hidden flex-shrink-0">
						<img src={brandLogo} alt="Logo" className="w-7 h-7 object-contain" />
					</div>
					<div className="min-w-0">
						<p className="text-sm font-semibold text-white truncate leading-tight">{companyName}</p>
						<p className="text-[10px] text-slate-500 leading-tight">Sistema de Facturación</p>
					</div>
					<button
						className="lg:hidden ml-auto btn-icon-sm"
						onClick={() => setMobileMenuOpen(false)}
						aria-label="Cerrar menú"
					>
						<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				{/* Nav */}
				<nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
					<p className="section-heading px-2 mb-2">General</p>
					{NAV_MAIN.map(({ to, label, icon, highlight }) => (
						<button
							key={to}
							onClick={() => goTo(to)}
							className={`nav-item ${isActive(to) ? "active" : ""} ${
								highlight && !isActive(to)
									? "text-brand-400 hover:text-brand-300 hover:bg-brand-500/10"
									: ""
							}`}
						>
							{icon}
							<span>{label}</span>
							{highlight && !isActive(to) && (
								<span className="ml-auto text-[9px] font-bold bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded-full ring-1 ring-brand-500/20">
									TPV
								</span>
							)}
						</button>
					))}

					{user.roles.includes("admin") && (
						<>
							<p className="section-heading px-2 mt-5 mb-2">Administración</p>
							{NAV_ADMIN.map(({ to, label, icon }) => (
								<button
									key={to}
									onClick={() => goTo(to)}
									className={`nav-item ${isActive(to) ? "active" : ""}`}
								>
									{icon}
									<span>{label}</span>
								</button>
							))}
						</>
					)}
				</nav>

				{/* User footer */}
				<div className="px-3 py-3 border-t border-white/[0.04]">
					<div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors">
						<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-blue-600 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
							{user.email.slice(0, 2).toUpperCase()}
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-xs font-medium text-white truncate">{user.email}</p>
							<p className="text-[10px] text-slate-500 capitalize">{user.roles[0]}</p>
						</div>
						<button
							onClick={handleLogout}
							title="Cerrar sesión"
							className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
							</svg>
						</button>
					</div>
				</div>
			</aside>

			{/* ── Main ── */}
			<main className="flex-1 overflow-y-auto overflow-x-hidden animate-fade-in">
				<div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto pt-20 lg:pt-8">
					{children}
				</div>
			</main>
		</div>
	);
};
