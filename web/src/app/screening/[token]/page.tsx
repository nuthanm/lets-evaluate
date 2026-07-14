import { ScreeningClient } from "./ScreeningClient";

type Props = { params: Promise<{ token: string }> };

export default async function ScreeningPage({ params }: Props) {
  const { token } = await params;
  return <ScreeningClient token={token} />;
}
