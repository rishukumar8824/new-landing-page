function createMySqlAuthStore() {
  return {
    async initialize() { return true; },
    async getOtp() { return null; },
    async setOtp() { return null; },
    async deleteOtp() { return null; }
  };
}
module.exports = { createMySqlAuthStore };
