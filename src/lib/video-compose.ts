import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);

export type SlideshowOptions = {
  secondsPerSlide?: number;
  width?: number;
  height?: number;
};

/**
 * Assembles a still-image slideshow (Ken Burns pan/zoom per slide, no cuts) into
 * an MP4 using ffmpeg — the free/zero-cost "video" tier: no AI video model
 * involved, just motion applied to already-generated cover images. Runs the
 * bundled ffmpeg-static binary via a temp-directory pipeline (ffmpeg has no
 * in-memory-buffer API), so this needs real disk + CPU time, unlike the rest of
 * this module's pure-fetch calls. Expect single-digit seconds per slide.
 */
export async function composeSlideshow(images: Buffer[], options: SlideshowOptions = {}): Promise<Buffer> {
  if (!ffmpegPath) throw new Error("ffmpeg binary not available");
  if (images.length === 0) throw new Error("composeSlideshow needs at least one image");

  const secondsPerSlide = options.secondsPerSlide ?? 4;
  const width = options.width ?? 800;
  const height = options.height ?? 800;
  const fps = 30;
  const totalFrames = secondsPerSlide * fps;

  const dir = await mkdtemp(join(tmpdir(), "mcg-slideshow-"));
  try {
    const imagePaths: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const path = join(dir, `slide-${i}.jpg`);
      await writeFile(path, new Uint8Array(images[i]));
      imagePaths.push(path);
    }

    const outputPath = join(dir, "output.mp4");
    const inputArgs: string[] = [];
    const filterParts: string[] = [];

    imagePaths.forEach((path, i) => {
      // Deliberately no -framerate/-t on the input: "-loop 1" alone loops the
      // same single frame indefinitely, which is what zoompan needs to treat
      // this as ONE continuous zoom across all `totalFrames`, driven by its own
      // internal frame counter. Constraining the input's own frame rate/duration
      // instead makes ffmpeg present several *distinct* "new" input frames, and
      // zoompan resets its zoom progression at each one — verified this by
      // extracting frames either side of a reset point and seeing the crop
      // visibly snap back outward instead of continuing to zoom in, which read
      // as judder/"poor quality" rather than a smooth Ken Burns pan.
      inputArgs.push("-loop", "1", "-i", path);
      // Scale up 2x before zoompan (a well-known ffmpeg workaround — zoompan
      // sampling directly at target size causes visible judder), zoom smoothly
      // across the whole slide, then trim+reset timestamps so concat sees a
      // clean, correctly-bounded segment instead of an unbounded looped input.
      filterParts.push(
        `[${i}:v]scale=${width * 2}:${height * 2},` +
          `zoompan=z='min(zoom+0.0015,1.2)':d=${totalFrames}:s=${width}x${height}:fps=${fps},` +
          `trim=duration=${secondsPerSlide},setpts=PTS-STARTPTS,format=yuv420p[v${i}]`,
      );
    });

    const concatInputs = imagePaths.map((_, i) => `[v${i}]`).join("");
    const filterComplex = `${filterParts.join(";")};${concatInputs}concat=n=${imagePaths.length}:v=1:a=0[outv]`;

    const args = [
      ...inputArgs,
      "-filter_complex", filterComplex,
      "-map", "[outv]",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-y",
      outputPath,
    ];

    await execFileAsync(ffmpegPath as string, args, { timeout: 120000, maxBuffer: 1024 * 1024 * 50 });
    return await readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
