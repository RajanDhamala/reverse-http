import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ChevronDown, LogOut, Menu, ServerCog, X } from "lucide-react";
import { type AuthUser, useUserStore } from "../Zustand/userStore";

const navItems = [
  { label: "Home", to: "/" },
  { label: "Docs", to: "/docs" },
  { label: "App Configs", to: "/app" },
  { label: "OAuth Routes", to: "/oauth" },
];

function navClass({ isActive }: { isActive: boolean }) {
  return [
    "rounded-lg px-3 py-2 text-sm font-medium transition",
    isActive
      ? "bg-neutral-900 text-white"
      : "text-neutral-500 hover:bg-neutral-900/70 hover:text-neutral-100",
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
    <div
      className="flex items-center gap-2"
      aria-label="Checking authentication"
    >
      <span className="h-9 w-20 animate-pulse rounded-lg bg-neutral-900" />
      <span className="h-9 w-9 animate-pulse rounded-full bg-neutral-900" />
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
      if (event.key === "Escape") {
        setIsOpen(false);
      }
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
        className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-1 transition hover:border-neutral-600 md:w-auto md:justify-start"
        title={username}
        aria-label="Open profile menu"
        aria-expanded={isOpen}
      >
        {avatar ? (
          <img
            src={avatar}
            alt={`${username} avatar`}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-950">
            {getInitial(username)}
          </span>
        )}
        <span className="hidden max-w-36 truncate text-sm font-medium text-neutral-200 sm:block">
          {username}
        </span>
        <ChevronDown
          className={[
            "h-4 w-4 text-neutral-500 transition",
            isOpen ? "rotate-180" : "",
          ].join(" ")}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 z-50 mt-2 rounded-lg border border-neutral-800 bg-neutral-950 p-2 shadow-xl shadow-black/40 md:left-auto md:w-48">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-red-900/70 bg-red-950/40 px-3 text-sm font-semibold text-red-200 transition hover:border-red-700 hover:bg-red-900/60 disabled:cursor-not-allowed disabled:opacity-70"
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
  if (isLoading) {
    return <AuthSkeleton />;
  }

  if (isLoggedIn) {
    return <ProfileMenu user={user} onLogout={onNavigate} />;
  }

  return (
    <>
      <Link
        to="/login"
        onClick={onNavigate}
        className="inline-flex h-9 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 text-sm font-medium text-neutral-300 transition hover:border-neutral-600 hover:text-white"
      >
        Login
      </Link>
      <Link
        to="/register"
        onClick={onNavigate}
        className="inline-flex h-9 items-center justify-center rounded-lg bg-neutral-100 px-3.5 text-sm font-semibold text-neutral-950 transition hover:bg-white"
      >
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
    <header className="sticky top-0 z-50 border-b border-neutral-900 bg-neutral-950/95 backdrop-blur">
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-8">
        <Link
          to="/"
          onClick={() => setMenuOpen(false)}
          className="flex min-w-0 items-center gap-2"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-200">
            <ServerCog className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="truncate text-sm font-semibold text-white">
            Reverse HTTP
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClass}>
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <AuthActions
            isLoading={isAuthLoading}
            isLoggedIn={isLoggedIn}
            user={user}
          />
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-300 transition hover:border-neutral-600 hover:text-white md:hidden"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <X className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Menu className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </nav>

      {menuOpen ? (
        <div className="border-t border-neutral-900 bg-neutral-950 px-4 pb-4 md:hidden">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 pt-3">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={navClass}
              >
                {item.label}
              </NavLink>
            ))}

            <div className="mt-3 flex items-center gap-2 border-t border-neutral-900 pt-3">
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
