'use client';

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
} from 'react';

type KycRegistration = {
  fullName: string;
  email: string;
  mobile: string;
};

type KycData = {
  registration: KycRegistration | null;
  aadharFile: File | null;
  webcamImage: Blob | null;
};

type KycContextValue = {
  data: KycData;
  setRegistration: (registration: KycRegistration) => void;
  setAadharFile: (file: File | null) => void;
  setWebcamImage: (blob: Blob | null) => void;
  reset: () => void;
};

const KycContext = createContext<KycContextValue | undefined>(undefined);

const initialState: KycData = {
  registration: null,
  aadharFile: null,
  webcamImage: null,
};

export function KycProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<KycData>(initialState);

  const setRegistration = (registration: KycRegistration) => {
    setData((prev) => ({
      ...prev,
      registration,
    }));
  };

  const setAadharFile = (file: File | null) => {
    setData((prev) => ({
      ...prev,
      aadharFile: file,
    }));
  };

  const setWebcamImage = (blob: Blob | null) => {
    setData((prev) => ({
      ...prev,
      webcamImage: blob,
    }));
  };

  const reset = () => setData(initialState);

  return (
    <KycContext.Provider
      value={{
        data,
        setRegistration,
        setAadharFile,
        setWebcamImage,
        reset,
      }}
    >
      {children}
    </KycContext.Provider>
  );
}

export function useKyc() {
  const ctx = useContext(KycContext);
  if (!ctx) {
    throw new Error('useKyc must be used within a KycProvider');
  }
  return ctx;
}

