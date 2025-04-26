interface MqttStatusIndicatorProps {
    status: string;
}

export function MqttStatusIndicator({ status }: MqttStatusIndicatorProps) {
    const statusClasses = {
        Connected: 'bg-green-100 text-green-800',
        Error: 'bg-red-100 text-red-800',
        default: 'bg-yellow-100 text-yellow-800'
    };

    const className = status === 'Connected' 
        ? statusClasses.Connected 
        : status.startsWith('Error') 
            ? statusClasses.Error 
            : statusClasses.default;

    return (
    <div className={`mb-4 p-2 rounded text-center ${className}`}>
        MQTT Status: {status}
    </div>
    );
}