'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import * as Papa from 'papaparse';
import mqtt, { MqttClient } from 'mqtt';

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

  // Format current row number display
  const formatRowNumber = () => {
    return `${currentRowIndex + 1} of ${data.length}`;
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">CSV File Uploader & Simulator</h1>
      
      {/* MQTT Status */}
      <div className={`mb-4 p-2 rounded text-center ${
        mqttStatus === 'Connected' ? 'bg-green-100 text-green-800' : 
        mqttStatus.startsWith('Error') ? 'bg-red-100 text-red-800' : 
        'bg-yellow-100 text-yellow-800'
      }`}>
        MQTT Status: {mqttStatus}
      </div>

      {/* File Upload Section */}
      <div 
        className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          id="file-upload" 
          accept=".csv" 
          onChange={handleFileChange} 
          className="hidden" 
        />
        <label htmlFor="file-upload" className="cursor-pointer block">
          <div className="flex flex-col items-center justify-center">
            <svg className="w-12 h-12 mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">CSV files only</p>
          </div>
        </label>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-medium text-red-800 mb-2">Validation Error</h3>
          <p className="text-red-700">{validationError}</p>
        </div>
      )}

      {/* File Info */}
      {file && !validationError && (
        <div className="mb-6">
          <p className="font-medium">Selected file: {file.name}</p>
          <p className="text-sm text-gray-600">Size: {(file.size / 1024).toFixed(2)} KB</p>
          <p className="text-sm text-gray-600">Rows: {data.length}</p>
          <p className="text-sm text-green-600 font-medium mt-2">
            ✓ All required columns present
          </p>
        </div>
      )}

      {/* Simulator Controls */}
      {data.length > 0 && !validationError && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Simulator Controls</h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className={`px-4 py-2 rounded-md ${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white`}
              >
                {isPlaying ? 'Stop' : 'Start'}
              </button>
              <button
                onClick={prevRow}
                disabled={currentRowIndex === 0 || isPlaying}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={nextRow}
                disabled={currentRowIndex >= data.length - 1 || isPlaying}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="interval-time" className="text-sm font-medium">
                Interval (ms):
              </label>
              <input
                id="interval-time"
                type="number"
                min="100"
                step="100"
                value={intervalTime}
                onChange={(e) => setIntervalTime(Number(e.target.value))}
                disabled={isPlaying}
                className="w-24 px-2 py-1 border rounded-md disabled:bg-gray-100"
              />
            </div>
            <div className="ml-auto">
              <span className="font-medium">{formatRowNumber()}</span>
            </div>
          </div>
          {mqttClientRef.current?.connected && (
            <div className="mt-4 text-sm text-green-600">
              Publishing to MQTT topics: assets/&lt;Asset_ID&gt;/&lt;Column_Name&gt;
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="text-center py-4">
          <p>Loading and parsing CSV file...</p>
        </div>
      ) : data.length > 0 && !validationError ? (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {isPlaying ? 'Currently Showing' : 'Preview'} Row {currentRowIndex + 1}
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead>
                <tr>
                  {REQUIRED_COLUMNS.map((header) => (
                    <th key={header} className="py-2 px-4 border-b bg-gray-50">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-blue-50">
                  {REQUIRED_COLUMNS.map((header) => (
                    <td key={header} className="py-2 px-4 border-b">
                      {data[currentRowIndex]?.[header] !== undefined ? String(data[currentRowIndex][header]) : 'N/A'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}