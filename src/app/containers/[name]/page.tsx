export default function ContainerPage({
  params,
}: {
  params: { name: string };
}) {
  return <p>Container {params.name} — coming in §3</p>;
}
