declare module 'request-promise-native' {

  import * as originalRequest from 'request';

  namespace request {

  }
  function request(url: string, opts?: originalRequest.CoreOptions): Promise<string>;
  export = request;
}