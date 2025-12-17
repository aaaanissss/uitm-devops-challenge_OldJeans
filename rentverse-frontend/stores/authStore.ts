import { create } from "zustand";
import type { User, AuthState } from "@/types/auth";
import type { SecuritySummary } from "@/types/security";
import { AuthApiClient } from "@/utils/authApiClient";
import { setCookie, deleteCookie } from "@/utils/cookies";
import { createApiUrl } from "@/utils/apiConfig";

interface SecurityState {
  summary: SecuritySummary | null;
  loadSecuritySummary: () => Promise<void>;
}

interface AuthActions {
  // Login functionality
  setPassword: (password: string) => void;
  submitLogIn: () => Promise<void>;
  submitMfaVerify: (code: string) => Promise<void>;

  // Signup
  setFirstName: (s: string) => void;
  setLastName: (s: string) => void;
  setBirthdate: (s: string) => void;
  setEmail: (s: string) => void;
  setPhone: (s: string) => void;
  setSignUpPassword: (s: string) => void;
  submitSignUp: () => Promise<void>;

  // Email check
  validateEmail: (email: string) => boolean;
  submitEmailCheck: () => Promise<{
    exists: boolean;
    isActive: boolean;
    role: string | null;
  } | null>;

  // General
  setLoading: (b: boolean) => void;
  setError: (s: string | null) => void;
  logout: () => void;
  resetForm: () => void;
  isLoginFormValid: () => boolean;
  isSignUpFormValid: () => boolean;

  // Persistence
  initializeAuth: () => void;
  validateToken: () => Promise<boolean>;
  refreshUserData: () => Promise<boolean>;
}

interface AuthFormState {
  password: string;
  firstName: string;
  lastName: string;
  birthdate: string;
  email: string;
  phone: string;
  signUpPassword: string;
}

type AuthStore = AuthState &
  AuthFormState &
  AuthActions &
  SecurityState;

