import { servicePoints } from "@/lib/service-points";
import ServicePointsLive from "./service-points-live";

export default async function ServicePointsCard({ userId }: { userId: string }) {
  return <ServicePointsLive initial={await servicePoints(userId)} />;
}
