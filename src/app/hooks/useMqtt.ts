'use client';

import { useState, useEffect, useCallback } from 'react';
import mqtt, { MqttClient } from 'mqtt';

type MqttStatus = 'Connecting' | 'Connected' | 'Error' | 'Disconnected' | 'Reconnecting';

interface UseMqttReturn {
    client: MqttClient | null;
    status: MqttStatus;
    publish: (topic: string, message: string) => void;
    subscribe: (topic: string | string[]) => void;
    unsubscribe: (topic: string | string[]) => void;
}

export const useMqtt = (brokerUrl: string, options?: mqtt.IClientOptions): UseMqttReturn => {
    const [client, setClient] = useState<MqttClient | null>(null);
    const [status, setStatus] = useState<MqttStatus>('Connecting');

    const publish = useCallback((topic: string, message: string) => {
        if (client?.connected) {
            client.publish(topic, message, { qos: 1 }, (err) => {
                if (err) {
                    console.error(`Error publishing to ${topic}:`, err);
                }
            });
        } else {
            console.warn('MQTT client not connected');
        }
    }, [client]);

    const subscribe = useCallback((topic: string | string[]) => {
        if (client?.connected) {
            client.subscribe(topic, (err) => {
                if (err) {
                    console.error('Subscription error:', err);
                }
            });
        }
    }, [client]);

    const unsubscribe = useCallback((topic: string | string[]) => {
        if (client?.connected) {
            client.unsubscribe(topic, (err) => {
                if (err) {
                    console.error('Unsubscription error:', err);
                }
            });
        }
    }, [client]);

    useEffect(() => {
        const clientInstance = mqtt.connect(brokerUrl, options);
        setClient(clientInstance);

        clientInstance.on('connect', () => {
            setStatus('Connected');
        });

        clientInstance.on('error', (err) => {
            console.error('MQTT error:', err);
            setStatus('Error');
        });

        clientInstance.on('close', () => {
            setStatus('Disconnected');
        });

        clientInstance.on('reconnect', () => {
            setStatus('Reconnecting');
        });

        return () => {
            if (clientInstance) {
                clientInstance.end();
            }
        };
    }, [brokerUrl, options]);

    return {
        client,
        status,
        publish,
        subscribe,
        unsubscribe
    };
};