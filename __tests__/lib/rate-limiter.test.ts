import { isRateLimited, INPUT_MAX_LENGTH } from "@/lib/rate-limiter";

describe("isRateLimited", () => {
  it("allows requests within limit", () => {
    const ip = "test-allow-" + Date.now();
    expect(isRateLimited(ip)).toBe(false);
  });

  it("blocks after exceeding max requests", () => {
    const ip = "test-block-" + Date.now();

    // Fill up to the limit (20 requests)
    for (let i = 0; i < 20; i++) {
      isRateLimited(ip);
    }

    // 21st should be blocked
    expect(isRateLimited(ip)).toBe(true);
  });

  it("tracks different IPs independently", () => {
    const ip1 = "test-ip1-" + Date.now();
    const ip2 = "test-ip2-" + Date.now();

    // Fill up ip1
    for (let i = 0; i < 20; i++) {
      isRateLimited(ip1);
    }

    // ip2 should still be allowed
    expect(isRateLimited(ip2)).toBe(false);
  });
});

describe("INPUT_MAX_LENGTH", () => {
  it("is set to 500", () => {
    expect(INPUT_MAX_LENGTH).toBe(500);
  });
});
