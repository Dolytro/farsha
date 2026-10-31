import { migrateLegacyLocalStorage } from "./legacy";

// imported first, so the carried-over settings are in place before the store and theme read them
migrateLegacyLocalStorage();
