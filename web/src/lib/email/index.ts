export type { MailVars, RenderedMail } from "./placeholders";
export { MAIL_PLACEHOLDERS, DEFAULT_MAIL_TEMPLATES, MAIL_SLUG_FOR_DECISION } from "./defaults";
export type { MailTemplateSlug } from "./defaults";
export { renderTemplateText, buildMailto } from "./placeholders";
export {
  ensureMailTemplates,
  getOrgMailTemplates,
  getMailTemplateBySlug,
  prepareMail,
  prepareMails,
  buildIcsEvent,
} from "./prepare";
