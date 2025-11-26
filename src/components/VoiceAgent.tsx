'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition: {
      prototype: SpeechRecognition;
      new(): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      prototype: SpeechRecognition;
      new(): SpeechRecognition;
    };
  }
}

async function playStreamingAudio(response: Response): Promise<void> {
  if (!response.body) throw new Error('No response body');

  const mediaSource = new MediaSource();
  const audio = new Audio();
  audio.src = URL.createObjectURL(mediaSource);

  return new Promise((resolve, reject) => {
    mediaSource.addEventListener('sourceopen', async () => {
      const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
      const reader = response.body!.getReader();
      let isDone = false;

      const appendNextChunk = async () => {
        try {
          const { done, value } = await reader.read();
          if (done) {
            isDone = true;
            mediaSource.endOfStream();
            return;
          }
          sourceBuffer.appendBuffer(value);
        } catch (error) {
          reject(error);
        }
      };

      sourceBuffer.addEventListener('updateend', () => {
        if (!isDone) {
          appendNextChunk();
        }
      });

      // Start playing as soon as we have data
      audio.play().catch(reject);
      appendNextChunk();
    });

    mediaSource.addEventListener('error', reject);

    // Wait for actual audio playback to end, not just streaming
    audio.addEventListener('ended', () => resolve());
  });
}

export default function VoiceAgent() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Click to start talking');
  const [isProcessing, setIsProcessing] = useState(false);
  // const [userId] = useState(() => generateRandomString(10));
  const [userId] = useState("Es1kF1h9a7");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'hi-IN';
      recognitionRef.current = recognition;
    }
  }, []);

  const startRecording = () => {
    if (!recognitionRef.current) {
      setStatus('Speech recognition not supported');
      return;
    }

    recognitionRef.current.onstart = (event: Event) => {
      setIsRecording(true);
      setStatus('Listening...');
    };

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      processTranscript(transcript);
    };

    recognitionRef.current.onend = (event: Event) => {
      setIsRecording(false);
      setStatus('Click to start talking');
    };

    recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setStatus('Error recognizing speech');
      setIsRecording(false);
    };

    recognitionRef.current.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
      setStatus('Processing...');
    }
  };
  function generateRandomString(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  const processTranscript = async (transcript: string) => {
    try {
      console.log('Transcript:', transcript);

      // Generate response using chat
      let reply = 'Main sunn nhi paya';
      if (transcript) {
        const chatResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: transcript, userId }),
        });
        if (chatResponse.ok) {
          const chatData = await chatResponse.json();
          reply = chatData.response;
        }
      }

      // Now TTS with streaming playback
      const ttsResponse = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: reply }),
      });

      if (!ttsResponse.ok) throw new Error('TTS failed');

      setStatus('Speaking...');
      // Streaming audio playback using MediaSource
      await playStreamingAudio(ttsResponse);
      console.log('Finished playing audio');
      // Automatically start listening again after AI finishes speaking
      startRecording();
    } catch (error) {
      console.error('Error processing transcript:', error);
      setStatus('Error processing transcript');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">
      <motion.h1
        className="text-4xl font-bold text-white mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Voice Agent
      </motion.h1>
      <div className="text-center">
        <div className="relative mb-8">
          {!isRecording ? (
            <motion.button
              onClick={startRecording}
              disabled={isProcessing}
              className={`w-32 h-32 rounded-full flex flex-col items-center justify-center text-white font-semibold text-lg transition-all duration-300 bg-blue-500 hover:bg-blue-600 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              whileHover={!isProcessing ? { scale: 1.05 } : {}}
              whileTap={!isProcessing ? { scale: 0.95 } : {}}
            >
              {isProcessing ? (
                <Loader2 className="w-12 h-12 animate-spin" />
              ) : (
                <Mic className="w-12 h-12" />
              )}
              <span className="mt-2 text-sm">Start</span>
            </motion.button>
          ) : (
            <motion.button
              onClick={stopRecording}
              className="w-32 h-32 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold text-lg transition-all duration-300 flex flex-col items-center justify-center relative"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <MicOff className="w-12 h-12" />
              <span className="mt-2 text-sm">Stop</span>
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-red-400"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.button>
          )}
        </div>

        <motion.p
          className="text-white text-xl font-light"
          key={status}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {status}
        </motion.p>
      </div>
    </div>
  );
}