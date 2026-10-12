import { SKILL_LABELS } from '../lib/engagement/skills';
export const Row = ({ skill }) => <li>{SKILL_LABELS[skill.key] ?? skill.key}</li>;
