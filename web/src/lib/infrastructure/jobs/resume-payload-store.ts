type ResumePayload = { resumeBuffer?: Buffer; resumeFilename?: string };

const resumePayloads = new Map<string, ResumePayload>();

export function stashResumePayload(itemId: string, payload: ResumePayload) {
  resumePayloads.set(itemId, payload);
}

export function takeResumePayload(itemId: string): ResumePayload {
  const p = resumePayloads.get(itemId) ?? {};
  resumePayloads.delete(itemId);
  return p;
}
