import SharedMapView from "@/components/shared/SharedMapView";

export default async function SharedMapPage({
  params,
}: {
  params: Promise<{ shareSlug: string }>;
}) {
  const { shareSlug } = await params;
  return <SharedMapView shareSlug={shareSlug} />;
}
