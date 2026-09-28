import test from "node:test";
import assert from "node:assert/strict";

import {
  createMemoryStorage,
  getCognitoSdkStorage,
  isPersistedCognitoSdkTokenKey,
  purgePersistedCognitoSdkTokens,
} from "./cognitoSdkStorage.js";

test("memory storage implements Web Storage string semantics without persistence", () => {
  const storage = createMemoryStorage();

  assert.equal(storage.length, 0);
  assert.equal(storage.getItem("missing"), null);

  storage.setItem("token", 123);
  assert.equal(storage.getItem("token"), "123");
  assert.equal(storage.length, 1);
  assert.equal(storage.key(0), "token");

  storage.removeItem("token");
  assert.equal(storage.getItem("token"), null);

  storage.setItem("a", "1");
  storage.setItem("b", "2");
  storage.clear();
  assert.equal(storage.length, 0);
});

test("secure Cognito storage is memory-only while legacy mode leaves SDK defaults intact", () => {
  assert.equal(getCognitoSdkStorage(false), undefined);

  const secureStorage = getCognitoSdkStorage(true);
  assert.ok(secureStorage);
  secureStorage.clear();
  secureStorage.setItem("CognitoIdentityServiceProvider.test.user.refreshToken", "secret");
  assert.equal(
    secureStorage.getItem("CognitoIdentityServiceProvider.test.user.refreshToken"),
    "secret",
  );
  secureStorage.clear();
});

test("only Cognito SDK token credential keys are classified as sensitive", () => {
  assert.equal(
    isPersistedCognitoSdkTokenKey(
      "CognitoIdentityServiceProvider.client.user.accessToken",
    ),
    true,
  );
  assert.equal(
    isPersistedCognitoSdkTokenKey(
      "CognitoIdentityServiceProvider.client.user.idToken",
    ),
    true,
  );
  assert.equal(
    isPersistedCognitoSdkTokenKey(
      "CognitoIdentityServiceProvider.client.user.refreshToken",
    ),
    true,
  );
  assert.equal(
    isPersistedCognitoSdkTokenKey(
      "CognitoIdentityServiceProvider.client.LastAuthUser",
    ),
    false,
  );
  assert.equal(
    isPersistedCognitoSdkTokenKey(
      "CognitoIdentityServiceProvider.client.user.clockDrift",
    ),
    false,
  );
  assert.equal(isPersistedCognitoSdkTokenKey("refresh_token"), false);
});

test("purge removes SDK credentials but preserves Cognito metadata and unrelated app data", () => {
  const storage = createMemoryStorage();
  storage.setItem("CognitoIdentityServiceProvider.client.user.accessToken", "access");
  storage.setItem("CognitoIdentityServiceProvider.client.user.idToken", "id");
  storage.setItem("CognitoIdentityServiceProvider.client.user.refreshToken", "refresh");
  storage.setItem("CognitoIdentityServiceProvider.client.user.clockDrift", "0");
  storage.setItem("CognitoIdentityServiceProvider.client.LastAuthUser", "user");
  storage.setItem("user_name", "Example");

  assert.equal(purgePersistedCognitoSdkTokens(storage), 3);
  assert.equal(
    storage.getItem("CognitoIdentityServiceProvider.client.user.accessToken"),
    null,
  );
  assert.equal(
    storage.getItem("CognitoIdentityServiceProvider.client.user.idToken"),
    null,
  );
  assert.equal(
    storage.getItem("CognitoIdentityServiceProvider.client.user.refreshToken"),
    null,
  );
  assert.equal(
    storage.getItem("CognitoIdentityServiceProvider.client.user.clockDrift"),
    "0",
  );
  assert.equal(
    storage.getItem("CognitoIdentityServiceProvider.client.LastAuthUser"),
    "user",
  );
  assert.equal(storage.getItem("user_name"), "Example");
});
