import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import { DEMO_CREDENTIALS } from "@/lib/constants";
import { env } from "@/lib/env";
import { getUserByEmail } from "@/lib/services/catalog";

async function matchesPassword(storedPassword: string, inputPassword: string) {
  if (storedPassword.startsWith("$2")) {
    return compare(inputPassword, storedPassword);
  }

  if (storedPassword === inputPassword) {
    return true;
  }

  const demoPasswords = Object.values(DEMO_CREDENTIALS).map(
    (credential) => credential.password,
  );

  if (demoPasswords.includes(storedPassword)) {
    const hashed = await hash(storedPassword, 10);
    return compare(inputPassword, hashed);
  }

  return false;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  secret: env.authSecret,
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const user = await getUserByEmail(credentials.email);

        if (!user) {
          return null;
        }

        const validPassword = await matchesPassword(
          user.password,
          credentials.password,
        );

        if (!validPassword) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          farmerId: user.farmerId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.farmerId = user.farmerId;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role as "buyer" | "farmer" | "admin";
        session.user.farmerId = token.farmerId as string | undefined;
      }

      return session;
    },
  },
};
