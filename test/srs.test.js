/**
 * Dyslexia Assistant - Spaced Repetition System (SRS) Algorithm Verification
 * Validates the 7-interval Leitner/SM-2 progressive review schedule.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

const SRS_INTERVALS = [1, 10, 60, 240, 1440, 4320, 10080]; // minutes

function calculateNextReview(currentLevel, rating, baseTime = Date.now()) {
    let newLevel = currentLevel;
    if (rating === 'again') {
        newLevel = 0;
    } else if (rating === 'hard') {
        newLevel = Math.max(0, currentLevel - 1);
    } else if (rating === 'good') {
        newLevel = Math.min(currentLevel + 1, SRS_INTERVALS.length - 1);
    } else if (rating === 'easy') {
        newLevel = Math.min(currentLevel + 2, SRS_INTERVALS.length - 1);
    }

    const intervalMinutes = SRS_INTERVALS[newLevel];
    const nextReview = baseTime + (intervalMinutes * 60 * 1000);

    return {
        level: newLevel,
        intervalMinutes,
        nextReview
    };
}

test('SRS: Correctly tracks 7 distinct progression intervals', () => {
    assert.equal(SRS_INTERVALS.length, 7, 'SRS must contain exactly 7 progression intervals');
    assert.deepEqual(SRS_INTERVALS, [1, 10, 60, 240, 1440, 4320, 10080]);
});

test('SRS: "Again" rating resets card to level 0 (1 minute)', () => {
    const now = 1700000000000;
    const resultFromLevel4 = calculateNextReview(4, 'again', now);
    assert.equal(resultFromLevel4.level, 0);
    assert.equal(resultFromLevel4.intervalMinutes, 1);
    assert.equal(resultFromLevel4.nextReview, now + (1 * 60 * 1000));
});

test('SRS: "Hard" rating steps back 1 level with floor at level 0', () => {
    const now = 1700000000000;
    const stepBack = calculateNextReview(3, 'hard', now);
    assert.equal(stepBack.level, 2);
    assert.equal(stepBack.intervalMinutes, 60);

    const floorTest = calculateNextReview(0, 'hard', now);
    assert.equal(floorTest.level, 0);
    assert.equal(floorTest.intervalMinutes, 1);
});

test('SRS: "Good" rating advances 1 level up to level 6 (1 week)', () => {
    const now = 1700000000000;
    const advance = calculateNextReview(1, 'good', now);
    assert.equal(advance.level, 2);
    assert.equal(advance.intervalMinutes, 60);

    const maxTest = calculateNextReview(6, 'good', now);
    assert.equal(maxTest.level, 6);
    assert.equal(maxTest.intervalMinutes, 10080);
});

test('SRS: "Easy" rating jumps 2 levels up to level 6', () => {
    const now = 1700000000000;
    const jump = calculateNextReview(0, 'easy', now);
    assert.equal(jump.level, 2);
    assert.equal(jump.intervalMinutes, 60);

    const maxJump = calculateNextReview(5, 'easy', now);
    assert.equal(maxJump.level, 6);
    assert.equal(maxJump.intervalMinutes, 10080);
});
