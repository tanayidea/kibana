import { NavigationPublicPluginStart } from '../../../src/plugins/navigation/public';

export interface BdmPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BdmPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}
