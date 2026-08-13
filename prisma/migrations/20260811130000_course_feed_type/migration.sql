-- New feed type for structured course listings (instructor, duration, mode,
-- fee, start date), alongside the existing free-form learning paths.
ALTER TYPE "FeedType" ADD VALUE 'COURSE';
