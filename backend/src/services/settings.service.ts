import { PrismaClient, UserSettings, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export interface StructuredSettings {
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  defaultDashboardView?: string | null;
  preferredChartType?: string | null;
  defaultDateRange?: number;
}

export interface CustomSettings {
  [key: string]: any;
}

/**
 * Get user settings, create default if doesn't exist
 */
export async function getUserSettings(userId: string): Promise<UserSettings> {
  let settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  // Auto-create default settings if they don't exist
  if (!settings) {
    settings = await createDefaultSettings(userId);
  }

  return settings;
}

/**
 * Create default settings for a new user
 */
export async function createDefaultSettings(
  userId: string
): Promise<UserSettings> {
  return await prisma.userSettings.create({
    data: {
      userId,
      emailNotifications: true,
      smsNotifications: false,
      defaultDateRange: 30,
      customSettings: Prisma.JsonNull,
    },
  });
}

/**
 * Update structured settings (partial update)
 */
export async function updateStructuredSettings(
  userId: string,
  updates: StructuredSettings
): Promise<UserSettings> {
  // Ensure settings exist
  await getUserSettings(userId);

  return await prisma.userSettings.update({
    where: { userId },
    data: updates,
  });
}

/**
 * Update custom settings with deep merge
 */
export async function updateCustomSettings(
  userId: string,
  updates: CustomSettings
): Promise<UserSettings> {
  const currentSettings = await getUserSettings(userId);

  // Deep merge custom settings
  const currentCustom =
    (currentSettings.customSettings as CustomSettings) || {};
  const merged = deepMerge(currentCustom, updates);

  return await prisma.userSettings.update({
    where: { userId },
    data: {
      customSettings: merged as Prisma.InputJsonValue,
    },
  });
}

/**
 * Set custom settings (replace entire JSON)
 */
export async function setCustomSettings(
  userId: string,
  settings: CustomSettings
): Promise<UserSettings> {
  await getUserSettings(userId);

  return await prisma.userSettings.update({
    where: { userId },
    data: {
      customSettings: settings as Prisma.InputJsonValue,
    },
  });
}

/**
 * Reset user settings to defaults
 */
export async function resetToDefaults(userId: string): Promise<UserSettings> {
  return await prisma.userSettings.upsert({
    where: { userId },
    update: {
      emailNotifications: true,
      smsNotifications: false,
      defaultDashboardView: null,
      preferredChartType: null,
      defaultDateRange: 30,
      customSettings: Prisma.JsonNull,
    },
    create: {
      userId,
      emailNotifications: true,
      smsNotifications: false,
      defaultDateRange: 30,
      customSettings: Prisma.JsonNull,
    },
  });
}

/**
 * Delete custom setting key
 */
export async function deleteCustomSettingKey(
  userId: string,
  key: string
): Promise<UserSettings> {
  const currentSettings = await getUserSettings(userId);
  const currentCustom =
    (currentSettings.customSettings as CustomSettings) || {};

  delete currentCustom[key];

  return await prisma.userSettings.update({
    where: { userId },
    data: {
      customSettings: currentCustom as Prisma.InputJsonValue,
    },
  });
}

/**
 * Deep merge two objects
 */
function deepMerge(target: any, source: any): any {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });
  }

  return output;
}

/**
 * Check if value is a plain object
 */
function isObject(item: any): boolean {
  return item && typeof item === "object" && !Array.isArray(item);
}
