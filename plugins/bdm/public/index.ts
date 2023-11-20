import './index.scss';

import { BdmPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  console.log("return plugin");
  
  
  return new BdmPlugin();
}
export type { BdmPluginSetup, BdmPluginStart } from './types';
