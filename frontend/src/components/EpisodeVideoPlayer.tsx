import { useRef, useEffect, memo } from 'react';

interface EpisodeVideoPlayerProps {
  src: string;
  className?: string;
}

// Wrap the component definition in memo
const EpisodeVideoPlayer = memo(({ src, className }: EpisodeVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Effect 1: Set the source when the src prop changes
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    videoElement.src = src;
  }, [src]);

  // Effect 2: Add event listener to play when data is loaded
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleLoadedData = () => {
      // Attempt to play the video only once data is loaded
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn("Video autoplay prevented for:", src, error);
        });
      }
    };

    // Add event listener
    videoElement.addEventListener('loadeddata', handleLoadedData);

    // Cleanup for Effect 2: remove event listener
    return () => {
      videoElement.removeEventListener('loadeddata', handleLoadedData);
    };
    // Rerun this effect if src changes, to ensure the listener is attached correctly
  }, [src]); 

  // Effect 3: Cleanup video on unmount or src change
  useEffect(() => {
    const videoElement = videoRef.current;
    // Return the cleanup function
    return () => {
      if (videoElement) {
        videoElement.pause();
      }
    };
    // Run cleanup when src changes or component unmounts
  }, [src]); 

  return (
    <video
      ref={videoRef}
      className={className} 
      playsInline      
      muted            
      loop             
      preload="metadata" 
    />
  );
});

export default EpisodeVideoPlayer; 