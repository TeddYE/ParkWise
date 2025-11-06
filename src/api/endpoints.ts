export const API_ENDPOINTS = {
  CARPARK_INFO: import.meta.env.VITE_CARPARK_INFO_API || "https://dfxiu6qgx4.execute-api.ap-southeast-1.amazonaws.com/Test2",
  CARPARK_AVAILABILITY: import.meta.env.VITE_CARPARK_AVAILABILITY_API || "https://sy335w2e42.execute-api.ap-southeast-1.amazonaws.com/ava",
  LOGIN: import.meta.env.VITE_AUTH_API + "/login" || "https://mb036g8g79.execute-api.ap-southeast-1.amazonaws.com/dev/login",
  SIGNUP: import.meta.env.VITE_AUTH_API + "/signup" || "https://mb036g8g79.execute-api.ap-southeast-1.amazonaws.com/dev/signup",
  SUBSCRIBE: import.meta.env.VITE_AUTH_API + "/update" || "https://mb036g8g79.execute-api.ap-southeast-1.amazonaws.com/dev/update",
  UPDATE_FAVORITES: import.meta.env.VITE_AUTH_API + "/update" || "https://mb036g8g79.execute-api.ap-southeast-1.amazonaws.com/dev/update",
  PREDICTIONS: import.meta.env.VITE_PREDICTION_API || "https://crt83d7q2g.execute-api.ap-southeast-1.amazonaws.com/default/availability_predictor"
} as const;