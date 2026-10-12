// r14 bad: imports a module that was deleted - the tool crashes on run.
import { IOE_BANK } from '../src/data/ioeRealBank';
export function exportAll() {
  return IOE_BANK;
}
