import test from 'node:test';
import assert from 'node:assert/strict';

function checkCountryAccess(country, env) {
    if (!country || country === 'XX' || country === 'T1') return true;
    const countryUpper = country.toUpperCase();
    if (env.BLOCKED_COUNTRIES) {
        const blockedList = env.BLOCKED_COUNTRIES.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
        if (blockedList.includes(countryUpper)) {
            return false;
        }
    }
    if (env.ALLOWED_COUNTRIES) {
        const allowedList = env.ALLOWED_COUNTRIES.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
        if (allowedList.length > 0 && !allowedList.includes(countryUpper)) {
            return false;
        }
    }
    return true;
}

test('blocks RU when BLOCKED_COUNTRIES contains RU', () => {
    const env = { BLOCKED_COUNTRIES: 'RU,KP,IR' };
    assert.equal(checkCountryAccess('RU', env), false);
    assert.equal(checkCountryAccess('CN', env), true);
    assert.equal(checkCountryAccess('US', env), true);
});

test('allows only CN, US when ALLOWED_COUNTRIES is CN,US', () => {
    const env = { ALLOWED_COUNTRIES: 'CN,US,HK,TW,MO' };
    assert.equal(checkCountryAccess('CN', env), true);
    assert.equal(checkCountryAccess('US', env), true);
    assert.equal(checkCountryAccess('HK', env), true);
    assert.equal(checkCountryAccess('RU', env), false);
    assert.equal(checkCountryAccess('GB', env), false);
});
