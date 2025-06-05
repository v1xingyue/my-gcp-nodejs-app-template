"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const dbClient = new client_1.PrismaClient();
// Mock database client implementation
const createDbClient = () => ({
    users: {
        findMany: async () => users,
        findById: async (id) => users.find((user) => user.id === id) || null,
        create: async (data) => {
            const newUser = {
                id: String(users.length + 1),
                ...data,
            };
            users.push(newUser);
            return newUser;
        },
    },
});
// Mock user authentication function
const authenticateUser = async (token) => {
    if (!token)
        return null;
    // Mock user verification - in real app, verify JWT token
    if (token === "valid-token") {
        return {
            id: "1",
            email: "john@example.com",
            role: "user",
        };
    }
    if (token === "admin-token") {
        return {
            id: "admin",
            email: "admin@example.com",
            role: "admin",
        };
    }
    return null;
};
// GraphQL type definitions
const typeDefs = `#graphql
  type Query {
    hello: String
    users: [User!]!
  }

  type User {
    id: ID!
    name: String!
    email: String!
  }

  type Mutation {
    createUser(name: String!, email: String!): User!
  }
`;
// Sample data
const users = [
    { id: "1", name: "John Doe", email: "john@example.com" },
    { id: "2", name: "Jane Smith", email: "jane@example.com" },
];
// GraphQL resolvers
const resolvers = {
    Query: {
        hello: (_, __, context) => {
            const greeting = context.user
                ? `Hello ${context.user.email}! You are logged in as ${context.user.role}.`
                : "Hello World from Apollo GraphQL!";
            return greeting;
        },
        users: async (_, __, context) => {
            // Use database client from context
            return await context.db.users.findMany();
        },
    },
    Mutation: {
        createUser: async (_, { name, email }, context) => {
            // Check if user is authenticated (optional - depending on your requirements)
            if (!context.user) {
                throw new Error("Authentication required to create users");
            }
            // Use database client from context
            return await context.db.users.create({ name, email });
        },
    },
};
const server = async () => {
    // Create Express app
    const app = (0, express_1.default)();
    // Create Apollo Server with Context type
    const apolloServer = new server_1.ApolloServer({
        typeDefs,
        resolvers,
    });
    // Start Apollo Server
    await apolloServer.start();
    // Apply Apollo GraphQL middleware to Express
    app.use("/graphql", (0, cors_1.default)(), express_1.default.json(), (0, express4_1.expressMiddleware)(apolloServer, {
        context: async ({ req }) => {
            const token = req.headers.authorization?.replace("Bearer ", "") ||
                req.headers.token;
            const user = await authenticateUser(token);
            const db = createDbClient();
            return {
                db,
                user: user || undefined,
                token,
            };
        },
    }));
    // Health check endpoint
    app.get("/health", (req, res) => {
        res.json({ status: "OK", message: "Server is running!" });
    });
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
        console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
        console.log(`📊 GraphQL Playground available at http://localhost:${PORT}/graphql`);
        console.log(`❤️  Health check available at http://localhost:${PORT}/health`);
    });
};
server().catch((error) => {
    console.error("Error starting server:", error);
});
