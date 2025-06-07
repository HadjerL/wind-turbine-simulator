'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MqttStatusIndicator } from './mqttStatusIndicator';
import { FileUploadArea } from './fileUploadArea';
import { ValidationErrorDisplay } from './validationErrorDisplay';
import { FileInfo } from './fileInfo';
import { DataPreviewTable } from './dataPreviewTable';
import { SimulatorControls } from './simulatorControls';
import { useData } from '@/app/dataStore/dataContext';
import { useMqtt } from '@/app/hooks/useMqtt';
import WindTurbine from '../windTurbine/windTurbine';

const REQUIRED_COLUMNS = [
  'Timestamp',
  'Asset_ID',
  'Status_Type',
  'Rotor_Speed',
  'Rotational_Speed',
  'Gearbox_Oil_Inlet_Temperature',
  'RMS_Current_Phase_1_HV_Grid',
  'RMS_Current_Phase_2_HV_Grid',
  'RMS_Current_Phase_3_HV_Grid',
  'RMS_Voltage_Phase_1_HV_Grid',
  'RMS_Voltage_Phase_2_HV_Grid',
  'RMS_Voltage_Phase_3_HV_Grid',
  'Min_Pitch_Angle',
  'Rotor_Bearing_Temperature',
  'Outside_Temperature',
  'Wind_Speed',
  'Power_Output',
  'Nacelle_Air_Pressure',
  'Wind_Direction_Sin',
  'Wind_Direction_Cos'
];

// const MQTT_BROKER_URL = 'ws://192.168.239.118:9001/mqtt';
const MQTT_BROKER_URL = process.env.NEXT_PUBLIC_MQTT_BROKER_URL || 'ws://localhost:9001/mqtt';
const MQTT_OPTIONS = {
  clientId: 'csv-simulator-' + Math.random().toString(16).substring(2, 8),
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
};

export default function CsvUploader() {
  const {
    file,
    data,
    currentRowIndex,
    isPlaying,
    isPaused,
    intervalTime,
    validationError,
    isLoading,
    setCurrentRowIndex,
    setIsPlaying,
    setIsPaused,
    setIntervalTime,
    setValidationError,
    processFile: contextProcessFile
  } = useData();

  const { status, publish } = useMqtt(MQTT_BROKER_URL, MQTT_OPTIONS);
  const [isDragging, setIsDragging] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentWindSpeed = data[currentRowIndex]?.['Wind_Speed'] as number || 0;

  // Validate CSV headers against required columns
  const validateCsvHeaders = useCallback((headers: string[]): boolean => {
    const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      setValidationError(
        `Missing required columns: ${missingColumns.join(', ')}. ` +
        `Found columns: ${headers.join(', ')}`
      );
      return false;
    }
    
    setValidationError(null);
    return true;
  }, [setValidationError]);

  // Process file with validation
  const processFile = useCallback((file: File) => {
    contextProcessFile(file, validateCsvHeaders);
  }, [contextProcessFile, validateCsvHeaders]);

  // Publish a row's data to MQTT topics
  // Publish a complete row's data in one MQTT message
  const publishRowData = useCallback((row: Record<string, string | number | null>) => {
    const assetId = row['Asset_ID'] || 'unknown';
    const topic = `assets/${assetId}/row`;
    
    // Create a simplified row object with all required columns
    const rowData: Record<string, string | number | null> = {};
    REQUIRED_COLUMNS.forEach(column => {
        rowData[column] = row[column] !== null ? row[column] : null;
    });
    
    // Add timestamp if not present
    if (!rowData['Timestamp']) {
        rowData['Timestamp'] = new Date().toISOString();
    }
    
    publish(topic, JSON.stringify(rowData));
  }, [publish]);

  // Publish data to MQTT when current row changes
  useEffect(() => {
    if (data.length > 0 && currentRowIndex < data.length && status === 'Connected') {
      publishRowData(data[currentRowIndex]);
    }
  }, [currentRowIndex, data, status, publishRowData]);

  // Handle file selection via input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  // Handle drag and drop events
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv') {
      processFile(droppedFile);
    }
  };

    const startSimulation = () => {
      if (data.length === 0) {
        alert('No data to simulate');
        return;
      }
      setIsPlaying(true);
      setIsPaused(false);
      setCurrentRowIndex(0);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const stopSimulation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
  };

  // Handle next row
  const nextRow = useCallback(() => {
    setCurrentRowIndex((prev: number) => {
      if (prev >= data.length - 1) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsPlaying(false);
        return prev;
      }
      return prev + 1;
    });
  }, [data.length, setIsPlaying, setCurrentRowIndex]);
  // Handle previous row
  const prevRow = () => {
    setCurrentRowIndex(prev => Math.max(0, prev - 1));
  };

  // Effect for interval simulation
  useEffect(() => {
    if (isPlaying && !isPaused) {
        intervalRef.current = setInterval(() => {
            nextRow();
        }, intervalTime);
    } else if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
    }

    return () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };
  }, [isPlaying, isPaused, intervalTime, nextRow]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">CSV File Uploader & Simulator</h1>
      
      <MqttStatusIndicator status={status} />

      <FileUploadArea
        isDragging={isDragging}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onFileChange={handleFileChange}
      />
      <ValidationErrorDisplay error={validationError} />
      {data.length > 0 && !validationError && (
        <div className='sm:flex sm:flex-row'>
          <div className='mb-4 sm:mb-0 sm:mr-4 sm:w-2/3'>
            <FileInfo file={file} dataLength={data.length} />

              <>
              <SimulatorControls
                isPlaying={isPlaying}
                isPaused={isPaused}
                currentRowIndex={currentRowIndex}
                dataLength={data.length}
                intervalTime={intervalTime}
                isConnected={status === 'Connected'}
                onStart={startSimulation}
                onPauseResume={togglePause}
                onStop={stopSimulation}
                onPrevRow={prevRow}
                onNextRow={nextRow}
                onIntervalChange={setIntervalTime}
              />

                <DataPreviewTable
                  columns={REQUIRED_COLUMNS}
                  data={data}
                  currentRowIndex={currentRowIndex}
                  isPlaying={isPlaying}
                />
              </>
          </div>
          <div className='w-full mt-28 sm:mt-0'>
            <WindTurbine 
              windSpeed={Number(currentWindSpeed)} 
              powerOutput={Number(data[currentRowIndex]?.['Power_Output'] || 0)}
              isPlaying={isPlaying}
              isPaused={isPaused}
            />
          </div>
        </div>
      )}
      {isLoading && (
        <div className="text-center py-4">
          <p>Loading and parsing CSV file...</p>
        </div>
      )}
    </div>
  );
}