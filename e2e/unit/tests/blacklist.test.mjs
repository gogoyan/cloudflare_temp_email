import test from 'node:test';
import assert from 'node:assert/strict';

import { matchAddressPattern, isBlocked } from '../../../worker/src/email/black_list.ts';

test('matchAddressPattern matches exact address', () => {
    assert.equal(matchAddressPattern('user@example.com', 'user@example.com'), true);
    assert.equal(matchAddressPattern('USER@EXAMPLE.COM', 'user@example.com'), true);
    assert.equal(matchAddressPattern('user@example.com', 'other@example.com'), false);
});

test('matchAddressPattern matches substring', () => {
    assert.equal(matchAddressPattern('example.com', 'user@example.com'), true);
    assert.equal(matchAddressPattern('spam', 'spammer123@example.com'), true);
});

test('matchAddressPattern matches wildcards', () => {
    assert.equal(matchAddressPattern('*@daifa123.com', '2jize4t1a4@daifa123.com'), true);
    assert.equal(matchAddressPattern('2jize*@daifa123.com', '2jize4t1a4@daifa123.com'), true);
    assert.equal(matchAddressPattern('test*@daifa123.com', '2jize4t1a4@daifa123.com'), false);
});

test('isBlocked blocks sender from env.BLACK_LIST', async () => {
    const mockMessage = {
        from: 'spammer@openai.com',
        headers: new Headers({ 'From': 'spammer@openai.com' })
    };
    const env = {
        BLACK_LIST: 'openai.com,badguy.com'
    };
    assert.equal(await isBlocked(mockMessage, env), true);
});

test('isBlocked blocks recipient from env.TO_BLACK_LIST', async () => {
    const mockMessage = {
        from: 'otp@tm1.openai.com',
        headers: new Headers({ 'From': 'otp@tm1.openai.com' })
    };
    const env = {
        BLACK_LIST: 'noreply@email.openai.com',
        TO_BLACK_LIST: '2jize4t1a4@daifa123.com,hacked@*'
    };
    assert.equal(await isBlocked(mockMessage, env, '2jize4t1a4@daifa123.com'), true);
    assert.equal(await isBlocked(mockMessage, env, 'safeuser@daifa123.com'), false);
});
