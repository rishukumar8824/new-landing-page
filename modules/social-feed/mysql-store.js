function createSocialFeedStore() {
  return {
    async initialize() { return true; },
    async getPosts() { return []; },
    async createPost() { return null; },
    async getPost() { return null; },
    async deletePost() { return null; },
    async likePost() { return null; },
    async getComments() { return []; },
    async createComment() { return null; }
  };
}
module.exports = { createSocialFeedStore };
