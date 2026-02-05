'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PrimaryButton from '@/components/PrimaryButton';
import StepIndicator from '@/components/StepIndicator';

export default function AadhaarUploadPage() {
  const router = useRouter();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (validTypes.includes(file.type)) {
        setUploadedFile(file);
      } else {
        alert('Please upload a valid file (JPG, PNG, or PDF)');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (validTypes.includes(file.type)) {
        setUploadedFile(file);
      } else {
        alert('Please upload a valid file (JPG, PNG, or PDF)');
      }
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
  };

  const handleProceed = () => {
    if (!uploadedFile) {
      alert('Please upload your Aadhaar document');
      return;
    }
    console.log('Uploaded file:', uploadedFile);
    router.push('/face-auth');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const steps = [
    { number: 1, label: 'Registration', status: 'completed' as const },
    { number: 2, label: 'Aadhaar', status: 'active' as const },
    { number: 3, label: 'Face Auth', status: 'pending' as const },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black flex items-center justify-center px-4 pt-24 pb-12">
      <div className="w-full max-w-2xl">
        {/* Step Indicator */}
        <StepIndicator steps={steps} />

        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Aadhaar Verification
          </h1>
          <p className="text-sm md:text-base text-gray-400">
            Upload your Aadhaar card for secure identity verification
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8 shadow-2xl">
          {/* Upload Section */}
          <div className="space-y-5 md:space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Upload Aadhaar (Front Side)
                <span className="text-red-500 ml-1">*</span>
              </label>

              {/* Upload Box */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl transition-all duration-200 ${
                  isDragging
                    ? 'border-red-500 bg-red-500/5'
                    : uploadedFile
                    ? 'border-green-600 bg-green-600/5'
                    : 'border-gray-700 bg-gray-950 hover:border-gray-600'
                }`}
              >
                <input
                  type="file"
                  id="aadhaar-upload"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {uploadedFile ? (
                  <div className="p-6 md:p-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center flex-shrink-0">
                          {uploadedFile.type === 'application/pdf' ? (
                            <svg
                              className="w-6 h-6 text-green-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-6 h-6 text-green-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">
                            {uploadedFile.name}
                          </p>
                          <p className="text-sm text-gray-400">
                            {formatFileSize(uploadedFile.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleRemoveFile}
                        type="button"
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                      >
                        <svg
                          className="w-5 h-5 text-gray-400 hover:text-red-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="aadhaar-upload"
                    className="flex flex-col items-center justify-center p-10 md:p-12 cursor-pointer"
                  >
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                      <svg
                        className="w-7 h-7 md:w-8 md:h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                    </div>
                    <p className="text-white font-medium mb-1 text-sm md:text-base">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs md:text-sm text-gray-400 mb-3">
                      JPG, PNG or PDF (MAX. 10MB)
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Images
                      </span>
                      <span className="flex items-center">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        PDF
                      </span>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <svg
                  className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <div>
                  <p className="text-sm text-gray-300 font-medium mb-1">
                    Secure & Confidential
                  </p>
                  <p className="text-sm text-gray-400">
                    Your Aadhaar data is used only for identity verification and is
                    securely processed. We comply with UIDAI guidelines and never
                    store your Aadhaar number permanently.
                  </p>
                </div>
              </div>
            </div>

            {/* Requirements Checklist */}
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-300 mb-3">
                Ensure your Aadhaar document:
              </p>
              <ul className="space-y-2">
                {[
                  'Is clear and readable',
                  'Shows all four corners of the card',
                  'Contains your photograph',
                  'Displays the Aadhaar number clearly',
                ].map((item, index) => (
                  <li key={index} className="flex items-start text-sm text-gray-400">
                    <svg
                      className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Button */}
            <PrimaryButton
              onClick={handleProceed}
              fullWidth
              disabled={!uploadedFile}
            >
              Proceed to Face Verification
            </PrimaryButton>
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 flex items-center justify-center space-x-2">
            <svg
              className="w-4 h-4 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>
              All documents are encrypted with AES-256 encryption
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}