import { useRef, useState, useEffect } from 'react';

/**
 * CameraCapture — Full-screen camera overlay for scanning discharge papers.
 * Uses rear camera (environment facing) for document capture.
 */
export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [captured, setCaptured] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (mounted && videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          setStream(mediaStream);
        } else {
          mediaStream.getTracks().forEach((t) => t.stop());
        }
      } catch {
        if (mounted) setError('Camera access denied. Please allow camera permissions.');
      }
    })();

    return () => {
      mounted = false;
      // Cleanup stream on unmount
    };
  }, []);

  // Stop stream when user leaves
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  const capture = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        setCaptured(blob);
        if (stream) stream.getTracks().forEach((t) => t.stop());
      },
      'image/jpeg',
      0.92
    );
  };

  const confirm = () => {
    if (captured) onCapture(captured);
  };

  const retake = async () => {
    setCaptured(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch {
      setError('Camera access denied.');
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-4 p-6">
        <span className="material-symbols-outlined text-red-400 text-5xl">videocam_off</span>
        <p className="text-white text-center">{error}</p>
        <button onClick={onClose} className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {!captured ? (
        <>
          <video ref={videoRef} autoPlay playsInline muted className="flex-1 object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
            <div className="bg-black/50 px-4 py-2 rounded-full">
              <p className="text-white text-sm font-medium">Point at discharge paper</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-white">close</span>
            </button>
          </div>
          {/* Capture guide frame */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[85%] h-[60%] border-2 border-white/30 rounded-2xl" />
          </div>
          <div className="p-6 flex justify-center">
            <button
              onClick={capture}
              className="w-20 h-20 rounded-full bg-white border-4 border-gray-300 hover:scale-105 active:scale-95 transition-transform shadow-xl"
              aria-label="Capture photo"
            />
          </div>
        </>
      ) : (
        <>
          <canvas ref={canvasRef} className="flex-1 object-contain bg-black" />
          <div className="p-6 flex justify-center gap-4">
            <button onClick={retake} className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors font-medium">
              Retake
            </button>
            <button onClick={confirm} className="px-6 py-3 bg-teal-500 text-white rounded-xl hover:bg-teal-400 transition-colors font-medium shadow-lg shadow-teal-500/30">
              Use Photo
            </button>
            <button onClick={onClose} className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors font-medium">
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
