declare module 'rimraf-promise' {
  function rimraf(dir: string): Promise<any>;
  namespace rimraf{}
  export = rimraf;
}