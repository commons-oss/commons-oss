import { describe, expect, it } from "vitest";
import { defineModule } from "../src/define.ts";
import { buildRegistry } from "../src/registry.ts";

const okModule = () => ({
  id: "attendance",
  name: { de: "Anwesenheit", en: "Attendance" },
  version: "0.1.0",
  perms: ["attendance.read", "attendance.record"] as const,
  api: { routes: {} },
  messages: { de: { nav: "Anwesenheit" }, en: { nav: "Attendance" } },
  routes: [{ path: "", scope: "team", perms: ["attendance.read"] } as const],
  nav: [
    {
      id: "attendance",
      label: { de: "Anwesenheit", en: "Attendance" },
      href: ({ orgSlug, teamId }: { orgSlug: string; teamId?: string }) =>
        `/${orgSlug}/${teamId ?? ""}/attendance`,
    },
  ],
});

describe("defineModule", () => {
  it("accepts a valid module", () => {
    const m = defineModule(okModule());
    expect(m.id).toBe("attendance");
  });

  it("rejects perms missing the module-id prefix", () => {
    expect(() =>
      defineModule({
        ...okModule(),
        perms: ["attendance.read", "wrong.record"] as const,
      }),
    ).toThrow(/perms\[1\]:.*must start with 'attendance\.'/);
  });

  it("rejects non-kebab-case actions", () => {
    expect(() =>
      defineModule({
        ...okModule(),
        perms: ["attendance.read", "attendance.RECORD"] as const,
      }),
    ).toThrow(/perms\[1\]:.*kebab-case/);
  });

  it("rejects team-scoped routes without :teamId", () => {
    expect(() =>
      defineModule({
        ...okModule(),
        routes: [{ path: "sessions/:id", scope: "team" as const }],
      }),
    ).toThrow(/scope='team' but path 'sessions\/:id' has no ':teamId'/);
  });

  it("rejects route perms not declared in module perms[]", () => {
    expect(() =>
      defineModule({
        ...okModule(),
        routes: [{ path: "", scope: "team" as const, perms: ["attendance.write"] }],
      }),
    ).toThrow(/routes\[0\]\.perms\[0\]:.*not declared/);
  });

  it("rejects bad semver", () => {
    expect(() => defineModule({ ...okModule(), version: "v1" })).toThrow(/version: must be semver/);
  });

  it("rejects bad module id", () => {
    expect(() => defineModule({ ...okModule(), id: "Bad-ID" })).toThrow(/id:.*kebab-case/);
  });
});

describe("buildRegistry", () => {
  it("builds from one module", () => {
    const m = defineModule(okModule());
    const r = buildRegistry([m]);
    expect(r.byId.get("attendance")).toBe(m);
    expect(r.allPerms.has("attendance.read")).toBe(true);
  });

  it("rejects duplicate module ids", () => {
    const m = defineModule(okModule());
    expect(() => buildRegistry([m, m])).toThrow(/duplicate module id/);
  });

  it("rejects duplicate nav ids across modules", () => {
    const a = defineModule(okModule());
    const b = defineModule({
      ...okModule(),
      id: "invoicing",
      perms: ["invoicing.read"] as const,
      routes: [{ path: "", scope: "team" as const, perms: ["invoicing.read"] }],
    });
    // Force the nav id collision: b's nav still has id: 'attendance'.
    expect(() => buildRegistry([a, b])).toThrow(/nav id 'attendance' declared by both/);
  });
});
