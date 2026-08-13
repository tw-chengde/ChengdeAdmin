import assert from "node:assert/strict";
import { afterEach, test } from "vitest";
import {
  allowedValuesFromEnvironment,
  moStorePlusAuthValueFromEnvironment,
  momoScmCredentialsFromEnvironment,
  optionalEnvironment,
  requiredEnvironment,
} from "@/app/lib/platforms/config";

const allowed = ["61", "62", "63", "65"] as const;
const touched = new Set<string>();

function setEnvironment(name: string, value: string | undefined) {
  touched.add(name);
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  for (const name of touched) delete process.env[name];
  touched.clear();
});

test("optionalEnvironment 去空白，未設定或全為空白時視為沒設定", () => {
  setEnvironment("TEST_PLATFORM_VALUE", "  hello  ");
  assert.equal(optionalEnvironment("TEST_PLATFORM_VALUE"), "hello");

  setEnvironment("TEST_PLATFORM_VALUE", "   ");
  assert.equal(optionalEnvironment("TEST_PLATFORM_VALUE"), undefined);

  setEnvironment("TEST_PLATFORM_VALUE", undefined);
  assert.equal(optionalEnvironment("TEST_PLATFORM_VALUE"), undefined);
});

test("requiredEnvironment 缺少設定時拋錯並指出變數名稱", () => {
  setEnvironment("TEST_PLATFORM_REQUIRED", undefined);
  assert.throws(() => requiredEnvironment("TEST_PLATFORM_REQUIRED"), /TEST_PLATFORM_REQUIRED/);

  setEnvironment("TEST_PLATFORM_REQUIRED", "ok");
  assert.equal(requiredEnvironment("TEST_PLATFORM_REQUIRED"), "ok");
});

test("allowedValuesFromEnvironment 未設定時回傳全部允許值", () => {
  setEnvironment("TEST_PLATFORM_LIST", undefined);
  assert.deepEqual(allowedValuesFromEnvironment("TEST_PLATFORM_LIST", allowed), ["61", "62", "63", "65"]);
});

test("allowedValuesFromEnvironment 去重、去空白並保留設定順序", () => {
  setEnvironment("TEST_PLATFORM_LIST", " 63 , 61 ,63, ");
  assert.deepEqual(allowedValuesFromEnvironment("TEST_PLATFORM_LIST", allowed), ["63", "61"]);
});

// 打錯物流商代碼若安靜地被忽略，會變成「少查了一批訂單」這種很難察覺的問題。
test("allowedValuesFromEnvironment 遇到不支援的值直接拋錯", () => {
  setEnvironment("TEST_PLATFORM_LIST", "62,99");
  assert.throws(() => allowedValuesFromEnvironment("TEST_PLATFORM_LIST", allowed), /99/);
});

test("momo SCM 四項憑證皆為必填，mo店+ 授權標頭為選填", () => {
  for (const name of ["MOMO_SCM_ENTP_ID", "MOMO_SCM_ENTP_CODE", "MOMO_SCM_ENTP_PASSWORD", "MOMO_SCM_OTP_BACK_NO"]) {
    setEnvironment(name, undefined);
  }
  assert.throws(() => momoScmCredentialsFromEnvironment(), /MOMO_SCM_ENTP_ID/);

  setEnvironment("MOMO_SCM_ENTP_ID", "12345678");
  setEnvironment("MOMO_SCM_ENTP_CODE", "001005");
  setEnvironment("MOMO_SCM_ENTP_PASSWORD", "secret");
  setEnvironment("MOMO_SCM_OTP_BACK_NO", "123");
  assert.deepEqual(momoScmCredentialsFromEnvironment(), {
    entpId: "12345678",
    entpCode: "001005",
    entpPassword: "secret",
    otpBackNo: "123",
  });

  setEnvironment("MO_STORE_PLUS_AUTH_VALUE", undefined);
  assert.equal(moStorePlusAuthValueFromEnvironment(), undefined);
});
