import { describe, it, expect } from "vitest";
import { isYouTubeUrl } from "../../src/utils/video.js";

describe("isYouTubeUrl", () => {
  it("accepts watch URLs", () => {
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=inpok4MKVLM")).toBe(true);
    expect(isYouTubeUrl("https://youtube.com/watch?v=inpok4MKVLM")).toBe(true);
  });

  it("accepts watch URLs with extra params", () => {
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=inpok4MKVLM&t=30s&list=PLabc")).toBe(true);
  });

  it("accepts youtu.be short URLs", () => {
    expect(isYouTubeUrl("https://youtu.be/inpok4MKVLM")).toBe(true);
  });

  it("accepts embed URLs", () => {
    expect(isYouTubeUrl("https://www.youtube.com/embed/inpok4MKVLM")).toBe(true);
  });

  it("accepts shorts URLs", () => {
    expect(isYouTubeUrl("https://www.youtube.com/shorts/inpok4MKVLM")).toBe(true);
  });

  it("rejects non-YouTube hosts", () => {
    expect(isYouTubeUrl("https://vimeo.com/123456789")).toBe(false);
    expect(isYouTubeUrl("https://example.com/watch?v=inpok4MKVLM")).toBe(false);
  });

  it("rejects YouTube URLs without a valid video id", () => {
    expect(isYouTubeUrl("https://www.youtube.com/")).toBe(false);
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=short")).toBe(false);
    expect(isYouTubeUrl("https://youtu.be/")).toBe(false);
  });

  it("rejects trailing path/fragment after the id (frontend alignment)", () => {
    expect(isYouTubeUrl("https://youtu.be/inpok4MKVLM/anything")).toBe(false);
    expect(isYouTubeUrl("https://www.youtube.com/embed/inpok4MKVLM/extra")).toBe(false);
    expect(isYouTubeUrl("https://youtu.be/inpok4MKVLM#frag")).toBe(false);
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=inpok4MKVLM#frag")).toBe(false);
  });

  it("accepts a single trailing slash after the id", () => {
    expect(isYouTubeUrl("https://youtu.be/inpok4MKVLM/")).toBe(true);
    expect(isYouTubeUrl("https://www.youtube.com/embed/inpok4MKVLM/")).toBe(true);
  });

  it("rejects malformed / non-http URLs", () => {
    expect(isYouTubeUrl("not-a-url")).toBe(false);
    expect(isYouTubeUrl("ftp://youtube.com/watch?v=inpok4MKVLM")).toBe(false);
    expect(isYouTubeUrl("")).toBe(false);
  });
});
