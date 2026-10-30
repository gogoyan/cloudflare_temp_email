import assert from "node:assert/strict";
import test from "node:test";

import { forwardEmail } from "./forward.ts";

function createMockMessage(from = "newsletter@promo.com", to = "tmp@domain.com") {
    const forwardedTo = [];
    return {
        from,
        to,
        forwardedTo,
        forward: async (address) => {
            forwardedTo.push(address);
        }
    };
}

test("forwardEmail: forwards all emails when FORWARD_ONLY_VERIFY_CODE is not enabled", async () => {
    const msg = createMockMessage();
    const env = {
        FORWARD_ADDRESS_LIST: JSON.stringify(["dest@example.com"]),
    };

    await forwardEmail(msg, env, null, null);
    assert.deepEqual(msg.forwardedTo, ["dest@example.com"]);
});

test("forwardEmail: skips forwarding when FORWARD_ONLY_VERIFY_CODE is true and mail is marketing spam", async () => {
    const msg = createMockMessage("promo@openai.com", "tmp@domain.com");
    const env = {
        FORWARD_ADDRESS_LIST: JSON.stringify(["dest@example.com"]),
        FORWARD_ONLY_VERIFY_CODE: true,
    };
    const parsedContext = {
        rawEmail: "Subject: Halloween costumes for your whole crew\r\n\r\nCheck out our spooky new deals!",
    };
    const aiExtract = {
        type: "none",
        result: "",
        result_text: "",
    };

    await forwardEmail(msg, env, aiExtract, parsedContext);
    assert.equal(msg.forwardedTo.length, 0, "Marketing email should not be forwarded");
});

test("forwardEmail: forwards when FORWARD_ONLY_VERIFY_CODE is true and aiExtract has auth_code", async () => {
    const msg = createMockMessage("auth@service.com", "tmp@domain.com");
    const env = {
        FORWARD_ADDRESS_LIST: JSON.stringify(["dest@example.com"]),
        FORWARD_ONLY_VERIFY_CODE: true,
    };
    const aiExtract = {
        type: "auth_code",
        result: "123456",
        result_text: "",
    };

    await forwardEmail(msg, env, aiExtract, null);
    assert.deepEqual(msg.forwardedTo, ["dest@example.com"]);
});

test("forwardEmail: forwards when FORWARD_ONLY_VERIFY_CODE is true and aiExtract has auth_link", async () => {
    const msg = createMockMessage("auth@service.com", "tmp@domain.com");
    const env = {
        FORWARD_ADDRESS_LIST: JSON.stringify(["dest@example.com"]),
        FORWARD_ONLY_VERIFY_CODE: true,
        FORWARD_ALLOW_AUTH_LINK: true,
    };
    const aiExtract = {
        type: "auth_link",
        result: "https://service.com/verify?token=xyz",
        result_text: "Verify Account",
    };

    await forwardEmail(msg, env, aiExtract, null);
    assert.deepEqual(msg.forwardedTo, ["dest@example.com"]);
});

test("forwardEmail: forwards when aiExtract is null but local regex detects verification code", async () => {
    const msg = createMockMessage("noreply@service.com", "tmp@domain.com");
    const env = {
        FORWARD_ADDRESS_LIST: JSON.stringify(["dest@example.com"]),
        FORWARD_ONLY_VERIFY_CODE: true,
    };
    const parsedContext = {
        rawEmail: "Subject: Your verification code\r\n\r\nYour login code is 839201. It expires in 10 minutes.",
    };

    await forwardEmail(msg, env, null, parsedContext);
    assert.deepEqual(msg.forwardedTo, ["dest@example.com"]);
});
