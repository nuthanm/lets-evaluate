/**
 * Canonical technology alias groups. Names within a group are treated as
 * equivalent during resume ↔ tech-stack matching (e.g. EFCore ↔ Entity Framework).
 */
export const TECH_ALIAS_GROUPS: readonly string[][] = [
  ["EFCore", "Entity Framework Core", "Entity Framework", "EF", "EF6"],
  ["JavaScript", "JS", "ECMAScript"],
  ["TypeScript", "TS"],
  ["Node.js", "NodeJS", "Node"],
  ["React", "ReactJS", "React.js"],
  ["Vue", "Vue.js", "VueJS"],
  ["Angular", "AngularJS"],
  ["PostgreSQL", "Postgres", "PSQL"],
  ["MongoDB", "Mongo"],
  ["Kubernetes", "K8s"],
  ["Amazon Web Services", "AWS"],
  ["Microsoft Azure", "Azure"],
  ["Google Cloud Platform", "GCP", "Google Cloud"],
  ["C#", "CSharp", "C Sharp"],
  [".NET", "DotNet", "dotnet", ".NET Core", ".NET 6", ".NET 8"],
  ["ASP.NET", "ASP.NET Core", "AspNet", "AspNet Core"],
  ["REST API", "REST", "RESTful"],
  ["GraphQL", "GQL"],
  ["Docker", "Containerization"],
  ["Redis", "Elasticache"],
  ["Kafka", "Apache Kafka"],
  ["Spring Boot", "SpringBoot"],
  ["Hibernate", "JPA"],
  ["SQL Server", "MSSQL", "MS SQL"],
  ["MySQL", "MariaDB"],
  ["Git", "GitHub", "GitLab", "Bitbucket"],
  ["CI/CD", "CICD", "Continuous Integration"],
  ["Terraform", "IaC", "Infrastructure as Code"],
  ["Ansible", "Configuration Management"],
  ["JUnit", "Junit5"],
  ["PyTest", "pytest"],
  ["Jest", "Vitest"],
  ["Selenium", "WebDriver"],
  ["Power BI", "PowerBI"],
  ["Figma", "Sketch"],
  ["Jira", "Confluence"],
  ["Agile", "Scrum", "Kanban"],
  ["Microservices", "Micro-services"],
  ["Machine Learning", "ML"],
  ["Artificial Intelligence", "AI"],
  ["Large Language Models", "LLM", "LLMs"],
  ["OpenAI", "GPT", "ChatGPT"],
];

/** Strip punctuation/spacing so "Entity Framework" and "entityframework" align. */
export function normalizeTechName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s._\-/\\]+/g, "");
}

/** True when two labels refer to the same technology (exact or alias group). */
export function techNamesEquivalent(a: string, b: string): boolean {
  const na = normalizeTechName(a);
  const nb = normalizeTechName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  for (const group of TECH_ALIAS_GROUPS) {
    const members = group.map(normalizeTechName);
    if (members.includes(na) && members.includes(nb)) return true;
  }

  // Substring fallback for compound names (e.g. "entityframeworkcore" ⊃ "efcore")
  if (na.length >= 3 && nb.includes(na)) return true;
  if (nb.length >= 3 && na.includes(nb)) return true;

  return false;
}

/** All search variants for a required stack entry (canonical + aliases). */
export function expandTechAliases(requiredTech: string): string[] {
  const normalized = normalizeTechName(requiredTech);
  const variants = new Set<string>([requiredTech.trim()]);
  for (const group of TECH_ALIAS_GROUPS) {
    const members = group.map(normalizeTechName);
    if (members.includes(normalized)) {
      for (const member of group) variants.add(member);
    }
  }
  return [...variants];
}

/** Whether free text (employment description, skill line) mentions a technology. */
export function textMentionsTech(text: string, tech: string): boolean {
  const haystack = text.trim();
  if (!haystack) return false;

  for (const variant of expandTechAliases(tech)) {
    if (techNamesEquivalent(haystack, variant)) return true;
  }

  const normalizedHay = normalizeTechName(haystack);
  for (const variant of expandTechAliases(tech)) {
    const needle = normalizeTechName(variant);
    if (needle.length >= 2 && normalizedHay.includes(needle)) return true;
  }

  return false;
}
