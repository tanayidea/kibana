import { CoreSetup, CoreStart, Plugin } from '../../../src/core/public';
import { BdmPluginSetup, BdmPluginStart } from './types';
import { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import { io } from 'socket.io-client';

interface BdmSetupDeps {
  data: DataPublicPluginSetup;
}

interface BdmStartDeps {
  data: DataPublicPluginStart;
}

enum Flag {
  NULL = 0,
  YES = 1,
  NO = 2
}

export class BdmPlugin implements Plugin<BdmPluginSetup, BdmPluginStart, BdmSetupDeps, BdmStartDeps> {
  
  // make this enum of three types
  private isTimeFilterChangeSendable: Flag;
  private isSearchFilterChangeSendable: Flag;

  constructor() {
    this.isTimeFilterChangeSendable = Flag.NULL;
    this.isSearchFilterChangeSendable = Flag.NULL;
  }
  
  public setup(core: CoreSetup<BdmStartDeps>, { data }: BdmSetupDeps): BdmPluginSetup {
    console.log("in bdm setup");
    return {};
  }

  public start(core: CoreStart, { data }: BdmStartDeps): BdmPluginStart {

    const urlSearchParams = new URLSearchParams(window.location.href);
    const userId = urlSearchParams.get('userId');
    const socket = io('/');
    console.log("KBI :: socket object ", socket);
    
    if (socket) {
      socket.on('connect', () => {
        console.log("KBI :: connected to bdm socket server");
        socket.emit('register_for_bdm_updates', userId);
      });
      socket.on('filter_change_socketserver2kibana_event', (newUrl) => {
        console.log("KBI :: filter_change_socketserver2kibana_event ", newUrl);
        this.isTimeFilterChangeSendable = Flag.NO;
        this.isSearchFilterChangeSendable = Flag.NO;
        window.location.href = newUrl;
      });
      const setupDashboardFilterChangeListener = () => {
        data.query.timefilter.timefilter.getTimeUpdate$().subscribe({
          next: () => {
            console.log("KBI :: time filter flag state ", this.isTimeFilterChangeSendable);            
            if (this.isTimeFilterChangeSendable === Flag.YES || this.isTimeFilterChangeSendable === Flag.NULL) {
              console.log("KBI :: time filter change is sendable for this update");
              const timeRange = data.query.timefilter.timefilter.getTime();
              console.log("KBI :: time filter changed:", timeRange);
              console.log("KBI :: Sending time filter change to bdm socket server");
              socket.emit('time_filter_change_kibana2socketserver_event', {
                userId: userId,
                timeRange: timeRange
              });
              this.isTimeFilterChangeSendable = Flag.YES;
            } else {
              console.log("KBI :: time filter change is not sendable for this update");
              this.isTimeFilterChangeSendable = Flag.YES;
            }
          }
        });
        data.query.filterManager.getUpdates$().subscribe({
          next: () => {
            console.log("KBI :: search filter flag state ", this.isSearchFilterChangeSendable);
            if (this.isSearchFilterChangeSendable === Flag.YES || this.isSearchFilterChangeSendable === Flag.NULL) {
              console.log("KBI :: search filter change is sendable for this update");
              const filters = data.query.filterManager.getFilters();
              console.log("KBI :: search filter changed: ", filters);
              console.log("KBI :: Sending search filter change to bdm socket server");
              socket.emit('search_filter_change_kibana2socketserver_event', {
                userId: userId,
                filters: filters
              });
              this.isSearchFilterChangeSendable = Flag.YES;
            } else {
              console.log("KBI :: search filter change is not sendable for this update");
              this.isSearchFilterChangeSendable = Flag.YES;
            }
          }
        });
      };

      setupDashboardFilterChangeListener();
    } else {
      console.error("KBI :: unable to connect to socket server");
    }
    return {};
  }

  public stop() {}
}
