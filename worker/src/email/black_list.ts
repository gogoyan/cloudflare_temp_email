import { addressParser } from "postal-mime";

import { CONSTANTS } from "../constants.ts";

const parseSenderAddresses = (headers: Headers): string[] => {
    try {
        const fromHeader = headers.get("From") || "";
        const senderAddresses = addressParser(fromHeader, { flatten: true })
            .map(sender => sender.address || "")
            .filter(Boolean);
        return senderAddresses;
    } catch (error) {
        console.error("Failed to parse sender addresses", error);
        return [];
    }
};

/**
 * Match address against a blacklist pattern.
 * Supports exact match, substring match, and simple wildcards (e.g. "*@domain.com", "user*@*").
 */
export const matchAddressPattern = (pattern: string, target: string): boolean => {
    pattern = pattern.trim().toLowerCase();
    target = target.trim().toLowerCase();
    if (!pattern || !target) return false;

    if (pattern.includes("*")) {
        const regexStr = "^" + pattern.split("*").map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(".*") + "$";
        try {
            return new RegExp(regexStr).test(target);
        } catch {
            return false;
        }
    }

    return target === pattern || target.includes(pattern);
};

export const isBlocked = async (
    message: Pick<ForwardableEmailMessage, "from" | "headers">,
    env: Bindings,
    toAddress?: string
): Promise<boolean> => {
    // 1. Check sender blacklist from env.BLACK_LIST
    const senders = [message.from, ...parseSenderAddresses(message.headers)];
    if (env.BLACK_LIST) {
        const blockedSenders = env.BLACK_LIST.split(",").map(s => s.trim()).filter(Boolean);
        if (blockedSenders.some(word => senders.some(sender => matchAddressPattern(word, sender)))) {
            return true;
        }
    }

    // 2. Check recipient blacklist from env.TO_BLACK_LIST
    if (toAddress && env.TO_BLACK_LIST) {
        const blockedRecipients = env.TO_BLACK_LIST.split(",").map(s => s.trim()).filter(Boolean);
        if (blockedRecipients.some(word => matchAddressPattern(word, toAddress))) {
            return true;
        }
    }

    if (!env.KV) {
        return false;
    }

    // 3. Check sender blacklist from KV
    const blockList = await env.KV.get<string[]>(CONSTANTS.EMAIL_KV_BLACK_LIST, 'json') || [];
    if (blockList.some(word => senders.some(sender => matchAddressPattern(word, sender)))) {
        return true;
    }

    // 4. Check recipient blacklist from KV
    if (toAddress) {
        const toBlockList = await env.KV.get<string[]>(CONSTANTS.EMAIL_KV_TO_BLACK_LIST, 'json') || [];
        if (toBlockList.some(word => matchAddressPattern(word, toAddress))) {
            return true;
        }
    }

    return false;
};
