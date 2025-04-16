import { useRef, useEffect } from 'react';

interface EpisodeVideoPlayerProps {
  src: string;
  className?: string;
}

function EpisodeVideoPlayer({ src, className }: EpisodeVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    // Set the source
    videoElement.src = src;

    // Attempt to play the video
    const playPromise = videoElement.play();

    if (playPromise !== undefined) {
      playPromise.catch(error => {
        // Autoplay was prevented.
        console.warn("Video autoplay prevented for:", src, error);
        // We could potentially show a play button here if needed
      });
    }

  }, [src]); // Re-run effect if the source URL changes

  return (
    <video
      ref={videoRef}
      className={className} // Apply passed classes
      playsInline      // Important for mobile
      muted            // Required for most autoplay scenarios
      loop             // Loop the video
      preload="metadata" // Hint to load metadata quickly
      // autoPlay attribute is removed, we handle play via JS
    />
  );
}

export default EpisodeVideoPlayer; 