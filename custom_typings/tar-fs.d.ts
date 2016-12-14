

declare module 'tar-fs' {

  import * as stream from 'stream';

  export function extract(dest: string, opts?:{
    map?: any
  }): stream.Writable
}