import { redirect } from "next/navigation";
import { requireSession } from "~/src/ctx";
import { getUserPersonas } from "~/src/personas";

interface Props {
  params: Promise<{ org: string }>;
}

export const dynamic = "force-dynamic";

/**
 * Role-defaulted landing. Phase 1 only ships the trainer surface, so
 * coaches go to /today; officers (and anyone else) fall through to
 * /profile until the admin surface lands in Phase 2.
 */
export default async function OrgLanding({ params }: Props) {
  const { org } = await params;
  const session = await requireSession(org);
  const personas = await getUserPersonas(session.userId, session.orgId);

  if (personas.isCoach) redirect(`/${org}/today`);
  redirect(`/${org}/profile`);
}
