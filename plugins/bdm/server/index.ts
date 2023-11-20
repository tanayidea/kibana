import { PluginInitializerContext } from '../../../src/core/server';
import { BdmPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new BdmPlugin(initializerContext);
}

export type { BdmPluginSetup, BdmPluginStart } from './types';
