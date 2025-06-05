import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { playgrounHTML } from "./playground";

// Context interface definition
interface Context {
  db: DatabaseClient;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  token?: string;
}

// Mock database client interface
interface DatabaseClient {
  users: {
    findMany: () => Promise<any[]>;
    findById: (id: string) => Promise<any | null>;
    create: (data: { name: string; email: string }) => Promise<any>;
  };
}

const dbClient = new PrismaClient();

// Mock database client implementation
const createDbClient = (): DatabaseClient => ({
  users: {
    findMany: async () => users,
    findById: async (id: string) =>
      users.find((user) => user.id === id) || null,
    create: async (data: { name: string; email: string }) => {
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
const authenticateUser = async (
  token?: string
): Promise<Context["user"] | null> => {
  if (!token) return null;

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
    hello: (_: any, __: any, context: Context) => {
      const greeting = context.user
        ? `Hello ${context.user.email}! You are logged in as ${context.user.role}.`
        : "Hello World from Apollo GraphQL!";
      return greeting;
    },
    users: async (_: any, __: any, context: Context) => {
      // Use database client from context
      return await context.db.users.findMany();
    },
  },
  Mutation: {
    createUser: async (
      _: any,
      { name, email }: { name: string; email: string },
      context: Context
    ) => {
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
  const app = express();

  // Create Apollo Server with Context type
  const apolloServer = new ApolloServer<Context>({
    typeDefs,
    resolvers,
  });

  // Start Apollo Server
  await apolloServer.start();

  // Apply Apollo GraphQL middleware to Express
  app.use(
    "/graphql",
    cors(),
    express.json(),
    expressMiddleware(apolloServer, {
      context: async ({ req }): Promise<Context> => {
        const token =
          req.headers.authorization?.replace("Bearer ", "") ||
          (req.headers.token as string);
        const user = await authenticateUser(token);
        const db = createDbClient();

        return {
          db,
          user: user || undefined,
          token,
        };
      },
    })
  );

  // GraphQL Playground route
  app.get("/playground", (req, res) => {
    // 检查是否允许访问 playground
    if (
      process.env.NODE_ENV === "production" &&
      !process.env.ALLOW_PLAYGROUND
    ) {
      return res.status(403).json({
        status: "error",
        message:
          "GraphQL Playground is disabled in production. Set ALLOW_PLAYGROUND=true to enable it.",
      });
    }

    // 直接返回内联的 HTML
    const html = playgrounHTML;

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  });

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({ status: "OK", message: "Server is running!" });
  });

  const PORT = process.env.PORT || 4000;

  app.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
    console.log(
      `📊 GraphQL Playground available at http://localhost:${PORT}/graphql`
    );
    console.log(
      `❤️  Health check available at http://localhost:${PORT}/health`
    );
  });
};

server().catch((error) => {
  console.error("Error starting server:", error);
});
