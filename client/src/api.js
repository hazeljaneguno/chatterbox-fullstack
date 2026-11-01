
import { io } from "socket.io-client";

export const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.headers || {}),
      "Content-Type": "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

export const api = {
  // Account settings
  updateTheme: (theme) =>
    request("/api/settings/theme", {
      method: "PATCH",
      body: JSON.stringify({ theme }),
    }),

  // Private conversation settings
  getConversationSettings: (conversationId) =>
    request(
      `/api/conversations/${encodeURIComponent(conversationId)}/settings`
    ),

  updateConversationBackground: (conversationId, background) =>
    request(
      `/api/conversations/${encodeURIComponent(conversationId)}/settings`,
      {
        method: "PATCH",
        body: JSON.stringify({ background }),
      }
    ),

  // Group conversation settings
  updateGroupBackground: (groupId, background) =>
    request(
      `/api/groups/${encodeURIComponent(groupId)}/background`,
      {
        method: "PATCH",
        body: JSON.stringify({ background }),
      }
    ),

  // Authentication
  me: () => request("/api/auth/me"),

  signup: (payload) =>
    request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  login: (payload) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  logout: () =>
    request("/api/auth/logout", {
      method: "POST",
    }),

  // Users and private messages
  users: (search = "") =>
    request(`/api/users?search=${encodeURIComponent(search)}`),

  messages: (userId) =>
    request(`/api/messages/${encodeURIComponent(userId)}`),

  // Group chats
  groups: () => request("/api/groups"),

  createGroup: (payload) =>
    request("/api/groups", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  addGroupMembers: (groupId, memberIds) =>
    request(`/api/groups/${encodeURIComponent(groupId)}/members`, {
      method: "PATCH",
      body: JSON.stringify({ memberIds }),
    }),

  deleteGroup: (groupId) =>
    request(`/api/groups/${encodeURIComponent(groupId)}`, {
      method: "DELETE",
    }),

  groupMessages: (groupId) =>
    request(`/api/groups/${encodeURIComponent(groupId)}/messages`),

  // File attachments
  uploadFile: async (formData) => {
    const response = await fetch(`${API_URL}/api/uploads`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "File upload failed.");
    }

    return data;
  },
};

export function connectSocket() {
  return io(API_URL, {
    withCredentials: true,
    transports: ["websocket", "polling"],
  });
}
