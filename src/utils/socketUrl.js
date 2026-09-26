export function getSocketUrl() {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  if (envUrl) return envUrl;
  if (window.location.hostname === 'localhost') return 'http://localhost:5000';
  return 'https://smartdine-1-gpjd.onrender.com';
}