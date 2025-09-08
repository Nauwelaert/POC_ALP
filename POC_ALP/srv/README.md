# SAP Data Sphere Service

A TypeScript-based service that acts as a middleware/proxy for SAP Data Sphere, enabling secure and efficient data access through OData v4 protocol.

## Core Architecture

- Built with Express.js and TypeScript
- Implements OData v4 protocol standards
- Uses SAP Cloud SDK for SAP BTP integration
- Follows clean architecture patterns (controllers, services, routes, types)

## Main Features

### Data Retrieval
- Proxies requests to SAP Data Sphere models
- Supports dynamic path handling for flexible model access

### Batch Processing
- Supports OData batch operations
- Implements pagination support
- Handles multipart responses

### Security & Integration
- Authentication using SAP XSUAA
- Leverages SAP BTP destination service
- JWT-based authentication flow

### Technical Features
- Error handling with proper HTTP status codes
- Structured logging
- Configuration management using @sap/xsenv
- Type-safe implementation with TypeScript interfaces

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Root endpoint with usage instructions |
| `/*` | GET | Dynamic path handling for Data Sphere model access |
| `/*$batch` | POST | OData batch request processing |

## Configuration

The service uses various configuration parameters:

### Server Settings
- Port configuration (default: 3002)
- Timeout settings (default: 3 minutes)

### Integration Settings
- XSUAA configuration
- Data Sphere destination settings
- Batch processing parameters

## Error Handling

The service implements comprehensive error handling:

- Global error handler for uncaught exceptions
- Type-specific error handling with status codes
- Proper error logging and client responses
- Different error message handling for production/development environments

## Deployment

This service is designed to be deployed on SAP Business Technology Platform (BTP) and serves as a secure gateway to SAP Data Sphere, enabling applications to access and manipulate data while handling authentication, authorization, and data transformation.

## Development

### Prerequisites
- Node.js
- TypeScript
- SAP BTP account with Data Sphere access

### Installation
```bash
npm install
```

### Running the Service
```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

### Environment Setup
The service requires proper configuration of:
- VCAP_SERVICES for cloud deployment
- Local environment variables for development
- SAP BTP destination configuration
