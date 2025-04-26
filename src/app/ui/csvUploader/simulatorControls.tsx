interface SimulatorControlsProps {
    isPlaying: boolean;
    currentRowIndex: number;
    dataLength: number;
    intervalTime: number;
    isConnected: boolean;
    onPlayToggle: () => void;
    onPrevRow: () => void;
    onNextRow: () => void;
    onIntervalChange: (time: number) => void;
}

export function SimulatorControls({
    isPlaying,
    currentRowIndex,
    dataLength,
    intervalTime,
    isConnected,
    onPlayToggle,
    onPrevRow,
    onNextRow,
    onIntervalChange
}: SimulatorControlsProps) {
    const formatRowNumber = () => `${currentRowIndex + 1} of ${dataLength}`;

    return (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Simulator Controls</h2>
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onPlayToggle}
                        className={`px-4 py-2 rounded-md ${
                            isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                        } text-white`}
                    >
                        {isPlaying ? 'Stop' : 'Start'}
                    </button>
                    <button
                        onClick={onPrevRow}
                        disabled={currentRowIndex === 0 || isPlaying}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    <button
                        onClick={onNextRow}
                        disabled={currentRowIndex >= dataLength - 1 || isPlaying}
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
                        onChange={(e) => onIntervalChange(Number(e.target.value))}
                        disabled={isPlaying}
                        className="w-24 px-2 py-1 border rounded-md disabled:bg-gray-100"
                    />
                </div>
                <div className="ml-auto">
                    <span className="font-medium">{formatRowNumber()}</span>
                </div>
            </div>
            {isConnected && (
                <div className="mt-4 text-sm text-green-600">
                    Publishing to MQTT topics: assets/&lt;Asset_ID&gt;/&lt;Column_Name&gt;
                </div>
            )}
        </div>
    );
}