import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: "buyer" | "farmer" | "admin";
      farmerId?: string;
    };
  }

  interface User {
    role: "buyer" | "farmer" | "admin";
    farmerId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "buyer" | "farmer" | "admin";
    farmerId?: string;
  }
}
