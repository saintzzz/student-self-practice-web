import { skillLabel } from '../lib/engagement/skills';
export const Row = ({ skill }) => <li>{skillLabel(skill.key)}</li>;
