import { auth } from "./auth.js";
import { fromNodeHeaders } from "better-auth/node";

interface User {
  [key: string]: any;
}

interface Session {
  user?: User | null;
}

interface RequestWithHeaders {
  headers: Record<string, string | string[] | undefined>;
  user?: User;
}

interface ResponseLike {
  status: (code: number) => {
    json: (body: any) => ResponseLike;
  };
  json?: (body: any) => ResponseLike;
}

type NextFunction = (err?: any) => void;

export const requireAuth = async (
  req: RequestWithHeaders,
  res: ResponseLike,
  next: NextFunction
): Promise<void | ResponseLike> => {
  try {
    console.log("🔐 [requireAuth] Starting authentication check");
    console.log("🔐 [requireAuth] Request URL:", (req as any).url);
    console.log("🔐 [requireAuth] Request headers:", JSON.stringify(req.headers, null, 2));
    
    // ✅ 1. Verify session
    const session = (await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    })) as Session | null;

    console.log("🔐 [requireAuth] Session result:", session ? "Session found" : "NO SESSION");
    console.log("🔐 [requireAuth] Session user:", session?.user ? `User ID: ${session.user.id}` : "NO USER");

    if (!session || !session.user) {
      console.log("❌ [requireAuth] Authentication FAILED - No session or user");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = session.user;
    req.user = user;

    console.log("✅ [requireAuth] Authentication SUCCESS - User:", user.id, "Email:", user.email, "Role:", user.role);
    next();
  } catch (err) {
    console.error("❌ [requireAuth] Auth middleware error:", err);
    return res.status(401).json({ error: "Invalid session" });
  }
};
