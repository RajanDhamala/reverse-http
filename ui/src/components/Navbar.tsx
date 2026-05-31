import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  ChevronDown,
  LogOut,
  Menu,
  ServerCog,
  X,
} from "lucide-react";
import { type AuthUser, useUserStore } from "../Zustand/userStore";

const navItems = [
  { label: "Landing", to: "/" },
  { label: "Docs", to: "/docs" },
  { label: "App Configs", to: "/app" },
  { label: "OAuth Routes", to: "/oauth" },
];

function navClass({ isActive }: { isActive: boolean }) {
  return [
    "inline-flex h-8 items-center rounded-md px-3 text-sm font-medium transition",
    isActive
      ? "border border-cyan-200 bg-cyan-50 text-cyan-700"
      : "text-gray-500 hover:bg-white hover:text-gray-900",
  ].join(" ");
}

function mobileNavClass({ isActive }: { isActive: boolean }) {
  return [
    "flex h-10 items-center rounded-md px-3 text-sm font-medium transition",
    isActive
      ? "border border-cyan-200 bg-cyan-50 text-cyan-700"
      : "text-gray-600 hover:bg-gray-50 hover:text-gray-950",
  ].join(" ");
}

function pickUserName(user: AuthUser | null) {
  return user?.Username ?? user?.username ?? user?.name ?? "User";
}

function pickAvatar(user: AuthUser | null) {
  return user?.avatar ?? user?.Avatar ?? user?.avatar_url ?? user?.avatarUrl ?? "";
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "U";
}

function AuthSkeleton() {
  return (
    <div className="flex items-center gap-2" aria-label="Checking authentication">
      <span className="h-8 w-20 animate-pulse rounded-md bg-gray-200" />
      <span className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
    </div>
  );
}

function ProfileMenu({
  user,
  onLogout,
}: {
  user: AuthUser | null;
  onLogout?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const username = pickUserName(user);
  const avatar = pickAvatar(user);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await fetch("http://localhost:3000/user/logout", {
        method: "GET",
        credentials: "include",
      });
    } catch (err) {
      console.log(err);
    } finally {
      useUserStore.getState().clearUser();
      setIsLoggingOut(false);
      setIsOpen(false);
      onLogout?.();
    }
  };

  return (
    <div ref={menuRef} className="relative w-full md:w-auto">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-2 transition hover:border-cyan-300 md:w-auto md:justify-start"
        title={username}
        aria-label="Open profile menu"
        aria-expanded={isOpen}
      >
        {avatar ? (
          <img
            src={avatar}
            alt={`${username} avatar`}
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-100 text-sm font-semibold text-cyan-700">
            {getInitial(username)}
          </span>
        )}
        <span className="hidden max-w-36 truncate text-sm font-medium text-gray-700 sm:block">
          {username}
        </span>
        <ChevronDown
          className={["h-4 w-4 text-gray-400 transition", isOpen ? "rotate-180" : ""].join(" ")}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 z-50 mt-2 rounded-lg border border-gray-200 bg-white p-2 shadow-xl shadow-slate-950/10 md:left-auto md:w-48">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

function AuthActions({
  isLoading,
  isLoggedIn,
  user,
  onNavigate,
}: {
  isLoading: boolean;
  isLoggedIn: boolean;
  user: AuthUser | null;
  onNavigate?: () => void;
}) {
  if (isLoading) return <AuthSkeleton />;
  if (isLoggedIn) return <ProfileMenu user={user} onLogout={onNavigate} />;

  return (
    <>
      <Link to="/login" onClick={onNavigate} className="dev-button h-9 min-h-9">
        Login
      </Link>
      <Link to="/register" onClick={onNavigate} className="dev-button dev-button-primary h-9 min-h-9">
        Register
      </Link>
    </>
  );
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { authStatus, isLoggedIn, user } = useUserStore();
  const isAuthLoading = authStatus === "loading";

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-gray-100/92 backdrop-blur">
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
        <Link
          to="/"
          onClick={() => setMenuOpen(false)}
          className="flex min-w-0 items-center gap-2"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-cyan-200 bg-cyan-50 text-cyan-700">
            <ServerCog className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="truncate text-sm font-semibold text-gray-950">Reverse HTTP</span>
        </Link>

        <div className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClass}>
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <AuthActions isLoading={isAuthLoading} isLoggedIn={isLoggedIn} user={user} />
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition hover:border-cyan-300 hover:text-cyan-700 lg:hidden"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
        </button>
      </nav>

      {menuOpen ? (
        <div className="absolute left-4 right-4 top-[calc(100%+0.5rem)] z-50 rounded-xl border border-gray-200 bg-white p-3 shadow-2xl shadow-slate-950/15 md:left-auto md:right-8 md:w-80 lg:hidden">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={mobileNavClass}
              >
                {item.label}
              </NavLink>
            ))}

            <div className="mt-2 flex items-center gap-2 border-t border-gray-200 pt-3">
              <AuthActions
                isLoading={isAuthLoading}
                isLoggedIn={isLoggedIn}
                user={user}
                onNavigate={() => setMenuOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
