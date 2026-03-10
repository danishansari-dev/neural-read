/**
 * Configuration variables for the NeuralRead extension.
 * Uses a plain global object (not ES modules) so it can be loaded
 * via importScripts() in service workers and <script> in popup.
 */
const CONFIG = {
  BACKEND_URL: 'https://neural-read-api.onrender.com',
  DASHBOARD_URL: 'https://neural-read-dashboard-git-main-danishs-projects-25aab0a7.vercel.app',
  ENABLED_KEY: 'nr_enabled',
  TOKEN_KEY: 'nr_token',
  MAX_HIGHLIGHTS: 3
};
