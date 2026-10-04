export const env = {
  appUrl: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
  authSecret: process.env.NEXTAUTH_SECRET ?? "dev-greencart-secret",
  mongodbUri: process.env.MONGODB_URI ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
  dataGovApiKey: process.env.DATA_GOV_API_KEY ?? "",
  mandiResourceId: process.env.DATA_GOV_MANDI_RESOURCE_ID ?? "",
  rainfallResourceId: process.env.DATA_GOV_RAINFALL_RESOURCE_ID ?? "",
  schemesResourceId: process.env.DATA_GOV_SCHEMES_RESOURCE_ID ?? "",
};
