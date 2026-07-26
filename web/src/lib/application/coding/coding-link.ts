import { appBaseUrl } from "@/lib/email/vars";

export function codingLinkUrl(token: string): string {
  return `${appBaseUrl()}/coding/${token}`;
}
