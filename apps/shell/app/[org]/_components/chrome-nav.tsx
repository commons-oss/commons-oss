"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface ChromeNavItem {
  key: string;
  label: string;
  href: string;
  icon?: string | undefined;
}

interface Props {
  orgSlug: string;
  appName: string;
  items: ChromeNavItem[];
}

/**
 * Two surfaces, one component:
 *   - <md  → bottom tab (trainer at the Platz)
 *   - md+  → sidebar (officer at the desk)
 *
 * CSS media queries flip which one is visible. Active state is derived
 * from `usePathname()` so the highlight follows client navigation
 * without a full reload.
 */
export function ChromeNav({ orgSlug, appName, items }: Props) {
  const pathname = usePathname() ?? "";

  return (
    <>
      <style>{chromeStyles}</style>

      <aside className="commons-sidebar">
        <Link
          href={`/${orgSlug}`}
          className="commons-brand"
          aria-label={appName}
        >
          <BrandGlyph />
          <span>
            Commons{" "}
            <span style={{ color: "var(--brand-mute)", letterSpacing: "0.05em" }}>OSS</span>
          </span>
        </Link>
        <div className="commons-org">{orgSlug}</div>
        <nav>
          <ul className="commons-sidenav">
            {items.map((it) => {
              const active = isActive(pathname, it.href);
              return (
                <li key={it.key}>
                  <Link
                    href={it.href}
                    className={active ? "commons-sidenav-link is-active" : "commons-sidenav-link"}
                  >
                    <NavIcon name={it.icon} />
                    <span>{it.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <nav className="commons-bottomtab" aria-label={appName}>
        {items.map((it) => {
          const active = isActive(pathname, it.href);
          return (
            <Link
              key={it.key}
              href={it.href}
              className={active ? "commons-tab is-active" : "commons-tab"}
              aria-current={active ? "page" : undefined}
            >
              <NavIcon name={it.icon} />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(href + "/");
}

function BrandGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 120 120" role="img" aria-hidden="true">
      <g transform="translate(60 60)">
        <circle cx="0" cy="-44" r="5" fill="var(--brand-slate)" />
        <circle cx="31.1" cy="-31.1" r="5" fill="var(--brand-slate)" />
        <circle cx="44" cy="0" r="5" fill="var(--brand-slate)" />
        <circle cx="31.1" cy="31.1" r="5" fill="var(--brand-slate)" />
        <circle cx="0" cy="44" r="5" fill="var(--brand-slate)" />
        <circle cx="-31.1" cy="31.1" r="5" fill="var(--brand-slate)" />
        <circle cx="-44" cy="0" r="5" fill="var(--brand-slate)" />
        <circle cx="-31.1" cy="-31.1" r="5" fill="var(--brand-slate)" />
        <circle cx="0" cy="0" r="7.5" fill="var(--brand-forest-bright)" />
      </g>
    </svg>
  );
}

function NavIcon({ name }: { name?: string | undefined }) {
  const stroke = "currentColor";
  const sw = 1.8;
  switch (name) {
    case "calendar-check":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" stroke={stroke} strokeWidth={sw} />
          <path d="M3 9h18M8 3v4M16 3v4" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M9 14l2 2 4-4" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "history":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 12a9 9 0 1 0 3-6.7" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M3 4v5h5" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 7v5l3 2" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "user":
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="8" r="4" stroke={stroke} strokeWidth={sw} />
          <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
  }
}

const chromeStyles = `
  .commons-sidebar {
    display: none;
    width: 240px;
    padding: 16px;
    border-right: 1px solid var(--brand-border);
    flex: none;
  }
  .commons-brand {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    font-weight: 500;
    color: var(--brand-slate);
    text-decoration: none;
  }
  .commons-org {
    font-size: 12px;
    color: var(--brand-mute);
    margin-bottom: 16px;
  }
  .commons-sidenav { list-style: none; padding: 0; margin: 0; }
  .commons-sidenav-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 6px;
    color: var(--brand-slate);
    text-decoration: none;
    font-size: 14px;
  }
  .commons-sidenav-link.is-active {
    background: var(--brand-forest-tint, rgba(16,90,60,0.08));
    color: var(--brand-forest, #105a3c);
    font-weight: 500;
  }

  .commons-bottomtab {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    background: #fff;
    border-top: 1px solid var(--brand-border);
    padding: 8px 8px calc(env(safe-area-inset-bottom, 0) + 12px);
    display: flex;
    align-items: stretch;
    justify-content: space-around;
    z-index: 10;
  }
  .commons-tab {
    flex: 1;
    height: 48px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    color: var(--brand-mute);
    text-decoration: none;
    font-size: 11px;
    -webkit-tap-highlight-color: transparent;
  }
  .commons-tab.is-active {
    color: var(--brand-forest, #105a3c);
    font-weight: 500;
  }

  .commons-shell-main {
    flex: 1;
    padding: 16px;
    padding-bottom: calc(env(safe-area-inset-bottom, 0) + 84px);
    min-width: 0;
  }

  @media (min-width: 768px) {
    .commons-sidebar { display: block; }
    .commons-bottomtab { display: none; }
    .commons-shell-main { padding: 24px; padding-bottom: 24px; }
  }
`;
