import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
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

export function cognitoSignIn({ usernameOrEmail, password }) {
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
          payload: session.getIdToken().decodePayload(), // contains email, given_name, family_name
        });
      },
      onFailure: (err) => reject(err),
    });
  });
}
