# Apollo GraphQL Server with Express

This project implements a modern Apollo GraphQL server using Express.js.

## Features

- 🚀 Apollo Server 4 with Express
- 📊 GraphQL Playground
- 🔍 Health check endpoint
- 📝 TypeScript support
- 🔧 Hot reload with ts-node-dev
- 🔐 Context-based authentication
- 💾 Mock database client integration
- 👤 User role management

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- pnpm (or npm/yarn)

### Installation

```bash
pnpm install
```

### Running the Server

```bash
# Development mode with hot reload
pnpm run server

# Build the project
pnpm run build
```

The server will start on `http://localhost:4000`

## Endpoints

- **GraphQL Playground**: `http://localhost:4000/graphql`
- **Health Check**: `http://localhost:4000/health`

## GraphQL Schema

### Queries

```graphql
# Get a simple hello message
query {
  hello
}

# Get all users
query {
  users {
    id
    name
    email
  }
}
```

### Mutations

```graphql
# Create a new user
mutation {
  createUser(name: "John Doe", email: "john@example.com") {
    id
    name
    email
  }
}
```

## Context Object

The server includes a comprehensive context object that provides:

- **Database Client**: Mock database client for data operations
- **User Authentication**: User information extracted from JWT tokens
- **Request Context**: Access to request headers and authentication state

### Context Interface
```typescript
interface Context {
  db: DatabaseClient;      // Database client instance
  user?: {                 // Authenticated user (optional)
    id: string;
    email: string;
    role: string;
  };
  token?: string;          // Authentication token
}
```

### Authentication

The server supports token-based authentication:
- `valid-token` - Regular user authentication  
- `admin-token` - Admin user authentication

## Testing with cURL

### Query Hello (No Authentication)
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"query":"query { hello }"}' \
  http://localhost:4000/graphql
```

### Query Hello (With Authentication)
```bash
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer valid-token" \
  -d '{"query":"query { hello }"}' \
  http://localhost:4000/graphql
```

### Query Users
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"query":"query { users { id name email } }"}' \
  http://localhost:4000/graphql
```

### Create User (Requires Authentication)
```bash
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer valid-token" \
  -d '{"query":"mutation { createUser(name: \"Alice\", email: \"alice@example.com\") { id name email } }"}' \
  http://localhost:4000/graphql
```

## Project Structure

```
src/
├── server.ts          # Main server file with Apollo GraphQL setup
├── index.ts           # Entry point (if exists)
└── ...
```

## Dependencies

- `@apollo/server` - Modern Apollo Server
- `express` - Web framework
- `graphql` - GraphQL implementation
- `cors` - CORS middleware
- `typescript` - TypeScript support
- `ts-node-dev` - Development server with hot reload

## Development

The server includes:
- Sample GraphQL schema with User type
- In-memory data storage (for demo purposes)
- CORS enabled for development
- TypeScript support
- Hot reload during development
- Context object with database client and user authentication
- Token-based authentication system
- Role-based access control examples

## Next Steps

- Add database integration (e.g., Prisma, MongoDB)
- Implement authentication and authorization
- Add more complex GraphQL types and resolvers
- Set up proper error handling
- Add unit and integration tests 