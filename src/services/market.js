import api from "./api";

export const marketService = {
  getMarkets: () => api.get("/markets").then((r) => r.data),
  getMarketById: (id) => api.get(`/markets/${id}`).then((r) => r.data),
  joinMarket: (id) => api.post(`/markets/${id}/join`).then((r) => r.data),
  leaveMarket: (membershipId) =>
    api.delete(`/markets/${membershipId}/leave`).then((r) => r.data),
  getMyMarkets: () => api.get("/markets/my-markets").then((r) => r.data),
  getNearbyMarkets: (lat, lng, radius = 50) =>
    api
      .get("/markets/nearby", { params: { lat, lng, radius } })
      .then((r) => r.data),
};