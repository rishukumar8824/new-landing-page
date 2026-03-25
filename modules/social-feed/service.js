function createSocialFeedService({ store, config } = {}) {
  return {
    async getPosts() { return []; },
    async createPost() { return null; },
    async getPost() { return null; },
    async deletePost() { return null; },
    async likePost() { return null; },
    async getComments() { return []; },
    async createComment() { return null; }
  };
}
module.exports = { createSocialFeedService };
