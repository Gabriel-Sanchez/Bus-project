// Configuración global de la aplicación
const API_CONFIG = {
  BASE_URL: 'https://5fb7hk72-9000.use2.devtunnels.ms',
  ENDPOINTS: {
    LOGIN: '/api/users/login/',
    UPDATE_ATTENDANCE: '/api/users/update-attendance/',
    UPDATE_ROUTE_STATUS: '/api/users/update-route-status/',
    DATA: '/api/users/data/',
    PARENT_DATA: '/api/users/data/', // Nuevo endpoint para padres
    ROUTE_LOCATION: '/api/users/routes', // Se usa con /${routeId}/location/
  }
};

// Función helper para construir URLs completas
const buildApiUrl = (endpoint, params = {}) => {
  let url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  // Para rutas que necesitan parámetros dinámicos
  Object.keys(params).forEach(key => {
    url = url.replace(`{${key}}`, params[key]);
  });
  
  return url;
};

// URLs completas para facilitar el uso
const API_URLS = {
  LOGIN: buildApiUrl(API_CONFIG.ENDPOINTS.LOGIN),
  UPDATE_ATTENDANCE: buildApiUrl(API_CONFIG.ENDPOINTS.UPDATE_ATTENDANCE),
  UPDATE_ROUTE_STATUS: buildApiUrl(API_CONFIG.ENDPOINTS.UPDATE_ROUTE_STATUS),
  DATA: buildApiUrl(API_CONFIG.ENDPOINTS.DATA),
  PARENT_DATA: buildApiUrl(API_CONFIG.ENDPOINTS.PARENT_DATA), // Nueva URL para padres
  ROUTE_LOCATION: (routeId) => `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ROUTE_LOCATION}/${routeId}/location/`,
};

module.exports = {
  API_CONFIG,
  buildApiUrl,
  API_URLS
}; 