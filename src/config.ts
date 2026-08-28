// Define the shape of your config object
interface Config {
  API_BASE_URL: string;
}

// Define the shape of the window environment variables (if they exist)
interface WindowEnv {
  API_BASE_URL?: string;
}

// Extend the Window interface to include your custom _env property
declare global {
  interface Window {
    _env?: WindowEnv;
  }
}

const config: Config = {
  API_BASE_URL: window?._env?.API_BASE_URL || "/api/v1",
};

export default config;
