import * as GitHubApi from 'github';

export async function getAllTags(api: GitHubApi, org: string, repo: string): Promise<GitHubApi.GetTagsResponse> {
      let tagResponse =
          await api.gitdata.getTags({owner: org, repo: repo});
      let allTags = tagResponse.slice();
      while (api.hasNextPage(tagResponse)) {
        tagResponse = await api.getNextPage(tagResponse);
        allTags = allTags.concat(tagResponse);
      }
      return tagResponse;
}