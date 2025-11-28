import { Task, User } from '../types';

// This mock service simulates a backend like Firebase Firestore.
// In a production app, you would replace localStorage calls with API calls.

const DELAY_MS = 800;

export const cloudService = {
  login: async (email: string): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    // Simulate finding a user or creating a dummy one
    return {
      id: btoa(email), // simple mock ID
      email,
      name: email.split('@')[0],
      avatar: `https://ui-avatars.com/api/?name=${email}&background=6366f1&color=fff`
    };
  },

  logout: async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 200));
  },

  // Simulates pushing data to a cloud database
  syncTasks: async (userId: string, tasks: Task[]): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    try {
      // We use a different localStorage key per user to simulate cloud buckets
      localStorage.setItem(`cloud_db_${userId}_tasks`, JSON.stringify(tasks));
      return true;
    } catch (e) {
      console.error(e);
      throw new Error("Cloud sync failed");
    }
  },

  // Simulates fetching data from a cloud database
  fetchTasks: async (userId: string): Promise<Task[] | null> => {
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    const data = localStorage.getItem(`cloud_db_${userId}_tasks`);
    return data ? JSON.parse(data) : null;
  }
};
