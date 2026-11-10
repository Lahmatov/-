import { GoogleSignin, isErrorWithCode, statusCodes } from "@react-native-google-signin/google-signin";
import { Platform } from "react-native";
import { googleConfig } from "../config";

let configured = false;

/** Кнопка Google видна, только если при сборке заданы Client ID (iOS — iosClientId, Android — webClientId). */
export function googleSignInAvailable(): boolean {
  return Platform.OS === "ios" ? !!googleConfig.iosClientId : Platform.OS === "android" ? !!googleConfig.webClientId : false;
}

/** ID-токен Google для POST /auth/google; null — пользователь отменил вход. */
export async function googleIdToken(): Promise<string | null> {
  if (!configured) {
    GoogleSignin.configure({
      iosClientId: googleConfig.iosClientId ?? undefined,
      webClientId: googleConfig.webClientId ?? undefined,
    });
    configured = true;
  }
  try {
    if (Platform.OS === "android") await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result = await GoogleSignin.signIn();
    if (result.type !== "success") return null;
    return result.data.idToken;
  } catch (error) {
    if (isErrorWithCode(error) && (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS)) return null;
    throw error;
  }
}
