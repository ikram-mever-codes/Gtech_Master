export const cookieOptions: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "none" | "lax" | "strict";
    maxAge: number;
} = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
    maxAge: 24 * 60 * 60 * 1000,
};

