import Link from "next/link";

export type SessionFilter = "all" | "training" | "match";

export interface SessionRow {
  id: string;
  teamName: string;
  kind: "training" | "match" | "other";
  title: string | null;
  date: string;
  day: string;
  present: number;
  excused: number;
  absent: number;
  rosterSize: number;
}

interface Labels {
  all: string;
  training: string;
  match: string;
  present: string;
  excused: string;
  absent: string;
}

export function parseSessionFilter(value: string | undefined): SessionFilter {
  return value === "training" || value === "match" ? value : "all";
}

export function applySessionFilter(items: SessionRow[], filter: SessionFilter): SessionRow[] {
  if (filter === "all") return items;
  return items.filter((s) => s.kind === filter);
}

export function SessionFilterView({
  items,
  labels,
  active,
  basePath,
}: {
  items: SessionRow[];
  labels: Labels;
  active: SessionFilter;
  basePath: string;
}) {
  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "12px 0",
          borderBottom: "1px solid var(--brand-border)",
          marginBottom: 8,
        }}
      >
        <Chip active={active === "all"} href={basePath}>
          {labels.all}
        </Chip>
        <Chip active={active === "training"} href={`${basePath}?filter=training`}>
          {labels.training}
        </Chip>
        <Chip active={active === "match"} href={`${basePath}?filter=match`}>
          {labels.match}
        </Chip>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.map((s) => (
          <Row key={s.id} s={s} labels={labels} />
        ))}
      </ul>
    </>
  );
}

function Chip(props: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={props.href}
      replace
      scroll={false}
      aria-current={props.active ? "page" : undefined}
      style={{
        height: 30,
        padding: "0 12px",
        borderRadius: 6,
        background: props.active ? "var(--brand-slate)" : "transparent",
        color: props.active ? "#fff" : "var(--brand-mute)",
        border: props.active ? "1px solid transparent" : "1px solid var(--brand-border)",
        fontSize: 13,
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
        textDecoration: "none",
      }}
    >
      {props.children}
    </Link>
  );
}

function Row({ s, labels }: { s: SessionRow; labels: Labels }) {
  const total = s.present + s.excused + s.absent;
  const denom = s.rosterSize > 0 ? s.rosterSize : total > 0 ? total : 1;
  const pct = Math.round((s.present / denom) * 100);
  const segTotal = total > 0 ? total : 1;

  const kindLabel =
    s.title ?? (s.kind === "training" ? labels.training : s.kind === "match" ? labels.match : "—");

  return (
    <li
      style={{
        borderBottom: "1px solid var(--brand-border)",
        padding: "14px 4px",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div style={{ width: 56, flex: "none" }}>
        <div style={{ fontSize: 12, color: "var(--brand-mute)", lineHeight: 1.2 }}>{s.day}</div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: "var(--brand-slate)",
            letterSpacing: "-0.2px",
            marginTop: 2,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {s.date}
        </div>
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--brand-slate)",
            letterSpacing: "-0.1px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {kindLabel}
        </div>

        <div
          style={{
            display: "flex",
            gap: 2,
            height: 4,
            background: "#f3f4f6",
            marginTop: 8,
            overflow: "hidden",
            borderRadius: 2,
          }}
        >
          <div
            style={{ flex: s.present / segTotal, background: "var(--status-ok)" }}
            aria-label={`${s.present} ${labels.present}`}
          />
          <div
            style={{ flex: s.excused / segTotal, background: "var(--status-warn)" }}
            aria-label={`${s.excused} ${labels.excused}`}
          />
          <div
            style={{ flex: s.absent / segTotal, background: "var(--status-bad)" }}
            aria-label={`${s.absent} ${labels.absent}`}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 6,
            fontSize: 12,
            color: "var(--brand-mute)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span>
            {s.present} {labels.present}
          </span>
          {s.excused > 0 ? (
            <span>
              {s.excused} {labels.excused}
            </span>
          ) : null}
          {s.absent > 0 ? (
            <span>
              {s.absent} {labels.absent}
            </span>
          ) : null}
        </div>
      </div>

      <div style={{ flex: "none", textAlign: "right" }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: "var(--brand-slate)",
            letterSpacing: "-0.3px",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {pct}
          <span style={{ fontSize: 12, color: "var(--brand-mute)", fontWeight: 400 }}>%</span>
        </div>
      </div>
    </li>
  );
}
