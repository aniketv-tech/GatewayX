
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock("../config/database.js", () => ({
  pool: {
    query: mockQuery,
  },
}));

import { authenticateApiKey } from "./api-key-auth-service.js";

describe("authenticateApiKey", () => {
  const plaintextKey = "gx_live_test_key_123456789";
  const keyHash = createHash("sha256")
    .update(plaintextKey, "utf8")
    .digest("hex");

  const authenticatedClient = {
    clientId: "ffe10db6-bc65-4f63-b5ef-ee9d993ba0a6",
    apiKeyId: "5bc35903-a21e-4685-b5ad-cf093ade7a3b",
    role: "CLIENT" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("authenticates a valid API key", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [authenticatedClient],
    });

    const result = await authenticateApiKey(plaintextKey);

    expect(result).toEqual(authenticatedClient);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("SET last_used_at = NOW()"),
      [keyHash],
    );
  });

  it("returns null when the API key is invalid", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
    });

    const result = await authenticateApiKey(
      "gx_live_invalid_key",
    );

    expect(result).toBeNull();
  });

  it("returns null when the API key is revoked or inactive", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
    });

    const result = await authenticateApiKey(plaintextKey);

    expect(result).toBeNull();

    const query = mockQuery.mock.calls[0][0] as string;

    expect(query).toContain("ak.is_active = TRUE");
    expect(query).toContain("ak.revoked_at IS NULL");
  });

  it("returns null when the API key is expired", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
    });

    const result = await authenticateApiKey(plaintextKey);

    expect(result).toBeNull();

    const query = mockQuery.mock.calls[0][0] as string;

    expect(query).toContain(
      "(ak.expires_at IS NULL OR ak.expires_at > NOW())",
    );
  });
});
