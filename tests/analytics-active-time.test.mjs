import test from "node:test";
import assert from "node:assert/strict";
import { createActiveTimeClock } from "../lib/analytics-active-time.ts";

test("short visits retain precise seconds instead of rounding up in 15s ticks", () => {
  const clock = createActiveTimeClock(0, true);
  clock.setActive(5500, false);
  assert.equal(clock.takeHeartbeat(5500), 5);
  assert.equal(clock.takeHeartbeat(60000), null);
});

test("background and unfocused periods never add active time or duplicate telemetry", () => {
  const clock = createActiveTimeClock(0, true);
  clock.setActive(10000, false);
  assert.equal(clock.takeHeartbeat(60000), 10);
  assert.equal(clock.takeHeartbeat(120000), null);
  clock.setActive(120000, true);
  clock.interact(120000);
  assert.equal(clock.takeHeartbeat(125000), 15);
});

test("idle focused tab caps at 60 seconds even if timers were suspended", () => {
  const clock = createActiveTimeClock(0, true);
  assert.equal(clock.takeHeartbeat(600000), 60);
  assert.equal(clock.takeHeartbeat(660000), null);
  clock.interact(660000);
  assert.equal(clock.takeHeartbeat(665000), 65);
});

test("ongoing interaction extends the activity window without counting idle gaps", () => {
  const clock = createActiveTimeClock(0, true);
  clock.interact(50000);
  assert.equal(clock.takeHeartbeat(60000), 60);
  assert.equal(clock.takeHeartbeat(120000), 110);
  clock.interact(180000);
  assert.equal(clock.takeHeartbeat(181000), 111);
});

test("only focused foreground tab contributes when switching between tabs", () => {
  const first = createActiveTimeClock(0, true);
  const second = createActiveTimeClock(0, false);
  first.setActive(10000, false);
  second.setActive(10000, true);
  second.interact(10000);
  assert.equal(first.takeHeartbeat(20000), 10);
  assert.equal(second.takeHeartbeat(20000), 10);
  assert.equal(first.takeHeartbeat(30000), null);
});
