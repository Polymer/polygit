declare module 'github' {

  namespace GitHubApi {
    interface GithubApiOptions {
      debug?: boolean;
      protocol?: 'https' | 'ssh';
      host?: string; // should be api.github.com for GitHub
      headers: any;
    }

    interface GetTagsOptions {
      owner: string;
      repo: string;
      per_page?: number;
      page_number?: number;
    }

    type GetTagsEntry = {ref: string, object: {sha: string}};

    type GetTagsResponse = GetTagsEntry[];

    interface GitData {
      getTags(opts: GetTagsOptions): GetTagsResponse;
    }

    interface GetBranchesOptions {
      owner: string;
      repo: string;
      per_page?: number;
      page_number?: number;
    }

    type BranchResponseEntry = {name: string, commit: {sha: string}};

    type GetBranchesResponse = BranchResponseEntry[];

    type GetBranchResponse = BranchResponseEntry;

    interface GetBranchOptions {
      owner: string;
      repo: string;
      branch: string;
      per_page?: number;
      page_number?: number;
    }

    interface Repos {
      getBranches(opts: GetBranchesOptions): GetBranchesResponse;
      getBranch(opts: GetBranchOptions): GetBranchResponse;
    }
  }

  class GitHubApi {
    constructor(opts: GitHubApi.GithubApiOptions)
    gitdata: GitHubApi.GitData;
    repos: GitHubApi.Repos;
    hasNextPage(response: any): boolean;
    getNextPage<T>(response: T): T;
    authenticate(opts: {type: string, token: string}): void;
  }
  export = GitHubApi;
}