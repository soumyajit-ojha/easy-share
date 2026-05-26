import axios from "axios";

// We use the local IP for testing on WiFi later
const API_BASE_URL = `http://${window.location.hostname}:8000/api/v1`;

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export default client;
