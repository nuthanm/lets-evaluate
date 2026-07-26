import { CodingClient } from "./CodingClient";

type Props = { params: Promise<{ token: string }> };

export default async function CodingPage({ params }: Props) {
  const { token } = await params;
  return <CodingClient token={token} />;
}
