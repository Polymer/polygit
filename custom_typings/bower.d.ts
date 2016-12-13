declare module "bower" {

  import * as events from 'events';

  namespace bower {

    interface LookupResponse {
      name: string;
      url: string;
    }

    interface BowerCommands {
      lookup: (package: string) => events.EventEmitter;
    }
  }

  class bower {
    static commands: bower.BowerCommands;
  }
  export = bower;
}