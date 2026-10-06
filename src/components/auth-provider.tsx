"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { authError, firebaseAuth, firebaseConfigured } from "@/lib/firebase";

const Context = createContext<{
  user: User | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}>({
  user: null,
  loading: true,
  error: "",
  refresh: async () => {},
  logout: async () => {},
});
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [, redraw] = useState(0);
  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }
    try {
      return onAuthStateChanged(
        firebaseAuth(),
        (user) => {
          setUser(user);
          setError("");
          setLoading(false);
        },
        (error) => {
          setError(authError(error));
          setLoading(false);
        },
      );
    } catch (error) {
      setError(authError(error));
      setLoading(false);
    }
  }, []);
  async function refresh() {
    const user = firebaseAuth().currentUser;
    if (user) {
      await user.reload();
      await user.getIdToken(true);
      setUser(user);
      redraw((value) => value + 1);
    }
  }
  return (
    <Context.Provider
      value={{
        user,
        loading,
        error,
        refresh,
        logout: async () => {
          await signOut(firebaseAuth());
          setUser(null);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
