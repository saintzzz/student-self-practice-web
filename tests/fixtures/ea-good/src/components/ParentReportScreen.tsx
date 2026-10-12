import { skillLabel } from '../lib/engagement/skills';
import { requestParentVerify } from '../lib/parentContact';
export const Row = ({ skill }) => <li>{skillLabel(skill.key)}</li>;
export async function resend(setVerifyState: (s: string) => void) {
  const result = await requestParentVerify();
  setVerifyState(result); // sent | already | throttled | failed
  return result === 'throttled' ? 'wait' : result;
}
