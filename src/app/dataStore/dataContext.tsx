'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import * as Papa from 'papaparse';

interface CsvData {
    [key: string]: string | number | null;
}

interface DataContextType {
    file: File | null;
    data: CsvData[];
    currentRowIndex: number;
    isPlaying: boolean;
    intervalTime: number;
    validationError: string | null;
    isLoading: boolean;
    setFile: (file: File | null) => void;
    setData: (data: CsvData[]) => void;
    setCurrentRowIndex: (value: number | ((prev: number) => number)) => void;
    setIsPlaying: (playing: boolean) => void;
    setIntervalTime: (time: number) => void;
    setValidationError: (error: string | null) => void;
    setIsLoading: (loading: boolean) => void;
    processFile: (file: File, validateHeaders: (headers: string[]) => boolean) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const [file, setFile] = useState<File | null>(null);
    const [data, setData] = useState<CsvData[]>([]);
    const [currentRowIndex, setCurrentRowIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [intervalTime, setIntervalTime] = useState(2000);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const processFile = useCallback((file: File, validateHeaders: (headers: string[]) => boolean) => {
        if (file.type !== 'text/csv') {
            alert('Please upload a CSV file');
            return;
        }
        
        setFile(file);
        setData([]);
        setCurrentRowIndex(0);
        setValidationError(null);
        setIsLoading(true);
        
        Papa.parse<CsvData>(file, {
            header: true,
            complete: (results) => {
                const headers = results.meta.fields || [];
                
                if (!validateHeaders(headers)) {
                    setIsLoading(false);
                    return;
                }
                
                setData(results.data);
                setIsLoading(false);
            },
            error: (error) => {
                console.error('Error parsing CSV:', error);
                alert('Error parsing CSV file');
                setIsLoading(false);
            }
        });
    }, []);

    return (
        <DataContext.Provider
            value={{
                file,
                data,
                currentRowIndex,
                isPlaying,
                intervalTime,
                validationError,
                isLoading,
                setFile,
                setData,
                setCurrentRowIndex,
                setIsPlaying,
                setIntervalTime,
                setValidationError,
                setIsLoading,
                processFile
            }}
        >
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};