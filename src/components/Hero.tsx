import { getSessionUser } from "@/lib/auth/session";
import AnimatedHero from "@/components/AnimatedHero";

export default async function Hero() {
  const user = await getSessionUser();
  // Logged in → straight to the create form. Logged out → sign up, then create.
  const createHref = user
    ? "/dashboard/events/new"
    : "/auth/signup?next=/dashboard/events/new";

  return <AnimatedHero createHref={createHref} />;
}
