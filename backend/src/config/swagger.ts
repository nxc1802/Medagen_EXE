export const swaggerOptions = {
  swagger: {
    info: {
      title: 'Medagen V2 Backend API',
      description: 'API documentation for Medagen Triage System',
      version: '2.0.0'
    },
    host: 'localhost:3000',
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json']
  }
};

export const swaggerUiOptions = {
  routePrefix: '/docs',
  exposeRoute: true
};
