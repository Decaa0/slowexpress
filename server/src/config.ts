export const config = {
  jwtSecret: () => process.env.JWT_SECRET || (() => { throw new Error("JWT_SECRET is not set"); })(),
  sessionHours: 8,
};
