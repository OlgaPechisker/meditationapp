import { describe, it, expect } from "vitest";
import { slugify } from "../src/utils/slugify.js";
import { paginate, paginatedResponse } from "../src/utils/pagination.js";

describe("slugify", () => {
  it("converts English text to slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("preserves Hebrew characters", () => {
    expect(slugify("שלום עולם")).toBe("שלום-עולם");
  });

  it("removes special characters", () => {
    expect(slugify("test! @#$% string")).toBe("test-string");
  });

  it("trims leading/trailing dashes", () => {
    expect(slugify(" -hello- ")).toBe("hello");
  });

  it("collapses multiple dashes", () => {
    expect(slugify("hello---world")).toBe("hello-world");
  });
});

describe("paginate", () => {
  it("calculates skip and take for page 1", () => {
    expect(paginate({ page: 1, limit: 20 })).toEqual({ skip: 0, take: 20 });
  });

  it("calculates skip and take for page 3", () => {
    expect(paginate({ page: 3, limit: 10 })).toEqual({ skip: 20, take: 10 });
  });
});

describe("paginatedResponse", () => {
  it("wraps data with meta", () => {
    const result = paginatedResponse(["a", "b"], 50, { page: 2, limit: 10 });
    expect(result).toEqual({
      data: ["a", "b"],
      meta: { page: 2, limit: 10, total: 50 },
    });
  });
});
