'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import * as Papa from 'papaparse';
import mqtt, { MqttClient } from 'mqtt';
import { MqttStatusIndicator } from '../csvUploader/mqttStatusIndicator';
import { FileUploadArea } from '../csvUploader/fileUploadArea';
import { ValidationErrorDisplay } from '../csvUploader/validationErrorDisplay';
import { FileInfo } from '../csvUploader/fileInfo';
import { DataPreviewTable } from '../csvUploader/dataPreviewTable';
import { SimulatorControls } from '../csvUploader/simulatorControls';

// Define the required columns
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

// MQTT broker configuration
const MQTT_BROKER_URL = 'ws://test.mosquitto.org:8080/mqtt'; // Replace with your broker URL
const MQTT_OPTIONS = {
  clientId: 'csv-simulator-' + Math.random().toString(16).substring(2, 8),
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
};

export default function CsvUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<Record<string, string | number | null>[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentRowIndex, setCurrentRowIndex] = useState(0);
  const [intervalTime, setIntervalTime] = useState(2000);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [mqttStatus, setMqttStatus] = useState<string>('Disconnected');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mqttClientRef = useRef<MqttClient | null>(null);

  // Connect to MQTT broker
  useEffect(() => {
    const connectToMqtt = () => {
      try {
        const client = mqtt.connect(MQTT_BROKER_URL, MQTT_OPTIONS);
        mqttClientRef.current = client;

        client.on('connect', () => {
          setMqttStatus('Connected');
          console.log('Connected to MQTT broker');
        });

        client.on('error', (err) => {
          setMqttStatus(`Error: ${err.message}`);
          console.error('MQTT error:', err);
        });

        client.on('close', () => {
          setMqttStatus('Disconnected');
        });

        client.on('reconnect', () => {
          setMqttStatus('Reconnecting...');
        });

        return () => {
          if (client) {
            client.end();
          }
        };
      } catch (err) {
        console.error('MQTT connection error:', err);
        setMqttStatus('Connection failed');
      }
    };

    connectToMqtt();
  }, []);

  // Publish data to MQTT when current row changes
  useEffect(() => {
    if (data.length > 0 && currentRowIndex < data.length && mqttClientRef.current?.connected) {
      publishRowData(data[currentRowIndex]);
    }
  }, [currentRowIndex, data]);

  // Publish a row's data to MQTT topics
  const publishRowData = (row: Record<string, string | number | null>) => {
    const assetId = row['Asset_ID'] || 'unknown';
    const client = mqttClientRef.current;

    if (!client || !client.connected) {
      console.warn('MQTT client not connected');
      return;
    }

    REQUIRED_COLUMNS.forEach(column => {
      if (column === 'Asset_ID') return; // Skip publishing Asset_ID as we use it in topic
      
      const topic = `assets/${assetId}/${column}`;
      const value = row[column] !== null ? String(row[column]) : 'null';
      
      client.publish(topic, value, { qos: 1 }, (err) => {
        if (err) {
          console.error(`Error publishing to ${topic}:`, err);
        } else {
          console.log(`Published to ${topic}: ${value}`);
        }
      });
    });
  };

  // Validate CSV headers against required columns
  const validateCsvHeaders = (headers: string[]): boolean => {
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
  };

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

  // Process the CSV file
  interface CsvRow {
    [key: string]: string | number | null;
  }

  const processFile = useCallback((file: File): void => {
    if (file.type !== 'text/csv') {
      alert('Please upload a CSV file');
      return;
    }

    setFile(file);
    setIsLoading(true);
    setData([]);
    setCurrentRowIndex(0);
    setValidationError(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);

    Papa.parse<CsvRow>(file, {
      header: true,
      complete: (results: Papa.ParseResult<CsvRow>) => {
        // Get the headers from the parsed results
        const headers = results.meta.fields || [];
        
        // Validate the headers
        if (!validateCsvHeaders(headers)) {
          setIsLoading(false);
          return;
        }
        
        setData(results.data);
        setIsLoading(false);
      },
      error: (error: Error) => {
        console.error('Error parsing CSV:', error);
        alert('Error parsing CSV file');
        setIsLoading(false);
      }
    });
  }, []);

  // Handle play/pause
  const togglePlay = () => {
    if (isPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsPlaying(false);
    } else {
      if (data.length === 0) {
        alert('No data to simulate');
        return;
      }
      setIsPlaying(true);
      setCurrentRowIndex(0); // Start from the beginning
    }
  };

  // Handle next row
  const nextRow = useCallback(() => {
    setCurrentRowIndex(prev => {
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
  }, [data.length]);

  // Handle previous row
  const prevRow = () => {
    setCurrentRowIndex(prev => Math.max(0, prev - 1));
  };

  // Effect for interval simulation
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        nextRow();
      }, intervalTime);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, intervalTime, data.length, nextRow]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">CSV File Uploader & Simulator</h1>
      
      {/* MQTT Status */}
      <MqttStatusIndicator status={mqttStatus}/>

      {/* File Upload Section */}
      <FileUploadArea
        isDragging={isDragging}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onFileChange={handleFileChange}
      />

      {/* Validation Error */}
      <ValidationErrorDisplay error={validationError}/>

      {/* File Info */}
      <FileInfo file={file} dataLength={data.length}/>

      {/* Simulator Controls */}
      {/* Loading State */}
      {data.length > 0 && !validationError && (
        <>
          <SimulatorControls
            isPlaying={isPlaying}
            currentRowIndex={currentRowIndex}
            dataLength={data.length}
            intervalTime={intervalTime}
            isConnected={mqttStatus === 'Connected'}
            onPlayToggle={togglePlay}
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
      )}

      {isLoading && (
        <div className="text-center py-4">
          <p>Loading and parsing CSV file...</p>
        </div>
      )}
    </div>
  );
}