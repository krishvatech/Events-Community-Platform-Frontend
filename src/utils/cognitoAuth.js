import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoRefreshToken,
} from "amazon-cognito-identity-js";

const region = import.meta.env.VITE_COGNITO_REGION;
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;

const pool = new CognitoUserPool({ UserPoolId: userPoolId, ClientId: clientId });

export function cognitoSignUp({ username, email, firstName, lastName, password }) {
  return new Promise((resolve, reject) => {
    pool.signUp(
      username,
      password,
      [
        { Name: "email", Value: email },
        { Name: "given_name", Value: firstName },
        { Name: "family_name", Value: lastName },
      ],
      null,
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
  });
}

export function cognitoConfirmSignUp({ username, code }) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: username, Pool: pool });
    user.confirmRegistration(code, true, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

export function cognitoResendSignUp({ username }) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: username, Pool: pool });
    user.resendConfirmationCode((err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

function cognitoAuthenticateSingle({ usernameOrEmail, password }) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: usernameOrEmail, Pool: pool });

    const authDetails = new AuthenticationDetails({
      Username: usernameOrEmail,
      Password: password,
    });

    user.authenticateUser(authDetails, {
      onSuccess: (session) => {
        resolve({
          idToken: session.getIdToken().getJwtToken(),
          accessToken: session.getAccessToken().getJwtToken(),
          refreshToken: session.getRefreshToken().getToken(),
          payload: session.getIdToken().decodePayload(),
        });
      },
      onFailure: (err) => reject(err),
    });
  });
}

export async function cognitoSignIn({ usernameOrEmail, password, candidates = [] }) {
  const identifiers = [usernameOrEmail, ...candidates].filter(Boolean);
  const deduped = [...new Set(identifiers.map((v) => String(v).trim()).filter(Boolean))];

  let lastErr = null;
  for (const identifier of deduped) {
    try {
      return await cognitoAuthenticateSingle({ usernameOrEmail: identifier, password });
    } catch (err) {
      lastErr = err;
      const code = err?.code || "";
      const message = err?.message || "";
      // Throw immediately for terminal errors (disabled, password reset required, etc.)
      // Also check message for "disabled" since Cognito returns NotAuthorizedException with that message
      if (
        code === "UserDisabledException" ||
        code === "PasswordResetRequiredException" ||
        message?.toLowerCase().includes("disabled")
      ) {
        throw err;
      }
    }
  }
  throw lastErr || new Error("Login failed");
}

function isRetryableForgotPasswordError(err) {
  const code = err?.code || "";
  return [
    "UserNotFoundException",
    "InvalidParameterException",
    "NotAuthorizedException",
  ].includes(code);
}

function buildIdentifierList(primary, candidates = []) {
  const normalized = [primary, ...candidates]
    .filter(Boolean)
    .map((v) => String(v).trim())
    .filter(Boolean);
  return [...new Set(normalized)];
}


// ✅ Forgot Password: send OTP to email/phone
function cognitoForgotPasswordSingle(usernameOrEmail) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: usernameOrEmail, Pool: pool });
    user.forgotPassword({
      onFailure: (err) => reject(err),
      inputVerificationCode: (data) => {
        resolve(data);
      },
    });
  });
}

export async function cognitoForgotPassword({ usernameOrEmail, candidates = [] }) {
  const identifiers = buildIdentifierList(usernameOrEmail, candidates);
  let lastErr = null;

  for (const identifier of identifiers) {
    try {
      const data = await cognitoForgotPasswordSingle(identifier);
      return { ...data, usedIdentifier: identifier };
    } catch (err) {
      lastErr = err;
      if (!isRetryableForgotPasswordError(err)) throw err;
    }
  }

  throw lastErr || new Error("Forgot password failed");
}


// ✅ Confirm Forgot Password: submit OTP + new password
function cognitoConfirmForgotPasswordSingle({ usernameOrEmail, code, newPassword }) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: usernameOrEmail, Pool: pool });
    user.confirmPassword(code, newPassword, {
      onSuccess: () => resolve(true),
      onFailure: (err) => reject(err),
    });
  });
}

export async function cognitoConfirmForgotPassword({ usernameOrEmail, code, newPassword, candidates = [] }) {
  const identifiers = buildIdentifierList(usernameOrEmail, candidates);
  let lastErr = null;

  for (const identifier of identifiers) {
    try {
      await cognitoConfirmForgotPasswordSingle({ usernameOrEmail: identifier, code, newPassword });
      return true;
    } catch (err) {
      lastErr = err;
      if (!isRetryableForgotPasswordError(err)) throw err;
    }
  }

  throw lastErr || new Error("Password reset confirmation failed");
}

// ✅ Change Password: re-authenticate then change password for logged-in user
export function cognitoChangePassword({ usernameOrEmail, currentPassword, newPassword }) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: usernameOrEmail, Pool: pool });
    const authDetails = new AuthenticationDetails({
      Username: usernameOrEmail,
      Password: currentPassword,
    });
    user.authenticateUser(authDetails, {
      onSuccess: () => {
        user.changePassword(currentPassword, newPassword, (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      },
      onFailure: (err) => reject(err),
    });
  });
}

// ✅ Refresh Session: use Refresh Token to get new Access/Id tokens
export function cognitoRefreshSession({ username, refreshToken }) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: username, Pool: pool });
    const token = new CognitoRefreshToken({ RefreshToken: refreshToken });

    user.refreshSession(token, (err, session) => {
      if (err) return reject(err);
      resolve({
        idToken: session.getIdToken().getJwtToken(),
        accessToken: session.getAccessToken().getJwtToken(),
        // refresh token usually stays the same, but good to be safe if rotated
        refreshToken: session.getRefreshToken().getToken(),
      });
    });
  });
}
