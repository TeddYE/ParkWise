import { User } from "../types";
import { validatePassword } from "../utils/validation";

const LOGIN_API =
  "https://mb036g8g79.execute-api.ap-southeast-1.amazonaws.com/dev/login";

const SIGNUP_API =
  "https://mb036g8g79.execute-api.ap-southeast-1.amazonaws.com/dev/signup";

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignupCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  user?: User;
  error?: string;
}

export async function login(
  credentials: LoginCredentials,
): Promise<AuthResponse> {
  try {
    const response = await fetch(LOGIN_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "*",
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      return {
        error:
          "You have entered an invalid username or password.",
      };
    }

    const data = await response.json();
    const profile =
      typeof data.profile === "string"
        ? JSON.parse(data.profile)
        : data.profile;
    const user: User = {
      user_id: data.user_id,
      name: profile?.name ?? undefined,
      email: credentials.email,
      subscription:
        profile?.is_premium === "yes" ? "premium" : "free",
      subscriptionExpiry:
        profile?.subscriptionExpiry ?? undefined,
      favoriteCarparks: profile?.favoriteCarparks ?? [],
    };

    return {
      user,
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      error:
        "You have entered an invalid username or password.",
    };
  }
}

export async function signup(
  credentials: SignupCredentials,
): Promise<AuthResponse> {
  // Client-side validation
  const passwordValidation = validatePassword(
    credentials.password,
  );
  if (!passwordValidation.isValid) {
    return {
      error: passwordValidation.errors[0],
    };
  }

  try {
    const response = await fetch(SIGNUP_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "*",
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error_msg = await response.json();
      console.log(error_msg);
      if (error_msg.error === "Email already exists") {
        return {
          error:
            "Email already exists. Please sign up with a different email.",
        };
      }
      return {
        error: "Signup failed. Please try again.",
      };
    }

    const data = await response.json();

    const user: User = {
      user_id: credentials.email,
      name: data.profile?.name ?? undefined,
      email: credentials.email,
      subscription:
        data.profile?.is_premium === "yes" ? "premium" : "free",
      subscriptionExpiry:
        data.profile?.subscriptionExpiry ?? undefined,
      favoriteCarparks: data.profile?.favoriteCarparks ?? [],
    };
    return { user };
  } catch (error) {
    console.error("Signup error:", error);
    return {
      error: "Signup failed. Please try again.",
    };
  }
}

export function logout(): void {
  localStorage.removeItem("user");
}