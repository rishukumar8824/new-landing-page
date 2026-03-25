function createUserCenterService({ store, config } = {}) {
  return {
    async getUser() { return null; },
    async updateUser() { return null; },
    async getStats() { return {}; }
  };
}
module.exports = { createUserCenterService };
