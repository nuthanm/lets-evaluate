import { appBaseUrl } from "@/lib/email/vars";

export function screeningLinkUrl(token: string): string {
  return `${appBaseUrl()}/screening/${token}`;
}
