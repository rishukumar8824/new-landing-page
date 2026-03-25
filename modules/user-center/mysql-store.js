function createUserCenterStore() {
  return {
    async initialize() { return true; },
    async getUser() { return null; },
    async updateUser() { return null; }
  };
}
module.exports = { createUserCenterStore };
