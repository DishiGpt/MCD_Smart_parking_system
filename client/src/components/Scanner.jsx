import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Tesseract } from 'tesseract.js';
import { Camera, RefreshCw, Send } from 'lucide-react';
import axios from 'axios';

const Scanner = ({ mode = 'ENTRY', onSuccess }) => {
  const webcamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [scannedText, setScannedText] = useState('');
  const [editedText, setEditedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fee, setFee] = useState(null);

  // License plate regex filter - matches patterns like: DL 55 1234, KA 01 AB 1234, HR 26 4567, etc.
  // Note: Pattern is referenced for documentation but filtering is done in filterLicensePlate function

  // Filter OCR text to extract only license plate-like patterns
  const filterLicensePlate = (text) => {
    if (!text) return '';

    // Remove extra spaces and normalize
    const normalized = text.trim().toUpperCase().replace(/\s+/g, ' ');

    // Try to match license plate pattern
    const patterns = [
      /[A-Z]{2}\s?\d{2}\s?[A-Z]{2}\s?\d{4}/,  // DL 55 AB 1234
      /[A-Z]{2}\s?\d{2}\s?\d{4}/,              // DL 55 1234
      /[A-Z]{2}\d{2}[A-Z]{2}\d{4}/,            // DL55AB1234
      /[A-Z]{2}\d{2}\d{4}/,                    // DL551234
    ];

    for (let pattern of patterns) {
      const match = normalized.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return '';
  };

  // Capture photo from webcam
  const handleCapture = () => {
    setError('');
    setSuccess('');
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    setScannedText('');
    setEditedText('');
    performOCR(imageSrc);
  };

  // Perform OCR using Tesseract
  const performOCR = async (imageSrc) => {
    setIsProcessing(true);
    setError('');

    try {
      const result = await Tesseract.recognize(imageSrc, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      const rawText = result.data.text;
      const filteredText = filterLicensePlate(rawText);

      setScannedText(rawText);
      setEditedText(filteredText);

      if (!filteredText) {
        setError(
          'No valid license plate detected. Please try again or edit manually.'
        );
      } else {
        setSuccess(`License plate detected: ${filteredText}`);
      }
    } catch (err) {
      setError(`OCR Error: ${err.message}`);
      console.error('Tesseract error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit to API
  const handleSubmit = async () => {
    if (!editedText.trim()) {
      setError('Please enter a valid license plate');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const endpoint = mode === 'ENTRY' ? '/api/entry' : '/api/exit';
      const payload = { licensePlate: editedText.trim() };

      const response = await axios.post(endpoint, payload);

      if (mode === 'EXIT' && response.data.fee) {
        setFee(response.data.fee);
        setSuccess(
          `Exit recorded successfully! Fee: ₹${response.data.fee}`
        );
      } else {
        setSuccess(`${mode} recorded successfully for: ${editedText}`);
      }

      if (onSuccess) onSuccess(response.data);

      // Reset after 3 seconds
      setTimeout(() => {
        setCapturedImage(null);
        setScannedText('');
        setEditedText('');
        setFee(null);
      }, 3000);
    } catch (err) {
      setError(
        `API Error: ${err.response?.data?.message || err.message}`
      );
      console.error('Submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset scanner
  const handleReset = () => {
    setCapturedImage(null);
    setScannedText('');
    setEditedText('');
    setError('');
    setSuccess('');
    setFee(null);
  };

  const videoConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'environment',
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Camera className="w-6 h-6" />
          ANPR License Plate Scanner
        </h2>
        <p className="text-blue-100 mt-1">
          {mode === 'ENTRY' ? 'Scan plate for entry' : 'Scan plate for exit'}
        </p>
      </div>

      <div className="p-6">
        {/* Camera View Section */}
        {!capturedImage ? (
          <div className="relative bg-black rounded-lg overflow-hidden mb-6">
            <div className="relative">
              <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                className="w-full"
              />

              {/* Scanner Frame Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-32">
                  {/* Frame corners */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-500"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-500"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-500"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-500"></div>

                  {/* Center line animation */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-70"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Capture Button */}
            <button
              onClick={handleCapture}
              disabled={isProcessing}
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-3 px-8 rounded-full shadow-lg flex items-center gap-2 transition"
            >
              <Camera className="w-5 h-5" />
              {isProcessing ? 'Processing...' : 'Capture Plate'}
            </button>
          </div>
        ) : (
          /* Captured Image Preview */
          <div className="mb-6">
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full rounded-lg border-2 border-blue-300"
            />
          </div>
        )}

        {/* Processing Spinner */}
        {isProcessing && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 font-semibold">Scanning license plate...</p>
          </div>
        )}

        {/* Raw OCR Text (Readonly) */}
        {scannedText && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Raw OCR Text (Reference)
            </label>
            <textarea
              readOnly
              value={scannedText}
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm max-h-24 overflow-y-auto"
            />
          </div>
        )}

        {/* Edited License Plate Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            License Plate
            {editedText && (
              <span className="text-green-600 font-semibold ml-2">
                ✓ Valid Format
              </span>
            )}
          </label>
          <input
            type="text"
            value={editedText}
            onChange={(e) => {
              setEditedText(e.target.value.toUpperCase());
              setError('');
            }}
            placeholder="e.g., DL 55 1234 or DL55AB1234"
            className="w-full p-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 font-mono text-lg tracking-wider"
          />
          <p className="text-xs text-gray-500 mt-1">
            Format: 2 letters + 2 numbers + (optional 2 letters) + 4 numbers
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
            <p className="text-red-700 font-semibold">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded">
            <p className="text-green-700 font-semibold">Success</p>
            <p className="text-green-600 text-sm">{success}</p>
          </div>
        )}

        {/* Fee Display (for EXIT mode) */}
        {fee && (
          <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <p className="text-blue-700 font-bold text-lg">
              Parking Fee: ₹{fee}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {capturedImage && (
            <button
              onClick={handleReset}
              disabled={isSubmitting}
              className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Retake Photo
            </button>
          )}

          <button
            onClick={handleSubmit}
            disabled={!editedText || isSubmitting || isProcessing}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit {mode === 'ENTRY' ? 'Entry' : 'Exit'}
              </>
            )}
          </button>
        </div>

        {/* Info Section */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-gray-800 mb-2">📋 How to use:</h3>
          <ul className="text-sm text-gray-700 space-y-1 ml-4">
            <li>✓ Click "Capture Plate" to scan a license plate</li>
            <li>✓ The OCR will auto-extract the plate number</li>
            <li>✓ Edit the text if OCR misread any characters</li>
            <li>✓ Click Submit to record {mode === 'ENTRY' ? 'entry' : 'exit'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Scanner;
