// Test stand-in for utils/cognitoAuth.js, which builds a real CognitoUserPool on
// import. A test answers calls by installing handlers on
// globalThis.__cognitoTestAuth ({ signUp, confirmSignUp, ... }); every call is
// also recorded there in `calls`. Unhandled calls fail, so nothing reaches AWS.
const routed = (name) => async (args) => {
  const fake = globalThis.__cognitoTestAuth || {};
  (fake.calls ||= []).push({ name, args });
  if (!fake[name]) throw new Error(`cognito ${name} disabled in tests`);
  return fake[name](args);
};

export const cognitoSignUp = routed("signUp");
export const cognitoConfirmSignUp = routed("confirmSignUp");
export const cognitoResendSignUp = routed("resendSignUp");
export const cognitoSignIn = routed("signIn");
export const cognitoForgotPassword = routed("forgotPassword");
export const cognitoConfirmForgotPassword = routed("confirmForgotPassword");
export const cognitoChangePassword = routed("changePassword");
export const cognitoRefreshSession = routed("refreshSession");
