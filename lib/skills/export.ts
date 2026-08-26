import type { SkillRow } from "@/app/actions/skills-actions";

export function exportToSkillsMd(skill: SkillRow): string {
  const lines: string[] = [];
  lines.push(`# ${skill.name}`);
  lines.push("");
  if (skill.description) {
    lines.push(skill.description);
    lines.push("");
  }
  if (skill.trigger_text) {
    lines.push("## Trigger");
    lines.push(skill.trigger_text);
    lines.push("");
  }
  lines.push("## Implementation");
  lines.push("```");
  lines.push(skill.implementation);
  lines.push("```");
  lines.push("");
  if (skill.parameters && skill.parameters.length > 0) {
    lines.push("## Parameters");
    lines.push("| Name | Type | Required | Description |");
    lines.push("|------|------|----------|-------------|");
    for (const p of skill.parameters) {
      lines.push(`| ${p.name} | ${p.type} | ${p.required ? "yes" : "no"} | ${p.description} |`);
    }
    lines.push("");
  }
  if (skill.example_usage) {
    lines.push("## Example Usage");
    lines.push("```");
    lines.push(skill.example_usage);
    lines.push("```");
    lines.push("");
  }
  if (skill.tags && skill.tags.length > 0) {
    lines.push("## Tags");
    lines.push(skill.tags.join(", "));
    lines.push("");
  }
  return lines.join("\n");
}
