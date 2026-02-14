import BackroomsGame from "@/components/game/BackroomsGame";
import { createSessionSeed } from "@/lib/world/seed";

export const dynamic = "force-dynamic";

export default function PlayPage() {
  return <BackroomsGame initialSeed={createSessionSeed()} />;
}
