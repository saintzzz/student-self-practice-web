import { SKILL_LABELS } from '../lib/engagement/skills';
import { requestParentVerify } from '../lib/parentContact';
export const Row = ({ skill }) => <li>{SKILL_LABELS[skill.key] ?? skill.key}</li>;
export async function resend() {
  const result = await requestParentVerify();
  if (result === 'already') return true;
  return false;
}
