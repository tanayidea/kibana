import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../src/core/server';

import { BdmPluginSetup, BdmPluginStart } from './types';
import { defineRoutes } from './routes';

export class BdmPlugin implements Plugin<BdmPluginSetup, BdmPluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('bdm: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('bdm: Started');
    return {};
  }

  public stop() {}
}
