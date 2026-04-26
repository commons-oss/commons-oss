"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { markAttendance, markAllPresent } from "../actions.ts";

type Status = "present" | "excused" | "absent";

export interface RosterPlayer {
  personId: string;
  jerseyNumber: number | null;
  firstName: string;
  lastName: string;
  notes: string | null;
}

interface Props {
  orgSlug: string;
  eventId: string;
  teamId: string;
  roster: RosterPlayer[];
  initialMarks: Record<string, Status>;
}

/**
 * Mockup parity with `today-training.jsx`:
 *   - Inline summary counts (anwesend/entschuldigt/abwesend/offen).
 *   - "Alle anwesend" quick action (only fills empty slots).
 *   - Per-row 3-state pill toggle, ok = forest, warn/bad = neutral.
 *   - Optimistic state + autosave indicator. Server is the source of truth;
 *     a failed write reverts the row + surfaces an error.
 */
export function RosterMarker({ orgSlug, eventId, teamId, roster, initialMarks }: Props) {
  const t = useTranslations("attendance-tracker");
  const [marks, setMarks] = useState<Record<string, Status>>(initialMarks);
  const [pending, startTransition] = useTransition();
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(
    Object.keys(initialMarks).length > 0 ? Date.now() : null,
  );

  const counts = roster.reduce(
    (acc, p) => {
      const s = marks[p.personId];
      if (s === "present") acc.present++;
      else if (s === "excused") acc.excused++;
      else if (s === "absent") acc.absent++;
      else acc.open++;
      return acc;
    },
    { present: 0, excused: 0, absent: 0, open: 0 },
  );

  function setOne(personId: string, status: Status) {
    const prev = marks[personId];
    if (prev === status) return;
    setMarks((m) => ({ ...m, [personId]: status }));
    startTransition(async () => {
      try {
        await markAttendance({ orgSlug, eventId, personId, status });
        setLastSavedAt(Date.now());
      } catch (err) {
        console.error("markAttendance failed", err);
        setMarks((m) => {
          const next = { ...m };
          if (prev) next[personId] = prev;
          else delete next[personId];
          return next;
        });
      }
    });
  }

  function onMarkAllPresent() {
    const next = { ...marks };
    for (const p of roster) {
      if (!next[p.personId]) next[p.personId] = "present";
    }
    setMarks(next);
    startTransition(async () => {
      try {
        await markAllPresent({ orgSlug, eventId, teamId });
        setLastSavedAt(Date.now());
      } catch (err) {
        console.error("markAllPresent failed", err);
        setMarks(marks);
      }
    });
  }

  const allDone = counts.open === 0;
  const saving = pending;

  return (
    <>
      <SummaryBar
        counts={counts}
        total={roster.length}
        allDone={allDone}
        onMarkAllPresent={onMarkAllPresent}
        labels={{
          present: t("summaryPresent"),
          excused: t("summaryExcused"),
          absent: t("summaryAbsent"),
          open: t("summaryOpen"),
          markAll: t("markAllPresent"),
        }}
      />

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {roster.map((p) => (
          <PlayerRow
            key={p.personId}
            player={p}
            status={marks[p.personId] ?? null}
            onChange={setOne}
            labels={{
              present: t("statusPresent"),
              excused: t("statusExcused"),
              absent: t("statusAbsent"),
            }}
          />
        ))}
      </ul>

      <div
        style={{
          marginTop: 12,
          fontSize: 13,
          color: "var(--brand-mute)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            background: saving ? "var(--brand-mute)" : "var(--status-ok)",
            transition: "background 200ms ease",
          }}
        />
        {saving ? t("saving") : lastSavedAt ? t("savedAuto") : t("progress", { done: 0, total: roster.length })}
        {!saving && allDone && lastSavedAt ? (
          <span style={{ marginLeft: 8 }}>· {t("completed")}</span>
        ) : null}
      </div>
    </>
  );
}