const useAuthStore = create<AuthStore>((set, get) => ({
  // Auth state
  user: null,
  isLoggedIn: false,
  isLoading: false,
  error: null,

  // MFA state
  mfaRequired: false,
  mfaToken: null,
  isVerifyingMfa: false,

  // Security summary
  summary: null,

  // Security summary loader
  loadSecuritySummary: async () => {
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("authToken")
          : null;

      if (!token) return;

      const res = await fetch("/api/security/me/summary", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (json.success && json.data) {
        set({ summary: json.data });
      }
    } catch (err) {
      console.error("[AuthStore] Failed to load security summary:", err);
    }
  },

  // Form state
  password: "",
  firstName: "",
  lastName: "",
  birthdate: "",
  email: "",
  phone: "",
  signUpPassword: "",

  // Basic setters
  setPassword: (password) => set({ password }),
  setFirstName: (firstName) => set({ firstName }),
  setLastName: (lastName) => set({ lastName }),
  setBirthdate: (birthdate) => set({ birthdate }),
  setEmail: (email) => set({ email }),
  setPhone: (phone) => set({ phone }),
  setSignUpPassword: (signUpPassword) => set({ signUpPassword }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  validateEmail: (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),

  isLoginFormValid: () => get().password.length >= 6,

  isSignUpFormValid: () => {
    const { firstName, lastName, email, signUpPassword, birthdate, phone } =
      get();
    return (
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      get().validateEmail(email) &&
      signUpPassword.length >= 6 &&
      birthdate.length > 0 &&
      phone.trim().length > 0
    );
  },

  //-------------------------------------------
  // LOGIN (with MFA support)
  //-------------------------------------------
  submitLogIn: async () => {
    const { email, password, setLoading, setError } = get();

    if (!email) return setError("Email is required");
    if (password.length < 6)
      return setError("Please enter a valid password");

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      //---------------------------------------
      // MFA Required path
      //---------------------------------------
      if (response.ok && result.success && result.data?.status === "MFA_REQUIRED") {
        const backendUser = result.data.user;

        set({
          user: backendUser,
          isLoggedIn: false,
          mfaRequired: true,
          mfaToken: result.data.mfaToken,
          password: "",
          email: "",
          error: null,
        });

        return;
      }

      //---------------------------------------
      // Normal login
      //---------------------------------------
      if (response.ok && result.success) {
        const backendUser = result.data.user;

        set({
          user: backendUser,
          isLoggedIn: true,
          mfaRequired: false,
          mfaToken: null,
          password: "",
          email: "",
          error: null,
        });

        if (typeof window !== "undefined") {
          localStorage.setItem("authToken", result.data.token);
          localStorage.setItem("authUser", JSON.stringify(backendUser));
          setCookie("authToken", result.data.token, 7);
        }

        // Load security summary after login
        get().loadSecuritySummary();

        window.location.href = "/";
      } else {
        setError(result.message || "Invalid credentials");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  },

  //-------------------------------------------
  // MFA Verification
  //-------------------------------------------
  submitMfaVerify: async (code: string) => {
    const { mfaToken, setLoading, setError } = get();

    if (!mfaToken) return setError("MFA session expired");
    if (!code || code.length !== 6) return setError("Enter a valid 6-digit code");

    set({ isVerifyingMfa: true });
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, mfaToken }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        const backendUser = result.data.user;

        set({
          user: backendUser,
          isLoggedIn: true,
          mfaRequired: false,
          mfaToken: null,
          isVerifyingMfa: false,
          error: null,
        });

        if (typeof window !== "undefined") {
          localStorage.setItem("authToken", result.data.token);
          localStorage.setItem("authUser", JSON.stringify(backendUser));
          setCookie("authToken", result.data.token, 7);
        }

        // Load summary after MFA login
        get().loadSecuritySummary();

        window.location.href = "/";
      } else {
        setError(result.message || "Invalid MFA code");
      }
    } catch (err) {
      console.error("MFA verify error:", err);
      setError("MFA verification failed");
    } finally {
      set({ isVerifyingMfa: false });
      setLoading(false);
    }
  },

  //-------------------------------------------
  // SIGNUP
  //-------------------------------------------
  submitSignUp: async () => {
    const { firstName, lastName, email, signUpPassword, birthdate, phone } = get();

    if (!get().isSignUpFormValid())
      return set({ error: "Fill in all fields properly" });

    set({ isLoading: true, error: null });

    try {
      const result = await AuthApiClient.register({
        email,
        password: signUpPassword,
        firstName,
        lastName,
        dateOfBirth: birthdate,
        phone,
      });

      if (result.success) {
        const backendUser = result.data.user;

        set({
          user: backendUser,
          isLoggedIn: true,
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          signUpPassword: "",
          birthdate: "",
          error: null,
        });

        if (typeof window !== "undefined") {
          localStorage.setItem("authToken", result.data.token);
          localStorage.setItem("authUser", JSON.stringify(backendUser));
          setCookie("authToken", result.data.token, 7);
        }

        // Load summary
        get().loadSecuritySummary();

        window.location.href = "/";
      } else {
        set({ error: result.message || "Sign up failed" });
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      set({ error: err?.message || "Sign up failed" });
    } finally {
      set({ isLoading: false });
    }
  },

  //-------------------------------------------
  // Email check
  //-------------------------------------------
  submitEmailCheck: async () => {
    const { email } = get();

    if (!get().validateEmail(email)) {
      set({ error: "Invalid email format" });
      return null;
    }

    set({ isLoading: true, error: null });

    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const result = await res.json();
      if (res.ok && result.success) return result.data;

      set({ error: result.message || "Unable to check email" });
      return null;
    } catch (err) {
      console.error("Email check error:", err);
      set({ error: "Email check failed" });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  //-------------------------------------------
  // LOGOUT
  //-------------------------------------------
  logout: () => {
    set({
      user: null,
      isLoggedIn: false,
      error: null,
      password: "",
      email: "",
      phone: "",
      signUpPassword: "",
      mfaRequired: false,
      mfaToken: null,
      isVerifyingMfa: false,
      summary: null,
    });

    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      deleteCookie("authToken");
    }
  },

  //-------------------------------------------
  // RESET FORM
  //-------------------------------------------
  resetForm: () =>
    set({
      password: "",
      firstName: "",
      lastName: "",
      birthdate: "",
      email: "",
      phone: "",
      signUpPassword: "",
      error: null,
      mfaRequired: false,
      mfaToken: null,
      isVerifyingMfa: false,
    }),

  //-------------------------------------------
  // INIT AUTH (persistent login)
  //-------------------------------------------
  initializeAuth: () => {
    if (typeof window === "undefined") return;

    try {
      const token = localStorage.getItem("authToken");
      const storedUser = localStorage.getItem("authUser");

      if (token && storedUser) {
        const user = JSON.parse(storedUser) as User;
        set({ user, isLoggedIn: true });
        get().refreshUserData();

        // Load summary at boot
        get().loadSecuritySummary();
      }
    } catch (err) {
      console.error("Auth init error:", err);
      deleteCookie("authToken");
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
    }
  },

  //-------------------------------------------
  // VALIDATE TOKEN
  //-------------------------------------------
  validateToken: async () => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("authToken")
        : null;

    if (!token) return false;

    try {
      const res = await fetch("/api/auth/me", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await res.json();

      if (res.ok && result.success && result.data?.user) {
        set({
          user: result.data.user,
          isLoggedIn: true,
          error: null,
        });

        localStorage.setItem("authUser", JSON.stringify(result.data.user));

        // Refresh summary
        get().loadSecuritySummary();

        return true;
      }

      get().logout();
      return false;
    } catch (err) {
      console.error("Token validation error:", err);
      return false;
    }
  },

  //-------------------------------------------
  // REFRESH USER DATA
  //-------------------------------------------
  refreshUserData: async () => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("authToken")
        : null;

    if (!token) return false;

    try {
      const res = await fetch("/api/auth/me", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await res.json();

      if (res.ok && result.success && result.data?.user) {
        set({
          user: result.data.user,
          isLoggedIn: true,
          error: null,
        });

        localStorage.setItem("authUser", JSON.stringify(result.data.user));

        // Refresh summary
        get().loadSecuritySummary();

        return true;
      }

      return false;
    } catch (err) {
      console.error("Refresh user error:", err);
      return false;
    }
  },
}));

export default useAuthStore;
