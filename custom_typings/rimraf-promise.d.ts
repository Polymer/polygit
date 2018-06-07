declare module 'rmfr' {
  function rimraf(dir: string): Promise<any>;
  namespace rimraf{}
  export = rimraf;
}