function SummaryBar(props: {
  counts: { present: number; excused: number; absent: number; open: number };
  total: number;
  allDone: boolean;
  onMarkAllPresent: () => void;
  labels: { present: string; excused: string; absent: string; open: string; markAll: string };
}) {
  const { counts, allDone, onMarkAllPresent, labels } = props;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "12px 0",
        borderTop: "1px solid var(--brand-border)",
        borderBottom: "1px solid var(--brand-border)",
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", gap: 20, alignItems: "baseline" }}>
        <Stat n={counts.present} color="var(--status-ok)" label={labels.present} />
        <Stat n={counts.excused} color="var(--status-warn)" label={labels.excused} />
        <Stat n={counts.absent} color="var(--status-bad)" label={labels.absent} />
        <Stat n={counts.open} color="var(--brand-mute)" label={labels.open} />
      </div>
      <button
        type="button"
        onClick={onMarkAllPresent}
        disabled={allDone}
        style={{
          height: 32,
          padding: "0 12px",
          borderRadius: 6,
          background: "transparent",
          border: "1px solid var(--brand-border)",
          color: "var(--brand-slate)",
          fontFamily: "var(--brand-font-sans)",
          fontSize: 13,
          fontWeight: 500,
          cursor: allDone ? "default" : "pointer",
          opacity: allDone ? 0.4 : 1,
          whiteSpace: "nowrap",
        }}
      >
        {labels.markAll}
      </button>
    </div>
  );
}

function Stat(props: { n: number; color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      <span
        style={{
          fontSize: 20,
          fontWeight: 500,
          lineHeight: 1,
          color: props.color,
          letterSpacing: "-0.4px",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {props.n}
      </span>
      <span style={{ fontSize: 12, color: "var(--brand-mute)" }}>{props.label}</span>
    </div>
  );
}

function PlayerRow(props: {
  player: RosterPlayer;
  status: Status | null;
  onChange: (personId: string, status: Status) => void;
  labels: { present: string; excused: string; absent: string };
}) {
  const { player, status, onChange, labels } = props;
  const segs: Array<{ key: Status; label: string; color: string }> = [
    { key: "present", label: labels.present, color: "var(--status-ok)" },
    { key: "excused", label: labels.excused, color: "var(--status-warn)" },
    { key: "absent", label: labels.absent, color: "var(--status-bad)" },
  ];
  const fullName = `${player.firstName} ${player.lastName}`;

  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 4px",
        borderBottom: "1px solid var(--brand-border)",
        minHeight: 56,
      }}
    >
      <div
        style={{
          width: 30,
          textAlign: "right",
          fontSize: 16,
          fontWeight: 500,
          color: "var(--brand-mute)",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.2px",
        }}
      >
        {player.jerseyNumber ?? ""}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: "var(--brand-slate)",
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {fullName}
        </div>
        {player.notes ? (
          <div style={{ fontSize: 12, color: "var(--brand-mute)", marginTop: 2 }}>
            {player.notes}
          </div>
        ) : null}
      </div>

      <div
        role="radiogroup"
        aria-label={`Anwesenheit ${fullName}`}
        style={{
          display: "flex",
          gap: 2,
          padding: 3,
          background: "#f3f4f6",
          border: "1px solid var(--brand-border)",
          borderRadius: 999,
        }}
      >
        {segs.map((s) => {
          const active = status === s.key;
          return (
            <button
              key={s.key}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={s.label}
              onClick={() => onChange(player.personId, s.key)}
              style={{
                appearance: "none",
                border: "none",
                cursor: "pointer",
                width: 32,
                height: 32,
                borderRadius: 999,
                background: active ? s.color : "transparent",
                color: active ? "#fff" : "var(--brand-mute)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 120ms ease",
                padding: 0,
              }}
            >
              <Glyph kind={s.key} active={active} />
            </button>
          );
        })}
      </div>
    </li>
  );
}

function Glyph({ kind, active }: { kind: Status; active: boolean }) {
  const stroke = active ? 2.4 : 2;
  const color = active ? "#fff" : "currentColor";
  if (kind === "present") {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 13l4 4L19 7"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "excused") {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth={stroke} />
        <path d="M12 8v4M12 16h.01" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </svg>
  );
}
